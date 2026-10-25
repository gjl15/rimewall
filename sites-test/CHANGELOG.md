# Rimewall changelog

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
