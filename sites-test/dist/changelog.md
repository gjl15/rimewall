# Rimewall test build — changelog

Newest changes appear first. Dates use America/Los_Angeles time.

## October 23, 2026 — Shared team battlefield (SHARED ARENA 20)

- Replaced independent human combat worlds in new rooms with one host-run
  battlefield. Every human and computer tower occupies that same world and
  attacks the same creeps. Waves spawn once for each team on the shared clock;
  the existing team-size wave load is retained. Each send purchase creates its
  two lane bodies once on the opposing half.
- Removed the Boards selector. Both teams' construction, sends and combat are
  rendered together at native proportions. The opening view fits the whole
  battlefield, and north/south positions stay canonical on every client.
- Human resources, upgrades, sales, undo, licenses, training and glyphs retain
  separate ownership. The host validates ordered player intents, acknowledges
  them, and rejects duplicate or foreign tower selections. Dropped commands
  retry without duplicate charges; full snapshots repair missed tower deltas.
- The host advances combat, pays income and awards bounty to the owning
  player. Guests display its state and interpolate moving creeps. Personal
  builder controls are restored after another player's action. Earth effect
  choices and the existing tower/rank/glyph fields are included in state.
- All computers send into the shared world, including sends that previously
  addressed a guest's independent defense. Their attack-outcome learning is
  retained. Team leaks and final results come from the one simulation.
- Moved individual team incomes from the right-side map overlay into compact
  header rows. The phone Sends tray now fits its contents, around 176px in
  portrait QA, instead of reserving 48% of the display. Tighter card spacing
  keeps prices, both income currencies, ROI, payback, HP, armor and speed.
- Shared state uses packed field tables, tower deltas and periodic reliable
  full refreshes. Routine moving-state packets use QoS 0; action messages and
  full recovery snapshots use QoS 1. Existing legacy protocol tests are kept.
- Corrected short landscape viewport fitting so the bottom of the shared map
  clears the mobile navigation. Long mixed-currency send cards retain room for
  their final income line in the shorter desktop dock.
- Verified 139 automated checks and two browser clients using the actual
  online MQTT relay, including Ready/start, allied construction, personal
  income and sends visible on the opposing half. Physical-device play remains
  the final confirmation. Refresh all devices and start a fresh room. The host
  must remain connected; host migration is not implemented.

## October 22, 2026 — Full-width multiplayer boards (FULL BOARDS 18)

- Replaced the compositor that squeezed complete human maps into colored
  columns. Each team now has one visible full-width board with native square
  cells. The north team stays north and the south team stays south.
- Added a compact Boards selector to view another human's independent defense.
  Teammate boards are read only; My towers and the home camera restore the
  local board and its build coordinates. Player colors retain lobby identity.
- Computers on the same team share their existing simulated board. Their
  towers draw together, with shared creeps deduplicated by identity. Terrain
  draws once, and the extra phone overview strip is hidden in live multiplayer.
- Removed the large zoom-scaled slot labels and the seat-width camera scaling.
  Board controls rebuild correctly after returning through a lobby.
- Shrine, glyph, balance and multiplayer ownership changes from SHRINES 17
  remain included. This changes presentation, not the independent human
  simulations or shared team life pools.
- Automated checks cover full-width rendering, local-only input, shared bot
  rendering, team ownership, ready/start and snapshot behavior. Mobile browser
  checks cover both team orientations, teammate viewing and 2v2/3v3 layouts.
  A real match on two physical devices remains to be confirmed. Refresh both
  devices to FULL BOARDS 18 and create a fresh room.

## October 22, 2026 — Shrines, glyphs and balance proposal (SHRINES 17)

- Implemented the agreed balance proposal: uncapped automatic ranks, standard
  requirements starting at 5 and splash at 100, one point per enemy damaged
  within an attack, no one-second credit throttle. DOT is excluded; beams use
  their attack cadence. Secondary effects share their attack's victim set.
- Ranks after 3 use fixed rank-3 baselines: +2% damage and +1% attack rate per
  rank, plus +5% damage at total ranks 5, 10, 15 and onward. Early rewards stay
  +10% base damage, +0.5 range and +0.1 attacks/sec each.
- Attackers use listed HP/armor and attack every 1 second. Ordinary tower HP
  doubles; Bulwark base HP does not. Existing normal-creep blocking stays 0.5s.
