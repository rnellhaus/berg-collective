# BERG Networking Bingo — Claude Code handoff

**Prepared:** August 6, 2026  
**Workspace:** `/Users/rnell/Local Sites/berg-react`  
**Target:** BERG Collective website and existing Vercel project
`berg-collective-web`

## 1. Mission and desired end state

Take over the Networking Bingo implementation, finish the remaining product and
reliability work, verify it for an event with roughly 250 participants, deploy a
preview, run launch smoke tests, and eventually deploy the approved build to
production.

The experience should let an attendee:

1. Scan a main event QR code.
2. Sign in with a secure email magic link.
3. Create a simple player card.
4. Optionally share LinkedIn, Instagram, and/or email only with people they
   actually connect with.
5. Read one conversation prompt at a time.
6. Scan another participant's unique QR code, with a short manual code as a
   fallback.
7. See progress, connections, and the public leaderboard.
8. Understand the flow through a short screenshot-based walkthrough.

The admin should be able to create games, set the number of prompts per player
(for example 8 or 12), edit custom prompts before registration, download the
main QR code, run/pause/end the game, track every participant, see timestamped
finishing order, and export private analytics plus a privacy-safe recap.

## 2. Read this before touching the code

The current branch is `main`, and the worktree contains a large amount of
modified and untracked user work. As of this handoff, all bingo implementation
files are untracked. Preserve everything.

Required safety rules:

- Start with `git status --short` and inspect changes file by file.
- Create a narrowly scoped working branch before the first commit.
- Never run `git reset --hard`, `git clean`, `git checkout --`, or another
  command that discards working-tree content.
- Never use `git add .` or `git add -A` in this worktree. Stage an explicit file
  list after reviewing each diff.
- Do not modify unrelated pages, assets, admin redesign work, or AI Summit work.
- Do not expose `.env` values, magic-link tokens, player email lists, database
  URLs, JWT secrets, Resend keys, or Vercel secrets.
- The existing `.vercel/project.json` links this directory to
  `berg-collective-web`. Do not run a command that creates or links a different
  Vercel project.
- Database migrations run automatically during application initialization.
  Make every new migration additive, versioned, idempotent, and safe on
  populated production tables.
- Inspect database state read-only before changing a live game. Do not delete,
  reset, archive, or rewrite participant results without explicit user
  approval.

## 3. Historical product context and decisions

The original request was for a link from the main website to an event
networking bingo product, inspired by The Jam Social's bingo experience. It
needed a main registration QR, a unique QR per participant, email magic-link
authentication, custom prompts, participant tracking, and a controllable admin
backend.

The user approved the plan and then iterated on the product:

- The first local magic link used the wrong host; the implementation now derives
  public links through `PUBLIC_SITE_URL`, `FRONTEND_URL`, or Vercel URL fallback.
  Production host alignment still must be smoke-tested.
- The user liked the basic layout and UX but wanted it to feel like a real,
  distinctive BERG product instead of a generic generated interface. The current
  participant and admin bingo screens were substantially restyled, and the
  product now uses an editorial BERGHAUS visual language.
- The QR scanner has an eight-character manual player-code fallback. The user
  asked whether four digits would be faster. No shortening has been implemented
  yet because four digits create guessing and collision concerns at event scale.
- A three-step, screenshot-based onboarding walkthrough was added.
- The product now congratulates the top three, displays a top ten, stores
  server-assigned finish places and timestamps, and provides two exports.
- The apparent “25” limit was only an early display-query limit. It was changed
  to top ten. All registered players and results are stored and available to the
  admin; there is no 25-player tracking cap.
- The user shared a Summer Mixer flyer and approved an optional per-event theme
  direction, not a permanent global rebrand.
- The latest requirement is optional LinkedIn, Instagram, or email sharing,
  admin control over 8 versus 12 prompts, and confidence that an approximately
  250-person event will not break.

Current priority decision: reliability and safe social/contact behavior come
before optional theme polish.

## 4. Current implementation

### Participant experience

Implemented:

- Public room route and main registration QR.
- Email magic-link request, inspection, redemption, session cookie, and logout.
- Player profile with optional company, role, LinkedIn, and opt-in email or
  LinkedIn sharing.
- Signed, game-scoped personal QR token for every player.
- Camera scanning with manual player-code fallback.
- One unique partner per scanner; self-scan and repeat-partner protections.
- Atomic connection completion and server-side sequential finishing place.
- Personal progress, connection history, top-three celebration, and top-ten
  leaderboard.
