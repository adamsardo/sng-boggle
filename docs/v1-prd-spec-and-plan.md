# Boggle Party Clone V1 PRD, Technical Spec, And Implementation Plan

Date: 2026-05-30

Primary inputs:

- Research baseline: `docs/boggle-party-research.md`
- Decision brief: `docs/boggle-party-decisions.md`
- Decision export:
  `/Users/adamsardo/Downloads/boggle-party-decisions-2026-05-30.json`

## PRD Or Spec

### Problem And Why Now

The goal is to build a high-fidelity, web-based private prototype of the Netflix
Boggle Party experience. The game should let a host create a room, show a shared
TV/projector stage, and let players join from phones to find words on the same
board in real time.

The user need is simple: remote groups want a fast, low-friction party word game
that feels as polished and social as the Netflix game, but can run in a web
session and eventually support up to 20 players.

Why now:

- The target experience has been researched through screenshots, live photos,
  and public documentation.
- All 40 major product decisions have been answered.
- Cloudflare Workers and Durable Objects are a strong fit for rooms that need
  stateful realtime coordination.
- A web-first build can validate the core party loop before native apps,
  public lobbies, or daily puzzles.

### Users

Primary users:

- Host: creates the room, displays the stage, configures settings, starts the
  round, and resolves host-only controls.
- Player: joins on a phone, enters a display name/avatar, swipes or taps
  letters, submits words, views feedback, and participates in challenges.
- Remote group: plays over a shared screen, video call, or projector setup.

Secondary users:

- Returning player: uses the same browser/device profile and keeps local
  achievements.
- Moderator/host: removes abusive names/avatars and manages room safety.
- Developer/operator: validates room performance, connection failures, and load.

### Success Metrics

V1 is successful when:

- A room can support 20 connected players in a controlled test without state
  corruption, timer drift, or missed broadcast updates.
- 95% or more of valid submissions in a 20-player load test receive an
  authoritative accept/reject response within 250 ms after reaching the room
  Durable Object.
- Stage timer and controller timer stay within 150 ms of server time during a
  round on desktop Chrome, desktop Safari, iOS Safari, and Android Chrome.
- At least 90% of a test group can join a room, enter a profile, and submit a
  valid word without help.
- End-round scoring matches engine unit tests for every configured board size,
  minimum word length, unique-word bonus, and challenge outcome.
- No player can submit a word after the strict 0 ms server cutoff.
- The stage and controller pass the v1 accessibility checklist for keyboard,
  screen-reader state announcements, reduced motion, and haptics off switch.
- A private prototype can be deployed to Cloudflare and played end to end.
- Stage and controller routes are installable as a PWA with manifest metadata,
  app icons, safe-area/mobile viewport behavior, and an offline shell that does
  not cache realtime room APIs or WebSocket routes.

### Scope

V1 includes:

- Web-only app.
- PWA-ready web app with install metadata, icon assets, and service-worker shell
  caching.
- Cloudflare deployment target.
- Party Mode only.
- Private rooms joined by code/link/QR.
- Dedicated stage route for TV/projector.
- Mobile controller route for players.
- Shared-stage-required remote play.
- Optional account architecture, but guest-first play.
- Same-device local profile/progress persistence.
- 4x4, 5x5, and 6x6 grids.
- 30, 60, 90, 120, and 180 second rounds.
- Minimum word length settings: 3, 4, or 5.
- All settings available by default.
- English-only dictionary.
- Open-source word list with modern clean filtering.
- Swipe and tap word entry.
- Host-configurable hints.
- Server-authoritative validation, scoring, and timer.
- Netflix-style scoring:
  - 3 letters: 1 point
  - 4 letters: 2 points
  - 5 letters: 3 points
  - Each extra letter: +1 point
  - Unique multiplayer words score double unless successfully challenged.
- Full Word Challenge flow, without definitions.
- Achievements only, with no unlock gating.
- Top-score-first 20-player scoreboard.
- Playful animated countdown, tile feedback, and end-round reveal.
- Strong v1 anti-cheat controls.
- Full name/avatar moderation controls.
- Analytics events for retention, round completion, word submissions, and
  connection failures.
- 30 minute inactive room expiration.
- Early load tests before visual polish.
- Offline app shell for returning to home/join routes, while actual multiplayer
  play remains online-only.

