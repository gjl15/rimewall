/* The REAL join flow, not a hand-wired one.

   mp2.js sets mp.transport itself, which skips everything mpOpenRoom does:
   seating a joiner, the config handshake, who ends up on which side. This
   drives the actual Create room / Join buttons with the MQTT library blocked,
   so both clients take the documented BroadcastChannel fallback, and then asks
   the question that matters: can each one SEE the other?
   node tools/harness/mpreal.js <url> */
const { chromium, CHROME, OUT } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 950, height: 1100 }, colorScheme: 'dark' });
  // force the local transport: block the CDN the MQTT client comes from
  await ctx.route('**/mqtt*', (r) => r.abort());
  await ctx.route('**/jsdelivr**', (r) => r.abort());
  const A = await ctx.newPage(), B = await ctx.newPage();
  const errs = [];
  for (const [p, n] of [[A, 'GENE'], [B, 'ABDY']]) {
    p.on('pageerror', (e) => errs.push(`${n} pageerror: ` + String(e).slice(0, 220)));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(`${n} console: ` + m.text().slice(0, 160)); });
    await p.goto(base + 'index.html', { waitUntil: 'load' });
    await p.waitForTimeout(700);
  }
  await A.evaluate(() => { profile.name = 'Gene'; saveProfile(); });
  await B.evaluate(() => { profile.name = 'Abdy'; saveProfile(); });

  await A.click('#mp-create');
  await A.waitForTimeout(2500);
  const code = await A.evaluate(() => mp.code);
  console.log('room code:', code);
  await B.evaluate((c) => { document.getElementById('mp-code').value = c; }, code);
  await B.click('#mp-join');
  await B.waitForTimeout(3500);
  await A.waitForTimeout(1500);

  const seats = (p) => p.evaluate(() => ({
    me:{ team:mp.team, seat:mp.seat, role:mp.role },
    south:roster ? roster.south.map((s) => `${s.kind}${s.sid ? ':' + (s.name || 'sid') : ''}`) : null,
    north:roster ? roster.north.map((s) => `${s.kind}${s.sid ? ':' + (s.name || 'sid') : ''}`) : null,
    lobbyUp:!document.getElementById('lobby').classList.contains('hidden'),
    peers:Object.values(mp.peers).map((x) => x.name || x.sid),
  }));
  console.log('GENE', JSON.stringify(await seats(A)));
  console.log('ABDY', JSON.stringify(await seats(B)));
  await A.screenshot({ path: OUT + 'real-lobby-gene.png' });

  // start from the host and let them run
  await A.evaluate(() => mpHostStart());
  await A.waitForTimeout(3000); await B.waitForTimeout(3000);

  // both build a tower and buy a send, then see what the other can see
  const act = (p) => p.evaluate(() => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    player.gold = 1e6; player.shrine = 5;
    let placed = 0;
    for (let r = SOUTH_BOT - 6; r > SOUTH_TOP && placed < 5; r -= 2)
      for (let c = 4; c < 14 && placed < 5; c += 2) {
        if (!isBuildableCell(r, c)) continue;
        const t = makeTower(r, c, selectedRace.id, 2, 'player'); t.buildUntil = 0; addTower(t); placed += 1;
      }
    renderSendPanel(); refreshSendLocks();
    document.querySelector('[data-send="hoverbarge"]')?.click();
    return { placed, myTowers:towers.size, mySeat:mpMySeatKey(), team:mp.team };
  });
  console.log('GENE acted', JSON.stringify(await act(A)));
  console.log('ABDY acted', JSON.stringify(await act(B)));
  await A.waitForTimeout(2500); await B.waitForTimeout(2500);

  const seen = (p) => p.evaluate(() => {
    rebuildMirrorEntities();
    return {
      watching:mp.viewSeat, foeHalf:mpFoeHalf(),
      seatsListed:mpViewableSeats().map((s) => `${s.key}:${s.name}:${s.hasBoard ? 'board' : 'NONE'}`),
      snapsHeld:Object.keys(mp.seatSnaps),
      mirrorTowers:mirrorTowers.length, mirrorCreeps:mirrorCreeps.length,
      myCreeps:creeps.length, myTowers:towers.size,
      watchChips:[...document.querySelectorAll('[data-watch]')].map((b) => b.dataset.watch),
    };
  });
  console.log('GENE sees', JSON.stringify(await seen(A), null, 1));
  console.log('ABDY sees', JSON.stringify(await seen(B), null, 1));
  await A.screenshot({ path: OUT + 'real-live-gene.png' });
  if (errs.length) console.log('ERRORS', errs.slice(0, 8)); else console.log('no page errors');
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 400)); process.exit(1); });
