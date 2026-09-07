/* Did making air immune to splash break air?

   The worry is real: if a blast no longer reaches a flier, an element whose
   damage is mostly blast has nothing to shoot at one with, and an air wave
   becomes unanswerable rather than a puzzle. So measure it — for every rung of
   every element, damage dealt to a packed group of AIR creeps against the same
   group on the ground.

   Also counts how much air the game actually throws at you, because a weakness
   only matters as often as it is tested.
   node tools/harness/air.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1600);

  const out = await page.evaluate(() => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};

    const run = (raceId, tier, air, count) => {
      const N = count == null ? 9 : count;
      resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
      towers.clear(); towersVersion += 1; creeps.length = 0;
      const row = SOUTH_TOP + 6, col = 12;
      const t = makeTower(row, col, raceId, tier, 'player'); t.buildUntil = 0; addTower(t);
      const made = [];
      for (let i = 0; i < N; i += 1) {
        spawnCreep(waveDefFor(1), 'south', 'west');
        const c = creeps[creeps.length - 1];
        if (!c || made.includes(c)) break;
        c.hp = c.maxHp = 5e8; c.spd = 0; c.slowPct = 0; c.armor = 0; c.air = !!air;
        c.x = col + 1.2 + (i % 3) * 0.6; c.y = row - 0.9 + Math.floor(i / 3) * 0.6;
        made.push(c);
      }
      const before = made.map((c) => c.hp);
      for (let i = 0; i < 240; i += 1) simulate(1 / 30);
      const dealt = made.reduce((s, c, i) => s + Math.max(0, before[i] - c.hp), 0);
      const hit = made.filter((c, i) => before[i] - c.hp > 0.5).length;
      matchOver = true; battleRunning = false;
      return { dealt, hit };
    };

    const rows = races.map((r) => {
      const list = towerListFor(r.id);
      const tiers = list.map((def, i) => {
        const g = run(r.id, i, false), a = run(r.id, i, true);
        const g1 = run(r.id, i, false, 1), a1 = run(r.id, i, true, 1);
        return { name: def.name, cost: def.cost, groundOnly: !!def.groundOnly,
          ground: Math.round(g.dealt), air: Math.round(a.dealt),
          groundHit: g.hit, airHit: a.hit,
          ratio: g.dealt > 0 ? +(a.dealt / g.dealt).toFixed(2) : null,
          solo: g1.dealt > 0 ? +(a1.dealt / g1.dealt).toFixed(2) : null };
      });
      const usable = tiers.filter((t) => t.ratio != null);
      return { race: r.name, tiers,
        best: Math.max(...tiers.map((t) => t.ratio == null ? 0 : t.ratio)),
        soloMean: +(tiers.filter((t) => t.solo != null).reduce((s, t) => s + t.solo, 0) / Math.max(1, tiers.filter((t) => t.solo != null).length)).toFixed(2),
        mean: +(usable.reduce((s, t) => s + t.ratio, 0) / Math.max(1, usable.length)).toFixed(2) };
    });

    // how often does the game actually send air at you?
    let airWaves = 0;
    const airList = [];
    for (let w = 1; w <= WAVES.length; w += 1) {
      const d = waveDefFor(w);
      if (d.air) { airWaves += 1; airList.push(w + ':' + d.name); }
    }
    const airSends = SENDS.filter((s) => s.air).map((s) => s.name);
    return { rows, airWaves, airList, total: WAVES.length, airSends };
  });

  const p = (s, n) => String(s).padEnd(n);
  console.log('damage to a packed group of AIR creeps, as a share of the same group on the ground');
  console.log('(1.00 = air takes it just as hard; 0.00 = this element cannot touch a flier)\n');
  console.log('  ' + p('element', 14) + p('vs a FLOCK', 8) + p('vs ONE flier', 12) + p('best rung', 10) + 'per rung vs a flock');
  out.rows.forEach((r) => {
    const cells = r.tiers.map((t) => (t.ratio == null ? '—' : t.ratio.toFixed(2)) + (t.groundOnly ? '!' : '')).join('  ');
    console.log('  ' + p(r.race, 14) + p(r.mean.toFixed(2), 8) + p(r.soloMean.toFixed(2), 12) + p(r.best.toFixed(2), 10) + cells);
  });
  console.log('\n  ! = ground only, cannot target air at all');
  console.log('\n  air waves in the table: ' + out.airWaves + ' of ' + out.total + '  ' + out.airList.join(', '));
  console.log('  air sends: ' + (out.airSends.join(', ') || 'none'));
  const worst = out.rows.slice().sort((a, b) => a.best - b.best).slice(0, 3);
  console.log('\n  elements with the weakest answer to air: '
    + worst.map((r) => r.race + ' (best rung ' + r.best.toFixed(2) + ')').join(', '));
  if (errs.length) console.log('\nERRORS', errs.slice(0, 3));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