- Three-step “30-second walkthrough” with screenshots.
- Game status handling for draft, registration, live, paused, ended, archived.

Not implemented:

- Instagram profile/sharing.
- A post-join Profile/Privacy screen to edit or revoke sharing.
- Collision-safe shorter manual codes.
- Per-game optional event theme controls.
- Proven 250-concurrent-user capacity or optimized polling.
- Robust client/server idempotency recovery for a connection whose response is
  lost after the database commit.

### Admin experience

Implemented:

- Game list/create flow.
- Game editor and status controls.
- Main QR generation and PNG download.
- Join code, instructions, dates, prompt count, leaderboard, and contact-sharing
  controls.
- Custom prompt create/update/activate/delete while the game is a draft.
- Live dashboard with all players, progress, participant status, recent
  connections, top-three podium, top-ten finishing order, and connection leaders.
- Server-assigned finish timestamps.
- Private participant CSV containing all players and personal data needed by the
  admin.
- Privacy-safe shareable recap CSV with event metrics and top three, excluding
  participant email/job title/contact-sharing details.

Important prompt behavior:

- `prompt_count` accepts integers from 3 through 50.
- Join/open is blocked unless at least that many prompts are active.
- Join code, prompt count, and prompt editing freeze once registration opens.
- If 12 prompts are active and `prompt_count` is 8, each new player receives a
  random 8. If all players should receive the exact same 8, leave exactly 8
  prompts active or add an explicit assignment-mode setting.

### Architecture and file map

| Area | Files |
| --- | --- |
| Participant React app | `src/bingo/BingoApp.jsx`, `src/bingo/Bingo.module.css` |
| Onboarding images | `public/images/bingo/onboarding/*.webp` |
| Admin list/editor/live | `src/admin/pages/BingoGamesPage.jsx`, `src/admin/pages/BingoGameEditorPage.jsx`, `src/admin/pages/BingoLivePage.jsx` |
| Admin bingo styles | `src/admin/pages/BingoAdmin.module.css` |
| Public API | `server/routes/bingoPublic.js` |
| Admin API | `server/routes/bingoAdmin.js` |
| Domain/service helpers | `server/services/bingo.js` |
| Participant session auth | `server/middleware/bingoAuth.js` |
| Schema migrations | `server/db/migrations/001_networking_bingo.js`, `002_bingo_prompt_cascade.js`, `index.js` |
| Migration runner | `server/db/migrate.js`, called by `server/db/init.js` |
| Unit tests | `server/services/bingo.test.js` |
| Integration test | `scripts/verify-bingo-integration.js` |
| Route mounts | `server/index.js`, `src/App.jsx`, `src/admin/AdminApp.jsx`, `src/admin/components/AdminLayout.jsx` |
| Vercel routing | `vercel.json`, `api/index.js` |

Stack: React 19, Vite 8, Express 5, Neon Postgres,
`@neondatabase/serverless`, Resend, `qrcode`, and `@zxing/browser`.

## 5. Last known verification and live-data snapshot

During final handoff validation, the following passed:

- Targeted ESLint for the bingo frontend, admin, routes, and integration script.
- `npm run test:bingo` (5 tests).
- `npm run build`.

Earlier in the same implementation session, the following also passed:

- `npm run test:bingo:integration` against Neon. The script created and cleaned
  test data.
- Desktop and mobile visual reviews with no page errors or horizontal overflow.

The Neon integration test was not rerun during final handoff validation because
network access was unavailable. Rerun every check because the repository
remains dirty and work will continue.

The last read-only database inspection earlier on August 6 showed:

- game ID `5`
- title `Network Summer Mixer — Networking Bingo`
- join code `SUMMER26`
- status `live`
- `prompt_count` `12`
- 12 active prompts
- one registered player

Network access was unavailable during final handoff validation, so treat that as
a timestamped snapshot, not guaranteed current state. Re-query aggregate game
state before acting. Do not print player PII.

Because the game had already opened and had a player, prompt count and prompts
were correctly frozen. If the user wants an 8-prompt test, create a separate
draft game or obtain explicit approval for a carefully designed reset workflow.
Do not mutate or erase the current game's results.

The last Vercel inspection showed the latest production deployment was about
21 days old, so the local bingo implementation was not in production. Environment
variable names existed for `DATABASE_URL`, `JWT_SECRET`, `RESEND_API_KEY`, and
`FRONTEND_URL`. `PUBLIC_SITE_URL`, `BINGO_QR_SECRET`, and `BINGO_FROM_EMAIL`
were not separately configured and therefore use code fallbacks. Re-check names
only with `vercel env ls`; never print values.

