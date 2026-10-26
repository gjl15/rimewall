# Rimewall shared test balance audit
October 25, 2026. Baseline: `954a19b5225144ae57e9ddab882f9c801ff73f16` on `test/sites-shared-arena-20`.

This first audit combines real regression checks, a reproducible economy and damage reference, and bounded combat scenarios. The candidate applies Abdy's 10/20/30/50 attacker prices, fixes Crystal ownership, and prevents unaffordable attacker turns from stalling AI pressure after the saving deadline. It is a first balance pass for review, not a claim that every race, late-game system or physical-device match is balanced.

## Findings and disposition

| Priority | Finding | Evidence | Disposition |
|---|---|---|---|
| High | Crystal formations cross teammate ownership | In a real two-client shared room, adjacent host and guest Crystals formed one group; the host's free bonus switch changed the guest's tower too. | Fixed by matching the stable player seat in shared rooms and the computer owner in solo/legacy rooms. New tests cover both clients and friendly computers. |
| High | Guest state stops updating above 400 active creeps | 400 creeps applied at state sequence 2. The next valid host snapshot contained 401 creeps, but the guest remained at 400 and sequence 2. The payload was 78,228 characters. | Open. The decoder rejects the whole state at its 400-creep limit while the host can exceed that population. This must be addressed before accepting long or heavily populated shared matches. |
| Medium | Attacker prices reward later combat power and income too cheaply | Wallbreaker cost the same 2 lumber as Breacher. Siege Ruiner returned 40% of its purchase price each cycle, versus 20% for Sapper. | Abdy selected candidate prices of 10 / 20 / 30 / 50 lumber, with recurring income retained. |
| Calibration | A passing functional suite does not establish game balance | Baseline 144/144; current candidate 150/150. The 20-minute computer economy test clears creeps during its accounting simulation. | Keep economy, controlled combat, full-match behavior and device performance as separate measurements. |
| Documentation | Attacker kill bounty is mode-dependent | The shipped `sendCreepDef` pays zero in Classic, but a minimum 20 gold per attacker outside Classic. | Correct the earlier broad wording that attackers never award bounty. This patch leaves the mode rules intact. |

The snapshot finding is reproduced in `audit/baseline.json` and remains visible in `audit/candidate.json`. It is not hidden by the passing regression count. A suitable repair must deliver the complete authoritative population, for example through bounded atomic pages, with loss/reordering recovery. Silently truncating the visible creeps or merely moving the cutoff is not a complete repair.

## Attacker price change

One purchase sends one attacker down each lane. Price and recurring income are per purchase, not per lane. The health, armor, swing damage, Shrine unlocks and AI 45-second spacing remain the existing rules.

| Attacker | Shrine | Existing lumber | Candidate lumber | Recurring lumber per cycle | Existing nominal payback cycles | Candidate nominal payback cycles |
|---|---:|---:|---:|---:|---:|---:|
| Sapper | 2 | 1 | 10 | 0.20 | 5.00 | 50.00 |
| Breacher | 3 | 2 | 20 | 0.35 | 5.71 | 57.14 |
| Wallbreaker | 4 | 2 | 30 | 0.60 | 3.33 | 50.00 |
| Siege Ruiner | 5 | 4 | 50 | 1.60 | 2.50 | 31.25 |

Candidate recurring return is 2%, 1.75%, 2% and 3.2% of cost per cycle. This reduces the old late-tier returns of 30% and 40%, while preserving recurring lumber as a reason to send.

Payback divides price by recurring income without reinvestment. Whole lumber arrives through the fractional bank: from an empty bank, recovering the full candidate cost takes 50, 58, 50 and 32 payouts respectively. Classic cycles are 15 seconds and wave-mode cycles 25 seconds; the time to the first payout depends on when the purchase occurs.

### Selected curve and comparison

Abdy selected 10 / 20 / 30 / 50 after the initial 2 / 4 / 8 / 20 proposal. That earlier proposal remains in the preceding PR commit for history. The current source, candidate results, tests and PR description use the selected values.

Using the game's physical armor formula, the following comparison assumes no armor piercing, class bonus or chaos damage. It is a durability reference, not universal survival time.

