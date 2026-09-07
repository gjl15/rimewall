# Changelog

What changed and why. Newest first. Dates are the day the work landed on `main`.

Rimewall deploys straight from `main` to GitHub Pages — there is no staging
environment, so every entry here was live the moment it was pushed.

---

## 2026-09-07 (night) — three things the first live 2v2 found

Gene and Abdy played the first real team game. Everything below is from that.

### One player going down is not a defeat
*"Abdy got a defeat icon whereas I can still play."* The leak handler ended the
match on **one client's own lifeforce**, so the first person to hit zero got a
defeat card while their side was still fighting. A side loses, not a person.

### Lifeforce is one pool a side, the same size for both
*"The lives should not be 200 vs 300 in a 2v3."* It was the sum of the seats, so
a bigger team simply started with more to lose — a handicap nobody chose. Both
sides now start on the lifeforce setting and share it, whatever size they are.

The pool is derived from leak **counts** rather than a decrementing number: each
client publishes only what leaked on its own board, and the pool is the setting
minus every count on that side. Two clients leaking in the same instant
therefore cannot double-subtract, and a late message cannot drift the total.
Measured across two clients: 100/100 at the start, 60/100 after one player
leaks 40 with that player still playing, 0/100 and over on both when the pool
is emptied, and 100 vs 100 in a 2v3.

### The lobby was rewriting itself under your finger
*"It's hard to adjust the seats, the portion keeps disappearing."* Every roster
message from the host re-rendered the whole lobby, which destroyed the
`<select>` you were in the middle of using — so a slot you had just set snapped
back and an open dropdown vanished. It rebuilds only when the roster changes
shape, never while a control inside it has focus, and puts focus back
afterwards. Verified: the same DOM node, the same value, still focused, after a
roster arrives.

The watch strip had the same bug and worse — `renderHud` runs five times a
second and it rewrote its own markup every time, so a chip was destroyed under
your finger between touch and click. Its handler is delegated now and only the
lifeforce numbers are patched in place. This is the third time this exact bug
has appeared in this file; if a control lives inside something a timer redraws,
assume it is broken until proven otherwise.

A closed slot also dimmed its whole row, including the dropdown you need in
order to reopen it. Only the name dims now.

---

## 2026-09-07 (evening) — teams, a real lobby, and a scoreboard

### Watch any board in the room, including the computers'
There is one place to show another board — the top half of your own screen —
and the drawing code read a single `mp.snap`, which held whichever client sent
a picture most recently. A team-mate's snapshots arrived and were stored and
then never drawn, because nothing said which board you wanted. And the
computers' board was never published at all: it exists only on the host, so an
AI side was invisible to everyone, the host included.

A strip above the wave bar now lists every seat in the room in its lane colour
with its lifeforce. Tap one to put that board up top. Your own chip is a label
rather than a choice. The host publishes the bots' board too, flipped into
south-half coordinates first — snapshots travel in the sender's own frame, and
without the flip a bot board arrives upside down.

The rival chip also used to be named after whoever said hello, which in a team
room is your own team-mate: the HUD read "GENE 200" for the enemy side while
Gene was on my team. It names the other side now.


### Two people can play on one team
The multiplayer protocol carried exactly one opponent, in scalars: `oppName`,
`oppRace`, `oppLives`, `oppIncome` and a single snapshot. A third client's
arrival simply overwrote the second one's, and no message said who it came
from — so two people on a team had nowhere to exist.

What did **not** change is the thing that makes this safe: every client
simulates only its own board and everyone else is a mirror. That was already
true for 1v1 and it generalises with no lockstep, because there is no shared
simulation to desync. What was added is identity.

- **Peers are a map**, keyed by session, and every message names its sender.
- **Seats, not sessions, are the address.** A seat can be a computer and a
  computer has no client, so messages address `north:1` rather than a session.
  That is what lets a room mix people and bots on either side.
