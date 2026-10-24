# Rimewall combined gameplay test — October 19, 2026

This source belongs only to the existing Bulwark test Site. Its project ID, URL,
and owner/Gene viewer audience are preserved. No GitHub main or live game write
is part of this deployment.

The previous Site source (3e779e6) is the common base of the recovered October
batch (02cd2df → 097ff0b → ec10d55). The GitHub consolidated branch at b1ecc682
was inspected but not copied over wholesale because it lacks the Ninja/Tech
changes. Earth uses the agreed playable preview's selectable test defaults,
not the conflicting unconditional passive draft on that branch.

## Included

- [x] Permanent test-only developer unlocks, all builders available.
- [x] Bulwark imbuement exclusion; existing Bulwark core/aura system preserved.
- [x] Shrine-first, ROI-second send ordering; consistent income/flying/attacker
      symbols and the lumber attacker costs; rival and allied AI reach Shrine 5.
- [x] Seven Ninja weapons with separate code-native silhouettes and matching
      attacks. Fist double-hit includes imbuements; Dagger armor penetration;
      Sword criticals; outward Mace pulse and refreshing four-second armor
      reduction; aligned Spear piercing; orthogonal distributed Shadow pulse.
- [x] Latest Shuriken correction: ground and air primary targets, air-to-air
      bounce only.
- [x] One Tech Bolt Platform chassis, weapon conversions, Bola Rig and Target
      Painter. Painter starts on First, holds its mark until it dies/leaves
      range, supports Strongest, and offers nearby Tech prioritize-marked.
- [x] Multishot audited and unchanged: up to three distinct full-power shots.
- [x] Earth-only paid Fault Line / Tremor choices; Stone-only critical profiles.
- [x] Crystal formations of two to four adjacent same-owner towers with visible
      links and legal placement hints; free switching between damage, speed,
      and range bonuses, one bonus at a time.
- [x] Latest user correction: no Crystal armor reduction, including no armor
      formation option. Chaos ignores armor amount and armor-class multipliers.
- [x] Hits earn ranks automatically from rank zero through rank 50. Ranks 1–3
      retain +10% base damage, +0.5 range, +0.1 attacks/second each.
- [x] Landed attacks bank from placement. A volley/pulse counts once, not once
      per splash victim. Kills and periodic damage do not add extra hit credits.
- [x] Optional Finish Rank completes the remaining progress immediately: gold
      for ranks 1–3, lumber afterward. No paid unlock caps. Resources never
      auto-spend; actual hits and paid progress are recorded separately.
- [x] Every computer sends in Classic Wars and wave modes from an independent
      purse, including friendly computers and the rival's computer teammates.
- [x] Protected economy, pressure/Shrine, and defense budgets; varied ground,
      flying, swarm, and lumber attacker purchases. Computers repair destroyed
      spiral cells and keep upgrading completed mazes.
- [x] Lobby ready/unready checks for every human, including the host. Changes to
      seats/races/settings reset readiness; stale/disconnected readiness blocks
      starting. Transport handshake alone does not consent to match start.
- [x] Combined-test version label and refreshed service-worker cache.

## Explicit test defaults

- Earth: Fault Line does 35% behind the mark over three cells with a 0.35s hold;
  Tremor impacts the original position after 0.6s for 25% in 1.5 cells and a
  0.2s hold. Both are ground-only and use existing hold-immunity rules.
- Stone critical choices: 45% at 1.8x; 18% at 3.5x; every fourth hit at 2.5x.
- Crystal: +15% damage, +15% attacks/second, or +1 range. No armor reduction.
- Paid finishing: ranks 1–3 use the existing per-tower gold prices. Each rank
  4–10 costs 1 lumber, 11–20 costs 2, 21–30 costs 3, 31–40 costs 4, and
  41–50 costs 5. These are optional shortcuts, not unlocks. Incremental hit
  thresholds are 100×1.5^n for splash and 100×(n+1)^2 otherwise, where n is
  the current total rank starting at zero. Ranks after the first three give
  +0.1% base damage each plus +1% for every five later ranks.
- AI budget defaults: before six towers, 65% of earned gold funds defense and
  35% economy sends. Thereafter, defense/economy/pressure shares are 30/30/40
  normally, 25/15/60 when attacks stall, and 20/5/75 when the opponent has at
  most a quarter of its starting lives. Entering an aggressive mode redirects
  75% of banked economy money to pressure. Purchases always charge the actual
  purse and the normal gold/lumber prices. Difficulty income multipliers,
  unit stats, and send HP/prices/income are unchanged.
