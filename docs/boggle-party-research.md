# Boggle Party Clone Research

Date: 2026-05-30

This document captures the research baseline for building a production-ready,
remote multiplayer Boggle Party-style game. The target is to reproduce the
interaction model and game mechanics closely, while using original branding,
illustration, sounds, copy, and UI assets.

## Research Status

Public source confidence is high for the core rules, modes, scoring, lobby
flow, controller model, profile model, unlock model, and supported settings.
Screenshot confidence is high for the visual layout and many state transitions.
Unknowns remain around the exact end-of-round sequence, prank catalog, advanced
unlock thresholds, daily leaderboard presentation, all avatar options, sound
design, and animation timing.

Official Netflix sources describe Boggle Party as a TV/browser game for 1-8
players. The product goal for this project is up to 20 remote players, so that
is an intentional extension rather than a researched parity feature.

## Source Inventory

Primary public sources:

- Netflix Help Center, Boggle Party game support:
  https://help.netflix.com/en/node/486016964629093
- Netflix Games Support, Getting Started:
  https://games-netflix.helpshift.com/hc/en/42-boggle-party/section/372-getting-started/?p=web
- Netflix Games Support, Gameplay and Features:
  https://games-netflix.helpshift.com/hc/en/42-boggle-party/section/373-gameplay-features-1754907119/?p=all
- Netflix Games Support, Controls and Settings:
  https://games-netflix.helpshift.com/hc/en/42-boggle-party/section/376-controls-settings/?p=web
- Netflix Tudum article on TV party games:
  https://www.netflix.com/tudum/articles/netflix-party-games-play-on-tv

Local screenshot and photo sources:

- Phone UI screenshots: `/Users/adamsardo/Downloads/IMG_5767.PNG` through
  `/Users/adamsardo/Downloads/IMG_5789.PNG`
- TV photos: `/Users/adamsardo/Downloads/IMG_5765.JPG`,
  `/Users/adamsardo/Downloads/IMG_5766.JPG`,
  `/Users/adamsardo/Downloads/IMG_5769.JPG`,
  `/Users/adamsardo/Downloads/IMG_5771.JPG`,
  `/Users/adamsardo/Downloads/IMG_5773.JPG`,
  `/Users/adamsardo/Downloads/IMG_5775.JPG`,
  `/Users/adamsardo/Downloads/IMG_5778.JPG`,
  `/Users/adamsardo/Downloads/IMG_5782.JPG`,
  `/Users/adamsardo/Downloads/IMG_5785.JPG`

## Confirmed Product Model

Boggle Party is a second-screen party game:

- The main screen runs on TV or desktop browser.
- Each player uses a phone or tablet as a controller.
- Players join by scanning a QR code displayed on the main screen.
- The first connected player becomes host by default.
- The host selects mode and round settings, starts rounds, manages profiles,
  can transfer host, and can delete disconnected profiles.
- Players can customize a profile name and avatar in the lobby.
- Players cannot customize name/avatar during an active round.
- The original supports 1-8 players. This project should support up to 20.
- Offline play is not supported in the original; a stable internet connection is
  part of the expected experience.
- Late joiners wait for the next round if a round is already active.
- Solo sessions keep the QR code visible so friends can join later.

## Confirmed Modes

### Party Mode

Party Mode is the main social mode. Players search the same random letter grid
against a timer. At round end, the shared display reveals found words and scores.
Party Mode supports solo play and multiplayer play.

Host-configurable settings:

- Grid size: 4x4, 5x5, 6x6
- Duration: 30, 60, 90, 120, or 180 seconds
- Minimum word length: 3 by default, with 4 and 5 letter minimums unlockable
- Word Challenge: unlockable
- Pranks: unlockable
- Challenge-word definitions: host setting in controller menu

### Daily Puzzle

Daily Puzzle is a global async competition:

- Daily board changes each day.
- Same-language players share the same daily puzzle.
- It uses a 4x4 grid and a 90 second timer.
- Only the first score of the day counts for ranking/challenge purposes.
- Past Daily Puzzles can be replayed for practice.
- Replaying old puzzles does not increase the daily streak.
- Daily Puzzle is initially locked in the observed screenshots, with copy
  indicating it unlocks after 3 rounds or 2 achievements.

## Word Rules

Confirmed rules:

- Words are formed from adjacent letter tiles.
- A tile can only be used once per submitted word.
- Default minimum word length is 3.
- 2-letter words are rejected.
- Minimum word length can later be set to 4 or 5.
- Swipe input is the default.
- Tap input is supported and can be changed from the controller menu.
- Invalid words have no score penalty.
- No speed bonus exists.
- Accepted words include common word forms such as plurals and past tense.
- Rejected categories include abbreviations, names, proper nouns/adjectives,
  archaic or obsolete words, very narrow technical/domain words, and strongly
  offensive words.

