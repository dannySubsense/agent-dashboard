/**
 * Acceptance criteria covered (US-05 — PendingSetupCard, Slice 5):
 * - AC1: Renders repoName text content
 * - AC2: Renders a "Needs setup" badge
 * - AC3: Does NOT render projectId, agentName, lastCommit, lastLoreCapture, currentSprint, openPrCount, or HALT badge
 * - AC4: Root element has class bg-muted
 */

import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PendingSetupCard } from '@/components/cards/PendingSetupCard';
import type { ProjectCardData } from '@/types';

function makeProject(overrides: Partial<ProjectCardData> = {}): ProjectCardData {
  return {
    repoPath: '/repo',
    repoName: 'my-repo',
    projectId: null,
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

describe('PendingSetupCard', () => {
  it('renders the repoName text content', () => {
    render(<PendingSetupCard project={makeProject({ repoName: 'pending-dashboard' })} />);
    expect(screen.getByText('pending-dashboard')).toBeInTheDocument();
  });

  it('renders a "Needs setup" badge', () => {
    render(<PendingSetupCard project={makeProject()} />);
    expect(screen.getByText('Needs setup')).toBeInTheDocument();
  });

  it('does not render projectId, agentName, lastCommit, lastLoreCapture, currentSprint, openPrCount, or HALT badge', () => {
    const project = makeProject({
      projectId: 'specific-project-id',
      agentName: 'specific-agent-name',
      lastCommit: {
        hash: 'abc123',
        date: new Date('2025-01-01'),
        message: 'feat: specific commit message text',
        author: 'Danny',
      },
      lastLoreCapture: {
        id: 'uuid-capture-1',
        timestamp: new Date('2025-01-02'),
        title: 'Specific LORE capture title text',
        documentType: 'decision',
        projectId: 'specific-project-id',
      },
      currentSprint: { slug: 'sprint-alpha-unique', status: 'IN PROGRESS' },
      openPrCount: 99,
      hasActiveHalt: true,
    });

    render(<PendingSetupCard project={project} />);

    expect(screen.queryByText('specific-project-id')).not.toBeInTheDocument();
    expect(screen.queryByText('specific-agent-name')).not.toBeInTheDocument();
    expect(screen.queryByText('feat: specific commit message text')).not.toBeInTheDocument();
    expect(screen.queryByText('Specific LORE capture title text')).not.toBeInTheDocument();
    expect(screen.queryByText('sprint-alpha-unique')).not.toBeInTheDocument();
    expect(screen.queryByText('99')).not.toBeInTheDocument();
    expect(screen.queryByText('HALT')).not.toBeInTheDocument();
  });

  it('root element has class bg-muted', () => {
    const { container } = render(<PendingSetupCard project={makeProject()} />);
    expect(container.firstChild).toHaveClass('bg-muted');
  });
});
