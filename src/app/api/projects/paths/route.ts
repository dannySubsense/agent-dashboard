/**
 * POST /api/projects/paths
 *
 * Validates an absolute path, writes it to the config file if not already
 * discoverable, invalidates the projects cache, and returns fresh ProjectCardData[].
 * Always returns HTTP 200 on success; errors use appropriate 4xx/5xx status codes.
 */

import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { cache } from '@/lib/cache';
import { readConfigFile, writeConfigFile } from '@/lib/config';
import { discoverProjects } from '@/lib/discovery';
import { getProjectsData } from '@/lib/projects';
import type { ApiResponse, ProjectCardData } from '@/types';

const CACHE_KEY = 'projects';

export async function POST(request: Request): Promise<NextResponse<ApiResponse<ProjectCardData[]>>> {
  // Step 1: Parse body; assert path is a string
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: 'Missing or invalid path field', stale: false, cachedAt: null },
      { status: 400 },
    );
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    !('path' in body) ||
    typeof (body as { path: unknown }).path !== 'string'
  ) {
    return NextResponse.json(
      { data: null, error: 'Missing or invalid path field', stale: false, cachedAt: null },
      { status: 400 },
    );
  }
  const rawPath = (body as { path: string }).path;

  // Step 2: Assert absolute path
  if (!rawPath.startsWith('/')) {
    return NextResponse.json(
      { data: null, error: 'Path must be absolute', stale: false, cachedAt: null },
      { status: 400 },
    );
  }

  // Step 3: Resolve
  const resolved = path.resolve(rawPath);

  // Step 4a: Outer path must exist
  try {
    await fs.stat(resolved);
  } catch {
    return NextResponse.json(
      { data: null, error: 'Path does not exist or is not readable', stale: false, cachedAt: null },
      { status: 400 },
    );
  }

  // Step 4b: .git must exist
  try {
    await fs.stat(path.join(resolved, '.git'));
  } catch {
    return NextResponse.json(
      { data: null, error: 'Path exists but has no .git directory', stale: false, cachedAt: null },
      { status: 400 },
    );
  }

  // Step 5: Collect all currently-known paths
  const discovered = await discoverProjects();
  const knownPaths = new Set(discovered.map((p) => path.resolve(p.repoPath)));

  // Step 6: Write to config if not already discoverable
  if (!knownPaths.has(resolved)) {
    const config = await readConfigFile();
    const existing = new Set(config.projectPaths.map((p) => path.resolve(p)));
    if (!existing.has(resolved)) {
      try {
        await writeConfigFile({ projectPaths: [...config.projectPaths, resolved] });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json(
          { data: null, error: `Config file write failed: ${message}`, stale: false, cachedAt: null },
          { status: 500 },
        );
      }
    }
  }

  // Step 7: Invalidate cache (always)
  cache.delete(CACHE_KEY);

  // Step 8: Fetch fresh data
  const data = await getProjectsData();

  // Step 9: Return 200
  return NextResponse.json({ data, error: null, stale: false, cachedAt: Date.now() });
}