Important implementation note: Netflix states its word list is made with Oxford
English Dictionary involvement and edited toward modern usage. We cannot copy
that list. We need a licensed/open dictionary plus our own filters, or a paid
word-list source, depending on production goals.

## Scoring Rules

Netflix Boggle Party scoring differs from classic tabletop Boggle scoring.
Use the Netflix scoring model for parity:

- 3 letters: 1 point
- 4 letters: 2 points
- 5 letters: 3 points
- Each additional letter: +1 point
- In multiplayer, unique words found by only one player score double.
- If a unique word is successfully challenged and rejected, it loses the double
  bonus and scores only once.
- No points are deducted for invalid words.
- No extra points are awarded for finding words faster.

The tutorial screenshot confirms this progression visually with examples:
`CAR` gives 1 point, `CARS` gives 2 points, and `CARTS` gives 3 points.

## Hints

Hints are player-side and configurable:

- If a player is inactive for several seconds, a lightbulb hint button appears.
- Tapping the hint button chooses a random valid word of the minimum required
  length.
- The hinted path is shown by lighting the first letter, then quickly animating
  the remaining letters in sequence.
- Players can change hint delay/frequency or turn hints off from the controller
  menu.

## Word Challenge

Word Challenge is unlockable and host-enabled:

- It occurs after word-finding ends and before final scores are revealed.
- It shows the most unique words from the round.
- The player who submitted each challenged candidate is initially hidden.
- Each player may challenge one word or pass.
- The word's owner must explain it or use it in a sentence.
- The challenger chooses whether to accept or reject.
- If rejected, the word loses its unique/double-score bonus for that round.
- Host can enable definitions after judgment.
- Scoring resumes after all challenges and passes are complete.

Open detail: the exact UI order, timing, tie handling, and challenge selection
rules need capture from the live game.

## Pranks

Pranks are an optional unlockable Party Mode feature:

- Host can enable or disable them in customization settings.
- They appear periodically during gameplay.
- They can help trailing players or interfere with opponents.
- They are introduced only after several rounds so new players learn the basics.

Open detail: the public documentation does not name the prank types, activation
rules, target selection rules, or effects. We need live capture or a deliberate
original replacement system.

## Profiles, Progress, Unlocks

Observed and documented:

- Player profiles are separate from the Netflix account profile but saved under
  the launching account/profile.
- A profile tracks achievements and high scores.
- A "Trophy Room" exists in the host/menu UI.
- Achievements track milestones such as unique words, longer words, total words,
  and counts of words at specific lengths.
- Achievement progress is displayed at round end.
- Unlocks include pranks, word challenge, grid sizes, minimum word options, and
  avatars.
- Unlocks progress per account/profile context in the original.
- Screenshot evidence shows a level/progress style after-round UI, including:
  - "FOUR-CE OF NATURE", find 4-letter words, 10/10
  - "Find Different words", 21/50
  - "Longest word (this game)" and "Longest word (all-time)" callouts

Production decision needed: for this clone, decide whether to preserve unlock
gating or start with all settings available. For rapid playtesting, all settings
should probably be available behind an "advanced settings" panel, with unlocks
added later if desired.

## Main Screen UI Observations

Shared screen states from screenshots/photos:

- Initial join screen:
  - Blue gradient background with subtle icons and particles.
  - Boggle Party logo centered near top.
  - Large QR code card in center.
  - Copy instructs players to scan with phone camera.
  - Player count appears in a small pill, e.g. `0/8`.
- Lobby/main game:
  - QR code remains available in a bottom-right card with "Scan to join!".
  - Controller status toast appears top right, e.g. "Searching for controller..."
  - Player panel appears left with name, host badge, avatar, word count, and
    recent/found word list.
  - Board is centered on a clean teal/blue background.
  - Timer appears top center in a purple pill with hourglass icon.
- Create Game:
  - Header card top left: "Create Game".
  - Host uses controller to choose grid size and duration.
  - Grid size and duration are large icon controls with left/right arrows.
- Mode select:
  - "Host, select a Game Mode"
  - Party Mode card is available.
  - Daily Puzzle card appears locked until required progress.
- How to Play:
  - Three panels: swipe letters, spell words, score points.
  - Tutorial emphasizes swipe/tap pathing, longer words score more, and unique
    multiplayer words score double.

## Phone Controller UI Observations

Phone controller states from screenshots:

- Persistent top controls:
  - Gear/settings button on left.
  - Netflix controller `N` button in center.
  - Device/menu button on right.
- Ready screen:
  - Large controller illustration.
  - "Look at the main screen" card.
  - Large green "Start Game" button.
  - Copy: "When everyone's ready, press Start."
