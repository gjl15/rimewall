# Rimewall test build — changelog

Newest changes appear first. Dates use America/Los_Angeles time.

## October 25, 2026 — Computers build up, send harder; Random element (Claude)

- Computer breadth target ends at 24 towers (was 64 in Classic); after that the build
  tick buys tier upgrades. `AI_UPGRADE_PERIOD` 5.5 → 3, four upgrades a tick, and a
  tier upgrade needs 70% of the purse in hand instead of 50%. Measured before: in a
  2v2 at nine minutes the rival had 50 of 107 towers at tier 0 and the friendly
  computer 45 of 45.
- `desiredAiShrine`: Classic `simTime/120`, waves `wave/4` (was /210 and /7). Send
  gate 10 s / wave 1 (was 20 s / wave 2). Cadence 7/5 s Classic, 12/8 s waves (was
  12/8 and 20/12). Opening economy share .45 (was .35), steady pressure share .50
  (was .40). Economy buys three tickets a cycle (was twelve in pressure mode). A
  pressure fund saving for a body for more than 40 s sends the strongest affordable
  body instead. RIVAL defaults to Brutal.
- Lobby: `lobbyPickRace('random')`; `randomRace` remembered in the profile; the host
  resolves every human `random` seat in `mpHostStart` before the roster is locked;
  guests adopt their seat's element from the `go` packet (`commitRace(race, true)`).
- Tests: ChatGPT's suite 86/86 with two fixtures moved to the new Shrine schedule
  (`desiredAiShrine` sample points; the large-purse test at 400 s instead of 650 s)
  and the wave-gate test's "before" check at wave 0.

## October 20, 2026 — Teammates build on one board (Claude)

- `mpSyncTeammateTowers`: a friendly human seat's snapshot becomes ally towers on
  this board (`owner:'player'`, `allySeat`, `remoteSeat`), kept in step as they
  build, upgrade and sell; copies are never published back out; a copy that fell
  here stays down until the teammate sells or rebuilds that cell.
- Developer mode: "Copy multiplayer diagnostics" (room, transport, roster, peers,
  snapshots received, towers on this board).

## October 19, 2026 — Running-match team ownership

- Locked player team/seat identities from the ready roster at match start.
  Late seat requests and lobby edits cannot switch teams during play.
- Sends identify their source seat and target seat. Same-team attacks, unknown
  sources, mismatched ownership, and messages for another match are rejected.
- Computer attacks relayed by a human host retain the computer identity, so
  the receiving teammate no longer sees the host's name as the attacker.
- Computer leaks update seat leak counts before shared life synchronization;
  synchronization no longer restores the computer life pool after a leak.
- Bot leak counts publish directly and monotonically without double-counting.
- Teammates receive the same match result; opponents receive the inverse.
  Final life counts accompany the result and received results are not echoed.
- Runtime regression checks use the actual match-start function, purchase
  action, sends, leaks, and win/loss handling in two separate client VMs.

## October 19, 2026 — Stable Ready checks and reliable lobby messages

- Heartbeat, roster, and Ready messages patch readiness text in place instead
  of rebuilding buttons during a tap.
- Guest Ready/Unready choices show syncing until the host acknowledges them.
  Unacknowledged requests retry once per second.
- Per-request sequence numbers prevent duplicate or out-of-order requests from
  reversing a later choice. Host state versions reject stale lobby snapshots.
- State heartbeats carry the roster, allowing a lost roster update to recover.
  A real roster/race change cancels pending consent and requires fresh Ready.
- The host's team-up control is disabled when humans already face computers
  together, preserving checked Ready states.
- Connection grace is 30 seconds. Missing players and unchecked players still
  block the host from starting.
- Start packets repeat for up to 30 seconds until acknowledged. Repeated start
  packets acknowledge again without starting a second match.

## October 19, 2026 — Correct teammate labels and lobby position guide

- Fixed the income panel's old two-player assumption: the other connected
  player was always displayed under THEIRS, even when seated as a teammate.
- Multiplayer team lists now come from the same roster as matchmaking and
  send targeting, including both computers in a two-human vs two-computer game.
- Added a host button, Play together vs computers, to repair an existing lobby
  and require fresh Ready checks from everyone.
- Added a lobby board guide showing names, colors, and west/centre/east positions.
- Team list accents match lobby seat colors instead of builder colors.
- The panel explicitly labels the top watched board TEAMMATE or OPPONENT.
- Watched route colors follow the watched player's team. Income is read per seat.
- Added a two-client regression that joins, checks Ready, starts a 2v2,
  and verifies teams, target seats, lobby colors, and rendered team labels.

## October 19, 2026 — Lobby teams, slots, and colors

- New rooms use the selected team size instead of reusing a previous roster.
- The host claims the first friendly slot before guests arrive. A second player
  joining a fresh 2v2 sits beside the host against two computers.
- Guests wait for their assigned roster before opening the lobby, regardless
  of config and ready packet arrival order.
- Connected human slots cannot be silently closed or converted to computers.
- Seat colors stay consistent across the lobby, local board, and Watch controls.
- Watched towers, creeps, beams, and effects preserve west/east columns.
- Closed slots retain their original network identities for sends, snapshots,
  and shared team life accounting.

## October 19, 2026 — Adaptive computer attacks

- All computers on both teams send independently from their own purses,
  including teammates in Classic Wars while the wave counter stays at zero.
- Computers track actual send kills and leaks. Four recent failures of a unit
  stop further economy purchases of that unit.