### Non-Goals

V1 does not include:

- Daily Puzzle.
- Daily streaks.
- Public lobbies.
- Matchmaking.
- Native mobile apps.
- App-store distribution.
- Offline multiplayer rounds.
- Pranks.
- Challenge-word definitions.
- Cloud-synced progression.
- Trophy Room.
- Unlock-gated settings.
- Spectator mode as a named product feature.
- Commercial/public branding readiness.
- Proprietary Netflix art, logos, sound, or dictionary data.

Important boundary:

- The private prototype may use Boggle-facing copy and near-pixel layout for
  internal research. Before any public or commercial release, naming, visual
  identity, assets, and copy must be reviewed and replaced as needed.

### Requirements

#### 1. Room Creation And Join

Functional requirements:

- A user can create a room from the root route.
- Creating a room creates a server-side room instance and a join code.
- The stage route displays:
  - room code
  - QR code/link
  - player count
  - connection status
  - host identity after first player joins
- A player can join from a phone by QR, link, or room code.
- The first joined player becomes host by default.
- The room supports a soft cap warning at 20 players.
- If more than 20 players join during v1 testing, the room warns the host and
  marks the over-cap state. The system should not crash or corrupt state.
- Late joiners during an active round enter a waiting state until the next
  round.
- Inactive rooms expire after 30 minutes.

Acceptance criteria:

- Stage and controller both reconnect to the same room after browser refresh.
- If the host refreshes during lobby, host status is restored.
- If a room expires, stage and controller show a clear expired-room state.
- QR code can be scanned from a normal TV viewing distance in a manual test.

#### 2. Profiles And Host Controls

Functional requirements:

- Players can enter a display name.
- Players can select an avatar from an original safe set.
- Display names and avatars persist on the same device.
- Host can start a round.
- Host can change:
  - grid size
  - round duration
  - minimum word length
  - hint setting
  - Word Challenge on/off
- Host can remove or rename abusive player names/avatars.
- Host transfer happens automatically if the host disconnects mid-round.
- One profile can have only one active device connection.

Acceptance criteria:

- If a second device joins with the same profile token, the newest connection
  replaces the old one or prompts handoff according to implementation choice.
- Host transfer chooses a connected player deterministically.
- Removed players can no longer submit words in the active room.

#### 3. Game Setup

Functional requirements:

- Party Mode is the only selectable mode in v1.
- Daily Puzzle is absent or visibly unavailable only if needed for visual parity.
- Host settings are available by default.
- The board is generated from a server-side seed.
- All players receive the same board.
- The server precomputes or caches valid words for the round according to:
  - board
  - dictionary
  - minimum word length
  - grid size
- The countdown uses high-fidelity visual treatment and can be reduced when
  reduced-motion is enabled.

Acceptance criteria:

- Same seed and settings always generate the same board and valid-word set.
- Changing minimum word length changes hint candidates and accepted submission
  rules.
- Reduced-motion mode replaces large animated countdown with a stable countdown.

#### 4. Word Entry

Functional requirements:

- Players can form words by swiping adjacent tiles.
- Players can form words by tapping adjacent tiles.
- A tile can be used only once per word.
- Selection feedback shows active path, current letters, invalid movement, and
  submission result.
- Invalid words have no score penalty.
- Duplicate submissions by the same player are rejected.
- Controller shows:
  - current timer
  - current selected word
  - board
  - submission feedback
  - connection state
  - player score or found count

Acceptance criteria:

- Non-adjacent paths are rejected client-side and server-side.
- Reused tiles are rejected client-side and server-side.
- The server rejects words submitted after the round end timestamp.
- The client disables entry immediately when the server says the round ended.
- Keyboard entry can select tiles and submit on supported routes.

#### 5. Hints

Functional requirements:

- Hints are host-configurable.
- If hints are enabled, inactive players can request a hint.
- A hint chooses a valid word at or above the minimum word length.
- Hint animation reveals the path in sequence.
- Hints do not change score.
- Hints can be disabled by host setting.

Acceptance criteria:

- No hint suggests a word outside the valid precomputed set.
- Hints respect minimum word length.
- Reduced-motion mode uses non-animated path highlight.

#### 6. Timer And Fairness

Functional requirements:

