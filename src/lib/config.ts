import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { ProjectsConfig } from '@/types';

const CONFIG_DIR  = path.join(os.homedir(), '.config', 'agent-dashboard');
const CONFIG_FILE = path.join(CONFIG_DIR, 'projects.json');

export async function readConfigFile(): Promise<ProjectsConfig> {
  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'projectPaths' in parsed &&
      Array.isArray((parsed as { projectPaths: unknown }).projectPaths)
    ) {
      return parsed as ProjectsConfig;
    }
    return { projectPaths: [] };
  } catch {
    return { projectPaths: [] };
  }
}

export async function writeConfigFile(config: ProjectsConfig): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}