- Failed attacks shift gold toward pressure. Stopped current-tier sends can
  bring the next Shrine upgrade forward from its usual schedule.
- Counter selection considers visible defending towers, armor matchups,
  penetration, air coverage, splash, and previous successful leaks.
- Stalled attacks save for two purchases and release them together down both
  lanes. Low opposing lives trigger three-purchase finishing bursts.
- Planning considers six income cycles so computers can field an attainable
  counter rather than wait indefinitely for an expensive Shrine-5 unit.
- Computers keep preparing pressure bursts even when every available unit has
  previously been stopped. Useful attacker damage to towers counts as progress.
- After the initial six-tower opening, defense/economy/pressure budget shares
  are 30/30/40 normally, 25/15/60 when stalled, and 20/5/75 when finishing.
  Entering an aggressive mode redirects 75% of banked economy money to attacks.
- Computers pay normal gold and lumber prices. Swarms spawn all their bodies;
  attacker purchases charge lumber and earn fractional lumber income.
- Multiplayer AI sends report kills and leaks to their sender. Duplicate
  results and reports from an unexpected peer are ignored.
- Computers repair destroyed spiral cells and continue upgrading completed
  mazes. Upgrades stay within the purchasing computer's own towers.
- Tech computers fit a weapon mix with one Target Painter per seven placements.
  Ninja computers can use all seven weapons. Chassis and fittings are paid for.
- Send prices, income, unit stats, time-independent HP, and difficulty income
  multipliers were preserved.

Validation: 69 behavioral checks passed for the gameplay release. A controlled
combat test uses actual movement, targeting, projectiles, damage, and leaks:
six Tech Bolt Platforms stop four Miners, then the computer upgrades its Shrine
and sends a paid Ram Hulk burst that causes life loss against the same defense.
A separate 20-minute economy/construction simulation verifies all five
computers reach Shrine 5 and send Shrine-5 units without overspending.
These checks do not establish overall balance or device performance. Live
multiplayer and mobile gameplay still need playtesting.

## October 19, 2026 — Hit-earned ranks and send ordering

- Landed attacks earn tower ranks from rank 0 through rank 50 without requiring
  a purchased unlock. One volley or pulse counts once; kills and periodic
  damage do not add extra hit credits.
- Optional **Finish Rank** completes remaining progress immediately. Ranks 1–3
  use gold; later ranks use lumber. Resources never auto-spend, and actual hits
  are recorded separately from purchased progress.
- Each of ranks 1–3 adds 10% base damage, 0.5 range, and 0.1 attacks per second.
  Later ranks add 0.1% base damage each and another 1% every five later ranks.
- Incremental thresholds start at 100 hits. Splash follows 100 × 1.5^n;
  other towers follow 100 × (n + 1)^2, where n is the current total rank.
- Paid finishing costs the existing gold price for ranks 1–3. Each rank 4–10
  costs 1 lumber; 11–20 costs 2; 21–30 costs 3; 31–40 costs 4; 41–50 costs 5.
- Tier upgrades and weapon changes preserve earned ranks and partial hits.
  Bulwark retains its own expertise progression.
- Sends, Attackers, and Flying sort by Shrine tier, then highest income ROI.
  ROI is income per cycle divided by price; attackers use lumber for both.
- Cards show ROI percentages and payback cycles. Shrine headings independently
  collapse and expand within each main send tab. Keyboard shortcuts follow the
  displayed unlocked send order.

## October 18, 2026 — Spiral mazes and combined builder test

- Computer mazes follow the uploaded square-spiral reference, mirrored between
  teams and separated by each seat's build zone. Inner corridors stay open;
  placement checks both entire ground routes before charging gold.
- Ninja has seven weapons with distinct silhouettes and attacks: Fist double
  hits, Dagger penetration, Sword criticals, outward Mace pulses, aligned Spear
  piercing, distributed orthogonal Shadow pulses, and Shuriken.
- Shuriken targets ground or air; only an air-first hit bounces to another flier.
- Tech builds one Bolt Platform chassis and fits weapons from its rack. Bola
  Rig roots ground targets; Target Painter holds a mark until death or leaving
  range. Multishot retains three distinct full-power shots.
- Bulwark has core upgrades and one exclusive aura, advanced by its separate
  expertise ranks. Bulwarks cannot be imbued.
- Crystal formations link two to four adjacent same-owner towers. Choose one
  bonus: +15% damage, +15% attack speed, or +1 range. Switching is free. Chaos
  ignores armor value and class multipliers; Crystal does not reduce armor.
- Earth alone offers paid Fault Line or Tremor, both ground-only. Stone offers
  Frequent, Heavy, or Steady critical profiles.
- Every human, including the host, must check Ready before a lobby can start.
  Changed seats, builders, or settings invalidate readiness.
- All builders are unlocked for testing.

## Earlier releases

The home-screen changelog retains the September 3–7 release notes covering
team lobbies, records and leaderboards, fortified sends, AI teammates,
learning rivals, Frost, imbuements, undo, Survival, Poison, and Gravity.
Those entries describe their releases at the time; later changes above take
precedence.

## Still on deck

- Playtest the stronger adaptive sending pressure.
- Reassess Crystal balance, then test Earth and Stone against varied sends.
- Improve spiral efficiency further.
- Verify mobile layout, live multiplayer, performance, and overall balance.

## Changelog availability

The home-screen **Changelog** summarizes these changes and opens automatically
once for this release. Its full-notes link opens this file. This update adds
release notes and refreshes the offline cache; it changes no gameplay values.
