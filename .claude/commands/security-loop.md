---
description: Security review → remediate → independently verify → Frank gate → ship. Closed-loop hardening for any repo; the bar is a security-tight repo, not a menu of options. Portable across all projects.
argument-hint: "[optional: scope or specific concern, e.g. 'whole repo' or 'the new auth code']"
---

# Security Loop — review, remediate, verify, Frank-gate, ship

Run the full hardening loop for THIS repo. The goal is a **security-tight repo** — not a
report, not a list of options. You review, you fix, you prove the fix, Frank gates it, you ship.
Do NOT stop at "here are the findings"; findings are the start of the loop, not the end. Optional
scope/concern from the invoker: `$ARGUMENTS`.

The one thing you may NOT do autonomously is anything irreversible and outward-facing — a git
history rewrite / force-push (Step 6) — that is always the human's call. Everything short of that,
you execute.

## Step 0 — Establish scope and stakes

- **Repo visibility** — `gh repo view --json visibility,nameWithOwner` (or infer). PUBLIC raises
  the stakes: a leaked secret is effectively public the instant it lands. Note it explicitly; it
  changes Step 4/6 judgment.
- **Branch + diff base** — current branch; ensure a base exists (`git remote set-head origin -a`
  if `origin/HEAD` is unset). Pending changes = uncommitted working tree + any commits ahead of
  upstream.
- **Review scope** — default to BOTH the pending changes AND a full-tree secret sweep. For a
  PUBLIC repo, never scope to the diff alone: a secret already committed elsewhere outranks
  anything in the current diff.

## Step 1 — Security review (comprehensive, not diff-only)

Scan the tracked tree, the about-to-be-committed untracked files, AND git history for secrets.
Cover at least:

| Class | What to grep / check |
|---|---|
| Live credentials | API keys/tokens (`sk-…`, `ghp_…`, `github_pat_…`, `gho_…`, `AKIA…`, `xoxb-…`), private keys (`BEGIN … PRIVATE KEY`), `.pem`/`.key`/`id_rsa` |
| Connection strings | `postgres://`, `mysql://`, `mongodb://`, `redis://`, `amqp://` with a REAL inline password (not `<pw>`/`<password>`/placeholder) |
| Tracked secret files | `git ls-files \| grep -iE '\.env\|secret\|credential\|\.pem\|\.key'` — `.env.example` is fine if placeholders only |
| Logs about to be committed | untracked `*.log` / runtime logs — read them; apps log connection strings on DB errors |
| Internal topology | internal IPs, tailnet/`*.ts.net` hostnames, VM labels, private hostnames |
| Gitignore coverage | are `.env*`, logs, local config actually ignored AND untracked? `git check-ignore` to confirm |

Run a real probe, not a glance. If a remediation sub-agent later reports "clean," you still
re-verify yourself in Step 5 — never trust a self-report.

## Step 2 — Triage by severity, and classify the FIX type (this drives everything)

For each finding, the fix type depends on what it is — get this right or you either under-protect
or destroy provenance for nothing:

