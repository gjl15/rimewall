# Rimewall test build — changelog

Newest changes appear first. Dates use America/Los_Angeles time.

## November 14, 2026 — A board with weather in it (Claude)

- `rwTerrainDetail`, painted onto the static board after `rwTerrainSurface`: tileable
  value noise (`terrainNoise`, generated in the page, no asset) as grain on floor,
  rock and water, each at its own scale; floor tiles bevelled with per-tile tone, a
  few cracked or pebbled; rock strata, frost caps on sky-facing edges and frosted
  boulders; a shadow cast by rock onto the ground below and right of it; foam
  wavelets along both river banks.
- `drawTerrainProps`: `props.webp` (4 frames, 13 KB: pines, ice crystals, boulders,
  frozen tree), generated in the creeps' style, placed by a hash of the cell on rock
  cells surrounded by rock, at least 3 cells apart, never over a lane or build tile.
  The board is repainted when the sheet loads and when "New creep art" is toggled;
  classic art hides the props. Sources in `tools/art/props/`.
- `drawRiverFx`: two layers of ridged caustics drift across the water in opposite
  directions, clipped to the river (cached `Path2D`). Off with particles, frozen under
  reduced motion.
- Measured: draw 3.4 ms per frame at minute 6 (budget 8); stress scene 2.7 ms (was
  2.35); one-off board repaint about 6 ms. Arena audit clean, teamboard.js PASS, no
  page errors.

## November 14, 2026 — Hits that glow (Claude)

- `fxGlow` / `fxGlowSprite`: one radial glow per colour, painted once into a 64 px
  canvas and stamped with additive blending. Used on every projectile (meteor and
  rocket at their body), impacts (plus a white core on big hits), deaths and the
  chain-lightning strike node. Off with "Turn off particles".
- Hit flash: the generated sprite itself flares (`lighter`, 0.1 s) where a white dot
  was painted over the creep; the dot stays for creeps without generated art.
- Death dissolve: the death effect carries the creep's frame, size and air flag; the
  frame lingers, lifts 7 px, widens 18 % and burns out over 0.35 s, drawn at board
  scale outside the FX enlargement. Reduced motion keeps the fade without the lift.
- A first, stronger tuning washed stacked hits out to white over the creeps; the
  shipped values keep the creeps readable under a pile of impacts.
- Measured: draw 3.6 ms per frame at minute 6 (was 2.8; budget 8). Stress, 46 creeps
  all flashing and 123 effects: 2.35 ms per frame (was 1.95). Arena audit clean,
  motion hooks 8 of 8 and reduce-motion unchanged, teamboard.js PASS, no page errors.

## November 14, 2026 — Every creep redrawn (Claude)

- All 53 roster creeps now have generated art (Canva image generation, one prompt
  template, palette by armour class: unarmored amber, light green, medium blue, heavy
  crimson, fortified violet, siege attackers hazard yellow; the Frost Tyrant icy white
  with gold). 52 frames: Mossback shares the Mossback Regenerator's
  (`GEN_CREEP_ALIAS`).
- `creeps-gen.webp` is now an 8-column grid, 768×672, 181 KB. `GEN_CREEP_NAMES` and
  `GEN_CREEP_FOOT` list the frames in name order; `drawCreep` reads the cell from the
  grid. The settings toggle reads "New creep art (all 53 creeps)".
- Keying fix: background showing through a gap (between an arm and a body, inside a
  coiled tail) is enclosed, so the border flood fill missed it and it showed as white
  blotches. Near-white areas of 40 px or more are now keyed too; small highlights stay.
- The frames, prompts and scripts that rebuild the atlas are in `tools/art/creeps/`.
- Measured at the 21 px board cell (`tools/art/creeps/measure.js`, same reduction as
  `tools/harness/readability.js`): grey creeps 44 of 53 with the classic art, now 4 of
  52 frames (Fang Outrider, Marauder, Frost Tyrant, Wallbreaker); mean saturation 0.43;
  largest hue bucket 13 (target ≤ 15); confusable pairs 2 (Breacher~Siege Ruiner,
  Miner~Undying Shade), against 283 across the classic roster.
