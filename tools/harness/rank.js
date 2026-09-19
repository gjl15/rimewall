/* Do towers earn rank, and only once there is nothing left to buy?

   Gene: "Tower kills or hits after max lvl up will earn exp to lvl further ...
   These lvls are less impactful than the ones you purchase. 1% increase per lvl
   from gaining exp from hits/kills rather than the 10% from the first few
   purchasable lvls."

   Three things worth holding the engine to: a tower with levels still to buy
   earns nothing, a maxed one earns from both hits and kills, and a rank is worth
   far less than a level so this never becomes the real power curve.
   node tools/harness/rank.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1800);

  const out = await page.evaluate(() => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};

    // a tower that still has levels to buy, fighting hard, must earn nothing
    const fight = (maxOut) => {
      resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
      towers.clear(); towersVersion += 1; creeps.length = 0;
      player.gold = 1e7;
      const row = SOUTH_TOP + 6, col = 12;
      const t = makeTower(row, col, 'ice', 2, 'player');
      t.buildUntil = 0; addTower(t);
      if (maxOut) while (canLevel(t)) t.level += 1;
      let killed = 0;
      for (let wave = 0; wave < 40; wave += 1) {
        spawnCreep(waveDefFor(2), 'south', 'west');
        const c = creeps[creeps.length - 1];
        c.spd = 0; c.x = col + 1; c.y = row;
        for (let i = 0; i < 90 && c.hp > 0; i += 1) simulate(1 / 30);
        if (c.hp <= 0) killed += 1;
      }
      const tw = towers.get(t.key) || t;
      matchOver = true; battleRunning = false;
      return { level: tw.level, rank: towerRank(tw), xp: Math.round(tw.xp || 0), kills: tw.kills, killed };
    };

    const notMaxed = fight(false);
    const maxed = fight(true);

    // and what a rank is worth against what a level is worth
    const def = towerDef('ice', 2);
    const base0 = def.dmg;
    const perLevel = Math.round(base0 * levelDmgStep('ice'));
    const perRank = Math.round(base0 * RANK_DMG);
    return { notMaxed, maxed, base: base0, perLevel, perRank,
      rankDmg: RANK_DMG, rankMax: RANK_MAX, need0: rankNeed(0) };
  });

  const p = (s, n) => String(s).padEnd(n);
  console.log('an Ice T2 holding a lane against 40 creeps\n');
  console.log('  ' + p('', 22) + p('level', 8) + p('kills', 8) + p('xp', 8) + 'rank');
  console.log('  ' + p('levels still to buy', 22) + p(out.notMaxed.level, 8) + p(out.notMaxed.kills, 8) + p(out.notMaxed.xp, 8) + out.notMaxed.rank);
  console.log('  ' + p('fully upgraded', 22) + p(out.maxed.level, 8) + p(out.maxed.kills, 8) + p(out.maxed.xp, 8) + out.maxed.rank);
  console.log('\n  a bought level is worth ' + out.perLevel + ' damage; an earned rank is worth ' + out.perRank
    + ' (' + Math.round(out.rankDmg * 100) + '%), capped at ' + out.rankMax);
  console.log('  first rank costs ' + out.need0 + ' xp');

  const ok = out.notMaxed.rank === 0 && out.notMaxed.xp === 0
    && out.maxed.rank > 0 && out.maxed.kills > 0;
  console.log('\n' + (ok
    ? 'PASS — nothing earned while levels remain; a finished tower ranks up from hits and kills'
    : 'FAIL'));
  if (errs.length) { console.log('ERRORS', errs.slice(0, 3)); process.exit(1); }
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
