/* The asset set for a design brief: every screen a person actually sees, on
   both devices, at the current build.
   node tools/harness/designshots.js <url> [outDir] */
const fs = require('fs');
const path = require('path');
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';
const OUT = process.argv[3] || path.join(process.env.HOME, 'Desktop', 'rimewall-design');

const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: 'dark' };
const laptop = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark' };

const seedBoard = () => {
  document.querySelectorAll('.coach-card').forEach((c) => c.remove());
  SFX.play = () => {};
  player.gold = 4200; player.lumber = 2;
  let n = 0;
  for (let r = SOUTH_TOP + 3; r < SOUTH_BOT - 2 && n < 26; r += 2)
    for (let c = 5; c < 34 && n < 26; c += 3) {
      if (!isBuildableCell(r, c)) continue;
      const t = makeTower(r, c, selectedRace.id, n % 5, 'player');
      t.buildUntil = 0; t.placedAt = -1000; t.level = n % 3; addTower(t); n += 1;
    }
  for (let i = 0; i < 10; i += 1) spawnCreep(waveDefFor(5), 'south', i % 2 ? 'west' : 'east');
  renderHud();
  return n;
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const shots = [];
  for (const [device, opts] of [['phone', phone], ['laptop', laptop]]) {
    const page = await (await browser.newContext(opts)).newPage();
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    await page.waitForTimeout(1100);
    const snap = async (name) => {
      const file = path.join(OUT, `${device}-${name}.png`);
      await page.screenshot({ path: file });
      shots.push(file);
    };
    await snap('1-title');
    await page.click('#start-button'); await page.waitForTimeout(800);
    await snap('2-lobby');
    await page.click('#lb-ready'); await page.waitForTimeout(2000);
    await page.evaluate(seedBoard);
    for (let i = 0; i < 45; i += 1) await page.evaluate(() => simulate(1 / 30));
    await page.waitForTimeout(600);
    await snap('3-arena');
    // a tower selected: the ring, and whatever panel that device shows
    await page.evaluate(() => {
      const first = [...towers.values()].find((t) => isMine(t));
      if (!first) return;
      selectedTowerKey = first.key; selectedGroupKeys = [first.key];
      inspectEntity = { kind: 'tower' };
      renderTowerDetails(); renderRing(); sheetKey = ''; renderCommandSheet();
      if (touchUI()) { wispTab = 'inspect'; renderWispPanel('inspect'); railTab = 'tower'; renderRails(); }
    });
    await page.waitForTimeout(700);
    await snap('4-tower-selected');
    await page.close();
  }
  // the tower ladder: every element, every tier, close up
  {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 3 })).newPage();
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    await page.click('#start-button'); await page.waitForTimeout(700);
    await page.click('#lb-ready'); await page.waitForTimeout(1800);
    const box = await page.evaluate(() => {
      document.querySelectorAll('.coach-card').forEach((c) => c.remove());
      SFX.play = () => {};
      towers.clear(); towersVersion += 1; creeps.length = 0;
      const list = ['ice', 'fire', 'earth', 'tech', 'crystal', 'poison', 'stone', 'electricity', 'gravity', 'beam', 'ninja'];
      const r0 = SOUTH_TOP + 3;
      list.forEach((rid, ri) => {
        for (let t = 0; t < 6; t += 1) {
          const r = r0 + ri * 2, c = 5 + t * 2.6 | 0;
          if (!inBounds(r, c) || terrainAt(r, c) !== T.FLOOR) continue;
          const tw = makeTower(r, c, rid, t, 'player');
          tw.buildUntil = 0; tw.placedAt = -1000; addTower(tw);
        }
      });
      redrawBoard();
      const rc = document.getElementById('fx-canvas').getBoundingClientRect();
      return { x: rc.left + (4.3 / COLS) * rc.width, y: rc.top + ((r0 - 1.4) / ROWS) * rc.height,
        w: (16.5 / COLS) * rc.width, h: (24.5 / ROWS) * rc.height };
    });
    for (let i = 0; i < 20; i += 1) await page.evaluate(() => simulate(1 / 30));
    const file = path.join(OUT, 'towers-every-element-every-tier.png');
    await page.screenshot({ path: file, clip: { x: Math.max(0, box.x), y: Math.max(0, box.y), width: box.w, height: box.h } });
    shots.push(file);
    await page.close();
  }
  await browser.close();
  console.log('wrote ' + shots.length + ' shots to:\n  ' + OUT);
  shots.forEach((f) => console.log('  ' + path.basename(f)));
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
