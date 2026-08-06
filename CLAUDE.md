# Claude Code entrypoint: BERG Networking Bingo

Before changing this repository, read these files in order:

1. `AGENTS.md`
2. `docs/BINGO_CLAUDE_CODE_HANDOFF.md`
3. `git status --short`

The handoff document is the source of truth for the current product request,
completed work, launch blockers, acceptance criteria, test commands, and
production rollout.

## Immediate mission

Finish and harden the Networking Bingo experience for an event with up to
approximately 250 participants, then prepare a safe preview and production
deployment. Reliability, registration, privacy, connection correctness, and
scale come before optional event theming.

## Repository safety

- The worktree is intentionally very dirty. Many modified and untracked files
  are unrelated user work.
- The bingo implementation itself is currently untracked. Do not use
  `git reset --hard`, `git clean`, `git checkout --`, or broad staging commands.
- Inspect every diff and stage only explicit files for the bingo work.
- Do not print, commit, or copy values from `.env.local`,
  `.env.admin.local`, or Vercel environment variables.
- Use the already-linked Vercel project `berg-collective-web`; never create a
  replacement project.
- Treat the connected Neon database as live data. Use read-only inspection
  first and never reset the current event game without explicit approval.

## Highest-priority findings

The current shared-IP magic-link limiter can block a venue after ten requests,
email delivery failures are shown as success, reciprocal scans duplicate people
in the Connections view, and current polling has not been proven at 250-player
load. These are release blockers and are detailed in the handoff.