## 6. Release blockers and required fixes

Treat items P0.1 through P0.6 as the minimum launch-hardening scope.

### P0.1 — Shared venue Wi-Fi can block magic-link registration

Evidence:

- `server/routes/bingoPublic.js` defines `magicLinkLimiter` with `max: 10` per
  15 minutes using the default IP key.
- Hundreds of attendees on venue Wi-Fi may share one NAT address and hit that
  limit after ten requests.
- The route already has a database-backed limit of three requests per game/email
  per 15 minutes.

Implement a venue-safe aggregate ceiling while retaining abuse protection. A
high shared-IP ceiling plus the existing email/game throttle is acceptable for
this launch; a distributed limiter is preferable long term. Add tests proving
that many distinct attendees behind one IP are not rejected while repeated
requests for one game/email remain throttled.

Acceptance:

- At least 250 distinct registration attempts from one simulated IP are not
  blocked by the old ten-request ceiling.
- Repeated requests to one email remain limited.
- Invalid email handling and generic game-not-found behavior are preserved.

### P0.2 — Email delivery failure is incorrectly presented as success

Evidence:

- The magic-link handler catches a Resend failure, returns HTTP 200 with
  `emailSent: false`, and leaves a usable token row in the database.
- `GameGatewayPage.requestLink()` ignores `emailSent` and always displays “Check
  your inbox.”
- The handler has no 429 retry/backoff behavior.

Fix:

- Verify the actual Resend plan, verified sending domain, daily allowance, and
  event-day headroom before launch. Official quota reference:
  `https://resend.com/docs/knowledge-base/account-quotas-and-limits`.
- Add bounded retry/backoff for transient 429/5xx responses without logging a
  token or email address.
- Return an honest service failure for a known valid request when delivery fails,
  and keep the participant on the email form with a clear retry message.
- Invalidate or expire the unsent magic-link token.
- Preserve non-enumerating behavior for nonexistent games.
- Do not build an insecure public authentication bypass. Any onsite fallback
  needs explicit authorization and audit logging.

Acceptance:

- Success UI appears only after Resend accepted the message.
- A simulated provider failure or 429 produces a useful retry state.
- No raw tokens, email addresses, or secrets are written to logs.
- Magic links use the production BERG domain, not localhost or a stale preview.

### P0.3 — Reciprocal scans duplicate people in Connections

Evidence:

- Directed connections are intentionally stored because A scanning B advances A,
  and B scanning A advances B.
- `getPlayerState()` selects every row where the player is scanner or target.
  After reciprocal scans, both users see the same person twice.
- Analytics currently call each directed completion a “connection.”

Keep the two directed rows and both players' progress, but deduplicate the
participant-facing Connections list by the other player's ID. Select the most
recent relevant record or merge prompt metadata consistently. Add a unique-pair
metric to admin/recap or label the existing metric “prompts completed” /
“connection actions” so it is not confused with unique human pairings.

Acceptance:

- A→B and B→A each advance the correct scanner exactly once.
- A sees B once and B sees A once in their Connections list.
- Existing no-repeat-scanner rule still prevents A→B twice.
- Tests cover reciprocal scans and metric semantics.

### P0.4 — Weak-network connection completion needs reconciliation

Evidence:

- `completeConnection()` clears the pending QR/manual code on every caught error.
- If the database commits but the HTTP response is lost, the UI shows failure
  even though progress changed.
- A retry then receives the duplicate-connection response.

Preferred implementation:

- Add a client-generated idempotency key for each confirmation and a
  database-backed uniqueness constraint/lookup, or implement an equally strong
  server-side idempotency design.
- On transient network errors and duplicate 409 responses, reload player state
  before declaring failure.
- Preserve the pending target during a retryable failure.
- Use copy such as “Checking whether your connection was saved…” while
  reconciling.

Acceptance:

- Replaying the same confirmation cannot double-count progress.
- A response lost after commit resolves to success after reconciliation.
- A genuine validation error remains clear and does not corrupt progress.
- Concurrent requests cannot assign two places or complete one prompt twice.

### P0.5 — Add Instagram and editable privacy controls

Current good behavior:

- Email and LinkedIn sharing default to unchecked.
- Contact data appears only after a recorded connection and only while the
  game's global contact-sharing setting is enabled.

