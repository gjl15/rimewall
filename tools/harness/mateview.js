/* Can you see your TEAMMATE's build?

   Gene, twice: "i still cant see what abd is building" and "i dont see his
   build still." Both on the same team, which is the case mpreal.js never
   covered — it puts the two clients on opposite halves.

   The shape that matters: the teammate builds FIRST, and you look afterwards.
   Towers are only put on the wire when they change, so a viewer who arrives
   after the last build used to receive creep-only snapshots forever and an
   omitted tower list reads as "unchanged, keep what you have" — which is
   nothing. This builds, waits past that moment, and only then looks.
   node tools/harness/mateview.js <url> */
const { chromium, CHROME, OUT } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const wide = process.argv.includes('--wide');
  const ctx = await browser.newContext(wide
    ? { viewport: { width: 950, height: 1100 }, colorScheme: 'dark' }
    // a phone by default: every other UI fault this week was only on a phone
    : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: 'dark' });
  await ctx.route('**/mqtt*', (r) => r.abort());
  await ctx.route('**/jsdelivr**', (r) => r.abort());
  const A = await ctx.newPage(), B = await ctx.newPage();
  const errs = [];
  for (const [p, n] of [[A, 'GENE'], [B, 'ABDY']]) {
    p.on('pageerror', (e) => errs.push(`${n}: ` + String(e).slice(0, 200)));
    await p.goto(base + 'index.html', { waitUntil: 'load' });
    await p.waitForTimeout(700);
  }
  await A.evaluate(() => { profile.name = 'Gene'; saveProfile(); });
  await B.evaluate(() => { profile.name = 'Abdy'; saveProfile(); });

  await A.click('#mp-create'); await A.waitForTimeout(2500);
  // two seats on the host's own half, so the joiner lands BESIDE Gene
  await A.evaluate(() => { const t = document.getElementById('team-select'); if (t) t.value = '2'; lobbySetSize('south', 2); lobbySetSize('north', 2); });
  await A.waitForTimeout(600);
  const code = await A.evaluate(() => mp.code);
  await B.evaluate((c) => { document.getElementById('mp-code').value = c; }, code);
  await B.click('#mp-join'); await B.waitForTimeout(3500); await A.waitForTimeout(1500);

  const seats = (p) => p.evaluate(() => ({ me: `${mp.team}:${mp.seat}`, south: roster.south.map((s) => s.kind), north: roster.north.map((s) => s.kind) }));
  console.log('GENE', JSON.stringify(await seats(A)));
  console.log('ABDY', JSON.stringify(await seats(B)));

  await A.evaluate(() => mpHostStart());
  await A.waitForTimeout(3000); await B.waitForTimeout(2500);

  // ABDY BUILDS FIRST
  const built = await B.evaluate(() => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    player.gold = 1e6;
    let n = 0;
    for (let r = SOUTH_BOT - 6; r > SOUTH_TOP && n < 7; r -= 2)
      for (let c = 5; c < 16 && n < 7; c += 2) {
        if (!isBuildableCell(r, c)) continue;
        const t = makeTower(r, c, selectedRace.id, 2, 'player'); t.buildUntil = 0; addTower(t); n += 1;
      }
    return { placed: n, seat: mpMySeatKey() };
  });
  console.log('\nABDY built ' + built.placed + ' towers on ' + built.seat);

  // ...and only NOW does Gene look, well after the build stopped changing
  await A.waitForTimeout(6000); await B.waitForTimeout(6000);
  /* PRESS THE CHIP, do not set the state. Setting mp.viewSeat by hand made this
     test pass even with the fix disabled — it proved the data was there while
     saying nothing about whether a person can reach it. */
  const strip = await A.evaluate(() => ({
    chips: [...document.querySelectorAll('[data-watch]')].map((b) => ({
      key: b.dataset.watch, label: (b.textContent || '').trim().slice(0, 18),
      visible: b.getBoundingClientRect().width > 0 })),
    watching: mp.viewSeat,
  }));
  console.log('GENE watch strip: ' + JSON.stringify(strip));
  const reachable = strip.chips.filter((c) => c.visible).length;
  console.log('  chips a finger can actually reach: ' + reachable + ' of ' + strip.chips.length
    + (reachable ? '' : '   *** the watch strip is not on screen ***'));
  const clicked = await A.evaluate((mateSeat) => {
    const b = document.querySelector(`[data-watch="${mateSeat}"]`);
    if (!b) return { pressed: false };
    b.click();
    return { pressed: true };
  }, built.seat);
  await A.waitForTimeout(1500);
  const look = await A.evaluate((mateSeat) => {
    rebuildMirrorEntities();
    return { pressedChip: true, watching: mp.viewSeat,
      friendly: mpViewableSeats().find((s) => s.key === mateSeat)?.friendly,
      seatsListed: mpViewableSeats().map((s) => `${s.key}:${s.name}:${s.hasBoard ? 'board' : 'NONE'}`),
      snapTowers: (mp.seatSnaps[mateSeat] || {}).towers?.length ?? 0,
      mirrorTowers: mirrorTowers.length };
  }, built.seat);
  if (!clicked.pressed) console.log('  *** no watch chip exists for the teammate ***');
  console.log('GENE watching his TEAMMATE: ' + JSON.stringify(look, null, 1));

  const ok = clicked.pressed && look.watching === built.seat && look.snapTowers >= built.placed
    && look.mirrorTowers >= built.placed && look.friendly === true;
  console.log('\n' + (ok
    ? `PASS — Gene sees all ${look.mirrorTowers} of his teammate's towers, arriving after the build`
    : `FAIL — Gene holds ${look.snapTowers} towers for a teammate who built ${built.placed}`));
  await A.screenshot({ path: OUT + 'mateview.png' });
  if (errs.length) console.log('ERRORS', errs.slice(0, 4));
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 400)); process.exit(1); });
