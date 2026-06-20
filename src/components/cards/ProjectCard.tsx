import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
import type { ProjectCardData, SprintStatus } from '@/types';

interface ProjectCardProps {
  project: ProjectCardData;
}

function sprintStatusVariant(
  status: SprintStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'IN PROGRESS':
      return 'default';
    case 'COMPLETE':
      return 'secondary';
    case 'BLOCKED':
    case 'HALTED':
      return 'destructive';
    case 'TODO':
    default:
      return 'outline';
  }
}

export function ProjectCard({ project }: ProjectCardProps) {
  const {
    repoName,
    projectId,
    agentName,
    lastCommit,
    lastLoreCapture,
    currentSprint,
    openPrCount,
    hasActiveHalt,
  } = project;

  const bothNull = projectId === null && agentName === null;

  return (
    <Card className="flex flex-col">
      {/* CardHeader: repo name + optional HALT badge */}
      <CardHeader className="px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-sm truncate">{repoName}</span>
          {hasActiveHalt && (
            <Badge variant="destructive" className="shrink-0 text-xs">
              HALT
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-3 pt-0 flex flex-col">
        {/* ProjectMeta: projectId + agentName */}
        <div className="py-2 border-t border-border">
          {bothNull ? (
            <p className="text-xs text-muted-foreground italic">no agent configured</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {projectId !== null && (
                <p className="text-xs text-muted-foreground truncate">{projectId}</p>
              )}
              {agentName !== null && (
                <p className="text-xs text-muted-foreground truncate">
                  Agent: {agentName}
                </p>
              )}
            </div>
          )}
        </div>

        {/* CommitInfo: last commit message + relative date */}
        <div className="py-2 border-t border-border">
          {lastCommit === null ? (
            <p className="text-xs text-muted-foreground">No commits</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              <p className="text-xs truncate">{lastCommit.message}</p>
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(lastCommit.date)}
              </p>
            </div>
          )}
        </div>

        {/* LoreSummary: last LORE capture title + relative date */}
        <div className="py-2 border-t border-border">
          {lastLoreCapture === null ? (
            <p className="text-xs text-muted-foreground">No captures</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              <p className="text-xs truncate">{lastLoreCapture.title}</p>
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(lastLoreCapture.timestamp)}
              </p>
            </div>
          )}
        </div>

        {/* SprintBadge: sprint slug + status — entire section omitted when currentSprint is null */}
        {currentSprint !== null && (
          <div className="py-2 border-t border-border flex items-center gap-2 min-w-0">
            <span className="text-xs text-muted-foreground truncate min-w-0">
              {currentSprint.slug}
            </span>
            <Badge
              variant={sprintStatusVariant(currentSprint.status)}
              className="shrink-0 text-xs"
            >
              {currentSprint.status}
            </Badge>
          </div>
        )}

        {/* PrCountBadge: always shown; 0 is valid */}
        <div className="py-2 border-t border-border flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">PRs:</span>
          <Badge variant="secondary" className="text-xs">
            {openPrCount}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