Required:

- Add an additive migration for `instagram_url` on the participant and player
  records plus `share_instagram` on the player record.
- Accept either an Instagram handle or `instagram.com` URL, normalize it to a
  safe HTTPS profile URL, and reject unrelated domains. Tighten LinkedIn
  validation to approved LinkedIn hosts; the current helper accepts any HTTP(S)
  URL.
- Add optional Instagram UI and separate LinkedIn/Instagram/email checkboxes.
- Add an accessible Profile/Privacy screen reachable after joining so a player
  can edit or revoke sharing at any time.
- Default every sharing option off. Never infer consent from a populated URL.
- Return a contact method only to connected players when its individual opt-in
  and the game-level setting are both enabled.
- Include consent flags in the private participant CSV.
- Exclude Instagram and all contact details from the shareable recap.
- Add a concise privacy/retention notice.

Acceptance:

- A player can opt in, opt out, and edit details after joining.
- Revocation removes the contact method from subsequent connected-player
  responses.
- A non-connected participant can never retrieve another player's details.
- Tests cover global sharing disabled, each opt-in independently, revocation,
  invalid hosts, and recap privacy.

### P0.6 — Prove and improve capacity for approximately 250 participants

Evidence:

- Every participant currently polls the full player state every 12 seconds while
  the room is registration/live/paused.
- At 250 clients that is about 21 participant API requests per second before
  scans. Each request performs multiple SQL queries.
- The live admin downloads and renders the full player list every five seconds.
- The existing integration test uses four sequential participants; it is not a
  concurrency/load test.

Improve before load testing:

- Split lightweight game/status/progress refreshes from contacts and leaderboard
  data, or otherwise reduce query count and payload size.
- Poll only what the active tab needs.
- Slow or stop full-state polling after a player finishes or the game ends.
- Avoid overlapping requests when a previous poll is still in flight.
- Split admin summary/activity from the full player table.
- Add admin search/filter and pagination or virtualization for 250 rows.
- Add database indexes only when an `EXPLAIN` or measured query demonstrates the
  need.

Create a repeatable, committed load-test script under `scripts/` that:

- Does not send real emails.
- Uses a dedicated draft/test game and synthetic accounts.
- Exercises registration/join, player-state reads, leaderboards, and concurrent
  connection writes at realistic rates.
- Uses bounded concurrency and has guaranteed, verified cleanup.
- Refuses to target production unless an explicit opt-in flag is provided.
- Reports latency percentiles, error rate, HTTP status distribution, and cleanup
  result without printing PII or credentials.

Acceptance:

- A documented 250-participant simulation completes with no correctness errors,
  no unexplained 429s, and no leftover test rows.
- Set a launch SLO before the run; recommended starting target is under 1% server
  errors and p95 under 1.5 seconds for reads under expected event traffic.
- Admin remains usable with 250 players.
- Neon, Vercel, and Resend limits/metrics are checked after the run.

## 7. Secondary work after launch blockers

### P1 — Prompt assignment clarity

The admin already controls 3–50 prompts, including 8 versus 12. Decide whether:

- every player gets a random subset from the active prompt pool (current
  behavior), or
- every player gets the same active prompts for direct competition.

Do not silently change competition behavior. If both are useful, add a per-game
`assignment_mode` in `bingo_games.settings` with explicit admin help text and
tests. Once registration opens, keep it frozen.

### P1 — Safe pre-event testing/reset

There is no bulk reset for a populated game, and only empty drafts can be
deleted. Prefer a separate test room so rehearsals do not pollute the official
leaderboard. If an admin reset is added, require admin role, typed confirmation,
transactional deletion, activity logging, a before/after count, and explicit
user approval before using it on any populated game.

### P2 — Optional “Midnight Rooftop” event theme

The Summer Mixer flyer suggests this optional palette:

- midnight navy `#04112B`
- electric cyan `#08DDF2`
- neon pink `#FF2C98`
- warm amber `#FFAD3D`
- soft white `#FFF9F2`

Original flyer supplied at:
`/Users/rnell/Downloads/F2CD61A8-8EB2-4BCE-A886-772F9AE678A9.PNG`.

Implement this as a per-game theme stored in the existing
`bingo_games.settings JSONB`, not as a global replacement for BERGHAUS. Apply it
to participant entry/play, leaderboard, winner, and recap presentation. Keep QR
modules and quiet zones pure high-contrast black/white. Keep the admin shell
stable and show a theme preview. Check contrast and reduced-motion behavior.

