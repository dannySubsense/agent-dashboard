/**
 * Acceptance criteria covered (US-05 — ProjectCardsPanel partition, Slice 5):
 * - AC5: Mixed active/pending data: active cards in top grid, pending in Pending Setup section
 * - AC6: Zero pending projects: "Pending Setup" heading is absent from the DOM
 * - AC7: Zero active, N pending: no empty-state message; pending section IS rendered
 * - AC8: Zero active and zero pending: empty-state message is rendered
 * - AC9: Pending cards sorted repoName ASC; active cards preserve order from getProjectsData()
 *
 * Isolation strategy:
 * - @/lib/projects — vi.fn() factory mock; getProjectsData controls all data paths
 * - ProjectCardsPanel is async; called directly then rendered: render(await ProjectCardsPanel())
 */

import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getProjectsData } from '@/lib/projects';
import { ProjectCardsPanel } from '@/components/panels/ProjectCardsPanel';
import type { ProjectCardData } from '@/types';

vi.mock('@/lib/projects', () => ({ getProjectsData: vi.fn() }));

function makeProject(overrides: Partial<ProjectCardData> = {}): ProjectCardData {
  return {
    repoPath: '/repo',
    repoName: 'my-repo',
    projectId: 'my-project',
    agentName: null,
    lastCommit: null,
    lastLoreCapture: null,
    currentSprint: null,
    openPrCount: 0,
    hasActiveHalt: false,
    lastTouchedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('ProjectCardsPanel partition', () => {
  it('AC5: renders active cards in the top grid and pending cards in the Pending Setup section', async () => {
    vi.mocked(getProjectsData).mockResolvedValue([
      makeProject({ repoPath: '/repos/active', repoName: 'active-repo', projectId: 'active-id' }),
      makeProject({ repoPath: '/repos/pending', repoName: 'pending-repo', projectId: null }),
    ]);

    render(await ProjectCardsPanel());

    const pendingHeading = screen.getByText('Pending Setup');
    const activeRepoEl = screen.getByText('active-repo');
    const pendingRepoEl = screen.getByText('pending-repo');

    // active-repo element precedes the "Pending Setup" heading
    expect(
      activeRepoEl.compareDocumentPosition(pendingHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    // pending-repo element follows the "Pending Setup" heading
    expect(
      pendingHeading.compareDocumentPosition(pendingRepoEl) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('AC6: does not render the Pending Setup heading when there are zero pending projects', async () => {
    vi.mocked(getProjectsData).mockResolvedValue([
      makeProject({ repoPath: '/repos/active', repoName: 'active-repo', projectId: 'active-id' }),
    ]);

    render(await ProjectCardsPanel());

    expect(screen.queryByText('Pending Setup')).not.toBeInTheDocument();
  });

  it('AC7: renders the pending section and no empty-state message when there are zero active projects', async () => {
    vi.mocked(getProjectsData).mockResolvedValue([
      makeProject({ repoPath: '/repos/p1', repoName: 'only-pending', projectId: null }),
    ]);

    render(await ProjectCardsPanel());

    expect(screen.getByText('Pending Setup')).toBeInTheDocument();
    expect(screen.getByText('only-pending')).toBeInTheDocument();
    expect(screen.queryByText(/No projects discovered/)).not.toBeInTheDocument();
  });

  it('AC8: renders the empty-state message when there are zero active and zero pending projects', async () => {
    vi.mocked(getProjectsData).mockResolvedValue([]);

    render(await ProjectCardsPanel());

    expect(screen.getByText(/No projects discovered/)).toBeInTheDocument();
    expect(screen.queryByText('Pending Setup')).not.toBeInTheDocument();
  });

  it('AC9: pending cards are sorted repoName ASC; active cards preserve the order from getProjectsData()', async () => {
    // Active cards delivered in a specific order — panel must preserve it
    // Pending cards delivered in reverse-alpha order — panel must sort them ASC
    vi.mocked(getProjectsData).mockResolvedValue([
      makeProject({ repoPath: '/repos/a1', repoName: 'zebra-active', projectId: 'id-z' }),
      makeProject({ repoPath: '/repos/a2', repoName: 'alpha-active', projectId: 'id-a' }),
      makeProject({ repoPath: '/repos/p1', repoName: 'zzz-pending', projectId: null }),
      makeProject({ repoPath: '/repos/p2', repoName: 'aaa-pending', projectId: null }),
    ]);

    render(await ProjectCardsPanel());

    const zebraEl = screen.getByText('zebra-active');
    const alphaEl = screen.getByText('alpha-active');
    const aaaEl = screen.getByText('aaa-pending');
    const zzzEl = screen.getByText('zzz-pending');

    // Active: zebra-active comes before alpha-active (order preserved from getProjectsData)
    expect(
      zebraEl.compareDocumentPosition(alphaEl) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    // Pending: aaa-pending comes before zzz-pending (sorted ASC)
    expect(
      aaaEl.compareDocumentPosition(zzzEl) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
