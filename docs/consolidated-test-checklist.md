# Consolidated Rimewall playtest — implementation checklist

Branch: `feature/consolidated-earth-stone-crystal-ninja-shrines`
Live: `main` (do not merge until user approves combined playtest)
Status: **NOT PLAYABLE / PARTIALLY IMPLEMENTED**. One send-panel ordering change is committed; other gameplay mechanics and testing remain outstanding.

Progress tracking: GitHub renders checked boxes as completed. This checklist updates when changes are committed; it does **not** auto-refresh continuously. Refresh the page to see new commits.

## Required before issuing a test URL
- [ ] Earth/Stone: implement and test Fault Line and Tremor interactions; settle activation and stacking rules.
- [ ] Crystal: armor reduction **per successful hit**, never per elapsed second; Formation increases armor removed **per hit**. Define floor and stacking.
- [ ] Ninja: unique silhouettes/projectiles by weapon; Fist Master (formerly Shadow Initiate) has 50% double-hit chance, including imbuement effects; Dagger Master has greater range than Fist/Shadow, less than Sword/Mace/Spear/Shuriken, and higher armor penetration. Review Sword Master and other weapon branches.
- [x] Shrine send panel: order income sends by shrine unlock tier, then ROI within tier; order lumber attackers by shrine tier and lumber cost. Code committed as `aa9f1a5` (not yet tested).
- [ ] Shrine follow-up: verify income, attacker, and flying classifications, AI shrine upgrades, and end-to-end UI behavior.
- [ ] Lobby: verify ready/unready toggles and multiplayer transitions.
- [ ] Tower ranks: ranks 1–3 gold; 4+ lumber plus hit thresholds; splash exponential and non-splash quadratic hit thresholds; expose costs and effects.
- [ ] Resolve no-op Bulwark imbuement without introducing silent balance changes.
- [ ] Run syntax/startup tests, combat-mechanics tests, and multiplayer/mobile smoke checks.
- [ ] Publish **one** isolated, playable combined build and share URL; do not publish partial tests.

## Open specifications
Fault Line/Tremor numerical effects; Crystal armor shred per hit, duration, floor and stacking; full Ninja weapon stats; exact send tiers and ROI order; quadratic/exponential coefficients and lumber schedule; meaning of +0.1 attack speed; Bulwark redesign scope.

## Already live (not part of this branch)
Classic Wars economy adjustment: 15-second income cycle, full listed income as standard send kill bounty, zero kill gold for Wallbreaker and Siege Ruiner. Avoid duplicating that work.
