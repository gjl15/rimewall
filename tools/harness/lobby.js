/* Drive the lobby: open it, set the slots, start, and check the match that
   comes out matches the roster that went in.
   node tools/harness/lobby.js <url> [w] [h] */
const { chromium, CHROME, OUT } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';
const W = Number(process.argv[3] || 900), H = Number(process.argv[4] || 1000);

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: W < 700, hasTouch: W < 700, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 250)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await page.click('#start-button');
  await page.waitForTimeout(700);
  const opened = await page.evaluate(() => ({
    visible: !document.getElementById('lobby').classList.contains('hidden'),
    slots: [...document.querySelectorAll('.lb-slot')].length,
    kinds: [...document.querySelectorAll('.lb-kind')].map((s) => s.value),
    lanes: [...document.querySelectorAll('.lb-swatch')].map((s) => s.title),
    running: battleRunning, phase: lobbyPhase,
  }));
  console.log('opened  ', JSON.stringify(opened));
  await page.screenshot({ path: OUT + 'lobby-1v1.png' });

  // make it 2v2: two slots a side, ours human + computer
  await page.evaluate(() => { lobbySetSize('south', 2); lobbySetSize('north', 2); });
  await page.waitForTimeout(300);
  const two = await page.evaluate(() => ({
    south: roster.south.map((s) => s.kind), north: roster.north.map((s) => s.kind),
    lanes: [...document.querySelectorAll('.lb-swatch')].map((s) => s.title),
    header: document.querySelector('.lb-head strong').textContent.trim(),
  }));
  console.log('2v2 set ', JSON.stringify(two));
  await page.screenshot({ path: OUT + 'lobby-2v2.png' });

  // start it and check what got built
  await page.click('#lb-ready');
  await page.waitForTimeout(2500);
  const live = await page.evaluate(() => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    return {
      running: battleRunning, lobbyHidden: document.getElementById('lobby').classList.contains('hidden'),
      seatsSouth: seatsOn('south'), seatsNorth: seatsOn('north'),
      allies: allies.map((a) => `${a.half}#${a.seat} ${a.raceId} ${a.zone.label} ${a.lane ? a.lane.name : '?'}`),
      playerSeat: player.seat, playerLane: player.lane && player.lane.name, playerZone: player.zone && player.zone.label,
      enemyLane: enemy.lane && enemy.lane.name,
      mode: matchMode, batches: seatsOn('south'),
    };
  });
  console.log('started ', JSON.stringify(live, null, 1));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: OUT + 'lobby-started.png' });
  if (errs.length) console.log('ERRORS', errs.slice(0, 8));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 400)); process.exit(1); });
