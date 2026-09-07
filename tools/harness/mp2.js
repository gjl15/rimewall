/* Two clients, one room, one team.

   Two pages in ONE browser context share a BroadcastChannel, which is exactly
   the transport the game falls back to when the relay is unreachable — so this
   drives a real room end to end without a network: host creates, guest joins,
   the host seats them on its own side, both see the same roster, the host
   starts, and a send from one lands on the named board and nowhere else.

   node tools/harness/mp2.js <url>                                            */
const { chromium, CHROME, OUT } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';
const ROOM = 'TSTA';

const boot = async (page, name) => {
  const errs = [];
  page.on('pageerror', (e) => errs.push(`${name} pageerror: ` + String(e).slice(0, 220)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(`${name} console: ` + m.text().slice(0, 160)); });
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  // force the local transport: no relay in a headless box, and this is the
  // same code path the game uses when the broker is blocked
  await page.evaluate(() => { window.__forceLocal = true; });
  return errs;
};

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 1100 }, colorScheme: 'dark' });
  const host = await ctx.newPage();
  const guest = await ctx.newPage();
  const hErr = await boot(host, 'HOST');
  const gErr = await boot(guest, 'GUEST');

  // both sides use the BroadcastChannel transport directly
  await host.evaluate((room) => { profile.name = 'Gene'; mp.role = 'host'; mp.code = room; mp.active = true; mp.sid = 'host-sid';
    mp.transport = mpMakeLocalTransport(room, mpOnMessage); ensureRoster(); lobbySetSize('south', 2); lobbySetSize('north', 2); }, ROOM);
  await guest.evaluate((room) => { profile.name = 'Abdy'; mp.role = 'guest'; mp.code = room; mp.active = true; mp.sid = 'guest-sid';
    mp.transport = mpMakeLocalTransport(room, mpOnMessage); ensureRoster(); }, ROOM);
  await host.waitForTimeout(200);

  // guest knocks
  await guest.evaluate(() => mpSend({ t:'hello', sid:mp.sid, name:mpPlayerName(), race:selectedRace.id, ts:Date.now() }));
  await host.waitForTimeout(600);

  const seatMap = (p) => p.evaluate(() => ({
    me:{ team:mp.team, seat:mp.seat, sid:mp.sid },
    south:roster.south.map((s) => `${s.kind}${s.sid ? ':' + s.sid : ''}`),
    north:roster.north.map((s) => `${s.kind}${s.sid ? ':' + s.sid : ''}`),
    peers:Object.keys(mp.peers),
    lobbyUp:!document.getElementById('lobby').classList.contains('hidden'),
  }));
  console.log('HOST  after join', JSON.stringify(await seatMap(host)));
  console.log('GUEST after join', JSON.stringify(await seatMap(guest)));

  /* THE CONTROL MUST SURVIVE A REMOTE UPDATE. Gene: "it's hard to adjust the
     seats, the portion keeps disappearing." Every roster message re-rendered
     the lobby, so a <select> was destroyed while it was open. Focus one, push
     a roster through, and check it is the same DOM node with the same value. */
  const survives = await host.evaluate(() => {
    const sel = document.querySelector('[data-lb-kind]');
    if (!sel) return 'no select';
    sel.focus();
    const before = sel;
    const value = sel.value;
    mpApplyRoster(mpRosterWire());     // exactly what an incoming roster does
    renderLobby();
    const after = document.querySelector('[data-lb-kind]');
    return { sameNode:before === after, keptValue:after && after.value === value, stillFocused:document.activeElement === after };
  });
  console.log('select survives a remote roster:', JSON.stringify(survives));
  await host.screenshot({ path: OUT + 'mp-lobby-host.png' });
  await guest.screenshot({ path: OUT + 'mp-lobby-guest.png' });

  // host starts the room
  await host.evaluate(() => mpHostStart());
  await host.waitForTimeout(2600);
  await guest.waitForTimeout(2600);
  const live = (p) => p.evaluate(() => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    return { running:battleRunning, seed:lastMatchSeed, team:mp.team, seat:mp.seat,
      mySeats:seatsOn('south'), foeSeats:seatsOn('north'),
      lane:player.lane && player.lane.name, zone:player.zone && player.zone.label,
      allies:allies.map((a) => `${a.half}#${a.seat} ${a.lane ? a.lane.name : '?'}`),
      teamLives:mpTeamLives(mp.team), foeLives:mpTeamLives(mp.team === 'south' ? 'north' : 'south') };
  });
  const hl = await live(host), gl = await live(guest);
  console.log('HOST  live', JSON.stringify(hl));
  console.log('GUEST live', JSON.stringify(gl));
  console.log('same seed:', hl.seed === gl.seed, '| both running:', hl.running && gl.running);

  /* Sends, through the real purchase path. Two things must hold: a send aimed
     at a computer spawns on the HOST's north half and on nobody's south half,
     and a send aimed at a person spawns only on that person's board — never on
     a teammate's. */
  const buy = async (page, id) => page.evaluate((id) => {
    player.gold = 1e6; player.shrine = 5; renderSendPanel(); refreshSendLocks();
    const before = { south:creeps.filter((c) => c.half === 'south').length, north:creeps.filter((c) => c.half === 'north').length };
    const btn = document.querySelector(`[data-send="${id}"]`);
    if (!btn) return { error:'no send button' };
    btn.click();
    return { before, target:mp.sendTurn };
  }, id);
  const counts = (page) => page.evaluate(() => ({ south:creeps.filter((c) => c.half === 'south').length, north:creeps.filter((c) => c.half === 'north').length }));

  const h0 = await counts(host), g0 = await counts(guest);
  await buy(host, 'hoverbarge');
  await guest.waitForTimeout(700);
  const h1 = await counts(host), g1 = await counts(guest);
  console.log('host sends at a computer:',
    `host north ${h0.north}->${h1.north} (want +2)`, `host south ${h0.south}->${h1.south} (want +0)`, `guest south ${g0.south}->${g1.south} (want +0)`);
  console.log('  ok:', h1.north - h0.north === 2 && h1.south === h0.south && g1.south === g0.south);

  // and the guest's send must reach the host's bots, not the host's own board
  await buy(guest, 'hoverbarge');
  await host.waitForTimeout(700);
  const h2 = await counts(host), g2 = await counts(guest);
  console.log('guest sends at a computer:',
    `host north ${h1.north}->${h2.north} (want +2)`, `host south ${h1.south}->${h2.south} (want +0)`, `guest south ${g1.south}->${g2.south} (want +0)`);
  console.log('  ok:', h2.north - h1.north === 2 && h2.south === h1.south && g2.south === g1.south);

  /* Watching another board. Every seat should be listed, the bots' board should
     arrive from the host, and switching the pick should change what is
     mirrored into the top half. */
  await host.waitForTimeout(1200);
  const watch = async (page) => page.evaluate(() => ({
    seats:mpViewableSeats().map((s) => `${s.key}:${s.name}:${s.hasBoard ? 'board' : 'none'}`),
    viewing:mp.viewSeat,
    snapKeys:Object.keys(mp.seatSnaps),
    mirroredTowers:(mp.snap && mp.snap.towers || []).length,
    chips:[...document.querySelectorAll('[data-watch]')].map((b) => b.dataset.watch),
  }));
  console.log('GUEST watch', JSON.stringify(await watch(guest)));
  const switched = await guest.evaluate(() => {
    const other = mpViewableSeats().find((s) => s.friendly && !s.mine);
    if (!other) return 'no team-mate seat';
    mpSetViewSeat(other.key);
    return { now:mp.viewSeat, towers:(mp.snap.towers || []).length };
  });
  console.log('GUEST switched to team-mate:', JSON.stringify(switched));

  /* LIFEFORCE IS ONE POOL A SIDE, AND ONE PLAYER GOING DOWN IS NOT A DEFEAT.
     Gene: "Abdy got a defeat icon whereas I can still play. The lives should
     not be 200 vs 300 in a 2v3." Leak the guest's whole share and check the
     side keeps playing, then finish the pool off and check both sides agree. */
  const pool = async (p) => p.evaluate(() => ({ mine:mpTeamLives(mp.team), theirs:mpTeamLives(mpFoeHalf()), over:matchOver, lives:player.lives }));
  console.log('pools at start   host', JSON.stringify(await pool(host)), 'guest', JSON.stringify(await pool(guest)));
  await guest.evaluate(() => { mp.myLeaks = 40; mpSyncTeamLives(); mpSend({ t:'leaks', sid:mp.sid, seat:mpMySeatKey(), value:40 }); });
  await host.waitForTimeout(600);
  console.log('guest leaks 40   host', JSON.stringify(await pool(host)), 'guest', JSON.stringify(await pool(guest)));
  const stillPlaying = await guest.evaluate(() => !matchOver && battleRunning);
  console.log('  guest still playing after leaking 40:', stillPlaying);
  await guest.evaluate(() => { mp.myLeaks = 100; mpSyncTeamLives(); mpSend({ t:'leaks', sid:mp.sid, seat:mpMySeatKey(), value:100 }); });
  await host.waitForTimeout(800);
  console.log('guest leaks 100  host', JSON.stringify(await pool(host)), 'guest', JSON.stringify(await pool(guest)));

  // and an uneven room must still be level on lifeforce
  const uneven = await host.evaluate(() => {
    mp.myLeaks = 0; mp.seatLeaks = {};        // fresh pools, or we just measure the last test
    lobbySetSize('north', 3);
    return { mine:mpTeamLives(mp.team), theirs:mpTeamLives(mpFoeHalf()), sizes:[mpSeatsInPlay('south').length, mpSeatsInPlay('north').length] };
  });
  console.log('2v3 pools:', JSON.stringify(uneven), '(want equal)');

  /* THE WATCHED BOARD MUST LOOK ALIVE. Gene: "it's still hard to see all the
     effects." Positions alone made a team-mate's board a spreadsheet. Fire a
     few events on the host's board and check the guest, watching it, turns them
     into tracers, bursts and puffs in mirrored coordinates. */
  await guest.evaluate(() => { matchOver = false; battleRunning = true; mp.myLeaks = 0; mpSyncTeamLives(); mpSetViewSeat('south:0'); });
  const emitted = await host.evaluate(() => {
    matchOver = false; battleRunning = true;
    mp.fxOut = [];
    mpEmit([0, 4, 60, 8, 62, 0, 5]);      // a shot from (4,60) at (8,62)
    mpEmit([1, 8, 62, 0, 1]);             // a big impact there
    mpEmit([2, 8, 62]);                   // and a kill
    mpEmit([3, 25, 71]);                  // plus a leak at the door
    const fx = mp.fxOut; mp.fxOut = [];
    mpSend({ t:'snap', sid:mp.sid, seat:mpMySeatKey(), towers:[], creeps:[], fx });
    return fx.length;
  });
  await guest.waitForTimeout(90);
  const replayed = await guest.evaluate(() => ({
    watching:mp.viewSeat,
    fx:mirrorFx.map((f) => f.kind),
    // mirrored: a shot from (4,60) should arrive at (COLS-4, ROWS-60)
    firstShot:mirrorFx.filter((f) => f.kind === 'shot').map((f) => [f.x1, f.y1, f.x2, f.y2])[0],
    expect:[COLS - 4, ROWS - 60, COLS - 8, ROWS - 62],
  }));
  console.log('host emitted', emitted, 'events; guest replayed', JSON.stringify(replayed));
  console.log('  mirrored correctly:', JSON.stringify(replayed.firstShot) === JSON.stringify(replayed.expect));

  /* THE WATCHED BOARD MUST BE THE REAL ART, AND TAPPABLE. Gene: "I want to see
     his cool tower effects and I still can't see what his units do by clicking
     on them." Push a board of known towers and creeps, then check the viewer
     rebuilds real entities from it and that a tap on one produces an inspect
     card with the right tower's name. */
  const inspect = await guest.evaluate(() => {
    mpSetViewSeat('south:0');
    // an Ice tier-2 at (5,60) and a creep beside it, in the sender's own frame
    /* A full-width row: an Ice tier-2 at level 1 with a bolt, mid-build, under
       attack, firing a beam; and a frozen shielded creep being knocked upward.
       If any of that survives the round trip, all of it does. */
    mp.snap = {
      towers:[[60, 5, races.findIndex((r) => r.id === 'ice'), 2, 4242, 1, 2, 0.8, 2.0, 0.5, 3, 0, 8, 62]],
      creeps:[[6, 61, 0, 640, 1280, 1 | 2 | 4 | 8 | 16,
        UNIT_DEFS.findIndex((d) => d.name === 'Prowler'), 77,
        1.2, 0.9, 7, 0.4, 0.3, 0, 0.6, 1, 0.5, 400, 33, 2.5]]
    };
    rebuildMirrorEntities();
    const t = mirrorTowers[0], c = mirrorCreeps[0];
    const hit = mirrorHit(t.c + .5, t.r + .5);
    inspectEntity = hit;
    const card = renderWispInspect();
    return {
      towers:mirrorTowers.length, creeps:mirrorCreeps.length,
      towerAt:[t.r, t.c], expectAt:[ROWS - 1 - 60, COLS - 1 - 5],
      creepAt:[+c.x.toFixed(1), +c.y.toFixed(1)], expectCreep:[+(COLS - 6).toFixed(1), +(ROWS - 61).toFixed(1)],
      hitKind:hit && hit.kind,
      cardName:(card.match(/<b><span class="wp-inspect-ico">[^<]*<\/span>([^<]*)</) || [])[1],
      realName:towerLiveStats(t).name,
      // everything the wide row was added for
      tower:{ level:t.level, bolt:t.bolt, key:t.key, beam:!!t.beamTo, building:t.buildUntil > simTime, shaking:t.underAttack > simTime, block:`${t.blockHp}/${t.blockMaxHp}` },
      creep:{ name:c.name, hp:`${c.hp}/${c.maxHp}`, armor:c.armor, cls:c.aClass, air:c.air, sent:c.sent, boss:c.boss,
        regen:c.regen, burning:c.dots.length > 0, frozen:c.frozenUntil > simTime, chilled:c.frostUntil > simTime,
        stacks:c.frostStacks, knock:c.knockKind, shield:`${Math.round(c.shield)}/${c.shieldMax}`, venom:c.venom, id:c.id },
      creepCard:renderWispInspect.call(null) && (() => { inspectEntity = { kind:'mirror-creep', ref:c }; const s = renderWispInspect(); inspectEntity = hit; return /(\d+)\/(\d+) HP/.test(s); })(),
      drew:(() => { try { const cv = document.createElement('canvas'); cv.width = cv.height = 400; drawTower(cv.getContext('2d'), t); drawCreep(cv.getContext('2d'), c); return 'ok'; } catch (e) { return 'THREW: ' + e.message; } })(),
    };
  });
  console.log('mirror entities + inspect:', JSON.stringify(inspect, null, 1));
  // what the wider row costs on a public relay at 3.3 messages a second
  const bytes = await host.evaluate(() => {
    const fake = { towers:[], creeps:[] };
    // a realistic late game: settled towers and mostly unafflicted creeps, run
    // through the same trim the real encoder uses
    for (let i = 0; i < 90; i += 1) fake.towers.push(trim([60, 5, 0, 3, 1234 + i, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    for (let i = 0; i < 70; i += 1) fake.creeps.push(trim([6.5, 61.2, 0, 640, 1280, 3, 5, i, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    const n = JSON.stringify({ t:'snap', sid:'x', seat:'south:0', ...fake, fx:[] }).length;
    return { bytes:n, perSec:Math.round(n * 3.33) };
  });
  console.log(`wire cost at 90 towers + 70 creeps: ${bytes.bytes} bytes a snapshot, ~${(bytes.perSec / 1024).toFixed(1)} KB/s`);
  console.log('  positions right:', JSON.stringify(inspect.towerAt) === JSON.stringify(inspect.expectAt)
    && JSON.stringify(inspect.creepAt) === JSON.stringify(inspect.expectCreep),
    '| tap inspects the right tower:', inspect.cardName === inspect.realName,
    '| real renderers survive it:', inspect.drew === 'ok');
  await guest.screenshot({ path: OUT + 'mp-watch-guest.png' });
  await host.screenshot({ path: OUT + 'mp-live-host.png' });
  const errs = hErr.concat(gErr);
  if (errs.length) console.log('ERRORS', errs.slice(0, 8));
  else console.log('no page errors');
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 500)); process.exit(1); });
