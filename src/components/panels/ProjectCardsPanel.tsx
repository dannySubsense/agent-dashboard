import { getProjectsData } from '@/lib/projects';
import { PanelShell } from '@/components/shared/PanelShell';
import { ProjectCard } from '@/components/cards/ProjectCard';
import type { ApiResponse, ProjectCardData } from '@/types';

/**
 * Async Server Component — no 'use client'.
 * Calls getProjectsData() directly (no fetch('/api/...')).
 * Wraps result in ApiResponse and delegates error/unavailable display to PanelShell.
 */
export async function ProjectCardsPanel() {
  let data: ProjectCardData[] | null = null;
  let error: string | null = null;

  try {
    data = await getProjectsData();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const response: ApiResponse<ProjectCardData[]> = {
    data,
    error,
    stale: false,
    cachedAt: data !== null ? Date.now() : null,
  };

  return (
    <PanelShell title="Project Cards" response={response}>
      {response.data && (
        response.data.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            No projects discovered. Check{' '}
            <code className="font-mono">PROJECTS_ROOT</code> configuration.
          </div>
        ) : (
          <div className="p-4 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {response.data.map((project) => (
              <ProjectCard key={project.repoPath} project={project} />
            ))}
          </div>
        )
      )}
    </PanelShell>
  );
}
