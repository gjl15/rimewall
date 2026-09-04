// Desktop-size screenshots of menu + arena.
const { chromium, CHROME, OUT } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8766/';
const prefix = process.argv[3] || 'd';
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 200)); });
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: OUT + prefix + '-menu.png' });
  await page.click('#start-button');
  await page.waitForTimeout(1800);
  await page.evaluate(() => document.querySelectorAll('.coach-card').forEach((c) => c.remove()));
  await page.waitForTimeout(200);
  await page.screenshot({ path: OUT + prefix + '-arena.png' });
  const m = await page.evaluate(() => {
    const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join(','); };
    return ['#map-viewport', '#map-frame', '.zoom-hint', '.map-zoom-controls', '.map-toggles', '#event-log', '.command-panel'].map((s) => s + ' ' + rect(document.querySelector(s)));
  });
  console.log(JSON.stringify(m)); if (errs.length) console.log('CONSOLE', errs.slice(0, 8));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
