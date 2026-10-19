FairFielding v0.4

Fair defensive lineup generator for youth baseball.

v0.4 fairness fix:
- Plans bench assignments across the WHOLE game before assigning field positions.
- Current-game bench equality is the top priority.
- Example: 12 active players, 10 fielders, 6 innings = 12 bench slots, so the target is exactly 1 bench inning per player whenever P/C locks permit.
- Avoids consecutive bench innings when possible.
- Season bench history decides who receives unavoidable extra bench innings.
- Current-game INF/OF balance is prioritized before season history.
- Season history is then used to correct long-term INF/OF and position imbalances.
- Keeps pitcher/catcher locks, No 1B restrictions, 9/10-player layouts, Save Game, and Season History.
- Default roster includes JW, Gino, and James.

Important:
Season history is stored on the device/browser where the game is saved. Clearing website data or using another device/browser will not carry the history over.
