/* Do the attacker sends actually take a wall down, and cost what they say?

   Gene: "as the game progresses attackers should be another very expensive and
   lumber included send item with zero income." Two things to prove: the lumber
   is really required and really spent with no income granted, and the creep
   goes after towers instead of filing past them.
   node tools/harness/attacker.js <url> */
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
    const list = SENDS.filter((s) => s.attacker).map((s) => ({ id: s.id, name: s.name, cost: s.cost, lumber: s.lumber, income: s.income, breakPower: s.breakPower, shrine: s.shrine }));

    // the economy half: buying one must cost lumber and grant no income
    player.shrine = 5; player.gold = 1e6; player.lumber = 5; player.income = 400;
    renderSendPanel();
    const before = { gold: player.gold, lumber: player.lumber, income: player.income };
    document.querySelector('[data-send="breaker"]')?.click();
    const after = { gold: player.gold, lumber: player.lumber, income: player.income };

    // refuse when the lumber is not there
    player.lumber = 0;
    const lumberBefore = player.gold;
    document.querySelector('[data-send="breaker"]')?.click();
    const refusedWithoutLumber = player.gold === lumberBefore;

    // the behaviour half: an attacker walks into a maze and breaks it
    resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
    towers.clear(); towersVersion += 1; creeps.length = 0;
    /* Put the wall where the creep actually WALKS. A row of towers picked by
       eye sat 37 cells off its lane, so the attacker strolled to the end and
       leaked — which the test then reported as "it walked past". Spawn it,
       let it get onto the route, then build beside the cells it is heading for. */
    const def = sendCreepDef(SENDS.find((s) => s.id === 'ruiner'));
    spawnCreep(def, 'south', 'west');
    const atk = creeps[creeps.length - 1];
    atk.hp = atk.maxHp = 5e8;
    // walk it until it is actually inside the rows a player can build on
    for (let i = 0; i < 60 * 30 && !isPlayerBuildRow(Math.round(atk.y - .5)); i += 1) simulate(1 / 30);
    const mine = [];
    {
      const cr = Math.round(atk.y - .5), cc = Math.round(atk.x - .5);
      for (let dr = -1; dr <= 3 && mine.length < 8; dr += 1) {
        for (let dc = -2; dc <= 2 && mine.length < 8; dc += 1) {
          const r = cr + dr, c = cc + dc;
          if (!inBounds(r, c) || towers.has(idx(r, c))) continue;
          if (terrainAt(r, c) !== T.FLOOR || !isPlayerBuildRow(r) || protectedCells.has(idx(r, c))) continue;
          const t = makeTower(r, c, 'stone', 0, 'player');
          t.buildUntil = 0; addTower(t);
          if (!routesAreOpen()) { removeTower(idx(r, c)); continue; }
          mine.push(t.key);
        }
      }
    }
    const towersBefore = mine.filter((k) => towers.has(k)).length;
    const isAttacker = !!atk.attacker, power = atk.breakPower;
    for (let i = 0; i < 90 * 30 && mine.some((k) => towers.has(k)); i += 1) simulate(1 / 30);
    const towersAfter = mine.filter((k) => towers.has(k)).length;
    const diag = { state: atk.state, hp: Math.round(atk.hp), alive: atk.hp > 0,
      x: +atk.x.toFixed(1), y: +atk.y.toFixed(1), half: atk.half,
      inList: creeps.includes(atk),
      nearestTowerDist: Math.min(...mine.filter((k) => towers.has(k)).map((k) => { const t = towers.get(k); return Math.hypot(t.c + .5 - atk.x, t.r + .5 - atk.y); })) };
    matchOver = true; battleRunning = false;

    return { list, before, after, refusedWithoutLumber, isAttacker, power, towersBefore, towersAfter, diag };
  });

  console.log('attacker sends on the ladder:');
  out.list.forEach((s) => console.log('  ' + s.name.padEnd(15) + s.cost + 'g + ' + s.lumber + ' lumber   income ' + s.income
    + '   ' + s.breakPower + ' hits a swing   shrine ' + s.shrine));
  console.log('\nbuying a Wallbreaker');
  console.log('  gold   ' + out.before.gold.toLocaleString() + ' -> ' + out.after.gold.toLocaleString());
  console.log('  lumber ' + out.before.lumber + ' -> ' + out.after.lumber + (out.after.lumber < out.before.lumber ? '   (spent)' : '   *** lumber not taken ***'));
  console.log('  income ' + out.before.income + ' -> ' + out.after.income + (out.after.income === out.before.income ? '   (none granted)' : '   *** it paid income ***'));
  console.log('  refused when you have no lumber: ' + out.refusedWithoutLumber);
  console.log('\na Siege Ruiner walking into a 10-tower wall');
  console.log('  flagged as an attacker: ' + out.isAttacker + '   swing power: ' + out.power);
  console.log('  towers standing: ' + out.towersBefore + ' -> ' + out.towersAfter
    + (out.towersAfter < out.towersBefore ? '   (it broke the wall)' : '   *** it walked past ***'));
  console.log('  creep at the end: ' + JSON.stringify(out.diag));
  const ok = out.after.lumber < out.before.lumber && out.after.income === out.before.income
    && out.refusedWithoutLumber && out.isAttacker && out.towersAfter < out.towersBefore;
  console.log('\n' + (ok ? 'PASS' : 'FAIL'));
  if (errs.length) console.log('ERRORS', errs.slice(0, 3));
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
