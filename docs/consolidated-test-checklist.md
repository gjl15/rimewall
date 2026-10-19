# Consolidated Rimewall playtest — implementation checklist

Branch: `feature/consolidated-earth-stone-crystal-ninja-shrines`
Live: `main` (do not merge until user approves combined playtest)
Status: **NOT PLAYABLE / NOT IMPLEMENTED**. This file records scope; it does not change game mechanics.

## Required before issuing a test URL
- [ ] Earth/Stone: implement and test Fault Line and Tremor interactions; settle activation and stacking rules.
- [ ] Crystal: armor reduction **per successful hit**, never per elapsed second; Formation increases armor removed **per hit**. Define floor and stacking.
- [ ] Ninja: unique silhouettes/projectiles by weapon; Fist Master (formerly Shadow Initiate) has 50% double-hit chance, including imbuement effects; Dagger Master has greater range than Fist/Shadow, less than Sword/Mace/Spear/Shuriken, and higher armor penetration. Review Sword Master and other weapon branches.
- [ ] Shrine: reorder sends by actual shrine unlock tier and ROI; check income, attackers, flying; verify AI shrine upgrades.
- [ ] Lobby: verify ready/unready toggles and multiplayer transitions.
- [ ] Tower ranks: ranks 1–3 gold; 4+ lumber plus hit thresholds; splash exponential and non-splash quadratic hit thresholds; expose costs and effects.
- [ ] Resolve no-op Bulwark imbuement without introducing silent balance changes.
- [ ] Run syntax/startup tests, combat-mechanics tests, and multiplayer/mobile smoke checks.
- [ ] Publish **one** isolated, playable combined build and share URL; do not publish partial tests.

## Open specifications
Fault Line/Tremor numerical effects; Crystal armor shred per hit, duration, floor and stacking; full Ninja weapon stats; exact send tiers and ROI order; quadratic/exponential coefficients and lumber schedule; meaning of +0.1 attack speed; Bulwark redesign scope.

## Already live (not part of this branch)
Classic Wars economy adjustment: 15-second income cycle, full listed income as standard send kill bounty, zero kill gold for Wallbreaker and Siege Ruiner. Avoid duplicating that work.
