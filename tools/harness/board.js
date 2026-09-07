/* Does the board actually resize for a solo match, and does the bigger one stay
   inside the three budgets the changelog set — a readable cell on a phone, an
   A* that does not freeze a build, and a comb row you can afford?
   node tools/harness/board.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 250)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(700);

  const measure = (page, key) => page.evaluate((key) => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    rebuildBoard(key);
    if (!canvasesReady) { setupCanvasesOnce(); }
    buildBaseTerrain(); applySavedSketchToTerrain();
    // A*: the cost that gates board size, since a build re-paths every creep
    const t0 = performance.now();
    let ok = 0;
    for (let i = 0; i < 8; i += 1) { if (routeLength('south', i % 2 ? 'east' : 'west') != null) ok += 1; }
    const astar = (performance.now() - t0) / 8;
    // one comb row: how many towers it takes to wall the board across
    const maze = mazeOrderSouth();
    const rows = {};
    maze.forEach((c) => { rows[c.r] = (rows[c.r] || 0) + 1; });
    const combRow = Math.max(...Object.values(rows));
    // sim cost
    const t1 = performance.now();
    for (let i = 0; i < 60; i += 1) simulate(1 / 30);
    const simStep = (performance.now() - t1) / 60;
    return { key, cols:COLS, rows:ROWS, cell:CELL, buildable:maze.length, combRow,
      astar:+astar.toFixed(2), simStep:+simStep.toFixed(3),
      econ:+ECON_SCALE.toFixed(2), startGold:START_GOLD, baseIncome:BASE_INCOME,
      routesOpen:ok, cellOnPhone:+(390 / COLS).toFixed(1) };
  }, key);

  const normal = await measure(page, 'normal');
  const solo = await measure(page, 'solo');
  const back = await measure(page, 'normal');
  const p = (s, n) => String(s).padEnd(n);
  console.log(p('board', 9) + p('cols x rows', 14) + p('cell', 6) + p('phone px', 10) + p('buildable', 11) + p('comb row', 10) + p('A* ms', 8) + p('sim ms', 9) + p('econ', 6) + p('start g', 9) + 'routes open');
  [normal, solo, back].forEach((r) => console.log(
    p(r.key, 9) + p(`${r.cols} x ${r.rows}`, 14) + p(r.cell, 6) + p(r.cellOnPhone, 10) + p(r.buildable, 11)
    + p(r.combRow, 10) + p(r.astar, 8) + p(r.simStep, 9) + p(r.econ, 6) + p(r.startGold, 9) + `${r.routesOpen}/8`));
  console.log('\nbudgets: A* under ~8ms (a build re-paths every creep), sim under ~1ms a step, all 8 routes open.');
  // compare the SHAPE, not the timings, which are noise
  const shape = (r) => JSON.stringify([r.cols, r.rows, r.cell, r.buildable, r.combRow, r.econ, r.startGold, r.baseIncome, r.routesOpen]);
  console.log('resize is reversible:', shape(normal) === shape(back) ? 'yes — identical board after going there and back' : 'NO — state leaked: ' + shape(normal) + ' vs ' + shape(back));
  if (errs.length) console.log('ERRORS', errs.slice(0, 6)); else console.log('no page errors');
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 400)); process.exit(1); });
