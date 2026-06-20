import { Suspense } from 'react';
import { DashboardGrid } from '@/components/layout/DashboardGrid';
import { PanelSkeleton } from '@/components/shared/PanelSkeleton';

// Slice 1 stub — placeholder divs at correct grid positions.
// Real panel components are wired in Slices 7, 8, 9, 10.

export default function DashboardPage() {
  return (
    <DashboardGrid>
      {/* Row 1: ProjectCards cols 1–8 */}
      <div className="col-span-8">
        <Suspense fallback={<PanelSkeleton />}>
          <div className="rounded-lg border border-border bg-card p-4 h-48 flex items-center justify-center text-muted-foreground text-sm">
            Project Cards Placeholder
          </div>
        </Suspense>
      </div>

      {/* Row 1: AgentStatus cols 9–12 */}
      <div className="col-span-4">
        <Suspense fallback={<PanelSkeleton />}>
          <div className="rounded-lg border border-border bg-card p-4 h-48 flex items-center justify-center text-muted-foreground text-sm">
            Agent Status Placeholder
          </div>
        </Suspense>
      </div>

      {/* Row 2: DdrPipeline cols 1–12 */}
      <div className="col-span-12">
        <Suspense fallback={<PanelSkeleton />}>
          <div className="rounded-lg border border-border bg-card p-4 h-48 flex items-center justify-center text-muted-foreground text-sm">
            DDR Pipeline Placeholder
          </div>
        </Suspense>
      </div>

      {/* Row 3: SessionClose cols 1–6 */}
      <div className="col-span-6">
        <Suspense fallback={<PanelSkeleton />}>
          <div className="rounded-lg border border-border bg-card p-4 h-48 flex items-center justify-center text-muted-foreground text-sm">
            Session Close Placeholder
          </div>
        </Suspense>
      </div>

      {/* Row 3: OpenWork cols 7–12 */}
      <div className="col-span-6">
        <Suspense fallback={<PanelSkeleton />}>
          <div className="rounded-lg border border-border bg-card p-4 h-48 flex items-center justify-center text-muted-foreground text-sm">
            Open Work Placeholder
          </div>
        </Suspense>
      </div>

      {/* Row 4: ActivityFeed cols 1–12 */}
      <div className="col-span-12">
        <Suspense fallback={<PanelSkeleton />}>
          <div className="rounded-lg border border-border bg-card p-4 h-48 flex items-center justify-center text-muted-foreground text-sm">
            Activity Feed Placeholder
          </div>
        </Suspense>
      </div>
    </DashboardGrid>
  );
}