- **A send goes to one seat.** It used to be broadcast and spawned by whoever
  heard it, so in a team match one purchase landed on every enemy board — and
  before targeting existed, on your own teammate. The sender picks one enemy
  seat round-robin and names it.
- **The host runs the computers.** Otherwise a bot's board exists in as many
  versions as there are clients and its lifeforce has no single value. The host
  alone spawns the far half's waves, runs its AI and broadcasts its lifeforce.
- **Team lifeforce is the sum of the seats**, and a side is out when every seat
  on it is out. A pair has twice the lifeforce and twice the wave load, so it is
  not a solo player with a spare life bar.

Verified by driving two real clients in one browser over the BroadcastChannel
transport — the same path the game falls back to when the relay is blocked:
both land in the lobby with the same roster, the host starts them on one shared
seed, Gene takes Purple/west and Abdy Orange/east, both agree the sides are 200
lifeforce each, and a send from either lands on the host's north half (+2) and
on nobody's south half. No page errors.

**Not claimed:** three or more clients, and reconnection. The protocol is shaped
for both, but neither is tested.

### A lobby with slots you can actually set
It used to open on the *last line* of `startBattle()`, after the terrain, the
rival and every ally had already been built — so it could show you the match but
never change it — and it was skipped entirely in multiplayer, which is the one
place a lobby is for.

There was also no seat object anywhere in the file. A "seat" was an index into
the allies array, only index 0 could ever be a person, and the count came from a
menu dropdown read at match start.

- One record per slot: who holds it (you / computer / open / closed), what they
  play, and the lane they hold. Each half carries its own list, so the sides can
  differ in size.
- **A seat is a colour is a place.** RED/BLUE/TEAL and PURPLE/YELLOW/ORANGE were
  already painted on the board and wired to nothing. A seat wears its lane's
  colour in the lobby, on the board label and on the dashed route. One a side
  holds the whole half; two split the edges; three take a lane each.
- `seatZone` replaces `allyZone`, which only ever returned west or east — a
  third defender used to collide onto the second one's flank, which is why 3v3
  was in the menu but not really in the game.
- Wave batches are counted per half rather than from one shared number.

### Solo rules
One player against one computer is a different game from a team match, so when
the lobby is down to one a side it offers to play it as a duel: sends only, no
neutral waves, rival at brutal. On by default, and a checkbox.

### A score, and a board to rank it on
Every finished run is scored from the row it already writes: 1000 a wave, 3 a
kill, economy for income and gold actually spent, 3000 × lifeforce still
standing, 900 × waves per minute, 4000 for a win, −40 a leak, times the handicap
you chose. Runs rank only inside a bracket — mode, side size, and the date for a
daily — so a survival grind never competes with a duel.

Ordering, on five worked cases: a fast brutal win at wave 9 (31,354) beats a
survival grind to wave 27 (29,336) beats a clean defeat at wave 14 (20,367); the
same wave-14 run scores less when it takes 40 minutes (19,694) and much less
when it leaks 95 lives instead of 39 (15,858).

The board reads the match-log pool that already merges your log with anything
imported, so it needs no server: **Copy JSON** on one phone and **Import log** on
another puts two people on one board. It sits at the top of Records, and the
match summary prints your score and rank.

### Fortified sends, so a wall built for the wrong thing can be punished
Twenty-one rungs on the ladder and exactly one was fortified — the World Titan,
15,000g at Shrine 5 — so for the whole early and mid game there was no way to
attack the armour class most walls fold to. Eight of the ten elements are weak
to it; only Stone (×1.50) and Earth (×1.55) want to meet one.

Four rungs added, one per shrine level: **Hoverbarge** (140g), **Ram Hulk**
(1,450g), **Siege Hulk** (4,500g), **Bastion** (9,200g). They are slow, which is
what they pay for the armour.

| send | price | class | easiest for | hardest for | spread |
|---|---|---|---|---|---|
| Fang Outrider | 126g | medium | Fire 1,234 | Stone 1,542 | 1.25× |
| **Hoverbarge** | 140g | fortified | Earth 918 | **Tech 3,557** | **3.87×** |

