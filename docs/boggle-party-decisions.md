# Boggle Party Clone Decisions

Date: 2026-05-30

Source export:
`/Users/adamsardo/Downloads/boggle-party-decisions-2026-05-30.json`

Answered: 40/40

## Product Direction

Build a web-only v1, hosted on Cloudflare, focused first on Party Mode. The
experience should be a near-pixel private prototype that uses Boggle-facing copy
and Netflix/Boggle naming for now, while the deployment path remains
"prototype, then decide." This means implementation can prioritize parity in the
local/private artifact, but the codebase should keep naming, copy, and visual
assets isolated enough to replace before any public launch.

The v1 game should use a shared stage view, require players to see that stage,
and include a dedicated main-screen route optimized for TVs/projectors. Phone
controllers should feel mobile-native rather than copying every persistent top
control from Netflix's controller UI.

## V1 Scope

Included in v1:

- Party Mode first.
- Web-only app.
- Cloudflare deployment target.
- Private rooms joined by code/link.
- Optional accounts, but playable without requiring sign-in.
- All advanced gameplay options available by default.
- Full word challenge parity, but no definitions in v1.
- No pranks.
- Host-configurable hints.
- Minimum word length affects hint generation and precomputed word sets.
- English-only dictionary.
- Open-source word list with modern clean filtering.
- Dedicated TV/projector stage route.
- High-fidelity 3D countdown typography and tile animation.
- Playful animated end-round reveal.
- Achievements, but no trophy room/unlock gating in v1.
- Same-device progress persistence.
- 30 minute inactive room lifetime.
- Full name/avatar moderation.
- Strong v1 anti-cheat protections.
- Early load tests before UI polish.

Deferred or excluded:

- Daily Puzzle.
- Daily streaks.
- Pranks.
- Challenge-word definitions.
- Cloud-synced progress across devices.
- Public lobbies.

## Multiplayer Decisions

- Target cap: soft cap with warning at 20 players.
- Spectators are not explicitly included in v1.
- Final-second submissions use a strict 0 ms server cutoff.
- If host disconnects mid-round, the round continues and host transfers
  automatically.
- If a player disconnects mid-round, submitted words remain eligible for
  scoring and unique/double scoring.
- One active device per profile.
- Strong anti-cheat is required in v1.

Implementation implications:

- The server must be authoritative for round state, timer, path validation,
  dictionary validation, duplicate detection, scoring, challenge outcomes, and
  host transfer.
- Because the cutoff is 0 ms, the UI needs a very clear server-synced countdown
  and should disable submission immediately at round end.
- A soft 20-player cap needs room state that can represent at-cap and over-cap
  states without breaking joins.
- Load tests should happen before heavy visual polish.

## UI Decisions

- Main screen/stage route is required.
- Remote players need the shared stage view.
- Phone controller should be mobile-native.
- Countdown and tile animation fidelity is high priority.
- 20-player scoreboard should prioritize top scores.
- End-round reveal should be playful and animated.

Implementation implications:

- Stage UX can assume the main board, timer, QR/link join, host status, and
  leaderboard are primary.
- Controller UX should still show enough local feedback for word entry, but it
  does not need to be fully playable without the stage.
- The 20-player stage scoreboard can optimize for ranking rather than showing
  everyone equally all the time.

## Dictionary Decisions

- English-only v1.
- Use an open-source word list.
- Apply modern clean filtering.
- No challenge definitions in v1.

Implementation implications:

- The dictionary pipeline needs a filter stage for offensive, archaic,
  proper-noun, abbreviation, and overly technical entries.
- Because definitions are excluded, the Word Challenge flow should rely on
  player explanation and challenger judgment.
- We should keep the dictionary source pluggable so a licensed list can replace
  the open-source source later.

## Progression Decisions

- Achievements only in v1.
- Progress persists on the same device only.
- No Daily Puzzle v1.
- No daily streaks v1.

Implementation implications:

- Local storage or IndexedDB can hold profile/progress for v1.
- Achievements should not gate settings.
- Profile migration to accounts should be possible later but does not block v1.

## Operations Decisions

