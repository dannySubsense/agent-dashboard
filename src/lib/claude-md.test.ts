/**
 * Acceptance criteria covered (Slice 2 — parseCLAUDEMd):
 * - Extracts projectId from "- Project ID: `agent-dashboard`" list item pattern
 * - Extracts projectId from "MCP_DEFAULT_PROJECT_ID=agent-dashboard" env var pattern
 * - Extracts agentName from "You are **Lumen**" pattern
 * - Returns null for both fields when content has no matching patterns
 * - Does not throw on empty string input
 * - Extracts both fields from the real CLAUDE.md at the project root
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parseCLAUDEMd } from './claude-md';

describe('parseCLAUDEMd', () => {
  it('extracts projectId from list item pattern "- Project ID: `agent-dashboard`"', () => {
    const content = `## Database\n\n- Project ID: \`agent-dashboard\`\n`;
    const result = parseCLAUDEMd(content);
    expect(result.projectId).toBe('agent-dashboard');
  });

  it('extracts projectId from MCP_DEFAULT_PROJECT_ID env var pattern', () => {
    const content = `MCP_DEFAULT_PROJECT_ID=agent-dashboard \\\nOPENAI_API_KEY=sk-test`;
    const result = parseCLAUDEMd(content);
    expect(result.projectId).toBe('agent-dashboard');
  });

  it('extracts agentName from "You are **Lumen**" pattern', () => {
    const content = `You are **Lumen**, a Lorekeeper working in the **agent-dashboard** repo.`;
    const result = parseCLAUDEMd(content);
    expect(result.agentName).toBe('Lumen');
  });

  it('returns null for both fields when content has no matching patterns', () => {
    const content = `# Generic file\n\nNothing relevant here.`;
    const result = parseCLAUDEMd(content);
    expect(result.projectId).toBeNull();
    expect(result.agentName).toBeNull();
  });

  it('does not throw on empty string input and returns null for both fields', () => {
    expect(() => parseCLAUDEMd('')).not.toThrow();
    const result = parseCLAUDEMd('');
    expect(result.projectId).toBeNull();
    expect(result.agentName).toBeNull();
  });

  it('extracts projectId and agentName from the real project CLAUDE.md', () => {
    const content = readFileSync(
      '/home/d-tuned/projects/agent-dashboard/CLAUDE.md',
      'utf-8'
    );
    const result = parseCLAUDEMd(content);
    expect(result.projectId).toBe('agent-dashboard');
    expect(result.agentName).toBe('Lumen');
  });
});
