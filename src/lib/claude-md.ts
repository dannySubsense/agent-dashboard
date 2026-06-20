/**
 * src/lib/claude-md.ts
 *
 * Pure content parser for CLAUDE.md files.
 * File I/O is handled by the caller (discovery.ts).
 * Does NOT throw — returns null fields on any parse failure.
 */

/**
 * Extracts projectId and agentName from CLAUDE.md content.
 *
 * projectId patterns (tried in order):
 *   1. List item:  /^[-*]\s*`?[Pp]roject[\s]*[Ii][Dd]`?\s*:\s*[`']?([^`'\n]+)/m
 *      Matches: "- Project ID: `agent-dashboard`" and "- projectId: 'value'"
 *   2. Assignment: /^projectId\s*=\s*[`']?([^`'\n]+)/m
 *      Matches: "projectId = value"
 *   3. Env var:    /^MCP_DEFAULT_PROJECT_ID=([^\s\\]+)/m
 *      Matches: "MCP_DEFAULT_PROJECT_ID=agent-dashboard" in relay dispatcher block
 *
 * agentName patterns (tried in order):
 *   1. /^Conversational name:\s*\*{0,2}(.+?)\*{0,2}$/m
 *   2. /^You are\s+\*{0,2}(\w+)\*{0,2}/m
 */
export function parseCLAUDEMd(content: string): {
  projectId: string | null;
  agentName: string | null;
} {
  if (!content) return { projectId: null, agentName: null };

  let projectId: string | null = null;
  let agentName: string | null = null;

  // ── projectId ────────────────────────────────────────────────────────────

  // Pattern 1: list item — handles "- Project ID: `value`" and "- projectId: 'value'"
  // The `[Pp]roject[\s]*[Ii][Dd]` allows optional space between "Project" and "ID"
  // and case-insensitive "P" to match both "Project ID" and "projectId".
  const projectIdListMatch = content.match(
    /^[-*]\s*`?[Pp]roject[\s]*[Ii][Dd]`?\s*:\s*[`']?([^`'\n,]+)/m
  );
  if (projectIdListMatch) {
    projectId = projectIdListMatch[1].trim();
  }

  // Pattern 2: assignment — "projectId = value" or "projectId='value'"
  if (!projectId) {
    const projectIdAssignMatch = content.match(
      /^projectId\s*=\s*[`']?([^`'\n]+)/m
    );
    if (projectIdAssignMatch) {
      projectId = projectIdAssignMatch[1].trim().replace(/[`',]+$/, '').trim();
    }
  }

  // Pattern 3: env var — "MCP_DEFAULT_PROJECT_ID=agent-dashboard" in bash blocks
  if (!projectId) {
    const envVarMatch = content.match(/^MCP_DEFAULT_PROJECT_ID=([^\s\\]+)/m);
    if (envVarMatch) {
      projectId = envVarMatch[1].trim().replace(/[`',]+$/, '').trim();
    }
  }

  // ── agentName ────────────────────────────────────────────────────────────

  // Pattern 1: "Conversational name: Lumen" or "Conversational name: **Lumen**"
  const convNameMatch = content.match(
    /^Conversational name:\s*\*{0,2}(.+?)\*{0,2}$/m
  );
  if (convNameMatch) {
    agentName = convNameMatch[1].trim();
  }

  // Pattern 2: "You are **Lumen**" or "You are Lumen"
  if (!agentName) {
    const youAreMatch = content.match(/^You are\s+\*{0,2}(\w+)\*{0,2}/m);
    if (youAreMatch) {
      agentName = youAreMatch[1].trim();
    }
  }

  return {
    projectId: projectId || null,
    agentName: agentName || null,
  };
}