- Bola: every third shot roots up to three ground targets for 1.25s, then 0.75s
  root immunity. Bosses are slowed instead. Roots do not freeze regeneration
  or prevent adjacent attacker swings.

Explosive Charge, universal Tech imbuement redesign, and speculative additional
weapons are not silently implemented.

## Verification

Run `node --test tests/rimewall.test.cjs`. The shipped inline script is parsed
and booted in an inert DOM, with actual combat/economy/lobby functions exercised
by 69 dependency-free behavioral tests. This is not browser rendering QA or
live network testing. Real-device multiplayer, mobile layout, balance, and feel
remain playtest items. Browser QA was unavailable in the managed environment.

## Send ordering follow-up

Mixed send panels now keep Shrine 1–5 order across income, flying and attacker
types. Previously, the legacy mixed panel appended lower-tier attackers after
all income sends. Main send tabs show explicit shrine dividers and payback in
cycles and income ROI percentages. Within a shrine, highest income divided by
price is first; attacker ROI uses lumber income divided by lumber price.
Shrine headings collapse and expand independently in each main send tab.
Keyboard shortcuts use the
displayed unlocked send order. Regression checks inspect the generated menu
markup and exercise the actual keyboard event handler.

Previous build label: `COMBINED TEST · SEND ORDER 2`.

## Spiral maze reference update

Previous build label: `COMBINED TEST · SPIRAL MAZES`.

The user's October 18 screenshot is now the reference for every computer's
maze, on both teams. The first 22 positions reproduce its continuous inner
hook and outer square wall. Towers extend outward in segment order rather
than being re-sorted by distance to the checkpoint. Each seat uses the
checkpoint in its own column zone; north reflects south. Whole-half computers
start at the shared checkpoint and add the side checkpoint coils afterward.

Completed coils reserve their internal walking corridors from later fill.
Additional approach-lane positions remain available after the coils, and each
purchase still checks both entire ground routes before charging gold. Learned
economy/combat choices remain; learned placement order cannot replace the spiral.

Three new behavioral checks cover the reference geometry, reflected and
non-overlapping seat plans for one/two/three defenders, and actual incremental
solo/full-team purchases with both routes open after every step.
Mobile rendering and live multiplayer remain device playtests.

## All computers and hit ranks update

Previous build label: `COMBINED TEST · ALL AI SENDS + HIT RANKS`.
Source base: `2bce49291a4ee55567ae521045b4db4da6084e0e`.

The Classic Wars wave-2 guard is removed for every computer. Saving for a
Shrine cannot stop its independent economy sends. The old first-affordable
Miner loop is replaced with separate economy and pressure choices. Send
purchases respect swarms, both lanes, per-seat gold, lumber conversion, and
fractional lumber income. Rival tower upgrades cannot touch teammate towers.
Tech AI fits a weapon mix with one Painter per seven placements; Ninja AI can
use all seven weapons. Both pay for the chassis and fitting separately.

The 20-minute, five-computer Classic Wars economy/construction simulation uses
normal income, the actual income/send/build functions, no free gold, and no
combat bounties. Every computer reaches Shrine 5 and sends Shrine-5 units,
using 13–14 distinct sends and roughly 290–350 purchases per computer under
the adaptive attack policy below. Every
purchase balances against earned gold. Spiral paths stay open, and completed
mazes keep receiving upgrades. Creeps are cleared between economy ticks in
this check: these numbers do not establish combat balance or frame rate.

Additional checks cover natural rank 1 from actual hit resolution at 100 hits,
free rank 50, mixed-currency paid batches, preservation through tier/weapon
changes, desktop/mobile rank markup, actual menu ordering and collapse events,
wave-mode sending, attackers' lumber charges and income, swarms, weapon-rack
choices, and repairing a destroyed spiral cell after its build queue ends.

## Adaptive attacks: win through life loss

Current build label: `COMBINED TEST · ADAPTIVE AI ATTACKS`.
Source base: `e5aaf4315455af0fbd7e3c3eeff24016b7446b40`.

Every AI send carries its sender through actual combat. Kills and leaks are
recorded separately for each computer and send type. Four recent failures of
a unit exclude it from economy purchasing. A recent run of at least four
stopped regular units, or three minutes without opposing life loss after
multiple purchases, increases offensive spending. Units still walking are not
recorded as kills. Attacker damage to towers counts as useful pressure even
when the attacker dies.

Computers compare visible defending towers' damage, armor matchups, armor
penetration, air coverage, and splash coverage. Stronger body size, shields,
regeneration, speed, swarms, and actual successful leaks inform attack choices.
This is an estimate for choosing sends, not a change to combat calculations.
Air is favored against ground-only defense; fortified bodies can punish Tech.

