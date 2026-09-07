/* Per-tier value, so an average can be read for WHERE it comes from.
   race.js reports one number a race; when that number is an outlier the useful
   question is whether the whole ladder is off or one rung is dragging it.
   node tools/harness/tiers.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  const out = await page.evaluate(() => {
    const CROWD = { splash: 3, smallsplash: 2.2, meteor: 3.5, chain: 3, forkbolt: 2.5, warppulse: 3, repulse: 3,
      liftoff: 3, blackhole: 3, machinegun: 1, laser: 1, shards: 2.5, quake: 3, tremor: 3, spores: 2.5, cloud: 3 };
    /* A tower bought to STOP a creep is not a tower bought to damage it.
       Entangle and paralyze are deterministic holds — the whole point of the
       rung — and they carry near-zero damage on purpose. Averaging their
       gold-per-dps into a race's damage score is meaningless, and it is what
       made Earth (42.5 on one rung) and Stone (35) read as 12x worse value than
       Fire when their damage ladders are actually fine. Score them apart. */
    const CONTROL = ['entangle', 'paralyze', 'pause', 'stasis'];
    return races.map((r) => ({
      race: r.name,
      tiers: towerListFor(r.id).map((t, i) => {
        const dps = (t.dmg || 0) / Math.max(0.05, t.cd || 1);
        const bodies = CROWD[t.special] || 1;
        return { i, name: t.name, cost: t.cost, dps: +dps.toFixed(1), bodies, control: CONTROL.includes(t.special),
          gpd: dps * bodies > 0 ? +(t.cost / (dps * bodies)).toFixed(2) : null, sp: t.special || '-' };
      }),
    }));
  });
  const p = (s, n) => String(s).padEnd(n);
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const rank = [];
  out.forEach((r) => {
    const all = r.tiers.map((t) => t.gpd).filter((v) => v != null);
    const dmg = r.tiers.filter((t) => !t.control).map((t) => t.gpd).filter((v) => v != null);
    rank.push({ race: r.race, raw: mean(all), fixed: mean(dmg), ctrl: r.tiers.filter((t) => t.control).length });
    if (!process.argv.includes('--table')) return;
    console.log('\n' + r.race.toUpperCase() + '   damage-ladder g/dps ' + mean(dmg).toFixed(2) + '  (counting control rungs: ' + mean(all).toFixed(2) + ')');
    console.log('  ' + p('tier', 6) + p('tower', 22) + p('cost', 8) + p('dps', 9) + p('bodies', 8) + p('g/dps', 8) + 'special');
    r.tiers.forEach((t) => console.log('  ' + p('T' + t.i, 6) + p(t.name, 22) + p(t.cost + 'g', 8) + p(t.dps, 9) + p(t.bodies + 'x', 8) + p(t.gpd, 8) + t.sp + (t.control ? '   <- control, not damage' : '')));
  });
  console.log('\ngold per point of crowd dps, DAMAGE RUNGS ONLY. Lower is stronger.');
  console.log('  ' + p('race', 14) + p('damage ladder', 16) + p('all rungs', 12) + 'control rungs excluded');
  rank.sort((a, b) => a.fixed - b.fixed).forEach((r) => console.log('  ' + p(r.race, 14) + p(r.fixed.toFixed(2), 16) + p(r.raw.toFixed(2), 12) + (r.ctrl || '')));
  const f = rank.map((r) => r.fixed);
  console.log('  spread best to worst: ' + (Math.max(...f) / Math.min(...f)).toFixed(2) + 'x   (was ' + (Math.max(...rank.map((r) => r.raw)) / Math.min(...rank.map((r) => r.raw))).toFixed(1) + 'x counting control rungs)');
  if (errs.length) console.log('\nERRORS', errs.slice(0, 3));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
