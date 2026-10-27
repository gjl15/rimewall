# Ninja Fire and Toxic stack-limit audit
Sunday-night work, October 25, 2026. Completed October 26, 2026.

**Finding:** removing the cap substantially improves concentrated Ninja damage against armored sends. It lets some moving defenses stop World Titan and Iron Leviathan. It does not make the tested defenses reliably stop the strongest Shrine-8 sends.

**Release state:** the game source and draft PR #10 still use a combined 30-effect cap. The audit changes `TRAIT.dotCap` to `Infinity` only inside isolated simulations. No stack-rule change, merge or deployment is included.

Tested source: [`f1c843672a52`](https://github.com/gjl15/rimewall/commit/f1c843672a520ceea4aa669050ad0f31f20168c3) in [draft PR #10](https://github.com/gjl15/rimewall/pull/10). Reproduction: [script](audit/dot-stack-audit.cjs), [all 572 scenario records](audit/dot-stack-audit.json).

## Scope and method

- 296 focused-fire cases, 216 moving-maze cases, 36 focused cases at 60 simulation steps/second, and 24 moving-maze cases at 60 steps/second. The broader screening cases use 20 steps/second. Capped and uncapped cases use the same three seeds: 20261025, 20261026 and 20261027. Four single-tower comparisons are included among the focus cases.
- The actual game VM handles damage, projectiles, armor/class penalties, imbuements, Fist double-hit credit, automatic ranks, movement, tower destruction and leaks. Only the DOT cap changes between each paired comparison.
- Starting ranks are conditional snapshots: a Master fitted near the start, one damaged enemy per attack, 50% active firing time, no purchased ranks. Fist uses its real random second strikes; other profiles use one credited victim per attack. Profiles exclude crowd/bounce bonus credits, construction time and competition from other towers. Every tower in a fixture receives the same age assumption. Automatic ranks continue to grow during each combat case.
- Focus cases hold one untrained send on a legal floor cell with all 20 towers in range; Shadow uses 10 legal cross positions. Held targets cannot attack towers, and Toxic cannot gain extra firing time through its slow. These isolate damage and are optimistic focus windows, not survival predictions.
- Maze cases use 24 or 48 legal cells from the game's spiral placement policy, cycling through all seven Ninja weapons. A purchase spawns one send per lane. Real movement, attacks and destruction remain enabled; later income, rebuilding, support glyphs, Bulwarks, other builders and additional sends are excluded.
- Focus trials end at death or 240 seconds. Maze trials end when both units retire or after 180 seconds. An unresolved unit is not a successful defense. Headline tables use the 60-step cases and medians over three seeds.

## Earned-rank assumptions

Each cell gives the starting rank and listed damage before armor, critical/double-hit multipliers and imbuements.

| Weapon | 8 minutes | 17.5 minutes | 24.5 minutes |
|---|---:|---:|---:|
| Fist Master | R11 / 32.76 | R14 / 34.32 | R16 / 36.66 |
| Dagger Master | R10 / 48.36 | R13 / 50.70 | R15 / 54.21 |
| Sword Master | R8 / 59.80 | R11 / 65.52 | R13 / 67.60 |
| Mace Master | R2 / 84.00 | R3 / 91.00 | R4 / 92.82 |
| Spear Master | R6 / 108.22 | R9 / 114.08 | R10 / 120.90 |
| Shadow Master | R3 / 52.00 | R6 / 57.72 | R7 / 58.76 |
| Shuriken Master | R7 / 73.45 | R10 / 80.60 | R11 / 81.90 |

These checkpoints follow the baseline computer Shrine schedule, not a mandatory player unlock timer. Every player Shrine upgrade costs one lumber and has no time gate. Buying all upgrades and a first Heartwood Giant from Shrine 1 costs 32 lumber (16,000 gold equivalent at 500 per lumber), while a first World Titan costs 15,000 gold plus four lumber (17,000 equivalent). Human rushes can therefore expose the defense to Shrine-8 bodies earlier than the 24.5-minute profile. This audit does not calibrate that economy issue.

## Focused Fire results at 60 steps per second

Twenty Fire-imbued towers continuously focus one held target. Tower ranks keep growing during combat. A value above 240 seconds is censored at the cutoff, not a measured kill time.

| Weapon / send | Starting rank | Spawned HP | 30-stack cap | No cap |
|---|---:|---:|---:|---:|
| Fist Master / World Titan | R11 | 23,494 | 33.03 s | 17.87 s |
| Fist Master / Root Leviathan | R16 | 156,630 | >240 s; unresolved | 112.72 s |
| Fist Master / Eternal Dragon | R16 | 244,734 | >240 s; unresolved | 159.98 s |
| Dagger Master / World Titan | R10 | 23,494 | 23.80 s | 14.47 s |
| Dagger Master / Root Leviathan | R15 | 156,630 | 196.75 s | 94.13 s |
| Dagger Master / Eternal Dragon | R15 | 244,734 | >240 s; unresolved | 133.33 s |

For Dagger, World Titan kill time improves by about 39%, and Root Leviathan by about 52%. Against Root Leviathan, twenty Daggers deal approximately 11,857 damage in the first 15 seconds with the cap and 23,582 without it, nearly double. Fist improves from approximately 8,979 to 19,590 over the same 15-second window, about 2.18 times as much damage. These are total damage measurements, including direct hits and burn.

The larger benefit against fortified units comes from letting more armor-bypassing burn remain active. The tower's base hit, armor penetration and damage-type penalty do not change. A single-tower control below the cap shows no difference; the improvement appears when multiple towers would otherwise evict one another's effects.

## Fire and Toxic damage comparison

The wider 20-step screening cases isolate each imbuement against Root Leviathan at the 24.5-minute rank profile. These figures are first-15-second damage against a held target; they do not include the movement benefit of Toxic's slow. Shadow uses 10 towers; the other rows use 20, so this is not a cost or weapon-efficiency ranking.

| Weapon | Imbuement | Damage with cap | Damage without cap | Increase |
|---|---|---:|---:|---:|
| Fist Master | Fire | 8,978 | 19,458 | 117% |
| Fist Master | Toxic | 8,303 | 13,490 | 62% |
| Dagger Master | Fire | 10,515 | 20,352 | 94% |
| Dagger Master | Toxic | 9,521 | 14,449 | 52% |
| Shadow Master | Fire | 4,095 | 5,909 | 44% |
| Shadow Master | Toxic | 3,030 | 4,093 | 35% |
| Shuriken Master | Fire | 8,873 | 16,147 | 82% |
| Shuriken Master | Toxic | 7,376 | 11,155 | 51% |

## Moving-maze results at 60 steps per second

Each row uses 48 Ninja towers with mixed weapons and two sends, one per lane. World Titan, Root Leviathan and Eternal Dragon rows alternate Fire and Toxic imbuements. Iron Leviathan uses Toxic on all towers. The listed outcome occurred in all three seeds; clear times are medians.

| Send / checkpoint | 30-stack cap, per run | No cap, per run |
|---|---|---|
| World Titan, 8 min | 1 stopped, 1 escaped | 2 stopped |
| Iron Leviathan, 17.5 min | 1 stopped, 1 escaped | 2 stopped |
| Root Leviathan, 24.5 min | 2 still active at 180 s | 1 stopped, 1 still active at 180 s |
| Eternal Dragon, 24.5 min | 2 escaped | 2 escaped |

World Titan clears in about 63 seconds without the cap; the capped defense loses one unit to a leak. Iron Leviathan clears in about 84 seconds without the cap; the capped defense also leaks one. Root Leviathan improves, but one unit remains alive at the 180-second cutoff. Both Eternal Dragons still escape, at about 33.5 seconds. Additional damage does not replace enough time in range, control, air coverage or a larger/different defense.

Frame cadence matters: the 20-step and 60-step moving probes can produce different path/target/cooldown outcomes. For example, the 48-tower mixed Root Leviathan fixture leaks both units at 20 steps/second; at 60, both remain active at the cutoff with the cap, while the uncapped case stops one and leaves one active. The broad cases are screening data; they must not be presented as a full-match win rate or device-independent guarantee.

## Mechanics and performance findings

- Fire still adds 20% of the current tower damage over three seconds and can kill. Toxic still adds 10% over four seconds, cannot reduce an enemy below 1 HP, and refreshes a 60% slow for 1.5 seconds. Uncapping DOT does not increase the slow strength.
- Each effect expires separately, so constant firing settles around application rate times effect duration. Stacks do not grow indefinitely on one enemy from a fixed number of towers. Fist's two landed strikes retain two imbuement applications and two hit credits; lingering DOT continues to grant zero rank credit.
- Isolated checks with 100 stacks confirm that Fire and Toxic effects expire on a surviving target, DOT does not award rank hits, and Toxic still stops at 1 HP. All capped scenarios stay at or below 30 queued effects. The four single-tower paired controls match in duration, remaining HP and peak queue size.
- The highest observed queue is 505 DOT entries on one creep in a broad concentrated trial. The moving-maze trials reach 249 at the finer cadence. This increases host-side work and storage; no phone frame-rate, battery or long multiplayer stress result is claimed. Shared-arena snapshots currently serialize DOT presence rather than each full stack, so an increase in stack count does not directly multiply that field's network payload.
- The cap is global to the shared DOT list. A permanent removal would also affect Tech imbuements and the Fire builder's burn effects. Those builders were not balanced by this Ninja-focused audit. The existing shared-state population cutoff is also outside this experiment.

## Recommendation and release decision

Uncapped, short-lived Ninja imbuements are a reasonable next playtest candidate. Keeping the existing percentages, durations and Toxic slow/non-lethal rule would isolate the change. The improvement is substantial against armor and lets additional towers contribute their full imbuement damage, but it does not resolve Ninja's full late-game progression, Shrine rush pricing or anti-air exposure.

Before a global rule change is accepted, measure the other affected builders and host performance in a long shared match. The audit is complete as a bounded Ninja comparison; full-game balance is not certified. The checked-in game rule remains 30, and nothing is deployed by this audit.

## Reproduce

From the repository root:

```sh
RIMEWALL_TEST_TIMEOUT_MS=60000 node sites-test/audit/dot-stack-audit.cjs all /tmp/rimewall-dot-stacks.json
```

Modes `focus`, `maze`, `cadence`, `maze-cadence` and `sanity` can run separately. `null` cap in the JSON records means Infinity in the isolated VM. The compact committed data combines the four completed batches and the invariant checks; it omits an unused per-second trace from the first screening run.