Stalled computers save for two purchases of a selected counter and release
them together down both lanes. Finishing attacks use three purchases. The
planner considers the current pressure fund plus six income cycles to choose
an attainable counter; it can use an earlier unlocked tier while saving for
later power. Repeatedly stopped current-tier sends can bring the next Shrine
forward from its normal schedule. Even if all Shrine-5 units have previously
been stopped, the computer continues preparing counter bursts instead of
silencing its sends. Failed units lose selection weight but can still be used
in pressure bursts when the alternatives are worse.

Aggressive send clocks are 8 seconds in Classic Wars and 12 in wave modes,
versus 12/20 normally, with seat offsets. Economy purchases are capped at four
per aggressive tick, versus twelve normally; pressure is capped at three
purchases per tick. Friendly and opposing computers use the same policy and
keep separate funds. The initial spiral build and existing defense budget
remain part of their policy.

Multiplayer AI sends include a result identifier. The defending client reports
actual kills/leaks to the sender; unexpected peers and duplicate results are
ignored. Observed team life loss also informs the planner when result reports
are absent. These protocol paths are exercised in the inert-DOM tests; live
network play remains unverified.

A controlled combat regression uses the actual movement, targeting,
projectiles, damage, and leak functions against six Tech Bolt Platforms on
the reference spiral. Four Miners are killed with no life loss. The computer
reacts, pays 500g to advance Shrine, and pays for two Ram Hulk purchases. At
least one armored counter reaches the ship against the same defense. This
establishes the feedback loop works, not overall game balance. Further checks
cover air counters, saving and burst charges, successful sends, low-life
finishing, continued attacks after all units fail, all five computer seats,
useful attacker damage, and multiplayer result handling.

Still on deck: playtest the stronger sends, then reassess Crystal; test Earth
and Stone against the varied ground, flying, and attacker pressure. Improve
spiral efficiency further after that. Bulwark, Ninja, Tech, Crystal, Earth,
and Stone combat values are preserved in this update. Live multiplayer,
mobile rendering, balance, and performance still require device playtests.

## Lobby slot fix — October 20, 2026

New room initialization clears stale seats and reserves the host before guest
assignment. Guest lobby entry requires an authoritative roster containing its
identity. Game colors resolve through roster team space; watched boards use
vertical reflection to preserve west/east positions. Wire keys retain raw slot
indices when another slot closes. Occupied human slots cannot be silently closed.

Regression coverage includes stale 1v1 to 2v2 creation, two humans vs two bots,
out-of-order guest handshake, closed-slot routing and life totals, north-team
colors, and watched towers/creeps/beams/effects.

## Follow-up: screenshot team display — October 19, 2026

The previous fix missed renderSquadIncome, which used the legacy oppName field
as an unconditional enemy label. The panel now groups the authoritative roster
and resolves income and seat colors individually. Added a spatial lobby guide
and explicit teammate/opponent labels for the top watched board.

New regression runs two separate application VMs through room creation, join,
roster exchange, Ready checks and host start, then checks actual team panel HTML
from both clients and verifies the only send targets are the two enemy bots.
Browser QA remains unavailable due to the preview browser URL policy block.

## Ready synchronization follow-up — October 19, 2026

Readiness updates patch existing controls. Guest intent stays pending until a
per-request acknowledgment arrives; both request and host-state versions reject
out-of-order messages. Heartbeats retry pending requests and include the roster.
A 30-second connection timeout still prevents starting with an absent player.
Start-message acknowledgment and retry recover a dropped go packet.

Regression checks cover stable lobby HTML across repeated heartbeats, roster and
state messages; lost Ready retries; stale state rejection; rapid unready overriding
a previous Ready; duplicate request idempotence; changed-roster cancellation;
no-op team arrangement; and lost/duplicated start packets. The two-client full
join/Ready/start check remains in the suite. Browser QA is still blocked by the
preview URL access policy. The home badge reads READY FIX 13.

## Runtime team fix — October 19, 2026

The former lobby regression stubbed startBattle. New runtime tests retain the
actual startBattle and buySend paths, with only canvas/viewport helpers stubbed.
They exercise both human purchases against AI seats, a hosted AI attack delivered
to the guest, friendly-fire rejection, late seat edits, real leaks on both sides,
and identical victory/defeat outcomes with final life totals on both clients.

Fixes freeze match team identity, validate attack ownership, name the actual AI
source, account for bot leaks before synchronization, and replace unconditional
inversion of the other human's result with team-aware result propagation.
The home badge is TEAM MATCH 14. Cross-device browser verification remains
unavailable; these are deterministic two-client application-script checks.
