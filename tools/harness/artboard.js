/* The art on the actual board, at the actual cell size, with the plinths under
   it and creeps walking past — because a contact sheet at 46px flatters
   silhouettes that vanish at 21px, and because the repaint cost of 350 towers
   a frame is the thing that decides whether any of this can ship.

   node tools/harness/artboard.js <url> */
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
  await page.click('#lb-ready'); await page.waitForTimeout(1600);

  const stats = await page.evaluate(() => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};
    battleRunning = true; battlePaused = false; matchOver = false;
    towers.clear(); towersVersion += 1; creeps.length = 0;
    player.gold = 1e7;

    /* One band of every element, climbing tiers left to right, laid on the
       player's half where the board actually draws them. */
    const ids = races.map((r) => r.id);
    let placed = 0;
    ids.forEach((id, i) => {
      for (let tier = 0; tier < 6; tier += 1) {
        const r = SOUTH_TOP + 3 + i * 2, c = 4 + tier * 3;
        if (!isBuildableCell(r, c)) continue;
        const t = makeTower(r, c, id, tier, 'player');
        t.buildUntil = 0; t.placedAt = -1000; addTower(t); placed += 1;
      }
    });

    // something for them to shoot at, so projectiles are in the frame
    for (let i = 0; i < 24; i += 1) {
      spawnCreep(waveDefFor(6), 'south', i % 2 ? 'west' : 'east');
      const c = creeps[creeps.length - 1];
      c.hp = c.maxHp = 90000;
    }
    for (let i = 0; i < 40; i += 1) simulate(1 / 30);

    // repaint cost with the whole board dressed
    const t0 = performance.now();
    for (let i = 0; i < 20; i += 1) renderFrame();
    const paint = (performance.now() - t0) / 20;
    return { placed, creeps: creeps.length, projectiles: projectiles.length, paint: +paint.toFixed(2) };
  });

  const file = path.join(OUT, 'artboard.png');
  await page.screenshot({ path: file });
  console.log(`  ${stats.placed} towers, ${stats.creeps} creeps, ${stats.projectiles} projectiles in flight`);
  console.log(`  repaint ${stats.paint}ms a frame   (budget ~16ms for 60fps)`);
  console.log(`  ${file}`);
  const ok = stats.paint < 16 && !errs.length;
  console.log('\n' + (ok ? 'PASS — the dressed board still paints inside a frame' : 'FAIL'));
  if (errs.length) console.log('ERRORS', errs.slice(0, 4));
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
