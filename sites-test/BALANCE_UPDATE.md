# SHARED ARENA 20 test handoff

Test URL: https://rimewall-bulwark-test.abdylang-dpt.chatgpt.site

SHARED ARENA 20 uses one host-authoritative team battlefield in new multiplayer
rooms. All players' defenses share pathfinding and combat against the same
waves and sends. Human purses, tower ownership and purchase decisions remain
separate. Both sides are visible together; the Boards selector is removed.
North and south remain canonical, including when a north player hosts.

The shared protocol lives in dist/shared-arena.js and is loaded by index.html.
Include that file with future handoffs. Every guest action has an ordered ID,
retries until acknowledged, and is validated/executed once on the host. Guests
consume packed host state, including personal purses, tower changes, creeps,
projectiles, effects, team leaks and results. Full snapshots repair missed
updates. The host must keep the game open; no host migration is implemented.

Team incomes now live above the map. Sends use a content-sized phone tray and
tighter desktop cards, preserving the existing information. The 139-check
suite covers shared combat, per-player resources, both team orientations,
AI-to-human sends, recovery, ownership, builder controls and existing balance.
Two browser clients have also passed Ready/start, shared building and outgoing
sends using the real online MQTT relay. Two physical devices still need to
confirm play. Refresh every client to SHARED ARENA 20 and create a fresh room.

The following records the earlier balance release and renderer history:

FULL BOARDS 18 follows SHRINES 17 (cea35b5c5d7b87d9861c5fc8b30f8e2033005b14).
Multiplayer shows one full-width native-aspect board per team rather than
compressed copies of human maps. Boards selects an independent human defense
or the shared computer defense on that half. Other humans remain read only;
My towers returns to local building. North/south teams and shared lives remain
unchanged. The phone overview strip and large in-map slot labels are removed.

The balance update below starts from MAZE SYNC 16
(46893fbcf8124dc8a4487e035f89fea8c480f5f1), preserving its multiplayer ownership
fixes. Main is not changed. Two physical-device play still needs confirmation.
Refresh both devices and create a fresh room after deployment.

## Tower progression and durability

Standard next-promotion requirements begin 5, 10, 25, 50, 75, 100, 125, 150,
200, 250, 300. Splash begins five positions ahead at 100. At 300 and above,
the next increase is 25 times the complete hundreds in the current requirement.
Rank 10 costs 990 total standard points or 3,175 splash points. Ranks are uncapped.

One damaged enemy earns one point per attack. Splash, chain and line victims
are counted individually; effects sharing one attack cannot double-count that
victim. Shield damage qualifies. DOT ticks give no extra points. Beams count
victims at their native attack cadence, independent of simulation frames.
Existing splash membership is retained (splashSpec, chain, Mace, Shadow,
beamline); Multishot uses the standard curve and counts distinct victims.
Earth aftershocks count their own landed blast. Painter support retains its
existing support credit. These are explicit first-pass event choices.

Ranks 1–3 retain +10% base damage, +0.5 range and +0.1 attacks/sec each.
Above 3: +2% damage and +1% attack rate per rank, based on fixed rank-3 stats;
an extra +5% damage at total ranks 5, 10, 15... No further range growth.
Paid ordinary finishing retains existing prices: gold for ranks 1–3, then
ceil(next rank / 10) lumber. Natural rank-ups never spend resources.

Ordinary tower maximum HP doubles. Bulwark base HP is unchanged. Attackers
use listed HP/armor (1400/8, 2800/13, 5200/18, 13500/24) and strike every 1s.
Non-attacker blocking attacks retain their old cadence. Strike damage remains
12/24/36/96. Siege Ruiner still one-shots a basic 96-HP ordinary tower.

Bulwark expertise earns incoming raw damage plus actual reflected damage,
excluding overkill. Ranks 2/3 require cumulative 0.5/1.5 base HP. Later ranks
require additional 0.5, 0.75, 1.0... base HP. Thresholds never scale with upgrades.
Above rank 3: +1% rank-3 HP per rank plus +5% each fifth total rank. Other
defense percentages stay at rank-3 limits. Optional finishing uses
ceil(next expertise rank / 10) lumber, minimum 1 (test tuning).

## Sends and training

