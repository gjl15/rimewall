# Changelog

What changed and why. Newest first. Dates are the day the work landed on `main`.

Rimewall deploys straight from `main` to GitHub Pages — there is no staging
environment, so every entry here was live the moment it was pushed.

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