- Inactive rooms expire after 30 minutes.
- Full moderation controls for names and avatars are required.
- Analytics required:
  - retention
  - round completion
  - word submissions
  - connection failures
- Accessibility required:
  - keyboard support
  - screen reader support
  - reduced motion
  - optional haptics
- Target devices:
  - iOS Safari
  - Android Chrome
  - desktop Chrome
  - desktop Safari
  - smart TV browser

Implementation implications:

- Smart TV browser support raises the QA bar for the stage route.
- Accessibility requirements affect swipe/tap input design: keyboard and
  assistive alternatives should be part of the input model, not an afterthought.
- Analytics events should be designed while implementing the state machine, not
  added afterward.

## Decision Table

| ID | Category | Decision |
| --- | --- | --- |
| 1 | Product and Legal Boundary | Use Netflix/Boggle naming |
| 2 | Product and Legal Boundary | Near-pixel clone for private prototype |
| 3 | Product and Legal Boundary | Prototype, then decide |
| 4 | Product and Legal Boundary | Use Boggle-facing copy |
| 5 | Platform and Deployment | Web-only v1 |
| 6 | Platform and Deployment | Cloudflare |
| 7 | Platform and Deployment | Optional accounts |
| 8 | Platform and Deployment | Private code/link only |
| 9 | Platform and Deployment | Shared stage required |
| 10 | Gameplay Scope | Party Mode first |
| 11 | Gameplay Scope | All available by default |
| 12 | Gameplay Scope | Full challenge parity |
| 13 | Gameplay Scope | No pranks ever |
| 14 | Gameplay Scope | Host configurable hints |
| 15 | Gameplay Scope | Minimum word length affects hints and precomputed word set |
| 16 | Dictionary and Language | English-only v1 |
| 17 | Dictionary and Language | Open-source word list |
| 18 | Dictionary and Language | Modern clean list |
| 19 | Dictionary and Language | No definitions in v1 |
| 20 | Multiplayer and Fairness | Soft cap with warning |
| 21 | Multiplayer and Fairness | 0 ms final-submission grace |
| 22 | Multiplayer and Fairness | Continue and auto-transfer host |
| 23 | Multiplayer and Fairness | Disconnected submitted words remain eligible |
| 24 | Multiplayer and Fairness | One active device |
| 25 | Multiplayer and Fairness | Strong v1 anti-cheat protections |
| 26 | UI and Experience | Dedicated stage route |
| 27 | UI and Experience | Mobile-native phone controller |
| 28 | UI and Experience | High countdown/tile animation fidelity |
| 29 | UI and Experience | Top-score-first 20-player scoreboard |
| 30 | UI and Experience | Playful animated end-round reveal |
| 31 | Progression | Achievements only |
| 32 | Progression | Same-device progress persistence |
| 33 | Progression | No daily streaks in v1 |
| 34 | Progression | No Daily Puzzle v1 |
| 35 | Production Operations | 30 minute inactive room lifetime |
| 36 | Production Operations | Full moderation |
| 37 | Production Operations | Retention, round completion, word submissions, connection failures |
| 38 | Production Operations | Keyboard, screen reader, reduced motion, optional haptics |
| 39 | Production Operations | iOS Safari, Android Chrome, desktop Chrome, desktop Safari, smart TV browser |
| 40 | Production Operations | Build load tests early |

## Tensions To Confirm Before Build

These decisions are workable, but they create important constraints:

- Exact Netflix/Boggle naming plus future public deployment is risky. Keep
  brand/copy isolated so it can be replaced.
- Near-pixel private prototype plus full moderation/analytics/smart-TV support
  mixes prototype and production goals. The first milestone should define how
  production-grade the private prototype needs to be.
- Shared stage required may make remote play dependent on a video call or screen
  share. If remote players cannot reliably see the stage, controller-only
  playability may need to come back.
- 0 ms submission grace is strict for remote play. It is fair by server clock,
  but can feel harsh under mobile network latency.
- Full word challenge parity without definitions keeps the social mechanic but
  removes a documented host setting; the challenge UI should make this clear.
