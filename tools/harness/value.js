/* Damage per gold, which is the only number a tier list can honestly rest on.

   matrix.js measures what leaves a creep. It cannot rank races, because a
   Petrifier costs 350g and a Bolt Turret costs 8 — averaging their dps compares
   two different purchases. This divides by price, and weights the armour
   classes by how often a defender actually meets them rather than treating
   fortified as one sixth of the game when the wave table barely uses it.

   It also reports the SPREAD across classes, which is a race's real character:
   a flat race is reliable, a spiky one needs a second element to cover it.
   node tools/harness/value.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1800);

  const out = await page.evaluate(() => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};

    /* HOW OFTEN YOU ACTUALLY MEET EACH CLASS, counted off the wave table itself
       rather than assumed. A race weak to a class that barely appears is not
       weak; a race weak to the class half the waves are made of is. */
    const met = { unarmored:0, light:0, medium:0, heavy:0, fortified:0 };
    let airShare = 0, waves = 0;
    for (let n = 1; n <= 40; n += 1) {
      const d = waveDefFor(n); if (!d) continue;
      waves += 1;
      if (d.aClass && met[d.aClass] !== undefined) met[d.aClass] += 1;
      if (d.air) airShare += 1;
    }
    const total = Object.values(met).reduce((a, b) => a + b, 0) || 1;
    const weight = {}; Object.keys(met).forEach((k) => { weight[k] = met[k] / total; });
    const airW = airShare / Math.max(1, waves);

    const TARGETS = [
      { key:'unarmored', aClass:'unarmored', armor:0,  air:false },
      { key:'light',     aClass:'light',     armor:4,  air:false },
      { key:'medium',    aClass:'medium',    armor:9,  air:false },
      { key:'heavy',     aClass:'heavy',     armor:16, air:false },
      { key:'fortified', aClass:'fortified', armor:20, air:false },
      { key:'air',       aClass:'light',     armor:6,  air:true },
    ];
    const CREEP_HP = 3000, SECONDS = 20;
    /* PRICE AND DAMAGE HAVE TO BE TAKEN AT THE SAME LEVEL. This priced every
       rung at its ceiling and then measured a LEVEL 0 tower, which is only
       harmless while every race has the same number of levels. The moment Tech
       went to six levels like a weapon rack, its all-in price tripled and its
       measured damage did not move — it read 0.068 and last by a factor of two,
       which measured the harness. The tower is levelled to its own ceiling
       before it fires. */
    const measure = (raceId, tier, target) => {
      resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
      towers.clear(); towersVersion += 1; creeps.length = 0;
      const row = SOUTH_TOP + 6, col = 12;
      const t = makeTower(row, col, raceId, tier, 'player');
      t.level = towerMaxLevel(t);
      t.buildUntil = 0; addTower(t);
      spawnCreep(waveDefFor(4), 'south', 'west');
      const c = creeps[creeps.length - 1];
      c.hp = c.maxHp = CREEP_HP; c.spd = 0; c.slowPct = 0;
      c.aClass = target.aClass; c.armor = target.armor; c.air = target.air;
      c.x = col + 1.3; c.y = row;
      let frames = 0; const cap = SECONDS * 30;
      while (frames < cap && c.hp > 0) { simulate(1 / 30); frames += 1; }
      const dealt = CREEP_HP - Math.max(0, c.hp);
      matchOver = true; battleRunning = false;
      return dealt / (frames / 30);
    };

    return races.map((r) => {
      const list = towerListFor(r.id);
      const own = list.slice(0, list.length - 1);   // drop the shared Bulwark rung (the Laser capstone is gone)
      const rungs = own.map((def, i) => {
        const dps = {}; TARGETS.forEach((tg) => { dps[tg.key] = measure(r.id, i, tg); });
        /* Weighted by what the wave table sends, air folded in at its own share. */
        const ground = Object.keys(weight).reduce((s, k) => s + dps[k] * weight[k], 0);
        const blended = ground * (1 - airW) + dps.air * airW;
        /* SPREAD MUST IGNORE WHAT A TOWER CANNOT HIT BY DESIGN. Dividing by a
           groundOnly rung's zero against air read Poison at 3,706x and Tech at
           982x — which measured the ground-only flag, not the race's character.
           groundOnly is reported on its own line instead. */
        const vals = TARGETS.filter((tg) => !(def.groundOnly && tg.air)).map((tg) => dps[tg.key]);
        /* ALL-IN PRICE, NOT STICKER PRICE. A ninja blade is five gold and a
           Petrifier is three hundred and fifty, so sticker price compares two
           different purchases: measured at sticker, Ninja read 11.49 dmg/gold
           against a field whose next best was 1.69. What you actually buy is a
           tower AT ITS CEILING, so the levels are priced in the way the game
           prices them — towerLevelCost compounds with the level already held. */
        const maxL = def.maxLevel || MAX_LEVEL;
        const step = def.levelCost || def.cost * .4;
        let allIn = def.cost;
        for (let L = 0; L < maxL; L += 1) allIn += Math.max(5, Math.ceil(step * (L + 1)));
        return { tier:i, name:def.name, cost:def.cost, allIn, dps, blended,
          groundOnly: !!def.groundOnly, range: def.range,
          perGold: blended / Math.max(1, allIn),
          spread: Math.max(...vals) / Math.max(.01, Math.min(...vals)) };
      });
      const best = rungs.slice().sort((a, b) => b.perGold - a.perGold)[0];
      const mean = (f) => rungs.reduce((s, x) => s + f(x), 0) / rungs.length;
      return { race:r.name, id:r.id,
        perGold: mean((x) => x.perGold), best,
        spread: mean((x) => x.spread),
        reach: mean((x) => x.range),
        groundOnly: rungs.filter((x) => x.groundOnly).map((x) => x.name),
        openerCost: rungs[0].cost, capstoneCost: rungs[rungs.length - 1].cost,
        rungs };
    }).sort((a, b) => b.perGold - a.perGold);
  });

  const p = (s, n) => String(s).padEnd(n);
  const f = (n, d = 2) => n.toFixed(d);
  console.log('DAMAGE PER GOLD AT THE CEILING, weighted by the classes the wave table sends\n');
  console.log('  ' + p('race', 14) + p('dmg/gold', 11) + p('spread', 8) + p('reach', 7) + p('best buy', 22) + p('all-in', 9) + 'opener');
  out.forEach((r) => console.log('  ' + p(r.race, 14) + p(f(r.perGold, 3), 11) + p(f(r.spread, 1) + 'x', 8)
    + p(f(r.reach, 1), 7) + p(r.best.name, 22) + p(r.best.allIn + 'g', 9) + r.openerCost + 'g'));

  console.log('\n  dmg/gold prices every rung AT MAX LEVEL, the way you actually buy one —');
  console.log('  sticker price compares a 5g ninja blade against a 350g Petrifier.');
  console.log('  spread is best armour class over worst, averaged across the rungs:');
  console.log('  a flat race is reliable, a spiky one needs a second element to cover it.');
  console.log('  reach is mean range — the compensator a low-damage race is paid in.');
  const go = out.filter((r) => r.groundOnly.length);
  if (go.length) console.log('\n  ground only (cannot hit air at all): '
    + go.map((r) => r.race + ' ' + r.groundOnly.join('/')).join(', '));
  if (errs.length) console.log('\nERRORS', errs.slice(0, 3));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
