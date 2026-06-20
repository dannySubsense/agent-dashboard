// src/types/index.ts

// ── Project Discovery ──────────────────────────────────────────────────────

export interface DiscoveredProject {
  repoPath: string;        // absolute path, e.g. /home/d-tuned/projects/agent-dashboard
  repoName: string;        // directory name, e.g. agent-dashboard
  projectId: string | null;
  agentName: string | null;
  githubRemote: { owner: string; repo: string } | null;
  // Resolved during discovery via getGitHubRemote(repoPath).
  // null if remote is absent, non-GitHub, or unreadable.
  // GitHub lib functions are skipped for this repo when null.
}

// ── Git ───────────────────────────────────────────────────────────────────

export interface GitCommit {
  hash: string;
  date: Date;
  message: string;         // first line only (short message)
  author: string;
}

// ── LORE ──────────────────────────────────────────────────────────────────

export interface LoreCaptureSummary {
  id: string;              // UUID
  timestamp: Date;
  title: string;
  documentType: string;
  projectId: string;
}

export interface SessionClose {
  projectId: string;
  repoName: string;
  timestamp: Date;
  title: string;
  content: string;         // full body; UI truncates display to ~300 chars
}

export interface AgentRecord {
  name: string;
  projectId: string;
  relayHandle: string;
  registryStatus: string;  // raw value from LORE registry capture status field
  switchboardStatus: SwitchboardStatus;
}

export type SwitchboardStatus = 'online' | 'offline' | 'unknown';

// ── Project Cards ─────────────────────────────────────────────────────────

export interface SprintInfo {
  slug: string;
  status: SprintStatus;
}

export type SprintStatus =
  | 'TODO'
  | 'IN PROGRESS'
  | 'COMPLETE'
  | 'BLOCKED'
  | 'HALTED';

export interface ProjectCardData {
  repoPath: string;
  repoName: string;
  projectId: string | null;
  agentName: string | null;
  lastCommit: GitCommit | null;
  lastLoreCapture: LoreCaptureSummary | null;
  currentSprint: SprintInfo | null;
  openPrCount: number;             // uncapped count; list rendering in Open Work Tracker caps display at 25
  hasActiveHalt: boolean;
  lastTouchedAt: Date;             // max(lastCommit.date, lastLoreCapture.timestamp)
}

// ── DDR Pipeline ──────────────────────────────────────────────────────────

export type KanbanColumn =
  | 'PROPOSED'
  | 'ACCEPTED'
  | 'IN SPRINT'
  | 'SHIPPED'
  | 'UNKNOWN';

export interface DdrEntry {
  number: string;          // e.g. "002"
  title: string;
  rawStatus: string;       // verbatim from 00-DDR-INDEX.md
  kanbanColumn: KanbanColumn;
  sprint: string;          // sprint slug or "tbd"
  repoName: string;
  projectId: string | null;
}

// ── Activity Feed ─────────────────────────────────────────────────────────

export type ActivityEventType = 'lore-capture' | 'git-commit' | 'pr-merge';

export interface ActivityEvent {
  id: string;              // deterministic: `${type}:${repoName}:${hash|uuid}`
  timestamp: Date;
  type: ActivityEventType;
  projectId: string | null;
  repoName: string;
  summary: string;         // one-line display string
}

// ── Open Work ─────────────────────────────────────────────────────────────

export type OpenWorkType = 'halt' | 'pr' | 'issue' | 'unaccepted-ddr';

export interface OpenWorkItem {
  type: OpenWorkType;
  projectId: string | null;
  repoName: string;
  title: string;
  timestamp?: Date;
  url?: string;
  number?: number;         // PR or issue number
  severity: 'red' | 'normal';
}

// ── GitHub ────────────────────────────────────────────────────────────────

export interface GitHubPr {
  number: number;
  title: string;
  url: string;
  mergedAt?: Date;
}

export interface GitHubIssue {
  number: number;
  title: string;
  url: string;
}

// ── Switchboard ───────────────────────────────────────────────────────────

export interface SwitchboardSession {
  agentId: string;
  startedAt: string;       // ISO string from JSON
  lastActiveAt: string;    // ISO string from JSON
}

export type SwitchboardSessions = Record<string, SwitchboardSession>;

// ── Cache ─────────────────────────────────────────────────────────────────

export interface CacheEntry<T> {
  data: T;
  fetchedAt: number;       // Date.now() at time of set
  ttlMs: number;
}

// ── API Response ──────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  stale: boolean;          // true when serving cached data after a re-fetch failure
  cachedAt: number | null; // Date.now() when cache entry was written
}
