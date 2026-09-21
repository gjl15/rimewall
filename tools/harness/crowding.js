/* Gene: "a lot of the creeps get staked together."

   Stacked, and you cannot tell one from another. Two separate things could be
   causing that and they want opposite fixes, so measure which:

     1. they physically OVERLAP — many bodies inside one cell, drawn on top of
        each other, so a pack of eight reads as one blob
     2. they look ALIKE — distinct positions, but the same glyph and colour, so
        you cannot tell a healer from a juggernaut

   node tools/harness/crowding.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1700);

  const out = await page.evaluate(() => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};
    resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
    towers.clear(); towersVersion += 1; creeps.length = 0;

    // a real wave, walking a real route, with a real wall slowing it
    let built = 0;
    for (const cell of mazeOrderSouth()) {
      if (built >= 60) break;
      if (towers.has(idx(cell.r, cell.c))) continue;
      const t = makeTower(cell.r, cell.c, 'ice', 1, 'player');
      t.buildUntil = 0; t.placedAt = -1000;
      addTower(t);
      if (!routesAreOpen()) { towers.delete(t.key); towersVersion += 1; continue; }
      built += 1;
    }
    const def = waveDefFor(8);
    for (let i = 0; i < 20; i += 1) spawnCreep(def, 'south', i % 2 ? 'west' : 'east');

    let worstInCell = 0, framesSampled = 0, sumTouching = 0, maxTouching = 0;
    const R = .42;                         // how close before two bodies visibly overlap
    for (let f = 0; f < 600; f += 1) {
      simulate(1 / 30);
      if (f % 20) continue;
      framesSampled += 1;
      const live = creeps.filter((c) => c.hp > 0);
      const cellCount = {};
      live.forEach((c) => { const k = Math.floor(c.y) + ':' + Math.floor(c.x); cellCount[k] = (cellCount[k] || 0) + 1; });
      worstInCell = Math.max(worstInCell, Math.max(0, ...Object.values(cellCount)));
      let touching = 0;
      for (let i = 0; i < live.length; i += 1)
        for (let j = i + 1; j < live.length; j += 1)
          if (Math.hypot(live[i].x - live[j].x, live[i].y - live[j].y) < R) touching += 1;
      sumTouching += touching; maxTouching = Math.max(maxTouching, touching);
    }

    /* AND HOW MANY DIFFERENT THINGS DOES THE WAVE TABLE EVEN LOOK LIKE. Every
       creep is drawn by drawCreep from its role and class — if forty wave
       entries resolve to a handful of appearances, telling them apart is not a
       crowding problem, it is an art problem. */
    const looks = new Set(), names = new Set(), roles = new Set();
    for (let n = 1; n <= 40; n += 1) {
      const d = waveDefFor(n); if (!d) continue;
      names.add(d.name);
      roles.add(d.role || 'standard');
      looks.add(`${d.role || 'standard'}|${d.aClass}|${d.air ? 'air' : 'ground'}|${d.boss ? 'boss' : ''}`);
    }
    matchOver = true; battleRunning = false;
    return { built, worstInCell, maxTouching,
      meanTouching: +(sumTouching / Math.max(1, framesSampled)).toFixed(1),
      distinctNames: names.size, distinctLooks: looks.size, roles: [...roles] };
  });

  console.log(`  a 20-creep wave against a ${out.built}-tower maze\n`);
  console.log('  OVERLAP');
  console.log(`    most bodies sharing one cell        ${out.worstInCell}`);
  console.log(`    pairs close enough to overlap, peak ${out.maxTouching}`);
  console.log(`    pairs close enough to overlap, mean ${out.meanTouching}`);
  console.log('\n  VARIETY');
  console.log(`    distinct creep NAMES in 40 waves    ${out.distinctNames}`);
  console.log(`    distinct APPEARANCES they resolve to ${out.distinctLooks}`);
  console.log(`    roles the art has to tell apart     ${out.roles.join(', ')}`);
  console.log('\n  ' + (out.worstInCell > 2 ? 'They do stack: bodies share cells and draw on top of each other.'
    : 'They are not stacking much; the problem is that they look alike.'));
  console.log('  ' + (out.distinctNames > out.distinctLooks
    ? `${out.distinctNames} named creeps share only ${out.distinctLooks} appearances — that is the art gap.`
    : 'every named creep already looks like itself'));
  if (errs.length) console.log('\nERRORS', errs.slice(0, 3));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
