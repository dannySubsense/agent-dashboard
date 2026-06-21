import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ProjectCardData } from '@/types';

interface PendingSetupCardProps {
  project: ProjectCardData;
}

export function PendingSetupCard({ project }: PendingSetupCardProps) {
  return (
    <Card className="flex flex-col bg-muted">
      <CardHeader className="px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground font-medium truncate">
            {project.repoName}
          </span>
          <Badge variant="outline" className="shrink-0 text-xs">
            Needs setup
          </Badge>
        </div>
      </CardHeader>
    </Card>
  );
}
