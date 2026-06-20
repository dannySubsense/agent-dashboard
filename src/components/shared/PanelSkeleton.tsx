import { Skeleton } from '@/components/ui/skeleton';

export function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      {/* Title bar placeholder */}
      <Skeleton className="h-5 w-40" />
      {/* Content block placeholders */}
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
