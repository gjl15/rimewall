/* Gene: "the towers re not centered on cells".

   Eyeballing that is exactly how it got missed, so measure it: draw one tower
   on a known cell, read the pixels back, take the bounding box of everything
   that is not background, and compare its centre to the cell's centre.

   node tools/harness/centring.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1700);

  const out = await page.evaluate(async () => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};
    for (let i = 0; i < 100 && !SPRITE_SHEETS.tower.ready; i += 1) await new Promise((r) => setTimeout(r, 50));

    const rows = [];
    const SCALE = 8;                       // draw big so a sub-pixel offset is visible
    for (const [raceId, tier] of [['ice', 0], ['ice', 3], ['ice', 5], ['tech', 0], ['stone', 4], ['ninja', 2]]) {
      const cv = document.createElement('canvas');
      cv.width = CELL * SCALE; cv.height = CELL * SCALE;
      const c = cv.getContext('2d');
      c.scale(SCALE, SCALE);
      const t = makeTower(SOUTH_TOP + 6, 12, raceId, tier, 'player');
      t.buildUntil = 0; t.placedAt = -1000;
      /* drawTowerStructure works from the cell centre, so put the origin there
         and the cell is the square from -CELL/2 to +CELL/2 around it. */
      c.translate(CELL / 2, CELL / 2);
      drawTowerStructure(c, t, towerLiveStats(t), false, null);

      const px = c.getImageData(0, 0, cv.width, cv.height).data;
      let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
      for (let y = 0; y < cv.height; y += 1) {
        for (let x = 0; x < cv.width; x += 1) {
          const a = px[(y * cv.width + x) * 4 + 3];
          if (a < 24) continue;            // ignore the faint contact shadow edge
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      if (x1 < 0) { rows.push({ raceId, tier, empty: true }); continue; }
      const cx = (x0 + x1) / 2 / SCALE, cy = (y0 + y1) / 2 / SCALE;
      rows.push({ raceId, tier,
        dx: +(cx - CELL / 2).toFixed(2), dy: +(cy - CELL / 2).toFixed(2),
        w: +((x1 - x0) / SCALE).toFixed(1), h: +((y1 - y0) / SCALE).toFixed(1),
        overflow: +Math.max(0, (x1 - x0) / SCALE - CELL, (y1 - y0) / SCALE - CELL).toFixed(1) });
    }
    return { cell: CELL, rows };
  });

  const p = (s, n) => String(s).padEnd(n);
  console.log(`  cell is ${out.cell}px; dx/dy are the drawn centre against the cell centre\n`);
  console.log('  ' + p('tower', 14) + p('dx', 8) + p('dy', 8) + p('size', 14) + 'overflows cell by');
  let worst = 0;
  out.rows.forEach((r) => {
    if (r.empty) return console.log('  ' + p(r.raceId + ' T' + r.tier, 14) + 'NOTHING DRAWN');
    worst = Math.max(worst, Math.abs(r.dx), Math.abs(r.dy));
    console.log('  ' + p(r.raceId + ' T' + r.tier, 14) + p(r.dx, 8) + p(r.dy, 8)
      + p(r.w + ' x ' + r.h, 14) + (r.overflow ? r.overflow + 'px' : '—'));
  });
  const ok = worst <= 2.0;
  console.log('\n  worst offset from centre: ' + worst.toFixed(2) + 'px');
  console.log('  ' + (ok ? 'PASS — every tower sits on its cell' : 'FAIL — towers are drawn off their cell'));
  if (errs.length) console.log('ERRORS', errs.slice(0, 3));
  await browser.close();
  process.exit(ok && !errs.length ? 0 : 1);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
