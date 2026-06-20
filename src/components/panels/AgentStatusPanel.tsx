import { getAgentRegistry } from '@/lib/lore';
import { readSwitchboardSessions, isAgentOnline } from '@/lib/switchboard';
import { PanelShell } from '@/components/shared/PanelShell';
import type { ApiResponse, AgentRecord, SwitchboardStatus } from '@/types';

// ── Sub-components ────────────────────────────────────────────────────────────

function SwitchboardStatusBadge({ status }: { status: SwitchboardStatus }) {
  if (status === 'online') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-green-600">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500 shrink-0" />
        online
      </span>
    );
  }
  if (status === 'offline') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0" />
        offline
      </span>
    );
  }
  // 'unknown'
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="inline-block font-mono leading-none">?</span>
      unknown
    </span>
  );
}

function AgentTable({ agents }: { agents: AgentRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-4 py-2 font-medium">Agent</th>
            <th className="px-4 py-2 font-medium">Project</th>
            <th className="px-4 py-2 font-medium">Handle</th>
            <th className="px-4 py-2 font-medium">Registry</th>
            <th className="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr
              key={agent.relayHandle}
              className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
            >
              <td className="px-4 py-2 font-mono text-sm">{agent.name}</td>
              <td className="px-4 py-2 text-xs text-muted-foreground max-w-[7rem] truncate">
                {agent.projectId || '—'}
              </td>
              <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                {agent.relayHandle}
              </td>
              <td className="px-4 py-2 text-xs text-muted-foreground">{agent.registryStatus}</td>
              <td className="px-4 py-2">
                <SwitchboardStatusBadge status={agent.switchboardStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

/**
 * AgentStatusPanel
 *
 * Async Server Component — no 'use client'.
 * Calls getAgentRegistry() and readSwitchboardSessions() in parallel.
 * Enriches each AgentRecord with the current Switchboard online status.
 * getAgentRegistry() throws on LORE outage — wrapped in try/catch.
 */
export async function AgentStatusPanel() {
  let data: AgentRecord[] | null = null;
  let error: string | null = null;

  try {
    const [agents, sessions] = await Promise.all([
      getAgentRegistry(),
      readSwitchboardSessions(),
    ]);

    const enriched: AgentRecord[] = agents.map((record) => ({
      ...record,
      switchboardStatus: isAgentOnline(record.relayHandle, sessions),
    }));

    // Sort alphabetically by name — defensive; getAgentRegistry already sorts.
    enriched.sort((a, b) => a.name.localeCompare(b.name));

    data = enriched;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const response: ApiResponse<AgentRecord[]> = {
    data,
    error,
    stale: false,
    cachedAt: data !== null ? Date.now() : null,
  };

  return (
    <PanelShell title="Agent Status" response={response}>
      {response.data && (
        response.data.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            No agents registered.
          </div>
        ) : (
          <AgentTable agents={response.data} />
        )
      )}
    </PanelShell>
  );
}