### P2 — Shorter manual player code

The current code uses eight unambiguous characters from
`23456789ABCDEFGHJKLMNPQRSTUVWXYZ`. Four digits are easier to say but can be
guessed and collide at 250-person scale. If changed:

- Prefer a six-digit numeric code or four-to-six unambiguous characters after
  measuring the UX tradeoff.
- Allocate inside a retry loop that handles the database unique constraint.
- Rate-limit manual lookups separately.
- Never allow the fallback code to bypass the game boundary or authentication.
- Test collision retries and rapid guessing.
- Keep QR scanning as the primary path.

### P2 — Accessibility and UI cleanup

Known review findings:

- Inline form errors need `aria-live` and field association.
- Profile inputs need names/autocomplete; URL fields need `type="url"` where
  appropriate; manual codes need `spellCheck={false}` and suitable input mode.
- Scanner and walkthrough dialogs need verified focus entry, focus trap, Escape
  handling, return focus, and screen-reader labels.
- Onboarding/logo images should include intrinsic dimensions to avoid layout
  shift.
- Visible keyboard focus should consistently use `:focus-visible`.
- The admin player table needs search/pagination/virtualization.
- `BingoLivePage.jsx` currently repeats the event/code subtitle twice; remove the
  duplicate during cleanup.

## 8. Privacy, security, and data semantics

- Sharing defaults must remain off.
- A connected contact may see only the methods the other person explicitly
  enabled.
- Admin exports are private and can contain PII; the shareable recap must not.
- Define and display a retention policy. Current participant/player records
  persist until their game is deleted; sessions expire after seven days.
- Signed QR tokens fall back to `JWT_SECRET` when `BINGO_QR_SECRET` is unset.
  A dedicated production `BINGO_QR_SECRET` is preferable, but rotating it during
  a live event invalidates displayed personal QR tokens. Plan rotation safely.
- `server/db/init.js` can seed a default admin if none exists. Do not put an
  admin password in this handoff or source control. Verify `ADMIN_SEED_PASSWORD`
  is configured in production and use the normal secure auth/reset flow.
- Do not log request bodies on auth/contact endpoints.
- Use parameterized SQL and preserve transactional locks/constraints around
  connection completion and finish-place assignment.

Analytics terminology must distinguish:

- registered participants,
- active participants,
- directed prompt completions/scan actions,
- unique participant pairings,
- finishers,
- average completed prompts.

## 9. Implementation sequence

Use this order unless new evidence shows a safer dependency order.

### Phase 0 — Establish a safe baseline

- [ ] Read `AGENTS.md`, this handoff, and current diffs.
- [ ] Create a scoped branch without discarding the dirty tree.
- [ ] Record the exact bingo file list and current test results.
- [ ] Inspect aggregate Neon game state read-only.
- [ ] Confirm Vercel project identity and environment-variable names.
- [ ] Confirm Resend domain/plan/quota without exposing secrets.

### Phase 1 — Registration and correctness

- [ ] Make magic-link rate limiting venue-safe.
- [ ] Implement honest Resend failure/retry behavior.
- [ ] Add reciprocal-connection presentation deduplication and clear metrics.
- [ ] Add idempotent/reconciled connection confirmation.
- [ ] Add Instagram plus editable Profile/Privacy controls.
- [ ] Add unit and integration coverage for every behavior above.

### Phase 2 — Scale

- [ ] Reduce participant polling/query/payload cost.
- [ ] Split and paginate/search the admin dashboard.
- [ ] Build the safe 250-participant load harness.
- [ ] Run it against a dedicated non-production test game.
- [ ] Review performance, rate limits, database usage, and cleanup.

### Phase 3 — Launch UX

- [ ] Confirm 8-versus-12 prompt behavior with the user if assignment mode matters.
- [ ] Run accessibility and weak-network review.
- [ ] Test iPhone Safari, Android Chrome, venue Wi-Fi, and cellular.
- [ ] Add optional event theme and/or shorter code only after P0 passes.

### Phase 4 — Preview and production

- [ ] Review every staged file; keep unrelated work out of the commit.
- [ ] Run the full verification suite below.
- [ ] Deploy to the existing Vercel project as a preview.
- [ ] Run end-to-end preview smoke tests with a disposable game.
- [ ] Confirm production migrations and rollback/mitigation plan.
- [ ] Obtain the user's final go-live approval if not already explicit for the
      exact tested commit.