That spread is the widest in the ladder and the whole point: at the same price
the medium rung is the same problem for everybody and the fortified rung is a
different problem depending on what they built. Send cards print the armour
class now, which they never did.

### Creep HP rides the same scale as the purse
`ECON_SCALE` doubled the gold when the board went from 32 to 51 columns, on the
sound argument that a maze only bites when you can finish a row of it. But gold
buys DPS as well as wall, and creep HP never moved — so every wave met roughly
twice the guns it had been tuned against. Gene: *"I had 120 gold at wave two
which seems OP."*

Seconds of sustained fire the whole purse needs to clear a wave (lower = easier):

| | wave 1 | wave 4 | wave 9 | wave 15 |
|---|---|---|---|---|
| tuned reference | 3.0 | 8.9 | 8.0 | 11.1 |
| after the resize | 1.7 | 5.5 | 5.3 | 6.6 |
| **now** | **3.5** | **11.1** | **10.7** | **15.3** |

`CREEP_HP_SCALE = ECON_SCALE` restores every gold-to-HP relationship at any
board width. `WAVE_PRESSURE` is a separate dial for making the game harder
without touching the purse.

### Four bugs Gene reported, all confirmed
- **Routes were unreadable.** Both lanes of a half were drawn the same colour,
  on top of each other along the run they share into the door, with no
  direction — so the overlay read as one dashed loop and told you nothing. Each
  lane now carries its map colour, the two are nudged apart on whichever axis
  they share, and an arrowhead every nine cells points the way. Routes default
  on.
- **Mirrored creeps drew in the wrong place.** `drawOpponentMirror` mirrored
  towers with `COLS`/`ROWS` but creeps with the literals `32` and `49` — the old
  board's size — so on the 51×73 board every mirrored creep landed ~20 cells off.
- **Income read as delayed, three reasons.** The "+N" that floats when income
  pays was pinned to the middle of the *old* board, which on this one is in the
  rival's half. Skirmish had no income countdown at all. And wave rollover paid
  a second lump on its own clock. All three fixed; the income chip carries the
  seconds to the next payout in every mode.
- **One tap picks a race.** Tapping a card only previewed it; you had to find
  "Fight as Fire" underneath and press that too, so people walked into the lobby
  as whatever they picked last time.

