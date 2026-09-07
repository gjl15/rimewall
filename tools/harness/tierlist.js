/* The tier list, built from measurements rather than opinion.

   Four axes, each one measured elsewhere in this harness and pulled together
   here so a ranking can be argued with:
     VALUE    gold per point of crowd dps, armour-matrix adjusted (race.js),
              scored on damage rungs only — a control tower like Petrifier or
              Bramble Speck is not a bad damage tower, it is a different thing.
     CROWD    what it costs to buy your first tower that damages more than one
              creep, measured by standing it beside a packed lane (crowd.js).
     REACH    mean range across the ladder — the compensator Tech and Beam are
              paid in for their poor gold-per-dps.
     LASTS    death wave in the ten-race regression (regress.js). Weakest of the
              four: that bot builds ~22 towers and barely leaves tier 1, so it
              under-reads any element whose answer lives higher up the ladder.
   node tools/harness/tierlist.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

// from tools/harness/regress.js on this build
const DIED = { Ice: 11, Fire: 15, Earth: 12, Tech: 11, Crystal: 14, Poison: 13, Stone: 11, Electricity: 14, Gravity: 11, Beam: 13 };

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1600);

  const rows = await page.evaluate(() => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};
    const CONTROL = ['entangle', 'paralyze', 'pause', 'stasis'];

    // measured: how many creeps one tower touches, by watching HP fall
    const bodies = (raceId, tier) => {
      resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
      towers.clear(); towersVersion += 1; creeps.length = 0;
      const row = SOUTH_TOP + 6, col = 12;
      const t = makeTower(row, col, raceId, tier, 'player'); t.buildUntil = 0; addTower(t);
      const made = [];
      for (let i = 0; i < 9; i += 1) {
        spawnCreep(waveDefFor(1), 'south', 'west');
        const c = creeps[creeps.length - 1];
        if (!c || made.includes(c)) break;
        c.hp = c.maxHp = 5e8; c.spd = 0; c.slowPct = 0; c.armor = 0;
        c.x = col + 1.2 + (i % 3) * 0.6; c.y = row - 0.9 + Math.floor(i / 3) * 0.6;
        made.push(c);
      }
      const before = made.map((c) => c.hp);
      for (let i = 0; i < 240; i += 1) simulate(1 / 30);
      const n = made.filter((c, i) => before[i] - c.hp > 0.5).length;
      matchOver = true; battleRunning = false;
      return n;
    };

    return races.map((r) => {
      const list = towerListFor(r.id);
      const own = list.slice(0, list.length - 1);          // drop the shared Laser Cannon rung
      const prof = ATTACK_PROFILE[r.id] || { vs: {} };
      const cls = ['unarmored', 'light', 'medium', 'heavy', 'fortified'];
      const avgVs = cls.reduce((s, c) => s + (prof.vs[c] ?? 1), 0) / cls.length;
      const hits = own.map((_, i) => bodies(r.id, i));
      const dmgRungs = own.map((t, i) => ({ t, i })).filter(({ t }) => !CONTROL.includes(t.special));
      const gpd = dmgRungs.map(({ t, i }) => {
        const dps = (t.dmg || 0) / Math.max(0.05, t.cd || 1);
        return t.cost / Math.max(1, dps * Math.max(1, hits[i]));
      });
      const firstCrowd = own.findIndex((_, i) => hits[i] >= 2);
      return { race: r.name,
        value: +((gpd.reduce((a, b) => a + b, 0) / gpd.length) / avgVs).toFixed(2),
        crowdAt: firstCrowd < 0 ? null : own[firstCrowd].cost,
        widest: Math.max(...hits),
        reach: +(own.reduce((s, t) => s + t.range, 0) / own.length).toFixed(1) };
    });
  });

  rows.forEach((r) => { r.died = DIED[r.race] ?? null; });
  // normalise each axis to 0..1 where 1 is best, then weight
  const span = (get, lowerBetter) => {
    const vals = rows.map(get).filter((v) => v != null && isFinite(v));
    const lo = Math.min(...vals), hi = Math.max(...vals);
    return (v) => { if (v == null || !isFinite(v)) return 0; const t = hi === lo ? .5 : (v - lo) / (hi - lo); return lowerBetter ? 1 - t : t; };
  };
  const nValue = span((r) => r.value, true);
  const nCrowd = span((r) => (r.crowdAt == null ? 400 : r.crowdAt), true);
  const nReach = span((r) => r.reach, false);
  const nLasts = span((r) => r.died, false);
  rows.forEach((r) => {
    r.score = +(nValue(r.value) * .35 + nCrowd(r.crowdAt == null ? 400 : r.crowdAt) * .25
      + nReach(r.reach) * .15 + nLasts(r.died) * .25).toFixed(3);
  });
  rows.sort((a, b) => b.score - a.score);
  const tierOf = (i) => (i < 2 ? 'S' : i < 5 ? 'A' : i < 8 ? 'B' : 'C');

  const p = (s, n) => String(s).padEnd(n);
  console.log('RIMEWALL TIER LIST — measured, weighted value .35 / crowd access .25 / survival .25 / reach .15\n');
  console.log('  ' + p('', 4) + p('element', 13) + p('g per crowd dps', 17) + p('crowd from', 12) + p('widest', 8) + p('reach', 7) + p('lasts to', 9) + 'score');
  let last = '';
  rows.forEach((r, i) => {
    const tier = tierOf(i);
    console.log('  ' + p(tier === last ? '' : tier + ' →', 4) + p(r.race, 13)
      + p(r.value.toFixed(2), 17) + p(r.crowdAt == null ? 'never' : r.crowdAt + 'g', 12)
      + p(r.widest, 8) + p(r.reach, 7) + p('wave ' + (r.died ?? '?'), 9) + r.score.toFixed(2));
    last = tier;
  });
  console.log('\n  Survival is the softest column: the regression bot barely leaves tier 1,');
  console.log('  so it under-reads any element whose real answer is higher up the ladder.');
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