- Host lobby:
  - Player avatar card with host badge and editable pencil button.
  - Selected settings card with grid, duration, and tutorial enabled status.
  - Large green Start button.
- Host menu:
  - Avatar/name card with "You're the host!" copy.
  - Options: Change Host, Tutorial, Trophy Room, Language.
- Mode selection:
  - Party Mode selectable card.
  - Daily Puzzle locked card.
  - Green Confirm button.
- Settings:
  - Grid Size card, initially 4x4 Classic selected.
  - Duration slider with 30s, 60s, 90s, 120s, 180s marks.
  - Green Start Game button.
  - Unlock encouragement copy.
- Countdown:
  - Large 3D "3" and "GO" typography centered.
  - Selected settings card remains visible below during countdown.
- Round play:
  - Timer pill top-left-ish.
  - Current word preview pill above board.
  - Hint button appears above board.
  - 4x4 board occupies lower half of phone.
  - Idle tiles are deep purple with white letters.
  - Active selection uses purple fill plus pink outline/path.
  - Accepted/just-submitted letters flash green, and a green "Added" pill
    appears above the word.

## 20-Player Remote Extension

The original is designed for local party play with 1-8 players. A production
remote version for up to 20 players needs explicit system design:

- Session model:
  - One shared "stage" route for host/main display.
  - Player controller route joined by QR/link/code.
  - Host can share the stage over Zoom/Meet/Discord, but players should not
    depend on seeing a local TV to submit words.
  - Each controller should show enough state to play independently, including
    timer, board, current score, and connection state.
- Transport:
  - WebSockets for room state, timers, profile joins, round lifecycle, and
    scoring events.
  - Server authoritative validation for board paths, dictionary acceptance, and
    scoring.
  - Client optimistic UI for swipe/tap path feedback.
- Scale:
  - 20 players can generate many word submissions in 30-180 seconds.
  - Validate locally first for path shape and duplicate submission, then submit
    to server for authoritative acceptance.
  - Cache each round's valid word/path set server-side for fast validation.
- Fairness:
  - Round timer should be server-time based.
  - Grace window for network jitter should be defined, e.g. accept submissions
    received within 500 ms of server round end if client started on time.
  - If players reconnect mid-round, allow resume with already submitted words.
- Shared screen:
  - At 20 players, the TV scoreboard cannot show all player word lists at once.
  - Need a responsive scoreboard that rotates, groups, or shows top/current
    standings while preserving parity feel.
- Privacy:
  - During a round, do not reveal other players' full word lists on controllers.
  - End-round reveal can show summary and contested unique words.

## Proposed State Machine

```text
boot
  -> join_screen
  -> lobby
  -> mode_select
  -> settings
  -> countdown
  -> active_round
  -> challenge_phase? (if enabled and eligible)
  -> scoring_reveal
  -> achievements_unlocks
  -> lobby
```

Controller substates:

```text
unpaired
  -> paired_profile_select
  -> lobby_ready
  -> host_controls | player_waiting
  -> countdown
  -> active_input
  -> challenge_vote? | challenge_defense?
  -> round_results
  -> lobby_ready
```

## Core Data Model Draft

```ts
type Room = {
  id: string;
  joinCode: string;
  status: RoomStatus;
  hostPlayerId: string | null;
  settings: RoundSettings;
  players: Player[];
  activeRoundId: string | null;
};

type RoundSettings = {
  mode: "party" | "daily";
  gridSize: 4 | 5 | 6;
  durationSeconds: 30 | 60 | 90 | 120 | 180;
  minimumWordLength: 3 | 4 | 5;
  wordChallengeEnabled: boolean;
  pranksEnabled: boolean;
  hintsEnabled: boolean;
  challengeDefinitionsEnabled: boolean;
  language: string;
};

type Round = {
  id: string;
  roomId: string;
  seed: string;
  grid: LetterTile[][];
  startsAt: string;
  endsAt: string;
  submissions: Submission[];
  scoreState: ScoreState;
};

type Submission = {
  id: string;
  roundId: string;
  playerId: string;
  word: string;
  path: TileCoord[];
  accepted: boolean;
  rejectedReason?: "too_short" | "not_adjacent" | "reused_tile" | "not_in_word_list" | "duplicate";
  submittedAt: string;
};
```

## Build Priorities

Recommended implementation slices:

1. Local deterministic game engine:
   - seeded board generation
   - path validation
   - dictionary lookup
   - scoring, uniqueness, and results
   - unit tests over edge cases
2. Single-player browser prototype:
   - phone-sized controller UI in a web viewport
   - 4x4/180s round
   - swipe and tap input
   - hint animation
   - scoring result
3. Multiplayer room:
   - QR/link join
   - host handoff
   - server authoritative submissions
   - reconnect support
   - 20-player load test