### A harness, in the repo
`tools/harness/` drives the real game in real Chrome and prints numbers instead
of impressions: `econ.js` (gold in vs wave HP per wave), `sends.js` (effective
HP per element per rung), `regress.js` (each element played by the ally AI on
the player's purse — a yardstick between builds, not a claim about human play),
`lobby.js`, `mp2.js` (two clients, one room), `board.js`, `shot.js`. See its
README. Headless Chrome's `--window-size=390` actually lays out at ~500px, so
phone screenshots need Playwright's mobile emulation — that one cost an
afternoon.

---

## 2026-09-07 (later still)

### Classic Wars could not be won. Not "was hard to win" — could not.
Three full 1v1 runs, twenty minutes each, both sides building constantly and
sending everything they could afford: **every one ended 100 lives to 100 lives
with zero leaks in either direction.** 549 towers, ~95 sends, Shrine 5, and
nothing ever got through.

Skirmish scales its pressure — `waveDefFor` doubles creep HP every loop of the
wave table. Classic has no waves, so the only pressure in the mode was a send
ladder frozen at its printed stats forever, while the wall it had to beat
compounded all match. The gap that produces:

- **World Titan — the 15,000g top of the ladder, 12,000 HP, 24 armour — dies to
  twenty tier-2 fire towers.** About 1,900g of wall.
- Across the ladder an attacker pays **1.5× to 3.7×** what the defender pays to
  stop it. No income curve converts that into a leak.

**Sends now double in HP on a timer in Classic, the way waves double on a loop
in Skirmish.** Every 150 seconds. With it the rival actually gets ground down —
finishing on 31 / 82 / 50 lives across three runs where it previously finished
on 100 every time.

That number is a first calibration off a noisy measurement, and it is honest to
say so: the rival's race is drawn at random and single runs swing hard. It also
only fixes half the problem. First blood still lands around minute 13, because
an exponential is slowest exactly when both walls are small. Closing the
1.5–3.7× attack-to-defence gap is the other half, and that wants real play to
tune rather than a simulated builder.

Skirmish is untouched — the growth applies only in Classic, and the ten-race
regression is unmoved (median death wave 45, was 46).

### "First" was shooting the first mob of the wave, not the one closest to the ship
Abdy reported this twice and I twice said targeting checked out. He was right and
I was wrong. `creepProgress` scored a creep as `cpIndex * 1000 + pathStep` —
where `pathStep` is that creep's index into **its own current path**. It resets
to 1 on every re-path, and every tower you place re-paths every creep. So
seconds after any build the entire wave scored identically and the sort fell
through to array order, which is spawn order.

Progress is now counted as steps **remaining** to the next checkpoint, which is
stable across re-paths and is what "closest to the ship" actually means. Verified
with six creeps strung out along the route: "first" picks the one with five steps
left, not the one that spawned first.

---

## 2026-09-07 (later)

### A bigger board — 51 × 73, and the door is now a hole in the world's edge
The map is 51 columns by 34 rows of ground per side, up from 32 × 23. Two and a
half times the ground, with a proportional massif in the middle, both lanes
converging on a wide open band, and the exit moved to the very edge of the
board: the last two rows are solid rock with a three-cell mouth cut through them
on the centre column, and the creeps walk straight into it.

**Every map coordinate now derives from three constants** — `COLS`,
`HALF_ROWS`, `RIVER_ROWS`. There used to be about twenty literal row and column
ranges scattered through terrain, routing, rendering, the rival's build zones,
the ally zones and the multiplayer mirror, which is why the board had never been
resized in the first place. `CELL` derives too, so the canvas backing store
stays around 4M pixels at any width (and still resolves to the original 24 at 32
columns).

**Two things broke on the bigger board, and neither was the obvious one.**

- **Short-range races stopped working entirely.** Stone opens at range 3.9 and
  Earth at 3.2. The old lanes were 10 cells wide, so any tower in a lane covered
  it and the order you laid the comb in barely mattered. Widen the lanes and
  that stops being true: laying the comb in raw row order put most of Stone's
  wall out of reach of anything walking. It leaked from **wave 2** and died at
  **wave 8 no matter how much gold it was given** — the wall was real, it just
  could not touch the creeps. The comb is now walked from the creep route
  outward, which fixed every race at once: Stone 8 → 27.
- **The purse was sized for the old board.** A maze only bites when you can
  finish a row of it, and a row is as long as the board is wide. Gold now scales
  as `(COLS / 32) ^ 1.5` — fitted to one measured point, not derived: at 51
  columns the ten-race median death wave came out 20 at ×1, 26 at ×1.5 and 42 at
  ×2, and `(51/32)^1.5 = 2.01`.

Result: median death wave **46** against the old board's 41, and nothing below
27 where the old board's worst race managed 16. Every race is playable.

### Why not 101 × 60
That was the ask, and it was built and measured before being turned down. It
fails three independent budgets:

| board | cells | cell @1× | A\* | sim/step | repaint | comb row |
|---|---|---|---|---|---|---|
| 32 × 51 (old) | 1,632 | 9.7px | 1.02ms | 0.39ms | 1.9ms | 29 |
| **51 × 73 (now)** | **3,723** | **5.9px** | **3.46ms** | **0.42ms** | **3.4ms** | **48** |
| 101 × 125 | 12,625 | 3.1px | 21.9ms | 3.80ms | 48.3ms | 98 |

- **You could not see it.** 101 columns across a 311px phone is a 3.1px cell —
  smaller than the old board's cell at *maximum* zoom.
- **You could not play it.** A tower placement invalidates every creep's path
  and each one re-runs A\*: ~30 creeps × 22ms is a **660ms freeze on every
  build**, on a desktop.
- **It was not a game.** A 98-tower comb row against a 29-tower one dropped the
  median death wave from 41 to 11.

What actually gates a wider board is the per-creep A\*, not the canvas and not
the screen. A flow field — one BFS per goal, then O(1) per creep — is the thing
that would unlock it.

### Zoom that fits the board it is on
The ceiling was a flat 3×, chosen when the board was 32 wide. It derives from
the board now, so a cell can always reach a thumb-sized ~26px on the narrowest
phone: 5× here, and a match opens at 3.1× framing your own ground rather than at
a whole-board overview you cannot build on. Landmark labels counter-scale with
the camera, so "SOUTH SHRINE" no longer renders five times life size.

Verified placing a tower by tapping the board at 1×, 1.8×, 2.6×, 3.5× and 5×.

---

## 2026-09-07

### The new sidebars gave the board back, and three-quarters of your taps
The rails moved every control off the map, which was right — but the way they
were built took the board apart. Four separate faults, each measured:

- **Three out of four taps on a rail button did nothing.** `renderHud()` runs
  every 200ms and rewrote both rails' `innerHTML` from scratch each time. A
  phone tap lasts 80–150ms, so a good share of presses had their button
  destroyed and recreated between finger-down and finger-up — and a browser
  fires no click at all when that happens. Measured with a realistic 130ms
  press: **BUILD opened 4 times out of 16.** The rails are now diffed and only
  rewritten when the markup actually changed, and their handlers are delegated
  to the containers so no rebuild can leave a dead button. **16 out of 16.**
- **The drawer was cutting the board to 172px.** It was a flex sibling, so
  opening it shrank the map — and because the board is width-limited on a
  phone, losing width loses height too. It now overlays the map's right edge
  and closes itself the moment you pick a tower, so the board is one fixed
  width for the whole match. The left rail went 58px → 46px as well: **292px
  of board → 307px, and no longer 172px while a drawer is open.**
- **A zoomed camera lurched whenever the viewport resized.** `frameBase` (the
  unzoomed board rect) was recomputed while the pan offsets were left in the
  old coordinate space. Panned into a corner at 2.6× and opening a drawer moved
  the view **9.3 cells**. A refit now remembers which part of the board is under
  the middle of the screen and puts it back: **0.00 cells.** Same fix covers
  rotation, the keyboard, and iOS collapsing its URL bar.
- **One-finger pan overshot.** The drag itself tracked the finger exactly, but
  the momentum after it was enormous: friction of `.98` per frame glided for
  **3.6 seconds**, and the gate to trigger it was so low that a deliberate 48px
  drag coasted a further **153px**. So the cell you had lined up was never the
  cell under your finger when you tapped. A flick now has to be a real flick
  (850 px/s, up from 250), it settles in 0.7s instead of 3.6, and putting a
  finger down stops the board on the spot.

Building by tapping the board is verified placing at 1×, 1.8× and 2.6×.

---

## 2026-09-05 (later)

### The rival learns your maze — and judges the lesson before trusting it
Matches now record the strategy behind them: the maze you laid **in the order
you laid it**, the tier you had reached by each wave, and when you bought sends.
Flat number tuples, so a 202-tower match costs ~2.5KB.

From those, a per-element **playbook** — the cells you favour, weighted toward
the games that went best. Three games minimum before an element has one.

**What the measurements said, and why the design changed twice.** Adopting a
human's build order wholesale made the rival *worse* (ice's median death wave
12 → 10). So it became a blend, with the hand-built flag-distance order as the
spine. Re-measured with a funded rival: fire and tech unchanged, ice 47 → 26.
Still worse. A human's order carries their mistakes as well as their skill, and
the rival only affords the first stretch of it.

