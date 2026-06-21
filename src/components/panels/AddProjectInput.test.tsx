/**
 * Acceptance criteria covered (project-discovery-v1 — AddProjectInput, Slice 6):
 * - AC1:  Renders input with placeholder="/absolute/path/to/repo" and aria-label="Add project path"
 * - AC2:  Button is disabled when input is empty
 * - AC3:  Button is enabled when input has a non-empty value
 * - AC4:  On submit, button shows "Adding..." and both controls are disabled during in-flight request
 * - AC5:  On successful POST: input cleared; router.refresh() called; no error shown
 * - AC6:  On failed POST: input retained; error shown with role="alert" and server's error string
 * - AC7:  On next submit after error: error clears immediately (setError(null) at submit start)
 * - AC8:  Enter key while input is non-empty triggers submission
 * - AC9:  Enter key while input is empty is a no-op
 * - AC10: On fetch network rejection: inline error 'An unexpected error occurred'; button re-enables
 * - AC11: Cache invariant — getProjectsData in src/lib/projects.ts does not call cache.get;
 *         ProjectCardsPanel.tsx does not call cache.get (static source check)
 *
 * Note: @testing-library/user-event is not installed in this project.
 * fireEvent from @testing-library/react is used in its place; interaction semantics
 * are equivalent for the state transitions tested here.
 */

import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { readFile } from 'fs/promises';
import path from 'path';
import { AddProjectInput } from '@/components/panels/AddProjectInput';

// vi.hoisted ensures mockRefresh is available inside the vi.mock factory,
// which is hoisted above all other declarations by vitest.
const mockRefresh = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

global.fetch = vi.fn();

beforeEach(() => {
  mockRefresh.mockReset();
  vi.mocked(fetch).mockReset();
});

describe('AddProjectInput', () => {
  it('AC1: renders input with placeholder "/absolute/path/to/repo" and aria-label "Add project path"', () => {
    render(<AddProjectInput />);
    const input = screen.getByRole('textbox', { name: 'Add project path' });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', '/absolute/path/to/repo');
  });

  it('AC2: button is disabled when the input is empty', () => {
    render(<AddProjectInput />);
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });

  it('AC3: button is enabled when the input has a non-empty value', () => {
    render(<AddProjectInput />);
    const input = screen.getByRole('textbox', { name: 'Add project path' });
    fireEvent.change(input, { target: { value: '/some/path' } });
    expect(screen.getByRole('button', { name: 'Add' })).not.toBeDisabled();
  });

  it('AC4: shows "Adding..." and disables both input and button during in-flight request', async () => {
    // Fetch never resolves — simulates a pending request for the entire assertion window
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));

    render(<AddProjectInput />);
    const input = screen.getByRole('textbox', { name: 'Add project path' });

    fireEvent.change(input, { target: { value: '/some/path' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    // React batches setIsSubmitting(true) before the await; waitFor polls for the re-render
    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent('Adding...');
    });
    expect(screen.getByRole('button')).toBeDisabled();
    expect(input).toBeDisabled();
  });

  it('AC5: on successful POST, clears input value, calls router.refresh(), and shows no error', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [], error: null }),
    } as Response);

    render(<AddProjectInput />);
    const input = screen.getByRole('textbox', { name: 'Add project path' });

    fireEvent.change(input, { target: { value: '/valid/repo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(input).toHaveValue('');
    });
    expect(mockRefresh).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('AC6: on failed POST, retains input value and shows the server error string with role="alert"', async () => {
    const serverError = 'Path exists but has no .git directory';
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: serverError }),
    } as Response);

    render(<AddProjectInput />);
    const input = screen.getByRole('textbox', { name: 'Add project path' });

    fireEvent.change(input, { target: { value: '/bad/path' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByRole('alert')).toHaveTextContent(serverError);
    expect(input).toHaveValue('/bad/path');
  });

  it('AC7: error message clears immediately at the start of the next submission', async () => {
    // Step 1: drive the component into an error state
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'some prior error' }),
    } as Response);

    render(<AddProjectInput />);
    const input = screen.getByRole('textbox', { name: 'Add project path' });

    fireEvent.change(input, { target: { value: '/bad/path' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Step 2: next submit uses a hanging fetch — error must clear before fetch resolves
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));

    // After a failed POST the button re-enables (isSubmitting = false) and shows "Add"
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('AC8: Enter key while input is non-empty triggers submission', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [], error: null }),
    } as Response);

    render(<AddProjectInput />);
    const input = screen.getByRole('textbox', { name: 'Add project path' });

    fireEvent.change(input, { target: { value: '/some/path' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledOnce();
    });
  });

  it('AC9: Enter key while input is empty is a no-op (fetch is never called)', () => {
    render(<AddProjectInput />);
    const input = screen.getByRole('textbox', { name: 'Add project path' });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('AC10: on fetch network rejection, shows "An unexpected error occurred" and re-enables the button', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network error'));

    render(<AddProjectInput />);
    const input = screen.getByRole('textbox', { name: 'Add project path' });

    fireEvent.change(input, { target: { value: '/some/path' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('An unexpected error occurred');
    });
    expect(screen.getByRole('button', { name: 'Add' })).not.toBeDisabled();
  });

  it('AC11: cache invariant — getProjectsData and ProjectCardsPanel do not call cache.get', async () => {
    const root = process.cwd();
    const projectsSrc = await readFile(path.join(root, 'src/lib/projects.ts'), 'utf-8');
    const panelSrc = await readFile(
      path.join(root, 'src/components/panels/ProjectCardsPanel.tsx'),
      'utf-8',
    );
    expect(projectsSrc).not.toMatch(/cache\.get\s*\(/);
    expect(panelSrc).not.toMatch(/cache\.get\s*\(/);
  });
});