- Checks: roster coverage 53 of 53, every creep on a full send board drawn as a sprite;
  draw 2.8 ms per frame at minute 6 (budget 8); arena audit: no errors, HUD contract
  clean; teamboard.js PASS.

## November 14, 2026 — Creeps stand on the ground; no more circles (Claude)

- The magenta (send) or role-coloured circle drawn over every creep's body is gone
  when the creep has art; the colour is a thin ring around its feet, under the body.
  The vector fallback keeps the old circle. Health bars ride above the head
  (`drawCreepReadPass`).
- Feet on the ground: every sprite is anchored so its feet sit on its shadow
  (generated frames by their measured foot line, the classic sheet at 97 % of the
  frame); the shadow used to sit at the knees, which read as floating. On the river
  a creep wades: a ripple instead of a shadow and a waterline over the feet
  (`drawCreep`).
- Eight sends drew as plain vector circles because they had no frame under their
  own name: Pathfinder, Sapper, Glacier Basilisk, Aegis Runner, Undying Shade, Elder
  Drake and Idol Bearer now use their wave art, and the Breacher uses the
  Wallbreaker's (`spriteIdForCreep`, `SPRITE_CREEP_ALIAS`). Every send and wave in
  the roster now has art.
- Checks: no page errors; arena audit unchanged; teamboard.js PASS; draw time
  unchanged.

## November 14, 2026 — New creep art, preview (Claude)

- Six creeps redrawn with an image generator (Canva) in one painted style, colour
  tied to armour class: Miner amber (unarmored), Prowler green (light), Fang
  Outrider blue (medium), Iron Pilgrim crimson (heavy), Hoverbarge violet
  (fortified), Drake Whelp green (light, flying). Backgrounds keyed out, packed into
  `creeps-gen.webp` (576×96, 20 KB) beside the page. Matched by name, waves and
  sends alike (`GEN_CREEPS`, `genCreepFrame`, one branch in `drawCreep`); the other
  47 creeps keep their art. Settings → "New creep art (preview, 6 creeps)" switches
  back (`profile.classicArt`).
- Measured at the 21 px cell on these six, today → generated: mean saturation
  0.22 → 0.40, effectively grey 4 → 1 of 6, hue families 2 → 4, confusable pairs
  0 → 0. On the board, 18 of 18 spawned creeps drew the new art; no page errors;
  arena audit unchanged; teamboard.js PASS.

## November 9, 2026 — Depth on the board (Claude, redesign phase 6)

- Mass with tier (ART-DIRECTION item 1): a tower's body scales 1.0 → 1.6 across its
  six rungs and the top rungs overhang the cell a little, so an upgrade is visible
  at the board's own cell. One key light, top-left, for everything on the board: a
  rim on the lit side and a shade on the far side of every tower, a contact shadow
  that falls down-right and grows with the mass (`drawTowerStructure`).
- Raised cliffs: a lit top/left edge and a shaded bottom/right edge on every cliff
  cell, painted once onto the static board (`drawTerrain`), so it costs nothing a
  frame.
- Parallax: two soft lights and a faint grid behind the board move at a quarter of
  the pan (`--par-x/--par-y` set where the board transform is), on the compositor.
- Creeps bank into their direction of travel and squash with their stride; fliers
  hover (`moveAlong` records direction; `drawCreep`). Reduced motion holds the pose.
