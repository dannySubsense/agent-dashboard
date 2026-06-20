/**
 * src/lib/ddr-index.ts
 *
 * Parses 00-DDR-INDEX.md pipe-delimited Markdown tables into DdrEntry arrays.
 * Does NOT throw — returns [] on any parse failure.
 */

import fs from 'fs/promises';
import path from 'path';
import type { DdrEntry, KanbanColumn } from '@/types';

/**
 * Normalizes a raw status string from the DDR index to a KanbanColumn.
 *
 * PROPOSED | BACKLOG | DRAFT → 'PROPOSED'
 * ACCEPTED                   → 'ACCEPTED'
 * IN SPRINT                  → 'IN SPRINT'
 * SHIPPED                    → 'SHIPPED'
 * anything else              → 'UNKNOWN'
 */
export function normalizeDdrStatus(rawStatus: string): KanbanColumn {
  const s = rawStatus.trim().toUpperCase();
  if (s === 'PROPOSED' || s === 'BACKLOG' || s === 'DRAFT') return 'PROPOSED';
  if (s === 'ACCEPTED') return 'ACCEPTED';
  if (s === 'IN SPRINT') return 'IN SPRINT';
  if (s === 'SHIPPED') return 'SHIPPED';
  return 'UNKNOWN';
}

/**
 * Parses a 00-DDR-INDEX.md pipe-delimited Markdown table into DdrEntry[].
 *
 * Table format expected:
 *   | # | Title | Status | Sprint | ... |
 *   |---|---|---|---|...|
 *   | 001 | Some DDR | ACCEPTED | sprint-slug | ... |
 *
 * Column index (after split on '|', trim, filter empty):
 *   0 → number
 *   1 → title
 *   2 → rawStatus
 *   3 → sprint
 *
 * Skips:
 *   - Separator rows (original line starts with |---)
 *   - Header row (filtered[2] === 'Status')
 *   - Rows with fewer than 4 non-empty fields (logged)
 *
 * Does not throw.
 */
export function parseDdrIndex(
  content: string,
  repoName: string,
  projectId: string | null
): DdrEntry[] {
  if (!content.trim()) return [];

  const entries: DdrEntry[] = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    // Skip separator rows
    if (trimmed.startsWith('|---') || trimmed.startsWith('| ---')) continue;

    // Only process pipe-delimited rows
    if (!trimmed.startsWith('|')) continue;

    const fields = trimmed
      .split('|')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    // Skip header row
    if (fields.length >= 3 && fields[2] === 'Status') continue;

    // Skip rows with insufficient fields
    if (fields.length < 4) {
      console.warn(
        `[ddr-index] Skipping row with ${fields.length} fields in ${repoName}: "${trimmed}"`
      );
      continue;
    }

    const rawStatus = fields[2];
    const sprint = fields[3] || 'tbd';

    entries.push({
      number: fields[0],
      title: fields[1],
      rawStatus,
      kanbanColumn: normalizeDdrStatus(rawStatus),
      sprint: sprint === '—' || sprint === '--' ? 'tbd' : sprint,
      repoName,
      projectId,
    });
  }

  return entries;
}

/**
 * Reads <repoPath>/docs/specs/<repoName>-ddrs/00-DDR-INDEX.md and parses it.
 * Returns [] if the file does not exist or is unreadable.
 * Does not throw.
 */
export async function getDdrEntries(repoPath: string): Promise<DdrEntry[]> {
  const repoName = path.basename(repoPath);
  const indexPath = path.join(
    repoPath,
    'docs',
    'specs',
    `${repoName}-ddrs`,
    '00-DDR-INDEX.md'
  );

  try {
    const content = await fs.readFile(indexPath, 'utf-8');
    return parseDdrIndex(content, repoName, null);
  } catch {
    return [];
  }
}
