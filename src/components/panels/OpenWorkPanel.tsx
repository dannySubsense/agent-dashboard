import { discoverProjects } from '@/lib/discovery';
import { getActiveHaltsByProject } from '@/lib/lore';
import { getOpenPrs, getOpenIssues } from '@/lib/github';
import { getDdrEntries } from '@/lib/ddr-index';
import { formatRelativeTime } from '@/lib/utils';
import { PanelShell } from '@/components/shared/PanelShell';
import type { ApiResponse, OpenWorkItem } from '@/types';

// Number of PRs/issues fetched per project — used to detect truncation.
const FETCH_LIMIT = 25;

// ── Group renderers ────────────────────────────────────────────────────────────

function HaltGroup({ items }: { items: OpenWorkItem[] }) {
  return (
    <div>
      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 border-b border-border/50">
        HALTs ({items.length})
      </div>
      <ul>
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-3 px-4 py-2.5 border-b border-border/30 last:border-0"
          >
            <span className="mt-1 inline-block w-2 h-2 rounded-sm bg-red-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0">
                  {item.repoName}
                </span>
                {item.timestamp && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatRelativeTime(item.timestamp)}
                  </span>
                )}
              </div>
              <p className="text-sm truncate mt-0.5">{item.title}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PrGroup({ items }: { items: OpenWorkItem[] }) {
  // Count per repo to detect truncation
  const countByRepo = new Map<string, number>();
  for (const item of items) {
    countByRepo.set(item.repoName, (countByRepo.get(item.repoName) ?? 0) + 1);
  }
  const truncatedRepos = Array.from(countByRepo.entries())
    .filter(([, count]) => count >= FETCH_LIMIT)
    .map(([repo]) => repo);

  return (
    <div>
      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 border-b border-border/50">
        Open PRs ({items.length})
      </div>
      <ul>
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 px-4 py-2 border-b border-border/30 last:border-0"
          >
            <span className="text-xs font-medium text-muted-foreground shrink-0 mt-0.5">
              {item.repoName}
            </span>
            <p className="text-sm truncate">
              {item.number !== undefined ? `PR #${item.number}: ` : ''}
              {item.title}
            </p>
          </li>
        ))}
      </ul>
      {truncatedRepos.length > 0 && (
        <p className="px-4 py-1.5 text-xs text-muted-foreground italic border-t border-border/30">
          Showing first {FETCH_LIMIT}
        </p>
      )}
    </div>
  );
}

function IssueGroup({ items }: { items: OpenWorkItem[] }) {
  // Count per repo to detect truncation
  const countByRepo = new Map<string, number>();
  for (const item of items) {
    countByRepo.set(item.repoName, (countByRepo.get(item.repoName) ?? 0) + 1);
  }
  const truncatedRepos = Array.from(countByRepo.entries())
    .filter(([, count]) => count >= FETCH_LIMIT)
    .map(([repo]) => repo);

  return (
    <div>
      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 border-b border-border/50">
        Open Issues ({items.length})
      </div>
      <ul>
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 px-4 py-2 border-b border-border/30 last:border-0"
          >
            <span className="text-xs font-medium text-muted-foreground shrink-0 mt-0.5">
              {item.repoName}
            </span>
            <p className="text-sm truncate">
              {item.number !== undefined ? `#${item.number}: ` : ''}
              {item.title}
            </p>
          </li>
        ))}
      </ul>
      {truncatedRepos.length > 0 && (
        <p className="px-4 py-1.5 text-xs text-muted-foreground italic border-t border-border/30">
          Showing first {FETCH_LIMIT}
        </p>
      )}
    </div>
  );
}

