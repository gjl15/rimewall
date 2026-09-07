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

## The files

```
index.html          813KB, 9,541 lines   THE ENTIRE GAME
CHANGELOG.md         42KB                the design record — read it
CLAUDE.md             3KB                working rules for this repo
README.md                                short public blurb
towers.html          33KB                a reference page that parses index.html
                                         at load and lists every tower; it breaks
                                         if the data literals stop being plain
maze-school.html    174KB                a standalone maze-building tutorial
sw.js                                    service worker, network-first
manifest.json, icon-*.png, og.svg        PWA bits
tools/harness/*.js                       the measurement tools
docs/review-prompt.md                    this file
```

### Where things live in `index.html`

Line numbers drift; grep the name. Roughly in file order:

| line | name | what it is |
|---|---|---|
| 1264 | `races` | the ten elements |
| 1281 | `TOWERS` | every tower, per element |
| 1402 | `ATTACK_PROFILE` | the armour-class matrix |
| 1415 | `TRAIT` | **every combat tunable in one object** |
| 1535 | `specialBlurb` | special descriptions, generated from TRAIT |
| 1599 | `BOLT_MODS` | tech bolt mods |
| 1710 | `COLS` / `HALF_ROWS` | board size, and every coordinate derived from it |
| 1905 | `WAVES` | the hand-authored wave table |
| 1949 | `SENDS` | the send ladder |
| 2179 | `ECON_SCALE` | purse scaling, and `CREEP_HP_SCALE` beside it |
| 2565 | `spawnCreep` | where a creep is actually built |
| 2654 | `newRoster` | the seat roster the lobby edits |
| 2690 | `queueWaveSpawns` | wave load per half |
| 2764 | `tryHold` / `tryStasis` | the chance-based hold cooldown |
| 2917 | `applyDamage` | the damage pipeline: shields, matrix, armour |
| 3046 | `applyHitEffects` | status effects on hit |
| 3130 | `resolveProjectileHit` | hit resolution, splash, chain |
| 3261 | `GRAV_SPECIALS` | gravity impulse weights per tier |
| 3284 | `gravityImpulse` | gravity's control |
| 3668 | `updateAlly` | a bot teammate |
| 3846 | `updateEnemyAI` | the rival — a richer, separate AI |
| 4044 | `payIncome` | the income tick |
| 4280 | `matchPoints` | the leaderboard score |
| 4368 | `commitMatchStats` | the match log row |
| 4531 | `simulate` | one sim step |
| 4689 | `drawTower` | tower rendering |
| 4915 | `drawCreep` | creep rendering |
| 6055 | `renderHud` | the HUD, runs 5x a second |
| 6966 | `frameBody` | the frame loop and fixed-step accumulator |
| 7041 | `startBattle` | committing a match |
| 7203 | `renderLobby` | the lobby |
| 7856 | `mpSnapOf` | the board snapshot sent over the wire |
| 8224 | `mpOnMessage` | every network message |
| 8498 | `drawOpponentMirror` | the board you are watching |
| 8677 | `showCardInfo` | the pre-build card |
| 8906 | `recordsContent` | Records and the leaderboard |

Two things worth knowing about this file: **`TRAIT` is where nearly every
balance number lives**, so start there; and **anything a timer redraws will
destroy a control mid-tap** — that bug has appeared three times, in the rails,
the send cards and the lobby. If a control lives inside something `renderHud`
touches, assume it is broken until proven otherwise.

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
