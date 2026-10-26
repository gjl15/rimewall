# Rimewall changelog

## October 25 2026 — Attacker lumber and Crystal ownership audit

- First test cost pass: Sapper 1→2, Breacher 2→4, Wallbreaker 2→8, Siege Ruiner 4→20 lumber. Recurring lumber income is retained, so nominal payback becomes 10, 11.43, 13.33 and 12.5 cycles.
- Crystal formations now compare player/computer ownership instead of treating every teammate as one owner. One player's free formation switch cannot change another player's towers.
- 149 behavioral checks pass (144 existing plus five additional price/accounting/ownership checks), with prior price-dependent expectations updated.
- Reproducible balance references and 66 seeded combat scenarios are in `audit/`. Read [BALANCE_AUDIT_2026-10-25.md](BALANCE_AUDIT_2026-10-25.md) for methods and limits.
- The audit also reproduces an OPEN shared-state rejection above 400 active creeps. Full shared-battlefield balance and physical-device acceptance are not signed off.

The maintained release history is [dist/changelog.md](dist/changelog.md).
It is published with the game and linked from the home-screen Changelog.

Detailed implementation and verification notes are in [TEST_BUILD.md](TEST_BUILD.md).

## October 25, 2026 — Computers build up and send harder; Random element (Claude, PR)

Changed functions: `desiredAiShrine` (Shrines 1–5 on `simTime/120` / `wave/4`, 6–8 on the
original `/210` / `/7`), `updateComputer` (send gate 10 s / wave 1; cadence 7/5 s Classic,
12/8 s waves; `budget*.7` tier rule; four upgrades a tick), `aiAttackPlan` (shares
.45 opening economy, steady .20/.45), `aiSendEconomy` (three tickets a cycle),
`aiSendPressure` (attackers one body a lane, one in six turns, 45 s apart; 40 s saving
cap; finish mode never saves), `syncAiBudget` (idle wall fund → pressure once the
placement queue is exhausted), `aiBreadthTarget` (ends at 24), `AI_UPGRADE_PERIOD` 3,
`lobbyPickRace` / `commitRace(race, force)` / `resolveRandomRace` / `setRandomRace`,
`mpHostStart` (resolves Random seats), the `go` handler (guest adopts its roster
element), `renderLobby` (Random chip and label), `startBattle` (solo Random),
`loadProfile`. RIVAL select defaults to Brutal. Three fixtures moved to the new schedule;
three regression tests added. 142/142.

### PR #9 audit follow-up — October 25, 2026

- Preserve the remembered Random choice in host seating, guest hello/retries,
  seat moves, and room configuration until the host resolves the starting roster.
- After the pressure saving deadline, or immediately in finish mode, select
  from all eligible affordable sends and reduce the burst to the affordable size.
  Attacker spacing and one-pack limits remain in place.
- Add regression coverage for both cases (144 tests total).

