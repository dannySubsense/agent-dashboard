import { Suspense } from 'react';
import { DashboardGrid } from '@/components/layout/DashboardGrid';
import { PanelSkeleton } from '@/components/shared/PanelSkeleton';
import { ProjectCardsPanel } from '@/components/panels/ProjectCardsPanel';
import { AgentStatusPanel } from '@/components/panels/AgentStatusPanel';
import { DdrPipelinePanel } from '@/components/panels/DdrPipelinePanel';
import { SessionClosePanel } from '@/components/panels/SessionClosePanel';
import { OpenWorkPanel } from '@/components/panels/OpenWorkPanel';
import { ActivityFeedLoader } from '@/components/panels/ActivityFeedLoader';

// Slice 1 stub — placeholder divs at correct grid positions.
// Real panel components are wired in Slices 7, 8, 9, 10.

export default function DashboardPage() {
  return (
    <DashboardGrid>
      {/* Row 1: ProjectCards cols 1–8 */}
      <div className="col-span-8">
        <Suspense fallback={<PanelSkeleton />}>
          <ProjectCardsPanel />
        </Suspense>
      </div>

      {/* Row 1: AgentStatus cols 9–12 */}
      <div className="col-span-4">
        <Suspense fallback={<PanelSkeleton />}>
          <AgentStatusPanel />
        </Suspense>
      </div>

      {/* Row 2: DdrPipeline cols 1–12 */}
      <div className="col-span-12">
        <Suspense fallback={<PanelSkeleton />}>
          <DdrPipelinePanel />
        </Suspense>
      </div>

      {/* Row 3: SessionClose cols 1–6 */}
      <div className="col-span-6">
        <Suspense fallback={<PanelSkeleton />}>
          <SessionClosePanel />
        </Suspense>
      </div>

      {/* Row 3: OpenWork cols 7–12 */}
      <div className="col-span-6">
        <Suspense fallback={<PanelSkeleton />}>
          <OpenWorkPanel />
        </Suspense>
      </div>

      {/* Row 4: ActivityFeed cols 1–12 */}
      <div className="col-span-12">
        <Suspense fallback={<PanelSkeleton />}>
          <ActivityFeedLoader />
        </Suspense>
      </div>
    </DashboardGrid>
  );
}
