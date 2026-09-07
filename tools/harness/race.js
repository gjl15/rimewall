/* What each element actually buys, tier by tier: damage per second per gold,
   reach, and how its special multiplies that. The point is to see a race's
   deficit as a number instead of a feeling.
   node tools/harness/race.js <url> [raceId,raceId...] */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';
const only = (process.argv[3] || '').split(',').filter(Boolean);

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  const out = await page.evaluate((only) => {
    const list = (only.length ? races.filter((r) => only.includes(r.id)) : races);
    /* How many bodies a shot actually touches. Single-target is 1; splash and
       pulses hit more, and that is the whole reason a low-damage tower can be
       fine. Radii come from splashSpec and TRAIT. */
    const reach = (sp) => {
      if (sp === 'splash') return 1 + Math.PI * 1.8 * 1.8 * .18 * .5;
      if (sp === 'smallsplash') return 1 + Math.PI * 1.2 * 1.2 * .18 * .4;
      if (sp === 'meteor' || sp === 'rocket') return 1 + Math.PI * 2.5 * 2.5 * .18 * .6;
      if (sp === 'frostnova') return 1 + Math.PI * 1.8 * 1.8 * .18 * .5;
      if (sp === 'chain') return 1 + .7 + .49 + .34;
      if (sp === 'splinter') return 1 + TRAIT.splinterMult;
      // gravity's area tiers: the lead creep in full and a capped few at a fraction
      if (sp === 'warppulse' || sp === 'repulse' || sp === 'liftoff' || sp === 'blackhole') {
        return 1 + TRAIT.gravPulseMult * TRAIT.gravPulseCap;
      }
      return 1;
    };
    return list.map((r) => {
      const prof = ATTACK_PROFILE[r.id] || { vs:{} };
      const cls = ['unarmored', 'light', 'medium', 'heavy', 'fortified'];
      const avgVs = cls.reduce((s, c) => s + (prof.vs[c] ?? 1), 0) / cls.length;
      const tiers = (TOWERS[r.id] || []).map((t, i) => {
        const dps = effectiveDps(t);
        const wide = dps * reach(t.special);
        return { i, name:t.name, cost:t.cost, dps:Math.round(dps), reach:+reach(t.special).toFixed(2),
          wide:Math.round(wide), gpd:+(t.cost / Math.max(1, wide)).toFixed(2), range:t.range, special:t.special };
      });
      const best = tiers.slice().sort((a, b) => a.gpd - b.gpd)[0];
      const avgGpd = +(tiers.reduce((s, t) => s + t.gpd, 0) / tiers.length).toFixed(2);
      const avgRange = +(tiers.reduce((s, t) => s + t.range, 0) / tiers.length).toFixed(1);
      return { race:r.name, avgVs:+avgVs.toFixed(2), avgGpd, avgRange, best:best.name, bestGpd:best.gpd,
        effGpd:+(avgGpd / avgVs).toFixed(2), tiers };
    }).sort((a, b) => a.effGpd - b.effGpd);
  }, only);
  const p = (s, n) => String(s).padEnd(n);
  console.log('gold per point of CROWD dps (dps x bodies touched), then adjusted for the armour matrix. Lower is stronger.');
  console.log(p('race', 14) + p('avg g/dps', 11) + p('avg vs', 8) + p('adjusted', 10) + p('avg range', 11) + 'best value tier');
  out.forEach((r) => console.log(p(r.race, 14) + p(r.avgGpd, 11) + p(r.avgVs, 8) + p(r.effGpd, 10) + p(r.avgRange, 11) + `${r.best} (${r.bestGpd})`));
  if (only.length) out.forEach((r) => {
    console.log(`\n${r.race}:`);
    r.tiers.forEach((t) => console.log('  ' + p('T' + t.i + ' ' + t.name, 24) + p(t.cost + 'g', 7) + p(t.dps + ' dps', 10) + p('x' + t.reach + ' bodies', 16) + p(t.wide + ' crowd', 12) + p(t.gpd + ' g/dps', 13) + p(t.range + ' rng', 9) + t.special));
  });
  if (errs.length) console.log('ERRORS', errs.slice(0, 4));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
