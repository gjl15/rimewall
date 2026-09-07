/* Screenshot the arena at a given viewport, optionally with debug overlays on.
   node tools/harness/shot.js <url> <name> [w] [h] [flags]
   flags: comma list of routes,ranges  e.g. node ... shot.js http://127.0.0.1:8771/ routes 900 1400 routes */
const { chromium, CHROME, OUT } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';
const name = process.argv[3] || 'shot';
const W = Number(process.argv[4] || 390), H = Number(process.argv[5] || 844);
const flags = (process.argv[6] || '').split(',').filter(Boolean);

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: W < 700, hasTouch: W < 700, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 300)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.click('#start-button');
  await page.waitForTimeout(2500);
  await page.evaluate((flags) => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    if (typeof closeLobby === 'function') closeLobby();
    flags.forEach((f) => { if (typeof debug === 'object') debug[f] = true; });
    if (typeof camAnim !== 'undefined') camAnim = { z: 1, x: 0, y: 0 };
  }, flags);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: OUT + name + '.png' });
  const m = await page.evaluate(() => ({
    board: [COLS, ROWS, CELL].join('x'),
    lanes: { W: LANE_W_C, E: LANE_E_C, turnS: S_TURN_R, midS: S_MID_R, door: DOOR_C },
    routesOn: debug.routes, mode: matchMode, zoom: Math.round((typeof camZoomNow === 'function' ? camZoomNow() : 1) * 100) + '%',
    creeps: creeps.length, towers: towers.size,
  }));
  console.log(JSON.stringify(m));
  if (errs.length) console.log('ERRORS', errs.slice(0, 6));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