- Server time is authoritative.
- Rounds have strict 0 ms grace after `endsAt`.
- Clients receive `startsAt`, `endsAt`, and periodic sync messages.
- The stage and controllers show consistent countdowns.
- Submissions include client timestamp for analytics only, not scoring.

Acceptance criteria:

- A submission received by the room after `endsAt` is rejected.
- Timer tests cover clock skew and delayed messages.
- Round cannot start if the room has no connected players.

#### 7. Scoring

Functional requirements:

- Base score follows the Netflix-style length formula.
- Unique words found by exactly one player score double.
- Rejected challenged unique words lose the double bonus.
- Invalid words score zero.
- Disconnected players' submitted words remain eligible.
- End-round results show:
  - final rank
  - player scores
  - words found count
  - unique words
  - longest word
  - achievement progress

Acceptance criteria:

- Engine tests cover base score, duplicate same-player submissions,
  cross-player duplicates, unique bonus, challenge rejection, disconnected
  players, and ties.
- The scoring output is deterministic and serializable for replay/debugging.

#### 8. Word Challenge

Functional requirements:

- If enabled, Word Challenge starts after the active round ends and before final
  scores.
- Challenge candidates are unique words from the round.
- Each eligible player can challenge one word or pass.
- The owner of a challenged word is initially hidden where parity calls for it.
- The challenged player can explain the word.
- The challenger can accept or reject.
- Rejected challenged words lose the unique/double bonus, but keep base points.
- No dictionary definitions are shown in v1.

Acceptance criteria:

- Challenge state is synchronized on stage and controllers.
- The challenge phase cannot deadlock if a player disconnects.
- Timeouts or host controls can advance stalled challenge steps.
- Challenge outcomes are stored in the round result.

#### 9. Stage UI

Functional requirements:

- Stage route is optimized for TV/projector and desktop browsers.
- Stage shows:
  - logo/title treatment
  - QR/join code
  - player list or player count
  - room status
  - host label
  - timer
  - board
  - scoreboard prioritizing top scores
  - end-round reveal
- Stage should use near-pixel layout and motion references from the supplied
  screenshots, while keeping any private prototype assets isolated and
  replaceable.

Acceptance criteria:

- Stage works at 16:9 desktop, 4K-ish TV, and common laptop sizes.
- Stage does not require hover or keyboard to understand current state.
- Top-score board remains readable with 20 players.
- QR/join affordance remains visible in lobby and solo waiting states.

#### 10. Controller UI

Functional requirements:

- Controller route is optimized for mobile portrait.
- Controller should be mobile-native, not a direct copy of every Netflix
  persistent top control.
- Controller supports:
  - profile setup
  - host settings
  - start game if host
  - waiting state if not host
  - board input
  - hint controls
  - challenge phase controls
  - results view
  - reconnect state
- Haptics are optional and can be disabled.

Acceptance criteria:

- Controller works on iOS Safari and Android Chrome.
- Touch targets meet mobile usability standards.
- Text does not overflow on a narrow iPhone viewport.
- Reduced-motion mode disables decorative motion.

#### 11. Achievements And Local Progress

Functional requirements:

- V1 includes achievements only.
- Achievements do not gate settings.
- Progress persists on the same device.
- Achievement examples:
  - first valid word
  - 10 words in one round
  - first unique word
  - first 5+ letter word
  - longest word personal best
  - win a round
  - complete 3 rounds
- Achievement progress can appear in end-round reveal.

Acceptance criteria:

- Achievements update only from authoritative round results.
- Same-device profile can recover progress after browser refresh.
- Clearing local data resets local progress.

#### 12. Moderation

Functional requirements:

- Display name filtering runs at join/profile edit.
- Avatar options are controlled and safe.
- Host can remove a player.
- Host can force rename or reset a display name.
- Abuse-related room actions emit analytics/debug events.

Acceptance criteria:

- Blocked names cannot be saved.
- Host moderation events sync to affected controller and stage.
- Removed players cannot reconnect with the same room token without rejoining.

#### 13. Analytics And Observability

Functional requirements:

- Track retention-oriented events without collecting unnecessary personal data.
- Required event groups:
  - room created
  - room joined
  - player connected/disconnected/reconnected
  - round configured/started/completed/abandoned
  - word submitted/accepted/rejected
  - challenge started/resolved/skipped
  - connection failure
  - moderation action
  - achievement earned