All Shrine unlocks still cost 1 lumber. Sends below are ordinary income sends;
none attacks towers. Values are base/listed stats before deployment and training.
New regular sends retain 1.35 HP scaling, board HP scaling, and +2 armor.

|Tier|Send|Gold|Wood|Gold income|Wood income|HP|Armor|Speed|Class|Air|
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
|6|Dawn Behemoth|20000|0|2000|0|15000|26|2.5|heavy|no|
|6|Iron Leviathan|24000|0|2400|0|17000|28|2.4|fortified|no|
|6|Crown Colossus|30000|0|2850|0|20000|30|2.5|medium|no|
|6|Tempest Dragon|18000|0|1700|0|13500|25|3.0|light|yes|
|6|Sky Sovereign|26000|0|2400|0|18000|28|2.9|heavy|yes|
|7|Grove Vanguard|30000|1|3000|0.01|22000|30|2.5|medium|no|
|7|Amber Guardian|38000|5|3600|0.05|27000|32|2.4|heavy|no|
|7|Elder Bastion|47000|10|4300|0.1|33000|34|2.3|fortified|no|
|7|Verdant Wyvern|58000|15|5100|0.25|40000|36|2.9|light|yes|
|7|World Sentinel|70000|20|6000|0.5|48000|38|2.5|heavy|no|
|8|Heartwood Giant|0|25|0|0.75|52000|40|2.5|medium|no|
|8|Ancient Warden|0|40|0|1.2|65000|42|2.4|heavy|no|
|8|Root Leviathan|0|60|0|1.8|80000|44|2.3|fortified|no|
|8|Aether Phoenix|0|90|0|2.7|100000|46|3.0|light|yes|
|8|Eternal Dragon|0|130|0|3.9|125000|48|2.8|heavy|yes|

Lumber fractions accumulate in woodBank each income cycle; whole lumber pays
when the balance reaches 1. Classic pays every 15s, wave mode every 25s.
Gold income is uncompressed: INCOME_EXP = 1, so the payout function returns
the rounded raw income. Earlier handoff wording about diminishing returns was
incorrect; the runtime constant was already 1 in SHRINES 17.
Mixed-currency ROI treats lumber cost as its 500g exchange value for gold
payback; pure-lumber ROI uses lumber only. Secondary wood income is shown
separately rather than counted twice in mixed ROI.

Send Training costs 100, 200, 300... lumber. Every level adds 5% HP, 1% speed,
10% gold price and 1% gold income against base values, plus 1 armor every two
levels. Only future regular sends change. Wood prices/income do not scale.
Attackers and neutral waves are excluded. Direct training income is deferred:
the suggested +5 gold/+1 lumber per purchase was not finalized in the plan.

## Support glyphs

Aegis costs 1000 gold + 2 lumber per charge; max 5 charges. One activation
protects ALL towers owned by that player, including builds during the active
window, for one shared random integer duration from 1 through 5 seconds.
Cooldown is 20 seconds from activation, with no stacking. Allies/enemies are
excluded. Protected swings give no expertise or Thorns reflection. Charges
reset every match. No real-money currency, payment, or persistence is active.

## Code and verification

Main changed functions include rankNeed, towerRank, settleTowerRanks,
towerLiveStats, applyDamage, resolveProjectileHit, firePulse, fireNinjaPulse,
updateTower, updateCreep, towerMaxHp, bulwarkRankValue, advanceBulwarkExpertise,
buySend, sendCreepDef, sendShownHp, sendRoi, sendTierMarkup, renderTowerList,
renderBuildExtras, renderCommandSheet, mpSnapOf and rebuildMirrorEntities.
New helpers cover trainedSend, buySendTraining, glyph purchase/casting,
damage-credit scopes and Bulwark expertise thresholds/paid finishing.

Run node --test tests/rimewall.test.cjs. Tests execute the actual shipped
source with an inert DOM. They include live start/send messaging across two
VM clients, trained arrival stats, glyph ownership/cooldown and remote snapshots.
Browser QA covers menus, collapse controls and Support. These checks do not
establish broker behavior on two physical devices or late-game balance.

The earlier Bulwark simulation tables remain model results, not newly measured
live fights. Continue testing both Classic Wars and Waves vs Rival, human
teammates on fixed north/south sides, simultaneous building/sends, shared lives,
reconnection, fresh rooms, phone portrait/landscape, and late-game economies.
