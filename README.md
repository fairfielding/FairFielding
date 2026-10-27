# FairFielding v0.10.1

## New in v0.10
- Coach batting rating from 1–5 for every player.
- Balanced batting-order generator that spreads stronger hitters throughout the circular lineup instead of stacking them together.
- Live Game Day batting screen with At Bat, On Deck, and In the Hole.
- One-tap HIT, WALK, HBP, STRIKEOUT, and OUT results plus undo.
- Season batting history for PA, H, BB, HBP, K, and outs.
- FairFielding live rating blends the coach's rating with actual results; performance influence grows gradually with plate appearances.
- Existing v0.9.1 smart mid-game defensive regeneration and live pitching bookkeeping are retained.

Upload all seven files together so the service worker and cached assets update consistently.


## v0.10.1 fix
- Bench equality is now a hard target whenever mathematically possible.
- Pitcher/catcher locks can no longer cause the greedy fallback to skip a player who still has eligible innings available.
- Mid-game regeneration uses completed-inning bench history when balancing the remaining innings.