So it no longer takes the lesson on faith. Each match records which plan it ran
(centre / sides / learned) and how that plan did; the next match picks the plan
with the better record, exploring 18% of the time. Seeded with a bad lesson it
picks centre 87% of the time; with a good one it picks learned 87%.

### Rival difficulty
Gold turned out to be the only thing limiting the rival — tier 0–1 wall, ~43
towers, ~200g peak purse. Multiplying its income moved median survival from
wave 12 to past 47. **Relaxed 0.7× / Normal 1.0× / Hard 1.7× / Brutal 2.6×**,
default Normal so nothing changes unless you choose it.

### AI teammates — 3v3 with two people, or one
Team size used to scale one thing: creep batches. 3v3 tripled the load on a half
with a single defender and said nothing about it. Every seat a person does not
fill is now an ally that **funds itself** — own income, own sends, own kills
paying its own purse. Verified: allies laid 46–55 towers each and spent 0g of
the player's gold, and never sealed a lane. Your ship fell at wave 7 with allies
vs 4 without at 2v2.

A squad roster on the home screen shows who is holding each half.

---

## 2026-09-05

### Frost rebuilt: a real ramp, a real freeze, a snowball launcher
Frost opened at 50%, stepped **1%** per stack and capped at 70% — thirty hits on
one creep bought twenty points of slow. Worse, the movement code capped every
slow at 80%, *below* the top of Ice's own ramp, so the last stretch bought
nothing at all.