- Events should include room/session IDs, coarse device category, browser, and
  timings where useful.

Acceptance criteria:

- Analytics failures never block gameplay.
- Local/dev analytics can be inspected without production credentials.
- Event schema is documented before implementation.

#### 14. Accessibility

Functional requirements:

- Keyboard support for core stage/controller actions.
- Screen-reader labels for controls and state changes.
- Reduced-motion support.
- Optional haptics toggle.
- Color contrast sufficient for tile letters, buttons, and status text.
- Non-color cues for accepted/rejected submissions.

Acceptance criteria:

- A keyboard-only smoke test can join, configure, start, select tiles, submit,
  and view results in desktop Chrome.
- Screen-reader announcements exist for join status, round start/end,
  submission result, and challenge prompts.
- `prefers-reduced-motion` changes countdown/tile/reveal animations.

### Open Questions

There are no open product-scope questions blocking v1 planning. Known
implementation choices still need to be decided inside the build:

- Exact open-source dictionary source and filtering rules.
- Exact Cloudflare data split between Durable Object storage, browser storage,
  and any future account store.
- Whether optional accounts are included in v1 UI or only represented as a
  future-ready identity boundary.
- Exact challenge candidate ordering and timeout rules.
- Exact visual asset strategy for private prototype vs replaceable public-safe
  assets.

### Ship Plan

Ship the smallest coherent v1 in six milestones:

1. Game engine and dictionary pipeline.
2. Single-device playable controller prototype.
3. Cloudflare room architecture and realtime skeleton.
4. Full multiplayer Party Mode with stage and controller.
5. Word Challenge, achievements, moderation, analytics, and load tests.
6. Visual fidelity, accessibility hardening, smart-TV QA, and private
   Cloudflare deployment.

Each milestone must leave the app playable or testable. Avoid a long branch
where the engine, UI, and realtime layer only come together at the end.

## Technical Strategy

### Diagnosis

The core technical challenge is not drawing a Boggle board. It is keeping a
fast, polished, realtime party-game loop fair and synchronized across one shared
stage and up to 20 phone controllers, while preserving enough visual fidelity to
feel like the target experience.

The riskiest areas are:

- realtime room coordination
- strict server cutoff for submissions
- 20-player load behavior
- word validation performance
- mobile input ergonomics
- challenge phase state transitions
- smart-TV browser compatibility
- later replacement of private prototype branding/assets

### Guiding Policies

- Use boring tools where possible.
- Keep the game engine pure and independent from UI and Cloudflare.
- Make the server authoritative for fairness.
- Use one Durable Object per room, the natural atom of coordination.
- Precompute/cached valid words per round to keep submissions fast.
- Build load tests before final visual polish.
- Keep private-clone branding and replaceable production branding separate.
- Treat accessibility as part of the input model, not a cleanup task.
- Every phase should produce a runnable or testable artifact.

### Standard Kit

Recommended stack:

- TypeScript.
- React + Vite for stage and controller UI.
- Cloudflare Workers Static Assets for full-stack deployment.
- Cloudflare Durable Objects for room coordination.
- Durable Object WebSockets with hibernation where possible.
- Durable Object SQLite storage for room/round state that must survive
  hibernation, restart, or reconnect.
- Cloudflare Workers `@cloudflare/vitest-pool-workers` for Worker/Durable
  Object tests.
- Vitest for pure engine and client logic.
- Playwright for browser, mobile viewport, and stage/controller E2E tests.
- A lightweight load-test harness using Node/WebSocket clients or k6, depending
  on local setup.

Cloudflare guidance checked during this spec:

- Cloudflare recommends Workers Static Assets for new static/full-stack apps on
  Workers.
- Durable Objects are a documented fit for coordinating multiple WebSocket
  clients in chat rooms or multiplayer games.
- Current Durable Object guidance emphasizes one object per coordination atom,
  SQLite-backed storage, alarms, and hibernatable WebSockets.
- Cloudflare documents testing Durable Objects with
  `@cloudflare/vitest-pool-workers`, including direct instance access and
  alarm testing.

### Architecture

