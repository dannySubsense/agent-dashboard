/**
 * Acceptance criteria covered (US-09 — Graceful Per-Panel Degradation):
 * - Renders PanelUnavailable when response.data === null
 * - Renders children when response.data is truthy
 * - Renders stale notice when response.stale === true AND data is present
 * - Does NOT render stale notice when response.stale === false
 * - Title is rendered in all states
 */

import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PanelShell } from './PanelShell';
import type { ApiResponse } from '@/types';

const unavailableResponse: ApiResponse<Record<string, string>> = {
  data: null,
  error: 'test error',
  stale: false,
  cachedAt: null,
};

const successResponse: ApiResponse<Record<string, string>> = {
  data: { value: 'present' },
  error: null,
  stale: false,
  cachedAt: null,
};

const staleResponse: ApiResponse<Record<string, string>> = {
  data: { value: 'present' },
  error: null,
  stale: true,
  cachedAt: Date.now(),
};

describe('PanelShell', () => {
  it('renders PanelUnavailable when response.data is null', () => {
    render(
      <PanelShell title="Test Panel" response={unavailableResponse}>
        <div>children content</div>
      </PanelShell>
    );

    expect(screen.getByText('Data unavailable')).toBeInTheDocument();
    expect(screen.queryByText('children content')).not.toBeInTheDocument();
  });

  it('renders children when response.data is truthy', () => {
    render(
      <PanelShell title="Test Panel" response={successResponse}>
        <div>children content</div>
      </PanelShell>
    );

    expect(screen.getByText('children content')).toBeInTheDocument();
    expect(screen.queryByText('Data unavailable')).not.toBeInTheDocument();
  });

  it('renders stale notice when stale is true and data is present', () => {
    render(
      <PanelShell title="Test Panel" response={staleResponse}>
        <div>children content</div>
      </PanelShell>
    );

    expect(
      screen.getByText(/Showing cached data — data source currently unreachable/i)
    ).toBeInTheDocument();
  });

  it('does not render stale notice when stale is false', () => {
    render(
      <PanelShell title="Test Panel" response={successResponse}>
        <div>children content</div>
      </PanelShell>
    );

    expect(
      screen.queryByText(/Showing cached data/i)
    ).not.toBeInTheDocument();
  });

  it('renders the title in the unavailable state', () => {
    render(
      <PanelShell title="My Panel Title" response={unavailableResponse}>
        <div>children content</div>
      </PanelShell>
    );

    expect(screen.getByText('My Panel Title')).toBeInTheDocument();
  });

  it('renders the title in the success state', () => {
    render(
      <PanelShell title="My Panel Title" response={successResponse}>
        <div>children content</div>
      </PanelShell>
    );

    expect(screen.getByText('My Panel Title')).toBeInTheDocument();
  });
});
