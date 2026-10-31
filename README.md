# FairFielding v0.11.3

Game Plan UI overhaul.

- Compact modern header reflecting Fielding, Batting, Pitching and Game Day
- Setup / Game Plan / History navigation
- One-inning-at-a-time fielding plan to eliminate long scrolling
- Compact batting order and fairness table
- Pitcher/catcher selections start blank after reset/update
- Preserves v0.10.1 hard bench-fairness solver, smart mid-game regeneration, live batting ratings and pitching bookkeeping


## v0.11.3
- Fixed iPhone roster rows to use the full card width.
- Player, No 1B, batting rating, and delete controls now stay on one compact row.
- Added safe-area spacing for the sticky top navigation.


## v0.11.3
- Rebuilt mobile roster markup instead of patching the desktop grid.
- Player name now gets the full flexible row width.
- Active checkbox and remove button stay beside the name; No 1B and Bat rating sit cleanly underneath.
- Setup/Game Plan/History navigation no longer sticks over iPhone content/status area.


v0.11.3 uses versioned CSS/JS filenames to prevent stale installed-PWA assets from older builds. The roster row is explicitly structured as active checkbox + full-width name + remove, with No 1B and Bat rating on the second line.


## v0.11.5
Visual refresh: upgraded app shell, cards, buttons, game-plan presentation, roster styling, and Game Day/scoreboard aesthetics. Core lineup and bookkeeping logic remains unchanged.


## v0.11.5
Game Day **Player Joined / Returned** now includes players who were unchecked at game generation (such as MAYBE players), not only players who left after the game started. Adding one preserves completed innings and regenerates only unfinished innings using fairness history.
