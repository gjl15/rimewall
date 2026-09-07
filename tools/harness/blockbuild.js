/* You cannot build the tower that seals your own lane, and Select all works.

   Gene: "we should not be allowed to build a unit that will block the path, it
   just too hard to undo it in time on mobile" — and "there may also need to be
   a select all button instead of double tap".

   Wall a lane off deliberately, one cell at a time, until the last gap is the
   only thing keeping the route open. Then try to fill it. Nothing should be
   built, and nothing should be spent.
   node tools/harness/blockbuild.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1600);

  const out = await page.evaluate(() => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};
    player.gold = 1e7; player.lumber = 9; selectedTowerTier = 0;
    towers.clear(); towersVersion += 1; creeps.length = 0;

    /* Build a wall straight across the player's half, skipping nothing but the
       cells that refuse. Whatever is left open at the end is the last gap. */
    let built = 0, refused = 0;
    const row = SOUTH_TOP + 5;
    const goldStart = player.gold;
    for (let c = 0; c < COLS; c += 1) {
      const before = towers.size;
      buildAt({ r: row, c });
      if (towers.size > before) built += 1; else refused += 1;
    }
    const routesAfterWall = routesAreOpen();

    // now try every remaining cell on that row — each is a potential last gap
    let sealAttempts = 0, sealsAllowed = 0;
    const goldBeforeSeals = player.gold;
    for (let c = 0; c < COLS; c += 1) {
      if (towers.has(idx(row, c))) continue;
      if (terrainAt(row, c) !== T.FLOOR || !isPlayerBuildRow(row) || protectedCells.has(idx(row, c))) continue;
      sealAttempts += 1;
      const before = towers.size;
      buildAt({ r: row, c });
      if (towers.size > before) {
        // it let us build — did the route survive?
        if (!routesAreOpen()) sealsAllowed += 1;
      }
    }
    const goldSpentOnSeals = goldBeforeSeals - player.gold;

    // SELECT ALL
    towers.clear(); towersVersion += 1;
    const keys = [];
    for (let i = 0; i < 6; i += 1) {
      const t = makeTower(SOUTH_TOP + 8, 6 + i * 2, selectedRace.id, 0, 'player');
      t.buildUntil = 0; t.placedAt = -1000; addTower(t); keys.push(t.key);
    }
    selectedTowerKey = keys[0]; selectedGroupKeys = [keys[0]];
    const selBefore = selectedGroupKeys.length;
    towerAction('selectall');
    const selAfter = selectedGroupKeys.length;

    return { built, refused, routesAfterWall, sealAttempts, sealsAllowed, goldSpentOnSeals,
      routesAtEnd: routesAreOpen(), selBefore, selAfter, alike: keys.length,
      goldStart, goldNow: player.gold };
  });

  console.log('walling a row across the player half');
  console.log('  towers placed: ' + out.built + '   placements refused: ' + out.refused);
  console.log('  routes still open after the wall: ' + out.routesAfterWall);
  console.log('\ntrying to fill every remaining gap on that row');
  console.log('  attempts: ' + out.sealAttempts);
  console.log('  builds that ACTUALLY SEALED a route: ' + out.sealsAllowed + (out.sealsAllowed ? '   *** should be 0 ***' : '   (none — good)'));
  console.log('  gold spent on refused placements: ' + out.goldSpentOnSeals + (out.goldSpentOnSeals && !out.sealsAllowed ? '' : ''));
  console.log('  routes open at the end: ' + out.routesAtEnd + (out.routesAtEnd ? '' : '   *** a lane is sealed ***'));
  console.log('\nselect all');
  console.log('  selected before: ' + out.selBefore + '  after: ' + out.selAfter + ' of ' + out.alike + ' alike'
    + (out.selAfter === out.alike ? '   (works)' : '   *** did not select them all ***'));
  const ok = out.sealsAllowed === 0 && out.routesAtEnd && out.selAfter === out.alike;
  console.log('\n' + (ok ? 'PASS' : 'FAIL'));
  if (errs.length) console.log('ERRORS', errs.slice(0, 3));
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