4. Shared stage:
   - lobby, QR, player list
   - board/timer
   - rotating or dense scoreboard for 20 players
   - end-round reveal
5. Advanced parity:
   - word challenge
   - achievements/trophy room
   - unlocks
   - pranks
   - daily puzzle and leaderboard
   - localization

## Acceptance Criteria For First Production-Ready Milestone

- A host can create a room and share a link/QR.
- 20 players can join from separate browsers/devices.
- Host can configure 4x4/5x5/6x6, timer, minimum word length, hints, and
  challenge toggle.
- All players receive the same board and server-synchronized timer.
- Players can submit words by swipe or tap.
- Server rejects invalid paths, too-short words, duplicate player submissions,
  and words outside the allowed dictionary.
- Server computes scores exactly according to Netflix-style scoring.
- Unique-word double scoring is calculated at round end.
- Results are visible on shared stage and controllers.
- Disconnected players can rejoin before the room expires.
- The UI works on mobile portrait, desktop browser, and living-room display
  aspect ratios.
- No Netflix logos, copied Boggle Party art, or proprietary word lists/assets
  are shipped.

## Open Questions

### Product and legal boundary

1. Should the shipped product use a new name and original visual identity while
   retaining the Boggle Party-style mechanics?
2. How close should visual parity be: approximate layout and feel, or highly
   faithful dimensions/colors/motion using original assets?
3. Is this intended for private use, public deployment, or commercial use?
4. Should we include "Boggle" terminology in user-facing UI, or avoid it?

### Platform and deployment

5. Should this be a web-only app, or do you want native mobile apps later?
6. Where should production run: Cloudflare, Vercel, Fly.io, Railway, or another
   stack?
7. Do you want anonymous rooms only, or user accounts and persistent profiles?
8. Should rooms be private by code/link only, or should there be public lobbies?
9. Should remote players need the shared stage view, or should the phone view
   be fully playable by itself?

### Gameplay scope

10. Is Party Mode the first build target, with Daily Puzzle deferred?
11. Should all advanced options be unlocked by default for our clone?
12. Should we implement word challenges in the first multiplayer milestone?
13. Should pranks be replicated, replaced with original effects, or skipped?
14. Should hints be enabled by default, and should they affect score or
    achievements?
15. Should minimum word length affect hint generation and precomputed word set?

### Dictionary and language

16. Is English-only acceptable for v1?
17. Which dictionary source should we use: open-source word list, licensed
    commercial list, or user-provided list?
18. How strict should filtering be for archaic, offensive, proper-noun, and
    domain-specific words?
19. Do you want definitions for challenged words in v1? If yes, from which
    licensed dictionary API?

### Multiplayer and fairness

20. Should the 20-player cap be hard, or should rooms support spectators beyond
    20?
21. What latency/jitter grace period is acceptable for final-second submissions?
22. If the host disconnects mid-round, should the round continue and host
    transfer automatically?
23. If a player disconnects mid-round, should their submitted words remain
    eligible for unique/double scoring?
24. Should players be able to join from multiple devices using the same profile?
25. Should there be anti-cheat protections against scripted word submissions?

### UI and experience

26. Do you want a dedicated "main screen" route optimized for TVs/projectors?
27. Should the phone controller include the same persistent top buttons as
    Netflix's UI, or simplify them?
28. How important is matching the 3D countdown typography and tile animation?
29. Should the 20-player scoreboard prioritize top scores, host/current player,
    recently scoring players, or a carousel?
30. Should end-round reveal be playful and animated, or dense and fast?

### Progression

31. Do you want achievements, trophy room, and unlocks in v1?
32. Should progress persist across rooms/devices?
33. Should daily streaks exist, and how should missed days be handled?
34. Should local/private daily puzzles compare only inside a friend group, or
    globally across all users?

### Production operations

35. How long should inactive rooms live?
36. Do we need moderation controls for names/avatars?
37. Do we need analytics for retention, round completion, word submissions, and
    connection failures?
38. What level of accessibility is required for v1: keyboard, screen reader,
    color contrast, haptics, reduced motion?
39. What browsers/devices are target-supported?
40. Should we build load tests before UI polish, given the 20-player goal?

## Research Gaps To Capture Next

If possible, capture these from the live Netflix game before implementation:

- Full end-of-round scoring sequence.
- Word Challenge screen from each role: challenger, challenged player, bystander,
  and host.
- Any prank button/effect screens.
- 5x5 and 6x6 boards.
- Minimum word length settings after unlock.
- Daily Puzzle active play, results, streak, and leaderboard screens.
- Trophy Room and achievement completion screens.
- Reconnect/disconnect flows.
- Host transfer flow.
- Any controller settings submenus for hints, haptics, sound, profile switch,
  and definitions.
