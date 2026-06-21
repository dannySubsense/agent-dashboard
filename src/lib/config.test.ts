/**
 * Acceptance criteria covered (Slice 2 — Config File Helpers):
 * - AC1: readConfigFile returns { projectPaths: [] } when the file does not exist
 * - AC2: readConfigFile returns { projectPaths: [] } when the file contains malformed JSON
 * - AC3: readConfigFile returns { projectPaths: [] } when projectPaths is not an array
 * - AC4: readConfigFile returns { projectPaths: ['/a', '/b'] } when the file contains a valid array
 * - AC5: writeConfigFile creates the config directory if absent and writes valid JSON
 * - AC6: round-trip writeConfigFile → readConfigFile returns the same projectPaths array
 *
 * Isolation: vi.doMock('os') + vi.resetModules() + dynamic import ensures the module-level
 * CONFIG_DIR and CONFIG_FILE constants resolve to a temp directory, not ~/.config/agent-dashboard.
 */

import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import os from 'os';
import path from 'path';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'fs/promises';
import type { ProjectsConfig } from '@/types';

let tmpHome: string;
let configDir: string;
let configFile: string;
let readConfigFile: () => Promise<ProjectsConfig>;
let writeConfigFile: (config: ProjectsConfig) => Promise<void>;

beforeAll(async () => {
  tmpHome = await mkdtemp(path.join(os.tmpdir(), 'agent-dashboard-config-test-'));
  configDir = path.join(tmpHome, '.config', 'agent-dashboard');
  configFile = path.join(configDir, 'projects.json');

  vi.resetModules();
  vi.doMock('os', () => ({
    default: { homedir: () => tmpHome },
  }));

  const mod = await import('./config');
  readConfigFile = mod.readConfigFile;
  writeConfigFile = mod.writeConfigFile;
});

afterEach(async () => {
  // Remove the config dir so each test starts with a clean slate
  await rm(configDir, { recursive: true, force: true });
});

afterAll(async () => {
  vi.doUnmock('os');
  await rm(tmpHome, { recursive: true, force: true });
});

describe('readConfigFile', () => {
  it('returns { projectPaths: [] } when the file does not exist', async () => {
    const result = await readConfigFile();
    expect(result).toEqual({ projectPaths: [] });
  });

  it('returns { projectPaths: [] } when the file contains malformed JSON', async () => {
    await mkdir(configDir, { recursive: true });
    await writeFile(configFile, '{ not valid json }', 'utf-8');

    const result = await readConfigFile();
    expect(result).toEqual({ projectPaths: [] });
  });

  it('returns { projectPaths: [] } when projectPaths is not an array', async () => {
    await mkdir(configDir, { recursive: true });
    await writeFile(configFile, JSON.stringify({ projectPaths: 'string' }), 'utf-8');

    const result = await readConfigFile();
    expect(result).toEqual({ projectPaths: [] });
  });

  it("returns { projectPaths: ['/a', '/b'] } when the file contains a valid array", async () => {
    await mkdir(configDir, { recursive: true });
    await writeFile(configFile, JSON.stringify({ projectPaths: ['/a', '/b'] }), 'utf-8');

    const result = await readConfigFile();
    expect(result).toEqual({ projectPaths: ['/a', '/b'] });
  });
});

describe('writeConfigFile', () => {
  it('creates the config directory if absent and writes valid JSON', async () => {
    // configDir does not exist — afterEach removed it, and no test above created it
    await writeConfigFile({ projectPaths: ['/a'] });

    const raw = await readFile(configFile, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual({ projectPaths: ['/a'] });
  });

  it('round-trip: writeConfigFile then readConfigFile returns the same projectPaths array', async () => {
    await writeConfigFile({ projectPaths: ['/a', '/b'] });

    const result = await readConfigFile();
    expect(result.projectPaths).toEqual(['/a', '/b']);
  });
});