function DdrGroup({ items }: { items: OpenWorkItem[] }) {
  return (
    <div>
      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 border-b border-border/50">
        Unaccepted DDRs ({items.length})
      </div>
      <ul>
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 px-4 py-2 border-b border-border/30 last:border-0"
          >
            <span className="text-xs font-medium text-muted-foreground shrink-0 mt-0.5">
              {item.repoName}
            </span>
            <p className="text-sm truncate">{item.title}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OpenWorkList({ items }: { items: OpenWorkItem[] }) {
  const halts = items.filter((i) => i.type === 'halt');
  const prs = items.filter((i) => i.type === 'pr');
  const issues = items.filter((i) => i.type === 'issue');
  const ddrs = items.filter((i) => i.type === 'unaccepted-ddr');

  const allEmpty = halts.length === 0 && prs.length === 0 && issues.length === 0 && ddrs.length === 0;

  if (allEmpty) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No open work items found.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/50">
      {/* Fixed group order: HALTs → Open PRs → Open Issues → Unaccepted DDRs */}
      {halts.length > 0 && <HaltGroup items={halts} />}
      {prs.length > 0 && <PrGroup items={prs} />}
      {issues.length > 0 && <IssueGroup items={issues} />}
      {ddrs.length > 0 && <DdrGroup items={ddrs} />}
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

/**
 * OpenWorkPanel
 *
 * Async Server Component — no 'use client'.
 * Discovers all projects then fans out in parallel (Promise.allSettled) to:
 *   - getActiveHaltsByProject (when projectId is present)
 *   - getOpenPrs + getOpenIssues (when githubRemote is present)
 *   - getDdrEntries filtered to kanbanColumn === 'PROPOSED'
 * Maps results to OpenWorkItem[] and delegates rendering to OpenWorkList.
 */
export async function OpenWorkPanel() {
  let data: OpenWorkItem[] | null = null;
  let error: string | null = null;

  try {
    const projects = await discoverProjects();

    const projectResults = await Promise.allSettled(
      projects.map(async (project) => {
        const [halts, prs, issues, ddrEntries] = await Promise.all([
          project.projectId
            ? getActiveHaltsByProject(project.projectId)
            : Promise.resolve([]),
          project.githubRemote
            ? getOpenPrs(project.githubRemote.owner, project.githubRemote.repo, FETCH_LIMIT)
            : Promise.resolve([]),
          project.githubRemote
            ? getOpenIssues(project.githubRemote.owner, project.githubRemote.repo, FETCH_LIMIT)
            : Promise.resolve([]),
          getDdrEntries(project.repoPath),
        ]);

        const proposedDdrs = ddrEntries.filter((d) => d.kanbanColumn === 'PROPOSED');

        return { project, halts, prs, issues, proposedDdrs };
      }),
    );

    const items: OpenWorkItem[] = [];

    for (const result of projectResults) {
      if (result.status !== 'fulfilled') continue;
      const { project, halts, prs, issues, proposedDdrs } = result.value;

      for (const halt of halts) {
        items.push({
          type: 'halt',
          projectId: project.projectId,
          repoName: project.repoName,
          title: halt.title,
          timestamp: halt.timestamp,
          severity: 'red',
        });
      }

      for (const pr of prs) {
        items.push({
          type: 'pr',
          projectId: project.projectId,
          repoName: project.repoName,
          title: pr.title,
          url: pr.url,
          number: pr.number,
          severity: 'normal',
        });
      }

      for (const issue of issues) {
        items.push({
          type: 'issue',
          projectId: project.projectId,
          repoName: project.repoName,
          title: issue.title,
          url: issue.url,
          number: issue.number,
          severity: 'normal',
        });
      }

      for (const ddr of proposedDdrs) {
        items.push({
          type: 'unaccepted-ddr',
          projectId: project.projectId,
          repoName: project.repoName,
          title: `DDR-${ddr.number}: ${ddr.title}`,
          severity: 'normal',
        });
      }
    }

    data = items;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const response: ApiResponse<OpenWorkItem[]> = {
    data,
    error,
    stale: false,
    cachedAt: data !== null ? Date.now() : null,
  };

  return (
    <PanelShell title="Open Work" response={response}>
      {response.data && <OpenWorkList items={response.data} />}
    </PanelShell>
  );
}