- Measured (tools/harness/readability.js at the 21 px cell, speed.js at 390×844):
  top rung ink over first rung, before → after: Ice 1.0 → 1.4, Fire 1.3 → 1.9,
  Earth 1.3 → 1.8, Tech 1.0 → 1.5, Crystal 1.3 → 1.7, Poison 1.1 → 1.5, Stone
  1.2 → 1.6, Electricity 1.0 → 1.4, Gravity 1.3 → 1.8, Beam 1.3 → 1.6, Ninja
  0.9 → 1.3, Wind 1.9 → 1.7 (its lower rungs were already tall); confusable creep
  pairs 284 → 283 of 1378, grey creeps 44 of 53 unchanged (the hue system is the
  next art task, not this one); draw 3.4 ms per frame at minute 6 (budget 8).
  Arena audit and teamboard.js unchanged.

## November 9, 2026 — Motion with a purpose (Claude, redesign phase 5)

- Entrances: screens fade in (220 ms), the lobby card, Settings and confirm cards
  pop in (200 ms), phone trays slide up (220 ms), fold-outs and the wisp panel
  unfold (200 ms). Taps land: every button, chip, tile and card eases its colours
  (150 ms) and presses to 97 % while held.
- Feedback on the board (`feedbackPulse`): a placement pulse in the element's
  colour, a gold bloom on a tier upgrade, a green bloom on a finished rank, a red
  pulse on a sale, a send-launch pulse at the far gate in the send type's colour.
  HUD numbers tick when they change (`hudTick`: gold on income and sales, income
  and gold on a send, lives on a leak); the board shakes for 250 ms on a leak
  (`shakeBoard`). The wave banner fade is 300 ms.
- Reduce motion: one rule for the OS setting and one for the in-game toggle now
  cover every animation and transition in the file (0.001 s, one iteration), and
  the feedback helpers step aside under either.
- Measured at 390×844 (motionaudit.js, speed.js): longest enter or feedback
  animation 220 ms and longest transition 300 ms on every screen (timed notices and
  ambient loops excepted and listed in the audit); all eight hooks fire; with
  reduce-motion on, longest animation and transition 0.001 s and no tick or shake;
  draw 3.6 ms per frame at minute 6 (budget 8; was 3.5 before the pass). Home,
  lobby, arena audits and teamboard.js unchanged.

## November 9, 2026 — One icon language (Claude, redesign phase 4)

