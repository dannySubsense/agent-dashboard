/**
 * src/lib/progress.ts
 *
 * Parses PROGRESS.md files to extract sprint info.
 * Does NOT throw — returns null on any parse failure.
 */

import fs from 'fs/promises';
import path from 'path';
import type { SprintInfo, SprintStatus } from '@/types';

/**
 * Parses the content of a PROGRESS.md file into a SprintInfo.
 *
 * Sprint slug: capture group 1 from /^#\s+PROGRESS\.md\s+[-—]\s+(.+)$/m
 * Sprint status: capture group 1 from /^\*{0,2}Status:\*{0,2}\s+(.+)$/m
 *   (handles both plain "Status: DONE" and bold "**Status:** DONE" variants)
 *
 * Returns null if either field is absent.
 */
export function parseProgressMd(content: string): SprintInfo | null {
  if (!content) return null;

  const slugMatch = content.match(/^#\s+PROGRESS\.md\s+[-—]\s+(.+)$/m);
  if (!slugMatch) return null;
  const slug = slugMatch[1].trim();
  if (!slug) return null;

  const statusMatch = content.match(/^\*{0,2}Status:\*{0,2}\s+(.+)$/m);
  if (!statusMatch) return null;
  const status = statusMatch[1].trim() as SprintStatus;
  if (!status) return null;

  return { slug, status };
}

/**
 * Scans <repoPath>/docs/specs/ for PROGRESS.md files, parses each,
 * and returns the most relevant sprint:
 *   - If any non-COMPLETE sprint exists: returns the most recently modified one
 *   - Else: returns the most recently modified COMPLETE sprint
 *   - Returns null if no PROGRESS.md files found or directory is unreadable
 */
export async function getLatestSprint(
  repoPath: string
): Promise<SprintInfo | null> {
  const specsDir = path.join(repoPath, 'docs', 'specs');

  let entries: string[];
  try {
    const dirents = await fs.readdir(specsDir, { withFileTypes: true });
    entries = dirents
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return null;
  }

  type Candidate = { info: SprintInfo; mtime: number };
  const candidates: Candidate[] = [];

  for (const entry of entries) {
    const progressPath = path.join(specsDir, entry, 'PROGRESS.md');
    try {
      const [content, stat] = await Promise.all([
        fs.readFile(progressPath, 'utf-8'),
        fs.stat(progressPath),
      ]);
      const info = parseProgressMd(content);
      if (info) {
        candidates.push({ info, mtime: stat.mtimeMs });
      }
    } catch {
      // PROGRESS.md missing or unreadable in this subdir — skip
    }
  }

  if (candidates.length === 0) return null;

  const nonComplete = candidates.filter((c) => c.info.status !== 'COMPLETE');
  if (nonComplete.length > 0) {
    // Return most recently modified non-COMPLETE sprint
    nonComplete.sort((a, b) => b.mtime - a.mtime);
    return nonComplete[0].info;
  }

  // All COMPLETE — return most recently modified
  candidates.sort((a, b) => b.mtime - a.mtime);
  return candidates[0].info;
}