| Finding | Correct remediation | History rewrite? |
|---|---|---|
| **Leaked credential / private key / live token** | Scrub from tree **AND rotate/revoke the secret at the source** (the secret is burned the moment it's committed, especially on a public repo). Then consider history purge. | **Yes — and rotation is mandatory, not optional.** Scrub-without-rotate is a false fix. |
| **Non-secret, non-routable topology** (CGNAT `100.64.0.0/10` IP, internal hostname, VM label) | Forward-only scrub to a placeholder + gitignore hardening so it stops propagating. | **No** — rewriting public history to delete a string an attacker can't route to is theater, and it corrupts `git_sha` provenance / PR linkage / any system keyed on SHAs. |
| **Committable runtime artifact** (logs, dumps, build output) | Gitignore it; remove from the stageable set. | Only if it contained a credential (then treat as row 1). |

State each finding's class and chosen fix BEFORE editing. If nothing is found: say so plainly and
still do the gitignore-hardening pass — a clean tree with leaky ignore rules is not tight.

## Step 3 — Remediate (route edits if the project requires it)

- If this repo's `CLAUDE.md` declares the orchestrator must NOT edit files directly, route the
  scrub to the appropriate implementation agent (e.g. `code-executor`) with a PRECISE contract:
  exact literals to replace, exact placeholder, explicit do-NOT-touch list (`.git/`,
  `node_modules/`, the real secrets file like `.env.local`, logs), and a required self-verify
  grep. Otherwise do the edits directly.
- Replace secret/topology literals with clear non-functional placeholders (`<lore-db-host>`,
  `<api-key>`, `<tailnet>`). Preserve surrounding prose/structure — change only the sensitive token.
- Harden `.gitignore` so the class can never recur (`logs/*.log`, `.env*.local`, local config).
- For a **rotated** credential: scrubbing the tree is step one of two — the rotation at the
  provider/source is the fix that actually matters. Do not mark resolved until rotation is done
  or explicitly handed to the human with that framing.

## Step 4 — Independent verification (the "double-check" — never skip)

Verify with YOUR OWN commands, not the remediation agent's report:
- Re-grep the whole working tree (excl. `.git`, `node_modules`) for every secret/topology literal
  you scrubbed → must be ZERO.
- Confirm the real secrets file (`.env.local` / `~/runtime/…`) was NOT touched and is still
  gitignored AND untracked (`git check-ignore` + `git ls-files`).
- Confirm logs / secret files are NOT in the stageable set (`git ls-files -mo --exclude-standard`).
- Confirm git identity is the intended one for THIS repo (per `CLAUDE.md` / memory) before any
  commit — wrong-identity commits to a public repo are their own leak.

If any check fails, loop back to Step 3. Do not advance a failing tree to Frank.

## Step 5 — Frank gate (adversarial verdict, not a rubber stamp)

Invoke Frank (`senior-qc` skill or the `frank` agent) with: repo visibility, the findings + their
class, exactly what was remediated, your independent verification output, and the explicit open
question of **history rewrite vs forward-scrub** for anything that touched committed history.

Frank returns a verdict, not suggestions. Honor it:
- **BLOCK** → fix what he names, re-verify (Step 4), re-gate. No shortcutting.
- **CLEAR** → proceed to ship.
- If Frank rules a history rewrite IS warranted (i.e. a real credential is in history), that is the
  Step 6 human-decision path — do not execute it yourself.

## Step 6 — Ship per repo convention (and the irreversible-action firewall)

1. Commit the remediation in coherent, logical commits (security scrub separate from unrelated
   doc/feature changes). End commit messages with the repo's required co-author/trailer convention.
2. Push per THIS repo's declared git policy (read `CLAUDE.md` "Git Workflow" or `docs/GIT-WORKFLOW.md`):
   - push-at-mainline convention + fast-forward → push, then verify `@{u}` == `HEAD`.
   - PR/protected-branch flow, or upstream diverged → do NOT auto-push; state the commits and ask.
3. **History rewrite / force-push is NEVER autonomous.** Even when warranted (real credential in
   history): present the plan (`git filter-repo`/BFG + force-push), state the blast radius
   (breaks clones/forks, rewrites SHAs that provenance systems depend on), confirm the credential
   is being ROTATED regardless, and get explicit human go before running it. A public-repo
   force-push cannot be undone.

## Step 7 — Record (if a LORE project) and report

- If this repo's `CLAUDE.md` declares a LORE `projectId`, capture the review + Frank's ruling +
  what shipped via `mcp__lore-gateway__capture_memory` (`documentType: "review"`,
  `epistemicType: "FACT"`). Reconcile any local status memory so layers agree.
- Print a close-out report:
  - Repo visibility and review scope
  - Findings by class (credential / topology / artifact) and the fix applied to each
  - Independent verification result (the proof, not "looks clean")
  - Frank's verdict and his history-rewrite ruling
  - Ship state: committed SHAs + push state (`pushed`, `@{u}`==`HEAD` / `held, reason` /
    `force-push proposed, awaiting human go`) — never silent
  - Any credential ROTATION still owed to the human

Do not claim the repo is secured until: findings are remediated, your independent verification is
clean, Frank has CLEARED, the ship/push state is explicit, and any leaked credential has a
rotation owner.
