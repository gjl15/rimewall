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

  await host.screenshot({ path: OUT + 'mp-live-host.png' });
  const errs = hErr.concat(gErr);
  if (errs.length) console.log('ERRORS', errs.slice(0, 8));
  else console.log('no page errors');
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 500)); process.exit(1); });
