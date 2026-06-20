import { discoverProjects } from '@/lib/discovery';
import { getSessionCloses } from '@/lib/lore';
import { PanelShell } from '@/components/shared/PanelShell';
import { formatRelativeTime } from '@/lib/utils';
import type { ApiResponse, SessionClose } from '@/types';

// ── Panel ──────────────────────────────────────────────────────────────────

export async function SessionClosePanel() {
  let response: ApiResponse<SessionClose[]>;

  try {
    const projects = await discoverProjects();

    // Extract non-null projectIds for LORE query
    const projectIds = projects
      .map((p) => p.projectId)
      .filter((id): id is string => id !== null);

    // getSessionCloses throws on pg connection errors — caught below
    const closesMap = await getSessionCloses(projectIds);

    // Build a lookup from projectId → repoName using discovered projects
    const repoNameByProjectId = new Map<string, string>(
      projects
        .filter((p): p is typeof p & { projectId: string } => p.projectId !== null)
        .map((p) => [p.projectId, p.repoName])
    );

    // Enrich repoName (LORE stores projectId as proxy; replace with real directory name)
    const closes: SessionClose[] = Array.from(closesMap.values()).map((sc) => ({
      ...sc,
      repoName: repoNameByProjectId.get(sc.projectId) ?? sc.repoName,
    }));

    // Sort by timestamp descending (most recent first)
    closes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    response = {
      data: closes,
      error: null,
      stale: false,
      cachedAt: Date.now(),
    };
  } catch (err) {
    response = {
      data: null,
      error: err instanceof Error ? err.message : String(err),
      stale: false,
      cachedAt: null,
    };
  }

  return (
    <PanelShell title="Where Did I Leave Off?" response={response}>
      {response.data && <SessionCloseList closes={response.data} />}
    </PanelShell>
  );
}

// ── SessionCloseList ───────────────────────────────────────────────────────

function SessionCloseList({ closes }: { closes: SessionClose[] }) {
  if (closes.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No session captures found across discovered projects.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {closes.map((sc) => (
        <SessionCloseCard key={sc.projectId} sc={sc} />
      ))}
    </div>
  );
}

// ── SessionCloseCard ───────────────────────────────────────────────────────

function SessionCloseCard({ sc }: { sc: SessionClose }) {
  // Hard-truncate at 300 chars; append "..." only if content was actually truncated
  const isTruncated = sc.content.length > 300;
  const contentPreview = isTruncated ? sc.content.slice(0, 300) + '...' : sc.content;

  return (
    <div className="p-4 space-y-1">
      {/* Header: repoName bold + timestamp right-aligned */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sm">{sc.repoName}</span>
        <span className="text-xs text-muted-foreground shrink-0">
          {formatRelativeTime(sc.timestamp)}
        </span>
      </div>

      {/* Capture title — single line */}
      <div className="text-sm overflow-hidden text-ellipsis whitespace-nowrap">
        {sc.title}
      </div>

      {/* Content preview — hard-truncated at 300 chars in JS; no CSS text-overflow */}
      <div className="text-xs text-muted-foreground">{contentPreview}</div>
    </div>
  );
}