| Attacker | HP | Armor | Tower swing damage | Effective HP before piercing | Candidate effective HP per lumber | Candidate swing damage per lumber |
|---|---:|---:|---:|---:|---:|---:|
| Sapper | 1,400 | 8 | 12 | 2,072 | 207.2 | 1.2 |
| Breacher | 2,800 | 13 | 24 | 4,984 | 249.2 | 1.2 |
| Wallbreaker | 5,200 | 18 | 36 | 10,816 | 360.53 | 1.2 |
| Siege Ruiner | 13,500 | 24 | 96 | 32,940 | 658.8 | 1.92 |

Later Shrines still offer stronger bodies and more durability per lumber. Wallbreaker requires a larger commitment than Breacher. Siege Ruiner's 96-damage swing can still destroy a basic 96-HP ordinary tower in one strike. Its higher return and damage per lumber remain visible in the comparison and should be checked in full matches.

Human and computer purchases use the same send table. Tests verify the new prices, insufficient funds, conversion of only missing AI lumber, recurring income, two-lane spawning and duplicate-command protection. Price-dependent fixtures were updated for the selected prices, ROI and remaining gold. The higher prices exposed an AI pressure-cycle stall: if no attacker is affordable after 40 seconds of saving, or immediately in finish mode, the computer now advances to the next send family. The 20-minute economy/construction check and a dedicated deadline/finish regression both pass without lowering the requested prices.

## Current state across the feature set

| Area from the change record | Audit evidence and current state |
|---|---|
| Shared combat and computer simulation | Actual two-client shared-world tests pass; only the host advances simulation. Full late-game acceptance is still open. |
| Map presentation and fixed teams | Canonical orientation, north-host and opposite-team cases pass in the VM. No new phone render measurement is claimed. |
| Lobby seats and ownership | Ready roster, personal purses and foreign sell/rank rejection pass. Crystal was the additional ownership defect found and fixed. |
| Ready/start | Ordered requests, stale consent, changed roster and start retry checks pass. |
| Lives and results | Single-count leaks, shared lives and teammate outcomes pass. |
| Network and recovery | Normal deltas, recovery and ordering pass; the 401-creep rejection is a high-priority exception. |
| Team income display | Roster-based income and personal accounting checks pass. |
| Send menus and mobile layout | Ordering and dynamic ROI markup pass. The new prices flow from the shared data table. Real-device readability remains unmeasured in this audit. |
| Computer mazes and upgrades | Spiral routes, repair, weapon mixes, 24-tower breadth and upgrade accounting pass. The long economy simulation is not a combat difficulty score. |
| Computer budgets and affordable attacks | Anti-hoarding and fallback tests pass at the selected higher prices. Six additional checks include real AI conversion/accounting and advancing past an unaffordable attacker turn after the deadline or in finish mode. |
| Computer Shrine progression | The existing fast Shrine 1-5 and slower 6-8 targets remain and pass their schedule checks. |
| Computer send cadence and limits | One attacker per lane, six-turn pressure cycle and 45-second spacing checks pass. |
| Random element | Solo choice, remembered selection, host resolution and lobby preservation checks pass. |
| Ninja | Existing weapon-specific tests pass. The combat matrix uses actual computer weapon choices and ranks; it does not measure every possible human build. |
| Tech | Chassis, three-target Multishot, Bola, Painter and weapon-mix checks pass. Class penalties still matter. |
| Earth | Fault Line, Tremor delay/location, ground-only behavior and synchronized choices pass. |
| Stone | The three critical profiles and exclusion of Earth abilities pass. |
| Crystal | Same-owner groups now stay isolated in shared and solo computer cases. Chaos and free switching checks continue to pass. |
| Rank limits and rewards | Standard rank 10 requires 990 points; splash 3,175. Ranks remain uncapped. Rank 10 damage is 1.24 times rank-3 damage and attack rate 1.07 times rank-3 rate before other modifiers. |
| Rank credit | Distinct victims, DOT exclusion, beam cadence and existing weapon behavior pass. Different attack rates and crowd exposure still create different promotion speeds. |
| Paid rank finishing | Currency separation, no automatic spending, partial progress and preservation through weapon changes pass. |
| Bulwark | Core/aura caps, expertise, reflected damage credit and protected-strike exclusion pass. Veteran growth still needs late-game calibration. |
| Tower durability and attacker stats | Listed attacker durability and one-second swings pass. Ordinary HP doubling and Bulwark exclusion pass. |
| Shrines 6-8 | Five sends per tier and currency rules pass. Those prices/stat lines are still provisional; functional checks do not settle their relative value. |
| Send Training | Escalating cost, future-unit scope and sender-owned stats pass. Level 1 costs 100 lumber for +5% HP, +1% speed, +10% gold price and +1% gold income; its economic attractiveness needs a full-match test. |
| Aegis | Owner-only protection, later builds, cooldown and charge behavior pass. Duration/value tuning remains open. |
| Gold/lumber economy | Fractional accumulation, mixed-currency ordering, mode timing and fixed-with-time send HP checks pass. Attacker bounty is zero only in Classic. |
| Test access and release identification | Test unlocks remain enabled. The candidate release tag and notes identify this cost/ownership pass. |

