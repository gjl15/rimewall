/* A contact sheet: every element, every tier, drawn the way the board draws it.

   Gene: "we need to improve everything including the towers themselves they are
   way too basic and boring" — and the reason they were is that rwBody took no
   tier, so all six rungs of a race drew the same body. This renders the whole
   11 x 6 grid at board scale so the change can be judged by looking, which is
   the only way art gets judged.

   node tools/harness/artsheet.js <url> */
const { chromium, CHROME, OUT } = require('./lib');
const path = require('path');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark' })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 180)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  const info = await page.evaluate(() => {
    const ids = races.map((r) => r.id);
    const TIERS = 6, PAD = 78, TOP = 56, LEFT = 128;
    const cv = document.createElement('canvas');
    cv.width = LEFT + TIERS * PAD + 24;
    cv.height = TOP + ids.length * PAD + 20;
    cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999';
    document.body.appendChild(cv);
    const c = cv.getContext('2d');
    c.fillStyle = '#0b1020'; c.fillRect(0, 0, cv.width, cv.height);

    c.font = '600 13px system-ui, sans-serif'; c.fillStyle = '#93a3c4';
    c.textAlign = 'left'; c.fillText('rwBody — every element, every tier', 16, 24);
    c.font = '600 11px ui-monospace, monospace';
    c.textAlign = 'center';
    for (let t = 0; t < TIERS; t += 1) c.fillText('T' + t, LEFT + t * PAD + PAD / 2, 44);

    ids.forEach((id, row) => {
      const y = TOP + row * PAD;
      c.textAlign = 'right'; c.fillStyle = '#93a3c4'; c.font = '600 12px system-ui, sans-serif';
      c.fillText(races[row].name, LEFT - 14, y + PAD / 2 + 4);
      for (let tier = 0; tier < TIERS; tier += 1) {
        const x = LEFT + tier * PAD + PAD / 2;
        c.save();
        c.translate(x, y + PAD - 18);
        // the board's own transform: CELL/20 with a 46px cell for legibility
        const s = 46 / 20; c.scale(s, s);
        c.fillStyle = RW_ELEMENT[id] || '#cfd8ea';
        c.strokeStyle = '#0c122099'; c.lineWidth = .9; c.lineJoin = 'round';
        rwBody(c, id, 5, 8.5, 1.7, tier);
        c.restore();
      }
    });
    return { w: cv.width, h: cv.height, races: ids.length };
  });

  const file = path.join(OUT, 'artsheet-towers.png');
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: info.w, height: info.h } });
  console.log(`  ${info.races} elements x 6 tiers -> ${file}`);
  if (errs.length) console.log('  ERRORS', errs.slice(0, 4));
  await browser.close();
  process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