- An original inline SVG icon set (`ICONS`, `icon(name)`, 46 glyphs on a 24 px grid,
  2 px round stroke, drawn in the control's own colour) replaces every emoji and
  dingbat in interactive controls: home gear, Settings (title, close, tutorial, map,
  tool cards), the HUD (wave skull, hourglass, lives, gold, income, lumber, rival,
  team; pause/play, restart, undo, targeting, settings, menu), the map toggles, the
  five-tab bar, the wisp and its tools, the lobby (leave, share, Random dice), the
  economy strip, the locked builder tab, tower actions (rank, tier, target, sell,
  select all, close, fit a weapon, warnings) in the tray, the ring and the rails,
  the send-type glyphs, the profile strip and the Daily Gauntlet card. The lumber
  glyph is `LUMBER_ICON` everywhere a price or label is rendered as HTML. Element
  symbols (❄ ✹ ◒ …) stay: they are the elements' marks, in their colours.
- Lobby seat-size buttons carry labels ("2 seats").
- Contrast: unlocked count, builder-tab captions, tower and send stat lines and the
  zoom hint move from 3.4–4.1:1 to ≥ 4.5:1 on their surfaces.
- Measured at 390×844 across home, settings, lobby and the five arena trays
  (emoji-audit.js, contrast-audit.js), before → after: controls carrying an emoji
  80 → 0; icon-only controls without a label 6 → 0; text below the contrast floor
  4 token/size pairs → 0 (board-overlay map markers excluded, they sit on art, not
  a surface). Home, lobby and arena audits unchanged; teamboard.js PASS.

## November 9, 2026 — Arena panels on the phone (Claude, redesign phase 3)

- One surface per thing: a tap on your tower opens the TOWER tray, a tap on a creep,
  rival tower or watched-board piece opens the ENEMY tray, and the floating chip
  stays closed (`phoneInspect`; the five tap sites and the rack shortcut). The TOWER
  tray hides the description, next-tier and rank paragraphs behind a ⓘ Details
  toggle; actions, stats and racks stay.
- Sends: the cards are a 3-column grid scrolled down, not sideways, 103 px tall
  (were 341 px, one row of 27 cards scrolled sideways); Shrine dividers span the
  row. An economy strip sits above the send tabs: lumber (+1 · 500 g), Shrine
  (→ next level · 1🪵) and the second-element licence with its picker
  (`renderEconStrip`, delegating to `buyLumber`, `upgradeShrine`,
  `licenseSecondElement`). The BUILD tray no longer carries the licence, lumber
  and shrine rows; the dock's Shrine tab is gone (the strip has it). The locked
  BUILDER 2 tab opens the strip. The SUPPORT · RESERVED tab is removed.
- Tower cards show name, numbers and price; the armour line and imbue line
  appear on the chosen card only.
- Fix (same day): the BUILD tray's tower rows collapsed to 48 px and their text
  spilled over the next row once they stopped being flex-centred; the list's grid
  rows are `max-content` again (rows 105/63 px, none overflowing).
- Top-bar contract: the phone HUD is a two-row grid by design, so R1 now holds per
  row (`hudContractReport`); it reported R1 on every phone render before.
- Measured at 390×844 (arenaaudit.js), before → after: BUILD controls 14 → 10,
  under 44 px 4 → 0; send cards per row 27 → 3, card height 341 → 103 px,
  horizontal scroll yes → no; tower tap: chip open + tray closed → tray open, chip
  closed, one action set, prose hidden; creep tap: chip → ENEMY tray; HUD contract
  R1 → clean; no page errors; teamboard.js PASS.

## November 9, 2026 — Lobby: tap a seat (Claude, redesign phase 2)

- The board guide is the seat control. Tap a tile to change who sits there (host or
  offline: computer → open → closed, open seats only in a room); a guest taps an open
  seat to sit in it; a connected player is never moved by a tap. The 1/2/3 size
  pickers sit in each band's header. Element, lane, position and ready state are on
  the tile, so the per-seat `<select>` rows are gone. Header: Leave, title with the
  setup line, Share (copies or shares the invite link). Room code and connected
  count in a row. All 13 element chips in one 7-column grid above the fold. Ready
  and Start sit in a sticky foot; a guest sees a status line instead of a dead
  button. New: `lobbyCycleSeat`, `lobbySeatCycle`; rewritten `lobbyBoardGuide` and
  the `renderLobby` template; `lb-leave`, `lb-share`, `data-lb-cycle` handlers.
- Fixed: leaving a lobby never cleared `lobbyPhase`, so a room created afterwards
  rendered into a hidden overlay (`leaveMatch` now calls `closeLobby`).
- Phase-1 follow-up: Map builder and Build hub moved from the home screen into
  Settings (home controls above the fold 9 → 7).
- Measured at 390×844 (lobbyaudit.js), before → after: visible controls solo 13 → 10,
  2v2 12 → 11, host 14 → 12, guest 8 → 3; tap targets under 44 px 13 → 0; element
  chips above the fold 10 → 13 of 13; taps to change a seat 2 → 1; Ready in the
  bottom quarter of the screen no → yes on every view; two-client room: both ready,
  host Start enabled, match starts on both; teamboard.js PASS; no page errors.

## November 9, 2026 — Home screen: play first (Claude, redesign phase 1)

- The setup is a "Next match" card: element and a one-line summary of mode, team,
  rival and lives, with one Change control that folds the four selects out. Play is
  a 56 px button under it; "With a friend" folds out the multiplayer panel and
  "Daily gauntlet" the gauntlet card. The element is picked in one place, a row of
  72×84 chips; the duplicate element toggle is gone. Settings sits by the wordmark;
  the version pill moves to the foot. The changelog card starts collapsed.
- Measured at 390×844 (homeaudit.js), before → after: controls above the fold
  9 → 7; element pickers 2 → 1; tap targets under 44 px 5 → 0; taps to play the
  last setup 1 → 1; taps to change element and play 2 → 2; no horizontal overflow;
  no page errors. teamboard.js PASS.
- Changed: the race-screen markup, `renderWhatsNew` (collapsed by default),
  `renderRaceDetail`'s close (no longer hides the element row), `renderRaceCards`
  (unlocked count), new `renderSetupSummary` and the fold-out handlers. The
  `#race-card` toggle no longer exists; `commitRace` still updates
  `#race-card-symbol`, `#selected-name` and `#selected-desc`.

## November 5, 2026 — Wind element, ported from Abdy's branch (Claude)

- Abdy's Wind builder (`test/sites-shared-arena-20` at `b484ca7`, 2026-11-03) ported
  function by function: `races` and `TOWERS.wind` (Wind Needle chassis 10 g; Gale,
  Razorwind, Vortex, Tempest as fittings), `weaponCost` (chassis pays the difference),
  `ATTACK_PROFILE.wind` (Pierce), `rankNeed` (wind counts as splash), `DEFAULT_RACES`,
  `moveAlong` (wind slows), the `WIND` table and `windRoute` / `windTunnel` /
  `windOpenCells` / `applyWindSlow` / `windPush` / `resolveWindShot`, the dispatch at
  the top of `resolveProjectileHit`, Shatter counting wind slows, Vortex riding the
  mace-pulse path in `fireNinjaPulse` / `updateTower` / `updateProjectile`,
  `aiWeaponTier`, `drawCreep`, `towerAction`, `weaponPanelHtml`, `effectiveDps`.
  Not ported: anything from SHARED ARENA; multiplayer code untouched.
- Checks: `node --check`; the 88-test suite plus Abdy's three Wind regressions 91/91 on
  this file; `tools/harness/teamboard.js` PASS; phone-size solo smoke (Wind chip in the
  lobby, rack prices 40/90/90/275, all four fittings, creeps slowed, no page errors).
- Known, pre-existing: `hudContractReport()` reports R1 (two centred rows) on this
  lineage's phone HUD, with or without Wind; same on the previous build.

## October 31, 2026 — Teammate towers survive a seat-list mismatch (Claude)

- `mpSnapOf` tower rows carry a 16th field: 1 = the sender's own tower, 2 = anything
  else on its half (computer ally, copy of a teammate's). `mpSyncTeammateTowers` trusts
  that mark and falls back to the lane-colour comparison only for rows from an older
  build. Reproduced: with the guest alone disagreeing on lane colours the old build
  mirrored zero teammate towers both ways; the new build mirrors all of them.
- `mpDiagnostics` adds a "teammate sync" line: per seat, rows received, rows that are
  theirs, placed / kept / blocked, bad rows, and the sim second of the last snapshot.
- `tools/harness/teamboard.js` on `main` is the two-client check; it must print
  RESULT PASS on any multiplayer change.

## October 25, 2026 — Computers build up, send harder; Random element (Claude)

- Computer breadth target ends at 24 towers (was 64 in Classic); after that the build
  tick buys tier upgrades. `AI_UPGRADE_PERIOD` 5.5 → 3, four upgrades a tick, and a
  tier upgrade needs 70% of the purse in hand instead of 50%. Measured before: in a
  2v2 at nine minutes the rival had 50 of 107 towers at tier 0 and the friendly
  computer 45 of 45.
- From Abdy's review of PR #9 (2e0e249), ported here: `mpLobbyRaceId()` carries a remembered
  Random into seat, hello, config and sit messages until the match starts; the AI's
  timed-out/finishing fallback searches the whole eligible family at single-pack cost
  and shrinks the burst to what it can afford.
- `aiSendPressure`: attackers one body a lane, one pressure turn in six, at least 45 s
  between attacker purchases per computer (a Brutal rival sent five attackers in six
  minutes; now one in eight).
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