- Bulwark expertise is uncapped. Raw incoming strikes plus actual Thorns damage
  advance ranks, with no overkill credit. Above 3: +1% health per rank plus 5%
  every fifth total rank; armor, regen, Thorns and auras retain rank-3 caps.
  Optional expertise finishing uses ceil(next rank / 10) lumber, minimum 1.
- Send Training costs 100, 200, 300... lumber. Each level gives future regular
  sends +5% HP, +1% speed, +1 armor every two levels, +10% gold cost, and +1%
  gold income. All percentages add against base values. Attackers and automatic
  waves are excluded. Direct income from buying training remains undecided.
- Appended five sends each at Shrines 6, 7 and 8. Tier 6 is gold only. Tier 7
  costs gold plus 1/5/10/15/20 lumber and awards 0.01/0.05/0.1/0.25/0.5 recurring
  lumber alongside gold income. Tier 8 costs lumber only and grows lumber
  income. Each Shrine unlock still costs 1 lumber. New prices/stats are test
  tuning, listed completely in BALANCE_UPDATE.md.
- Support sells Aegis glyphs for 1,000 gold + 2 lumber. Each cast protects ALL
  towers owned by that player, including new builds during the same window,
  for one random 1–5 seconds. No stacking, 20s player cooldown, 5-charge limit.
  Shielded swings give no damage or expertise. No real-money system is active.
- Collapsible Shrine groups now cover desktop, phone rail and command sheet.
  Hidden send controls remain callable by shortcuts. Both income currencies
  and mixed prices remain visible, with fractional lumber accumulation.
- Multiplayer snapshots include ranks, Bulwark core/aura state, actual tower
  maximum HP, glyph duration and real creep armor/speed. Trained send messages
  carry the sender's training level, preventing defender upgrades from changing
  incoming units. Version 16's seat ownership fixes are retained.
- Refresh BOTH devices to SHRINES 17 and start a fresh room. Controlled tests
  pass; two physical devices and long-game balance still need play testing.

## October 22, 2026 — Multiplayer maze ownership (MAZE SYNC 16)

- Fixed a 3v3 ownership bug: the guest ran a second friendly computer, human
  board snapshots included friendly computer towers, and the friendly computer
  never received its own published board. This produced duplicate mazes and an
  empty slot on the other screen.
- The host now runs every computer and publishes a separate snapshot for each
  AI seat on both teams. Host and guest draw those same seat snapshots.
- Human slots include only that human's towers, creeps, and projectiles.
  Computer shots and impacts are tagged with their own seat and reflected into
  the wire coordinate system once, alongside their maze.
- Crystal formation links and bonuses are included in each board snapshot.
  Remote tower keys cannot read a matching key from the local Crystal cache.
- Snapshot data no longer repeats the whole opposing team in each AI seat.
  Canvas slot transforms are restored even if drawing fails.
- Added 3v3 regressions for all four AI seats, human/AI ownership separation,
  actual computer shots, north-team orientation, and draw-state restoration.
- Controlled side-by-side browser checks cover 2v2 and 3v3; real-device relay
  confirmation is still required. Refresh both devices to MAZE SYNC 16 and
  start a fresh room before testing.

## October 19, 2026 — Fixed lobby map positions (FIXED MAP 15)

- Both devices now show the same canonical map: northwest Red, north centre
  Blue, northeast Teal; southwest Purple, south centre Yellow, southeast Orange.
  In 2v2 the middle slots are unused. Teams keep their lobby half.
- Human players still defend independent boards and share lives with their
  team. Each complete human board is displayed inside its own coloured slot;
  the host's shared computer board keeps its original west/centre/east lanes.
- Removed the automatic teammate mirror in the upper half, which could draw
  over the host's live computer towers and creeps. Each active slot now has
  a distinct coloured area, name and position on the map.
- Map slot controls focus an existing position rather than relocating a board.
  The phone's small map strip shows the fixed map overview.
- Pointer coordinates, drag builds, and box/lasso selection map back into the
  local defense board. Other slots cannot build or sell local towers.
- Board snapshots retain seat ownership and match identity; combat effects
  are stored per seat. Closed or departed slots do not relocate the remaining
  map areas during the match.
- Computer snapshots also carry their actual builder and income. The guest
  no longer substitutes an unplayed local computer's placeholder stats.
- Tests cover identical layouts on both clients, all six colours, coordinate
  round trips, local-only build input, and opponent-only sends after focusing
  every slot. Real-device confirmation remains outstanding.

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