- Ramp is now **40% on the first hit, +5% every hit after**.
- The **twelfth hit freezes the creep solid** — an actual halt, not a slow.
  Lasts 1.2s, clears the stacks, then 3.5s immunity so no wall can perma-lock.
- **Bosses cannot be hard-frozen**; they take an 80% slow instead.
- **Frostbite**: 14% chance per hit for 75% bonus damage.
- The ramp is shared across the whole wall, and nova/snowball splash carries it,
  so a splash hit builds toward a freeze exactly like a direct one.
- Slow ceiling raised 80 → 92 so the top of the ramp is worth reaching.
- Tier scaling removed from the slow and the bite chance — it meant a Frostflick
  actually opened at 22% and stepped 2.7%, so the card lied to every tier below
  the top one.
- **Hailslinger → Snowball Launcher.** It was described as chilling "whole
  lanes" while firing single-target bolts. Now a 1.5-radius splash at 45% that
  frosts everything caught in the burst — the early AoE the line never had.
- Frost ring thickens as the ramp climbs; frozen creeps wear a spiked ice shell.

### Bolt mods for the tech line and every Laser Cannon
Tech was the only line with no passive at all — bolt throwers with raw numbers
while every other race carried an element. A bolt buys **one borrowed element
per tower**:

| Bolt | Effect |
|---|---|
| Ice | 30% slow for 1.5s on every hit |
| Fire | +20% of the hit as burn damage over 3s |
| Toxic | 60% slow and a 10% venom that can never land the killing blow |
| Piercing | +10% range and fire rate, plus 10% damage that ignores armour **and** the class matrix — identical against every armour type, non-lethal, does not stack |

One per tower, swappable for the fee again, and it survives a tier upgrade.
Deliberately weaker than the races that own each effect — a bolt buys the
flavour, not the race. Priced at 40% of the tier cost: at 60% the gold-per-damage
search never bought one, because another 8g turret always won. Bolts are what you
buy when you are out of **cells**, not out of gold.

New shared **non-lethal** damage mode floors a creep at 1 HP, so chip damage
never steals a kill or a bounty from the tower that earned it.

### Send income now says what it pays
The ledger was correct all along — every purchase path credits income and the
25s clock pays exactly what the HUD promises. The **mobile** send chip was
printing the raw ladder number while the HUD paid the compressed one, so at 2000
income an Idol Bearer advertised "+450" and moved the readout by 185. All four
surfaces (desktop card, quick-send tooltip, mobile chip, purchase log line) now
share one helper. Trimmed figures render amber.

### Sells are undoable, and undo stopped dying early
- **Selling was the only irreversible move in the game.** Now undoable for 12s,
  restoring tier, level, kills and priority exactly. The window closes early if
  you spend the gold or rebuild on the cell.
