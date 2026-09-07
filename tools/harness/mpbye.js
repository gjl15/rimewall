/* A teammate leaving must not end the match for everyone else.

   Two real clients on the SAME team (team size 2) against computer seats, via
   the real Create/Join buttons with the MQTT CDN blocked so both take the
   BroadcastChannel fallback. Then Abdy leaves. Gene should still be playing:
   the north half is full of computers, so nobody has run out of players.
   Before the fix any 'bye' called endMatch('victory') and Gene's match ended.
   node tools/harness/mpbye.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 950, height: 1100 }, colorScheme: 'dark' });
  await ctx.route('**/mqtt*', (r) => r.abort());
  await ctx.route('**/jsdelivr**', (r) => r.abort());
  const A = await ctx.newPage(), B = await ctx.newPage();
  const errs = [];
  for (const [p, n] of [[A, 'GENE'], [B, 'ABDY']]) {
    p.on('pageerror', (e) => errs.push(`${n} pageerror: ` + String(e).slice(0, 220)));
    await p.goto(base + 'index.html', { waitUntil: 'load' });
    await p.waitForTimeout(700);
  }
  await A.evaluate(() => { profile.name = 'Gene'; saveProfile(); });
  await B.evaluate(() => { profile.name = 'Abdy'; saveProfile(); });

  await A.click('#mp-create'); await A.waitForTimeout(2500);
  /* Two seats a side BEFORE the guest arrives, so the host seats Abdy beside
     Gene and the leaver is a TEAMMATE. The join path fills the host's own half
     first and only spills over when it is full, so opening south:1 is what
     decides this — setting team-select alone does not, it only travels in the
     config message. */
  await A.evaluate(() => { const t = document.getElementById('team-select'); if (t) t.value = '2'; lobbySetSize('south', 2); lobbySetSize('north', 2); });
  await A.waitForTimeout(600);
  const code = await A.evaluate(() => mp.code);
  await B.evaluate((c) => { document.getElementById('mp-code').value = c; }, code);
  await B.click('#mp-join'); await B.waitForTimeout(3500); await A.waitForTimeout(1500);

  const roster = (p) => p.evaluate(() => ({
    me: `${mp.team}:${mp.seat}`,
    south: roster.south.map((s) => s.kind + (s.name ? ':' + s.name : '')),
    north: roster.north.map((s) => s.kind + (s.name ? ':' + s.name : '')),
  }));
  console.log('GENE', JSON.stringify(await roster(A)));
  console.log('ABDY', JSON.stringify(await roster(B)));

  await A.evaluate(() => mpHostStart());
  await A.waitForTimeout(3000); await B.waitForTimeout(2000);
  const before = await A.evaluate(() => ({ running: battleRunning, over: matchOver, foeSeats: mpSeatsInPlay(mpFoeHalf()).length, mySeats: mpSeatsInPlay(mp.team).length }));
  console.log('GENE mid-match before the leave:', JSON.stringify(before));

  // Abdy leaves the way a real client does
  await B.evaluate(() => mpSend({ t: 'bye' }));
  await A.waitForTimeout(2500);
  const after = await A.evaluate(() => ({
    running: battleRunning, over: matchOver,
    foeSeats: mpSeatsInPlay(mpFoeHalf()).length, mySeats: mpSeatsInPlay(mp.team).length,
    south: roster.south.map((s) => s.kind), watching: mp.viewSeat,
  }));
  console.log('GENE after Abdy left:      ', JSON.stringify(after));

  const ok = after.running && !after.over;
  console.log(ok
    ? '\nPASS — Gene is still playing; Abdy\'s seat closed, the computers remain.'
    : '\nFAIL — Gene\'s match ended because a TEAMMATE left.');
  if (errs.length) console.log('ERRORS', errs.slice(0, 6));
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 400)); process.exit(1); });
