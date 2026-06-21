import { discoverProjects } from '@/lib/discovery';
import { getDdrEntries } from '@/lib/ddr-index';
import { PanelShell } from '@/components/shared/PanelShell';
import type { ApiResponse, DdrEntry, KanbanColumn } from '@/types';

// ── Column ordering ────────────────────────────────────────────────────────

const STANDARD_COLUMNS: KanbanColumn[] = [
  'PROPOSED',
  'ACCEPTED',
  'IN SPRINT',
  'SHIPPED',
];

// ── Panel ──────────────────────────────────────────────────────────────────

export async function DdrPipelinePanel() {
  let response: ApiResponse<DdrEntry[]>;

  try {
    const projects = await discoverProjects();
    const allEntries: DdrEntry[] = [];

    for (const project of projects) {
      const entries = await getDdrEntries(project.repoPath);
      allEntries.push(...entries);
    }

    response = {
      data: allEntries,
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
    <PanelShell title="DDR Pipeline" response={response}>
      {response.data && <KanbanBoard entries={response.data} />}
    </PanelShell>
  );
}

// ── KanbanBoard ────────────────────────────────────────────────────────────

function KanbanBoard({ entries }: { entries: DdrEntry[] }) {
  const hasUnknown = entries.some((e) => e.kanbanColumn === 'UNKNOWN');
  const columns: KanbanColumn[] = hasUnknown
    ? [...STANDARD_COLUMNS, 'UNKNOWN']
    : STANDARD_COLUMNS;

  return (
    <div className="flex gap-3 p-4 overflow-x-auto h-full">
      {columns.map((col) => (
        <KanbanColumnView
          key={col}
          column={col}
          entries={entries.filter((e) => e.kanbanColumn === col)}
        />
      ))}
    </div>
  );
}

// ── KanbanColumnView ───────────────────────────────────────────────────────

function KanbanColumnView({
  column,
  entries,
}: {
  column: KanbanColumn;
  entries: DdrEntry[];
}) {
  return (
    <div className="flex flex-col min-w-[180px] flex-1">
      {/* Column header: label + count badge */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
          {column}
        </span>
        <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-mono">
          {entries.length}
        </span>
      </div>

      {/* Cards — zero-item columns render empty body; column is not hidden */}
      <div className="flex flex-col gap-2">
        {entries.map((entry) => (
          <DdrCard
            key={`${entry.repoName}-${entry.number}`}
            entry={entry}
            showRawStatus={column === 'UNKNOWN'}
          />
        ))}
      </div>
    </div>
  );
}

// ── DdrCard ────────────────────────────────────────────────────────────────

function DdrCard({
  entry,
  showRawStatus,
}: {
  entry: DdrEntry;
  showRawStatus: boolean;
}) {
  return (
    <div className="rounded border border-border bg-background p-2 space-y-0.5">
      {/* DDR number */}
      <div className="text-xs font-mono text-muted-foreground">
        DDR-{entry.number}
      </div>

      {/* Title — single line, overflow ellipsis */}
      <div
        className="text-sm font-medium overflow-hidden text-ellipsis whitespace-nowrap"
        title={entry.title}
      >
        {entry.title}
      </div>

      {/* Repo name (muted) */}
      <div className="text-sm text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
        {entry.repoName}
      </div>

      {/* Sprint slug or "tbd" (muted) */}
      <div className="text-xs text-muted-foreground">
        sprint: {entry.sprint}
      </div>

      {/* UNKNOWN cards additionally show raw status in parentheses */}
      {showRawStatus && (
        <div className="text-xs text-muted-foreground">
          ({entry.rawStatus})
        </div>
      )}
    </div>
  );
}