The direct-damage reference includes 340 combinations of the current damaging tower definitions and five armor classes at 24 armor. It calls actual damage functions, but excludes sustained status/control value and uses listed tower prices. It is not a cross-race efficiency ranking; weapon chassis and cumulative investment must be considered before drawing that conclusion.

## Controlled combat measurements

A deliberately weak wall of twelve tier-0 Tech towers was tested with actual movement, attacks, projectiles, damage, ranks and leaks, one attacker in each lane. Sapper destroyed one tower and was stopped; Breacher, Wallbreaker and Siege Ruiner destroyed the twelve towers and caused two leaks. This illustrates why affordable early attacker bursts matter. It does not represent an upgraded human defense.

A second reproducible matrix covers eleven builders and six send choices: 66 scenarios. Every defense received a 1,000-gold budget, twelve legal spiral cells and the existing computer upgrade policy. Actual spending was 900-1,000 gold; leftover money is reported. Seed is 20261025, with no later income and a 120-second limit. Natural ranks remain active.

| Two-unit send | All units stopped within 120s | At least one leak | Unresolved at cutoff |
|---|---:|---:|---:|
| Miner | 11 | 0 | 0 |
| Breacher | 11 | 0 | 0 |
| Wallbreaker | 5 | 6 | 0 |
| Siege Ruiner | 0 | 10 | 1 |
| World Titan | 0 | 11 | 0 |
| Root Leviathan | 0 | 4 | 7 |

An unresolved scenario is not a win or a successful defense. These fixtures compare a specific computer-built opening against much later sends as well as early sends. They do not justify a race tier list, a win-rate claim, or arbitrary damage buffs. The matrix does establish useful coverage of damage, pathing, wall destruction and the strength gap between attacker rungs.

## Validation and reproducibility

- Untouched baseline: 144/144 behavioral tests passed.
- Current candidate: 150/150 passed, including six additional regression checks.
- The new price and ownership tests were run against the baseline first and failed, then passed after the patch.
- Inline JavaScript and shared-arena syntax checks passed.
- `git diff --check` passed.
- No actual two-phone session or hosted deployment was performed.

From the repository root:

```sh
node --test sites-test/tests/*.test.cjs
RIMEWALL_TEST_TIMEOUT_MS=60000 node sites-test/audit/balance-audit.cjs /tmp/rimewall-audit.json
RIMEWALL_TEST_TIMEOUT_MS=60000 node sites-test/audit/combat-matrix.cjs /tmp/rimewall-combat.json
```

The audit runtime reuses the committed real-game VM and two-client fixtures. It disables only test registration when loading them; it does not substitute a combat or economy model.

## Next balance gates

1. Repair complete snapshot delivery above 400 creeps and verify recovery after missing or reordered data.
2. Play fresh same-version rooms on two physical devices in Classic and wave modes, with both 1v1 and team layouts.
3. Measure matched-tech defenses and sends at several budgets and seeds. Record first leak time, lives lost, towers destroyed, remaining resources and response options.
4. Calibrate the attacker curve, Shrines 6-8, rank promotion speed, Training and Aegis against those full matches. Avoid treating the old independent-board lethality measurements as shared-world balance results.
5. Add the original SHRINES 17 balance review when Gene supplies it. The request is already posted in issue 8.

This patch is prepared on a separate audit branch targeting the shared test branch. It does not update main, the separate GitHub Pages /test/ lineage or the ChatGPT-hosted test game.