```text
Browser stage route
  -> Worker HTTP route
  -> Room Durable Object
  -> WebSocket broadcast

Phone controller route
  -> Worker HTTP route
  -> Room Durable Object
  -> WebSocket commands/events

PWA shell
  -> Web app manifest
  -> Service worker app-shell cache
  -> Network-only `/api/*` and `/ws/*`

Pure game engine
  -> board generation
  -> path validation
  -> dictionary lookup
  -> valid-word precompute
  -> scoring
  -> challenge outcome scoring
```

Recommended route shape:

- `/` landing/create-room entry
- `/stage/:roomCode` shared screen
- `/join/:roomCode` controller join
- `/controller/:roomCode` active controller
- `/api/rooms` create room
- `/api/rooms/:roomCode` room metadata
- `/ws/:roomCode` WebSocket upgrade routed to room Durable Object
- `/manifest.webmanifest` PWA install metadata
- `/service-worker.js` shell cache and static-asset cache strategy

Recommended room Durable Object responsibilities:

- create/load room state
- accept/reject WebSocket connections
- track players and host
- enforce one active device per profile
- manage room settings
- start countdown and round
- store `startsAt` and `endsAt`
- validate submissions
- maintain accepted/rejected submissions
- broadcast room events
- run challenge phase
- compute final scores
- update local-progress payloads sent to clients
- schedule room expiry alarm
- clear expired room storage

Recommended client responsibilities:

- render stage/controller states
- provide optimistic path feedback
- prevent obvious invalid paths before sending
- show server-authoritative submission result
- handle reconnect and state resync
- persist local profile/progress
- register the service worker only in production builds
- keep room APIs and WebSocket routes network-only
- show a clear reconnect/offline state instead of pretending active rounds work
  offline
- respect reduced motion and haptics settings

### Core State Machine

Room states:

```text
created
  -> lobby
  -> configuring
  -> countdown
  -> active_round
  -> challenge_phase
  -> scoring_reveal
  -> achievements
  -> lobby
  -> expired
```

Controller states:

```text
unpaired
  -> joining
  -> profile_setup
  -> lobby_host | lobby_player
  -> countdown
  -> active_input
  -> challenge_select | challenge_defend | challenge_wait
  -> results
  -> disconnected
  -> reconnecting
```

### Data Model

```ts
type RoomStatus =
  | "lobby"
  | "configuring"
  | "countdown"
  | "active_round"
  | "challenge_phase"
  | "scoring_reveal"
  | "achievements"
  | "expired";

type Room = {
  id: string;
  joinCode: string;
  status: RoomStatus;
  createdAt: string;
  expiresAt: string;
  hostPlayerId: string | null;
  settings: RoundSettings;
  playerOrder: string[];
  activeRoundId: string | null;
  softCapWarningShown: boolean;
};

type Player = {
  id: string;
  profileTokenHash: string;
  displayName: string;
  avatarId: string;
  role: "host" | "player";
  connectionStatus: "connected" | "disconnected" | "removed";
  connectedAt: string;
  lastSeenAt: string;
  deviceLabel?: string;
};

type RoundSettings = {
  mode: "party";
  gridSize: 4 | 5 | 6;
  durationSeconds: 30 | 60 | 90 | 120 | 180;
  minimumWordLength: 3 | 4 | 5;
  wordChallengeEnabled: boolean;
  hintsEnabled: boolean;
  language: "en";
};

type Round = {
  id: string;
  roomId: string;
  seed: string;
  grid: LetterTile[][];
  validWordSetId: string;
  startsAt: string;
  endsAt: string;
  status: "pending" | "active" | "ended" | "challenging" | "scored";
};

type Submission = {
  id: string;
  roundId: string;
  playerId: string;
  word: string;
  normalizedWord: string;
  path: TileCoord[];
  accepted: boolean;
  rejectedReason?:
    | "too_short"
    | "not_adjacent"
    | "reused_tile"
    | "not_in_word_list"
    | "duplicate"
    | "round_ended"
    | "removed_player"
    | "rate_limited";
  submittedAtServer: string;
  submittedAtClient?: string;
};

type Challenge = {
  id: string;
  roundId: string;
  challengerPlayerId: string;
  ownerPlayerId: string;
  normalizedWord: string;
  status: "pending_owner" | "pending_judgment" | "accepted" | "rejected" | "skipped";
  ownerExplanation?: string;
  resolvedAt?: string;
};

type ScoreLine = {
  playerId: string;
  baseScore: number;
  uniqueBonus: number;
  challengeAdjustments: number;
  finalScore: number;
  acceptedWordCount: number;
  uniqueWordCount: number;
  longestWord: string | null;
};
```

### Event Protocol

Client to server:

- `join_room`
- `update_profile`
- `host_update_settings`
- `host_start_round`
- `submit_path`
- `request_hint`
- `challenge_select_word`
- `challenge_submit_explanation`
- `challenge_accept_word`
- `challenge_reject_word`
- `challenge_pass`
- `host_remove_player`
- `host_force_rename`
- `ping`

Server to client:

- `room_snapshot`
- `player_joined`
- `player_updated`
- `player_removed`
- `host_changed`
- `settings_updated`
- `soft_cap_warning`
- `countdown_started`
- `round_started`
- `timer_sync`
- `submission_result`
- `round_ended`
- `challenge_started`
- `challenge_prompt`
- `challenge_updated`
- `scores_revealed`
- `achievement_earned`
- `room_expired`
- `error`
- `pong`

Protocol requirements:

- Every mutating client event includes `clientMessageId`.
- Server responses include `serverEventId`.
- Client can request `room_snapshot` after reconnect.
- Server ignores duplicate `clientMessageId` from the same connection/profile.

## Phased Implementation Plan

### Phase 0: Project Foundation

Goal: create the deployable app skeleton and shared quality gates.

Build:

- Initialize TypeScript React/Vite app.
- Add Cloudflare Worker entry with Static Assets.
- Add Durable Object binding stub.
- Add shared package folders:
  - `src/engine`
  - `src/protocol`
  - `src/room`
  - `src/ui/stage`
  - `src/ui/controller`
  - `src/testing`
- Add lint/typecheck/test scripts.
- Add Playwright config.
- Add Worker/Vitest pool config.
- Add basic route shell for stage and controller.

Tests:

- Typecheck passes.
- Empty Worker/Durable Object test passes in Workers runtime.
- Playwright smoke loads root, stage, and controller routes.
- CI or local check command runs all phase-0 checks.

Exit criteria:

- The app can run locally and deploy as a static/full-stack Worker shell.

### Phase 1: Pure Game Engine

Goal: make the core game rules deterministic, fast, and testable without UI.

Build:

- Seeded random generator.
- Board generator for 4x4, 5x5, 6x6.
- Tile path validator.
- Word normalization.
- Open-source dictionary importer.
- Modern clean dictionary filtering pipeline.
- Valid-word precompute for a board.
- Base scoring.
- Unique-word scoring.
- Challenge adjustment scoring.
- Achievement evaluator from final score results.

Tests:

- Unit tests for board determinism.
- Unit tests for all path rules.
- Dictionary filtering tests.
- Valid-word precompute tests with fixed boards.
- Scoring tests for:
  - 3, 4, 5, and 6+ letter words
  - duplicate same-player submissions
  - duplicate cross-player submissions
  - unique double score
  - rejected challenge removing unique bonus
  - disconnected player words remaining eligible
  - ties
- Property-style tests for path validation boundaries.

Exit criteria:

- Engine can produce a complete round result from fixture submissions.
- Engine is independent from React and Cloudflare imports.

### Phase 2: Single-Device Playable Prototype

Goal: prove word input, feedback, hints, timer display, and results locally.

Build:

- Mobile controller board UI.
- Swipe input.
- Tap input.
- Keyboard fallback input.
- Current word preview.
- Accepted/rejected feedback.
- Hint button and hint path animation.
- Local timer simulation.
- Local result screen.
- Reduced-motion variants.
- Basic stage board render.
- First PWA baseline: manifest metadata, app icon, production-only service
  worker registration, and an offline shell cache that excludes realtime routes.

Tests:

- Vitest tests for controller input reducer.
- Playwright mobile viewport tests for:
  - tap word
  - swipe word
  - invalid non-adjacent path
  - duplicate submission
  - accepted common dictionary words from the generated board-specific
    dictionary subset
  - hint request
  - reduced-motion hint behavior
- PWA asset smoke tests for manifest and realtime-route cache exclusions.
- Accessibility smoke with keyboard path.
- Visual screenshots for core controller states.

Exit criteria:

- One browser can play a complete local round on a fixed board.

### Phase 3: Realtime Room Skeleton

Goal: prove Cloudflare room coordination before polishing UI.

Build:

- Room Durable Object with SQLite-backed state.
- WebSocket upgrade and routing.
- Join code generation.
- Stage connection.
- Controller connection.
- Room snapshot protocol.
- Player join/profile update.
- Host assignment.
- Host transfer on disconnect.
- One active device per profile.
- Room expiry alarm.
- Reconnect/resync.
- Minimal host settings update.
- Minimal round start/end event flow.
- Realtime routes remain network-only under the PWA service-worker strategy.

Tests:

- Workers/Vitest tests for Durable Object room creation.
- Workers/Vitest tests for SQLite persistence.
- Workers/Vitest tests for expiry alarm.
- WebSocket integration tests for:
  - stage connects
  - 20 controllers connect
  - host assigned
  - profile update broadcast
  - disconnect/reconnect
  - host auto-transfer
  - one active device rule
- First load test: 20 clients join and receive snapshots.

Exit criteria:

- 20 simulated players can join one room and receive consistent room snapshots.

### Phase 4: Multiplayer Party Mode

Goal: ship the core room game loop end to end.

Build:

- Host settings UI.
- Server-side board generation.
- Server-side `startsAt`/`endsAt`.
- Countdown event.
- Active round event.
- Server-authoritative submission validation.
- Submission rate limits.
- Submission result broadcast to submitting controller.
- Stage scoreboard updates.
- Strict 0 ms cutoff.
- Round-end scoring.
- Results on stage and controllers.
- Disconnected submissions remain eligible.

Tests:

- Workers/Vitest tests for round lifecycle.
- Workers/Vitest tests for strict cutoff.
- Workers/Vitest tests for rate limiting.
- Workers/Vitest tests for final scoring.
- Playwright two-browser E2E for host + player.
- Playwright multi-context E2E for 4 players.
- Load test for 20 players submitting at realistic pace.
- Load test for burst submissions near round end.

Exit criteria:

- 20-player simulated Party Mode completes with correct scores.
- Manual playtest can run a full round on stage + multiple phones.

### Phase 5: Challenge, Achievements, Moderation, Analytics

Goal: add the v1 completeness features that make the product feel real.

Build:

- Word Challenge candidate selection.
- Challenge UI on stage and controllers.
- Challenge pass/accept/reject flow.
- Challenge timeout and disconnect handling.
- Challenge scoring adjustment.
- Achievement engine integration.
- Local progress persistence.
- Profile moderation filters.
- Host remove player.
- Host force rename/reset.
- Analytics event schema and local/dev sink.
- Production analytics adapter boundary.

Tests:

- Engine tests for challenge outcome scoring.
- Workers/Vitest tests for challenge state machine.
- Workers/Vitest tests for challenge disconnect/timeouts.
- Playwright E2E:
  - challenger rejects word
  - challenger accepts word
  - player passes
  - challenged player disconnects
  - host removes abusive player
  - achievement earned after round
- Analytics schema tests.
- Moderation filter tests.

Exit criteria:

- Full v1 functional scope works before final visual polish.

### Phase 6: Visual Fidelity, Accessibility, Smart-TV QA, Deployment

Goal: bring the prototype to the agreed private high-fidelity bar and deploy.

Build:

- Stage visual pass against screenshots.
- Controller visual pass against screenshots while preserving mobile-native
  direction.
- 3D countdown treatment.
- Tile selection/accepted/rejected animation.
- Playful result reveal.
- Top-score-first 20-player scoreboard polish.
- Reduced-motion final pass.
- Screen-reader announcements.
- Haptics toggle.
- Smart-TV browser compatibility fixes.
- Cloudflare preview deploy.
- PWA install QA on iOS Safari and Android Chrome.
- Offline shell QA for home/controller/stage route fallback.
- Reconnect/offline messaging QA for rooms when network returns.
- Production/private deploy checklist.

Tests:

- Playwright visual screenshots for:
  - stage join
  - stage lobby
  - stage active round
  - stage results
  - controller join
  - controller lobby host
  - controller active input
  - controller challenge
  - controller results
- Accessibility smoke tests.
- Manual iOS Safari and Android Chrome playtest.
- PWA install/add-to-home-screen smoke on iOS Safari and Android Chrome.
- Offline shell smoke test.
- Desktop Chrome and Safari playtest.
- Smart-TV browser smoke test.
- Final 20-player load test.
- Deployment smoke test against Cloudflare preview URL.

Exit criteria:

- Private deployed prototype meets v1 acceptance criteria and is ready for
  realistic remote playtesting.

## Testing Plan

### Test Pyramid

Unit tests:

- engine
- scoring
- dictionary filtering
- input reducers
- protocol validators
- achievement evaluator

Worker/Durable Object tests:

- room lifecycle
- storage
- alarms
- WebSocket coordination
- host transfer
- cutoff enforcement
- reconnect
- challenge state machine

Browser/E2E tests:

- stage/controller join
- host settings
- round lifecycle
- mobile input
- challenge flow
- moderation
- accessibility smoke

Load tests:

- 20 joins
- 20 active submitters
- burst submissions
- reconnect storm
- host disconnect
- room expiry

Manual tests:

- real phone QR scan
- iOS Safari
- Android Chrome
- desktop Safari
- desktop Chrome
- smart-TV browser
- video-call remote play

### Required Test Scenarios

1. Host creates room and first player becomes host.
2. 20 players join and receive consistent lobby state.
3. Player 21 triggers soft-cap warning without corrupting state.
4. Host configures 4x4/5x5/6x6 and each timer option.
5. Player submits valid word by swipe.
6. Player submits valid word by tap.
7. Player attempts non-adjacent path.
8. Player attempts reused tile.
9. Player submits duplicate word.
10. Player submits after strict cutoff.
11. Round ends and unique double scoring is correct.
12. Disconnected player's words remain eligible.
13. Host disconnects mid-round and host transfers.
14. Same profile joins from a second device.
15. Hint request respects minimum word length.
16. Word Challenge accept keeps unique bonus.
17. Word Challenge reject removes unique bonus.
18. Challenge phase handles disconnected challenged player.
19. Host removes abusive player.
20. Achievement earned after round.
21. Reduced-motion mode changes countdown and tile animations.
22. Keyboard-only input completes a word.
23. Screen reader announces submission result.
24. Room expires after inactivity.
25. Cloudflare deployed preview completes full round.

### Quality Gates

Every PR or phase should run:

- typecheck
- lint
- engine unit tests
- relevant Worker/Durable Object tests
- relevant Playwright tests

Before visual polish:

- 20-player join load test passes.
- 20-player submission load test passes.
- strict cutoff tests pass.
- reconnect/host-transfer tests pass.

Before private deploy:

- full E2E path passes on deployed preview.
- manual mobile browser smoke tests pass.
- accessibility smoke tests pass.
- analytics local/dev sink shows expected events.
- no proprietary assets are accidentally committed unless explicitly intended
  for private prototype and isolated for replacement.

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| 0 ms cutoff feels unfair remotely | Make server time visible, disable input decisively, measure rejected-late submissions, revisit after playtests. |
| Dictionary quality causes disputes | Keep dictionary pipeline pluggable, log rejected-word patterns, add curated allow/deny overrides. |
| Near-pixel private prototype creates public-launch risk | Keep brand, copy, and assets isolated behind theme/content layers. |
| 20-player load breaks late | Load-test room skeleton before final UI polish. |
| Challenge phase deadlocks | Add timeouts, host override, and disconnect resolution rules. |
| Smart-TV browser support slows build | Treat smart TV as stage-only smoke target, not full controller/browser parity. |
| Optional accounts expand scope | Ship guest-first with account-ready identity interfaces, defer cloud sync unless trivial. |
| Accessibility conflicts with swipe-first UI | Build tap and keyboard input as first-class alternatives. |

## Recommended Next Step

Start Phase 0 and Phase 1 together:

- scaffold the Cloudflare/React/TypeScript project,
- define the pure engine API,
- choose and import the first open-source dictionary,
- write engine fixture tests before building multiplayer UI.

This keeps the riskiest product logic testable before the realtime and visual
layers add complexity.

## External Platform References

- Cloudflare Workers Static Assets:
  https://developers.cloudflare.com/workers/static-assets/
- Cloudflare Workers best practices:
  https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
- Durable Objects overview:
  https://developers.cloudflare.com/durable-objects/concepts/what-are-durable-objects/
- Durable Objects best practices:
  https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/
- Durable Objects testing:
  https://developers.cloudflare.com/durable-objects/examples/testing-with-durable-objects/
