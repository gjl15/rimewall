// Element screenshot of the Tech card on towers.html at phone width.
const { chromium, CHROME, OUT } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8766/';
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'light' });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await page.goto(base + 'towers.html', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const status = await page.evaluate(() => document.getElementById('status').textContent);
  console.log('status:', status);
  await page.locator('#race-tech').screenshot({ path: OUT + 'towers-tech-390.png' });
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' });
  const p2 = await ctx2.newPage(); await p2.goto(base + 'towers.html', { waitUntil: 'load' }); await p2.waitForTimeout(1500);
  await p2.locator('#race-tech').screenshot({ path: OUT + 'towers-tech-1280.png' });
  if (errs.length) console.log('ERRORS', errs);
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
