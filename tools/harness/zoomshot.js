/* A close crop of the board, so the sprites can be judged at the size a player
   actually leans in at rather than from across the whole 41x57 field.
   node tools/harness/zoomshot.js <url> */
const { chromium, CHROME, OUT } = require('./lib');
const path = require('path');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark' })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 180)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1700);

  const box = await page.evaluate(async () => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};
    battleRunning = true; battlePaused = false; matchOver = false;
    towers.clear(); towersVersion += 1; creeps.length = 0;
    player.gold = 1e7;
    // one band of every element, climbing tiers, and a wave walking past them
    races.forEach((r, i) => {
      for (let tier = 0; tier < 6; tier += 1) {
        const rr = SOUTH_TOP + 4 + i * 2, cc = 4 + tier * 2;
        if (!isBuildableCell(rr, cc)) continue;
        const t = makeTower(rr, cc, r.id, tier, 'player');
        t.buildUntil = 0; t.placedAt = -1000; addTower(t);
      }
    });
    for (let i = 0; i < 16; i += 1) {
      spawnCreep(waveDefFor(6 + (i % 14)), 'south', i % 2 ? 'west' : 'east');
      const c = creeps[creeps.length - 1];
      c.hp = c.maxHp = 90000;
      c.x = 20 + (i % 4) * 1.2; c.y = SOUTH_TOP + 5 + Math.floor(i / 4) * 2;
    }
    for (let i = 0; i < 30; i += 1) simulate(1 / 30);
    // wait for the sheets, then repaint so the first frame is not the fallback
    for (let i = 0; i < 60 && !(SPRITE_SHEETS.tower.ready && SPRITE_SHEETS.creep.ready); i += 1) {
      await new Promise((r) => setTimeout(r, 50));
    }
    renderFrame();
    const cv = document.getElementById('fx-canvas');
    const r = cv.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height,
      cell: CELL, ready: SPRITE_SHEETS.tower.ready && SPRITE_SHEETS.creep.ready };
  });

  // crop to the band of towers and the creeps beside them
  const clip = { x: Math.round(box.x + box.w * .04), y: Math.round(box.y + box.h * .52),
    width: Math.round(box.w * .62), height: Math.round(box.h * .44) };
  const file = path.join(OUT, 'zoomshot.png');
  await page.screenshot({ path: file, clip });
  console.log(`  sheets loaded: ${box.ready}   cell ${box.cell}px`);
  console.log('  ' + file);
  if (errs.length) console.log('  ERRORS', errs.slice(0, 3));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