- [ ] Deploy that exact commit to production.
- [ ] Monitor Vercel errors/latency, Neon connections/query latency, Resend
      delivery/429s, and registration success during rollout.
- [ ] Perform a production smoke test without polluting the official game.
- [ ] Record deployment URL, commit SHA, migration IDs, test results, and any
      follow-up in the continuation log.

## 10. Verification commands and launch matrix

Start with targeted lint and widen it for every touched file:

```bash
npx eslint \
  src/bingo/BingoApp.jsx \
  src/admin/pages/BingoGamesPage.jsx \
  src/admin/pages/BingoGameEditorPage.jsx \
  src/admin/pages/BingoLivePage.jsx \
  server/routes/bingoPublic.js \
  server/routes/bingoAdmin.js \
  server/services/bingo.js \
  scripts/verify-bingo-integration.js

npm run test:bingo
npm run test:bingo:integration
npm run build
```

Notes:

- The integration script requires `.env.local` and `.env.admin.local`, mutates
  Neon temporarily, and is expected to clean up. Inspect its target and verify
  cleanup before and after every run.
- Do not rely on old visual-review scripts in `/private/tmp`; temporary files may
  disappear. Create a reusable repository QA script if continued visual
  automation is needed.
- `npm run lint` covers the entire already-dirty repository and may surface
  unrelated pre-existing failures. Report those separately; do not “fix
  everything” as part of bingo.

Manual preview test matrix:

| Scenario | Required result |
| --- | --- |
| Main event QR | Opens correct preview/production host and room |
| Shared venue IP | Many distinct emails are not blocked after ten |
| Magic link | Arrives, expires correctly, is one-time, returns to same game |
| Provider failure | Honest retry UI; no false “check inbox” |
| New profile | Sharing defaults off; optional fields remain optional |
| Privacy edit | Opt-in/out updates connected-player data immediately |
| Camera allowed | Correct player QR opens confirmation |
| Camera denied | Manual fallback remains easy to find and complete |
| Outside camera app | Scanned personal link preserves target through auth |
| Self/repeat scan | Rejected without progress change |
| Reciprocal scan | Both progress; one connection card per person |
| Lost response | Reconciliation shows saved state without double count |
| Pause/resume/end | Correct participant copy and write permissions |
| Finish race | Unique sequential place and server timestamp |
| 250-player admin | Search/table/status controls remain responsive |
| Private CSV | Every player included; protected as admin data |
| Share recap | No email/contact details; metrics and top three correct |
| Mobile viewport | No horizontal overflow or blocked primary controls |

Deployment inspection commands:

```bash
vercel whoami
vercel env ls
vercel ls
vercel deploy
```

Use the preview URL for acceptance testing. Use the existing project deployment
flow for production only after the exact preview commit passes. Never paste env
values into logs or documentation.

## 11. Day-of-event operating plan

Before opening:

1. Create a fresh official game with the intended prompt count and prompt pool.
2. Keep rehearsals in a separate test room.
3. Verify the production magic-link host and send a real test email.
4. Confirm Resend capacity exceeds expected unique attendees plus retries.
5. Open registration 30–60 minutes early to spread email traffic.
6. Pilot with 10–20 simultaneous people across iPhone, Android, venue Wi-Fi,
   and cellular.
7. Confirm QR, manual fallback, reciprocal scans, pause/resume, exports, and
   winner timestamping.
8. Put one staff member on the live admin dashboard and one on attendee support.

During the event:

- Watch registration success, API errors, 429s, database latency, and email
  delivery.
- Do not rotate auth/QR secrets.
- Pause the game rather than manipulating result rows if an incident occurs.
- Preserve an admin CSV after the event; share only the privacy-safe recap.

## 12. Continuation log

Claude Code should append concise entries here after each meaningful checkpoint
so a later agent can resume without reconstructing terminal history.

Use this format:

```text
YYYY-MM-DD HH:MM ET — phase/checkpoint
- Commit/branch:
- Changed:
- Tests:
- Data/deployment actions:
- Open risks or next step:
```

Initial entry:

```text
2026-08-06 — Codex handoff prepared
- Branch: main; no handoff commit created
- Changed: added CLAUDE.md and this handoff only
- Handoff validation: targeted ESLint, 5 unit tests, and production build passed
- Earlier validation: Neon integration and desktop/mobile visual checks passed
- Deployment: bingo changes are local and not known to be in production
- Next step: establish safe branch/baseline, then begin Phase 1 release blockers
```