- The undo pill, wisp badge, bar chip and ESC each reimplemented undo, and three
  tested "under construction" — 1.2s for a tier-0 tower — while the full refund
  lasts 8s. The button went dead with your refund still owed. All four now share
  one path.

### Double-tap anywhere resets a stuck view
The map had its own double-tap zoom, but a page zoom strands you on the *chrome*,
where double-tap did nothing and the only escape was a reset button inside the
map you could no longer reach. Reset now drops focus, re-asserts the viewport,
clears map zoom and pan, closes sheets, modals and staged ghosts, and scrolls to
top.

### Match log and race audit
Every finished match records itself — race, wave, kills, leaks, gold earned and
spent, peak income, bolts fitted. The **Records** tab rolls it up per race. The
column that matters is **first leak**: the average wave a race first loses a
life on locates a weakness far better than a win rate does.

---

## 2026-09-04

- **Survival mode** — one player, no rival, creeps only.
- A **mazeable pocket at the ship**, set from the traced map export: notch at
  columns 12–18, rows 46–48, two-cell gate.
- **The rival never upgraded once.** A `cost * 8 > gold` rule locked it at tier 0
  — it reached wave 20 with 202 tier-0 towers. Now it goes wide first, then
  upgrades above a gold float.

## 2026-09-03

- **Poison reworked**: full bolt damage plus a single venom pool every poison
  tower feeds, unlimited stacking, duration refreshed on every hit.
- Poison had silently lost its armour-class weakness — DoT ticks carry no tower,
  so the class matrix never applied. Its spread was the flattest of any race
  (1.5×); now 3.2×.
- **Gravity's effects were too rare to see.** Loosened the guard.
- `towers.html` — a reference page that reads the live build, with the data baked
  in so it renders with no network call at all.
- **Service worker was turning a transient 404 into a permanent one** — a
  resolved 404 is not a rejection, and every navigation was being cached as the
  app shell.
- Retired a HUD contract that fired on every render. It compared child `top`
  values, and under `align-items:center` a 54px brand sits 21px above a 13px
  label *on the same row* — so it reported a three-row stack on every phone. It
  was never happening. **If a contract fires on every render, suspect the
  contract.**

## 2026-09-02

- **Every tower declares a special, every race has a weakness.** Nine towers
  declared none; two had real but undeclared mechanics.
- **Earth rebuilt** around splash as its primary identity, mostly melee range,
  with one long-range entangler that prioritises bosses.
- **Gravity rebuilt as a ladder** instead of one kit repeated six times, with
  five distinct impact outcomes (slow, knock up, knock down, pushback, push
  forward) and a falloff that took a pulse from 108 damage to 25.
- **Crystal ignored armour *and* the class matrix** — a strength with no matching
  weakness anywhere, which is why it kept measuring best-in-class. Chaos now
  means what it says: it ignores the armour *value* only.
- **Beam** — a tenth race that never stops firing.
- Death-payload sends (heal-on-death, shield-on-death).
- Particle kill switch for lag; crits in their own colour.
- **The iOS zoom trap fixed at its source**: Safari force-zooms on any control
  under 16px and has ignored `user-scalable=no` since iOS 10.
- Creeps scale with team size — 1 batch per player.
- **The income snowball.** Every send paid for itself in 100–235s then printed
  forever; a 50/50 sender ended wave 40 with 25,839g of wall against a pure
  builder's 4,147g. Income above a soft cap is now compressed.

## 2026-08-30

- PWA: service worker, hardened manifest, OG share image.
- Spoiler-free copy-result share.
- **The rival was starving itself to zero towers.**
- `CLAUDE.md` and a SessionStart hook that warns when the checkout is behind
  `origin/main` — after commit `d851689` wrote the whole file back from a stale
  checkout and deleted 160 lines, 24 of them another session's work, with no
  conflict and no warning.

---

## House rules

- No Warcraft III assets, extracted or redistributed. Original code and art only.
- Dependency-free and buildless. That is a feature, not an accident.
