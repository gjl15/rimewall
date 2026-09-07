# Review prompt for Rimewall

Paste everything below the line into a fresh agent session. It is written to be
self-contained for an agent that has never seen the project.

---

## Context

You are reviewing **Rimewall**, a browser tower-defence lane-pusher.

- Repo: `https://github.com/gjl15/rimewall`
- Live: `https://gjl15.github.io/rimewall/`
- It is a remake, in spirit, of the Warcraft III custom map *Wintermaul Wars*.
  All names and art are original for IP reasons. **Never introduce Warcraft or
  Wintermaul names anywhere**, including comments.

**How it plays.** Two sides face each other across a river. You build a maze of
towers on your half; neutral creep waves walk your maze and cost you lifeforce
if they reach your door. You also spend gold to *send* creeps at the other side,
which permanently raises your income. Ten elements (Ice, Fire, Earth, Tech,
Crystal, Poison, Stone, Electricity, Gravity, Beam), each with six tower tiers
and its own multiplier against five armour classes. First side to zero
lifeforce loses. Modes: Skirmish (waves plus a rival), Classic Wars (sends
only), Survival (waves, no rival). 1v1 up to 3v3, humans or computers in any
seat, set in a lobby before the match.

**Read these first, in this order:**
1. `CLAUDE.md` — the working rules for this repo.
2. `CHANGELOG.md` — the real design record. Nearly every number has a paragraph
   explaining what was measured and why it is what it is. Newest first; the last
   few days are dense.
3. `tools/harness/README.md` — the measurement tools.

## Ground rules, which matter more here than usual

- **The whole game is one file**: `index.html`, about 780KB of inline markup,
  CSS and JavaScript. No build step, no package manager, no test suite, no
  dependencies. That is deliberate and is not up for review.
- **`main` deploys straight to GitHub Pages on push.** There is no staging.
  **Do not push to `main`.** Work on a branch and tell me what you would merge.
- **Several agents edit this one file at once.** `git pull` immediately before
  any edit and again immediately before any push. A whole-file write from a
  stale checkout silently deletes other people's work with no merge conflict —
  it has already happened twice in this repo.
- Syntax check after every edit:
  ```
  awk '/^<script>/{f=1;next}/^<\/script>/{f=0}f' index.html > /tmp/g.js && node --check /tmp/g.js
  ```
- **Use the harness in `tools/harness/`.** It drives the real game in real
  Chrome via playwright-core and prints numbers. Extend it rather than writing
  throwaway scripts, and add a script for anything new you measure:

  | script | what it answers |
  |---|---|
  | `econ.js` | gold available vs wave health, per wave |
  | `race.js` | value per gold per element, adjusted for the armour matrix |
  | `sends.js` | effective health of each send against each element |
  | `regress.js` | plays every element by driving the in-game ally AI |
  | `lock.js` | share of a creep's life each element can hold it motionless |
  | `grav.js` | what Gravity's impulse rolls actually become |
  | `tips.js` | asserts every displayed health number matches the creep spawned |
  | `mp2.js` | two clients in one room over the real transport |
  | `cardshot.js` | the pre-build card, and every special's description |
  | `lobby.js`, `shot.js`, `fxshot.js` | UI drives and screenshots |

- **Phone first.** Drive at 390×844 with Playwright's mobile emulation. Headless
  Chrome's `--window-size=390` actually lays out at about 500px, so a plain CLI
  screenshot lies about phones. This cost someone an afternoon already.

## Current measured baseline

So you can tell movement from noise:

- Ten-race regression, median death wave **12.5**, worst 11 (Ice, Tech, Stone,
  Gravity), best 15 (Fire).
- Value per gold, adjusted for the armour matrix, best to worst: Fire 0.58,
  **Gravity 0.74**, Crystal 0.84, Beam 0.86, Electricity 1.00, Ice 1.05,
  Poison 1.18, Tech 1.28, Stone 6.15, Earth 7.06. (Stone and Earth are short
  range and melee-ish, so a raw gold-per-dps number flatters everyone else.)
- Share of a creep's life a 26-tower wall can hold it motionless: Gravity 12.7%,
  Earth 11.8%, Electricity 8.9%, Ice 8.2%, everyone else 0%.
- Multiplayer snapshot cost: about 3.5KB a message, ~11.5 KB/s at a heavy late
  game, three messages a second, over a public MQTT relay.

## What I want from you

**Bring your own judgement. Do not just confirm what the changelog says.** Where
you disagree with a decision, say so and show the number.

### 1. Balance: damage against health, across all ten elements
- Is any element unplayable? Is any strictly better?
- **The open contradiction:** `race.js` says Gravity is the second best value
  per gold in the game; `regress.js` says it dies as early as the worst. Two
  causes were found and fixed (its impulse rolls were being discarded when a
  cooldown was running, and its shove was capped). Neither moved the death wave.
  **Find the rest of it.**
- `CREEP_HP_SCALE` ties creep health to `ECON_SCALE` so the gold-to-health ratio
  holds at any board width. Check that reasoning and the resulting curve. Waves
  1–20 are hand-authored; past 20 the table loops with doubling health. Is the
  join between those regimes sane?
- Armour is two systems multiplied: a class matrix, and a separate diminishing
  curve on armour *value* (`armorReduction`). Is one drowning the other?
- Sends: is any rung of the ladder never worth buying? Does the income soft cap
  (`INCOME_SOFT`, `INCOME_EXP`) make late sends pointless?

### 2. The regression bot is weak, and that is the biggest hole
`regress.js` drives the in-game ally AI with the player's purse and reaches
about wave 12. Older ad-hoc measurements in the changelog claimed 46. **Either
make the bot play like a competent human, or state plainly that its number is
only good for comparing builds and must never be quoted as difficulty.** Almost
every balance claim in this project rests on it.

### 3. Multiplayer correctness
Every client simulates only its own board; teammates and enemies are mirrors
rebuilt from a snapshot. Team lifeforce is one shared pool derived from leak
counts. The host alone simulates the computer seats. Sends are addressed to one
enemy seat, round-robin.
- Where does that model break? Look hard at: reconnection, a client leaving
  mid-match, three or more clients in a room, and the host disconnecting.
- The snapshot rebases every duration onto the receiver's clock. Verify it.
- Is the send targeting exploitable?

### 4. UX and UI
- Can a new player tell what a tower does before buying it, what an element is
  good against, and why they lost?
- Is anything unreadable during heavy combat? Effects draw over creeps, with a
  thin "read pass" afterwards to keep bodies visible. Judge whether that is
  enough, especially for Electricity and Poison.
- The lobby, the leaderboard and the Records sheet are all new this week.
- Onboarding: the Coach is five cards. Is that the right amount?

### 5. Anything I did not ask about
Especially **numbers displayed anywhere that do not match what the simulation
actually does**. That class of bug has appeared repeatedly here: a stale board
constant, a scale applied at spawn but not on the card, a description key that
did not match its special. Assume there are more.

## How to report

For each finding: **what is wrong, the evidence (a number, a file and line, or a
screenshot), and what you would change.** Rank by impact on a real player. Say
plainly when you are unsure.

I would rather have five findings you can defend than twenty you cannot.
