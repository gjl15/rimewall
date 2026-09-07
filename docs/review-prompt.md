# Review prompt for Rimewall

Paste this into a fresh agent session (Antigravity, Codex, or another Claude).
It is written to be handed to an agent that has never seen the project.

---

You are reviewing **Rimewall**, a browser tower-defence lane-pusher at
`https://github.com/gjl15/rimewall` (live at `https://gjl15.github.io/rimewall/`).
Read `CLAUDE.md` and `CHANGELOG.md` first — the changelog is the real design
record and explains why most numbers are what they are.

## Ground rules

- **The whole game is one file**, `index.html`, about 780KB of inline markup,
  CSS and JavaScript. No build step, no package manager, no test suite. That is
  deliberate.
- **`main` deploys straight to GitHub Pages.** Do not push to `main`. Work on a
  branch and say what you would merge.
- **Several agents edit this one file.** `git pull` immediately before any edit
  and immediately before any push. A whole-file write from a stale checkout
  deletes other people's work with no conflict — it has happened twice.
- Syntax check with:
  `awk '/^<script>/{f=1;next}/^<\/script>/{f=0}f' index.html > /tmp/g.js && node --check /tmp/g.js`
- There is a harness in `tools/harness/` that drives the real game in real
  Chrome and prints numbers. Read its README. Use it. Extend it rather than
  writing throwaway scripts:
  - `econ.js` — gold available versus wave health, per wave
  - `race.js` — value per gold per element, adjusted for the armour matrix
  - `sends.js` — effective health of each send against each element
  - `regress.js` — plays every element by driving the in-game ally AI
  - `tips.js` — asserts every displayed health number matches the creep that spawns
  - `grav.js` — what gravity's impulse rolls actually become
  - `mp2.js` — two clients in one room, over the real transport
  - `lobby.js`, `shot.js`, `fxshot.js`, `cardshot.js` — UI drives and screenshots

## What I want from you

**Bring your own judgement.** Do not just confirm what is already written down.
Where you disagree with a decision in the changelog, say so and show the number.

### 1. Balance: damage against health, across all ten elements
- Is any element unplayable, and is any element strictly better?
- `race.js` says Gravity is the second best value per gold in the game and
  `regress.js` says it dies as early as the worst. That contradiction was
  partly explained (procs were being discarded) but not fully resolved.
  **Find the rest of it.**
- `CREEP_HP_SCALE` ties creep health to `ECON_SCALE` so the gold-to-health
  ratio holds at any board width. Check that reasoning and the resulting curve.
  Waves 1-20 are hand-authored; past 20 the table loops with doubling health.
  Is the join between those two regimes sane?
- Armour: the class matrix multiplies, and armour *value* is a separate
  diminishing curve (`armorReduction`). Are the two together doing what the
  matrix implies, or is one drowning the other?
- Sends: is any rung of the ladder never worth buying? Is the income soft cap
  (`INCOME_SOFT`, `INCOME_EXP`) making late sends pointless?

### 2. The regression bot is weak, and that matters
`regress.js` drives the in-game ally AI with the player's purse. It reaches
about wave 12; the changelog's older measurements claimed 46 from a different
ad-hoc bot. **Either fix the bot so it plays like a competent human, or tell me
the number it produces is only good for comparing builds and should never be
quoted as difficulty.** This is the single biggest hole in how this game is
tuned.

### 3. Multiplayer correctness
Every client simulates only its own board; teammates and enemies are mirrors
rebuilt from a snapshot. Team lifeforce is one shared pool derived from leak
counts. The host alone simulates the computer seats.
- Where does that model break? Look hard at reconnection, a client leaving
  mid-match, three or more clients, and the host disconnecting.
- The snapshot rebases every duration onto the receiver's clock. Check that.
- Sends are addressed to one seat, round-robin. Is that exploitable?

### 4. UX and UI, on a phone first
Drive it at 390×844 with Playwright mobile emulation. Note that headless
Chrome's `--window-size=390` actually lays out at about 500px, so a plain CLI
screenshot lies about phones.
- Can a new player tell what a tower does before buying it, what an element is
  good against, and why they lost?
- Is anything unreadable during heavy combat? Effects are drawn over creeps,
  with a thin "read pass" afterwards to keep bodies visible — judge whether
  that is enough.
- The lobby, the leaderboard and the Records sheet are all new. Are they clear?

### 5. Anything you find that I did not ask about
Especially: numbers displayed anywhere that do not match what the simulation
actually does. That class of bug has appeared repeatedly here.

## How to report

For each finding: **what is wrong, the evidence (a number, a line reference, or
a screenshot), and what you would change.** Rank by impact on a real player.
Say plainly when you are unsure. I would rather have five findings you can
defend than twenty you cannot.
