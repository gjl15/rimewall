/* Every creep sprite at the size the board draws it, so "does a Mossback look
   like a Mossback" is answered by looking rather than by reading an atlas.
   node tools/harness/creepsheet.js <url> */
const { chromium, CHROME, OUT } = require('./lib');
const path = require('path');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark' })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 180)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  const info = await page.evaluate(async () => {
    for (let i = 0; i < 100 && !SPRITE_SHEETS.creep.ready; i += 1) await new Promise((r) => setTimeout(r, 50));
    const ids = SPRITE_CREEP_IDS;
    const COLS = 9, CW = 118, ROWH = 86;
    const rows = Math.ceil(ids.length / COLS);
    const cv = document.createElement('canvas');
    cv.width = COLS * CW; cv.height = rows * ROWH + 40;
    cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999';
    document.body.appendChild(cv);
    const c = cv.getContext('2d');
    c.fillStyle = '#0e1c28'; c.fillRect(0, 0, cv.width, cv.height);
    c.font = '600 13px system-ui, sans-serif'; c.fillStyle = '#93a3c4'; c.textAlign = 'left';
    c.fillText(`every creep, drawn at the board own 21px cell and again at 3x`, 16, 26);

    ids.forEach((id, i) => {
      const x = (i % COLS) * CW + CW / 2, y = 52 + Math.floor(i / COLS) * ROWH;
      drawSprite(c, 'creep', id, x - 22, y + 22, 21);        // board size
      drawSprite(c, 'creep', id, x + 16, y + 22, 58);        // leaned in
      c.font = '500 8.5px ui-monospace, monospace';
      c.fillStyle = '#7f90b2'; c.textAlign = 'center';
      c.fillText(id.replace(/^(wave|send)-/, '').slice(0, 17), x, y + 62);
    });
    return { n: ids.length, w: cv.width, h: cv.height };
  });

  const file = path.join(OUT, 'creepsheet.png');
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: info.w, height: info.h } });
  console.log(`  ${info.n} creeps -> ${file}`);
  if (errs.length) console.log('  ERRORS', errs.slice(0, 3));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
