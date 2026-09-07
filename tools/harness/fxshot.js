/* Mid-combat screenshot with a dense wall of one element, which is the only
   way to judge whether the wave still reads through its own light show.
   node tools/harness/fxshot.js <url> <raceId> [towers] [name] [readPass 0|1] */
const { chromium, CHROME, OUT } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';
const raceId = process.argv[3] || 'electricity';
const nTowers = Number(process.argv[4] || 30);
const name = process.argv[5] || ('fx-' + raceId);
const readPass = process.argv[6] !== '0';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 1000 }, deviceScaleFactor: 2, colorScheme: 'dark' })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1800);
  const info = await page.evaluate(({ raceId, nTowers, readPass }) => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};
    if (!readPass) window.drawCreepReadPass = () => {};   // the before picture
    debug.routes = false;
    selectedRace = races.find((r) => r.id === raceId);
    const sel = document.getElementById('mode-select'); if (sel) sel.value = 'survival';
    resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
    player.lives = 99999; player.startLives = 99999;
    const marks = [sharedFlagCell(PLAYER_HALF)];
    const near = (c) => Math.min(...marks.map((m) => Math.hypot(c.r - m.r, c.c - m.c)));
    const spots = mazeOrderSouth().sort((a, b) => near(a) - near(b));
    let placed = 0;
    for (const s of spots) { if (placed >= nTowers) break; if (!isBuildableCell(s.r, s.c)) continue;
      const t = makeTower(s.r, s.c, raceId, 3, 'player'); t.buildUntil = 0; addTower(t); placed += 1; }
    // a wave of SENDS, which is the case Gene hit: sends used to be the same
    // yellow Electricity fires
    const sd = SENDS.find((x) => x.id === 'wolfrider');
    for (let i = 0; i < 22; i += 1) spawnCreep(sendCreepDef(sd), 'south', i % 2 ? 'east' : 'west', true);
    for (let i = 0; i < 1180; i += 1) simulate(1 / 30);   // fast-forward them to the edge of the guns
    // then keep feeding the wall so the real frame loop paints live combat
    window.__fxFeed = setInterval(() => { for (let i = 0; i < 2; i += 1) spawnCreep(sendCreepDef(sd), "south", i % 2 ? "east" : "west", true); }, 260);
    return { towers:placed, creeps:creeps.filter((c) => c.hp > 0).length, fx:effects.length, shots:projectiles.length };
  }, { raceId, nTowers, readPass });
  // let a frame paint the live board
  await page.waitForTimeout(2600);   // let the game itself run, so effects are live rather than a stale instant
  await page.evaluate(() => clearInterval(window.__fxFeed));
  const box = await page.locator('#map-viewport').boundingBox();
  await page.screenshot({ path: OUT + name + '.png', clip: { x:box.x, y:box.y, width:box.width, height:Math.min(box.height, 760) } });
  console.log(name, JSON.stringify(info));
  if (errs.length) console.log('ERRORS', errs.slice(0, 4));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
