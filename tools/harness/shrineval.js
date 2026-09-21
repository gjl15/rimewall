/* Is a shrine upgrade worth the lumber?

   Gene: "the send hp should never scale, otherwise theres no point in upgrading
   the shrine." The clock is gone, so the ladder is now the ONLY thing that makes
   a sender stronger — which only works if climbing it actually buys more
   pressure per gold than staying put.

   effHP is what a wall has to chew through: hit points divided by the class
   multiplier and the armour reduction, averaged over the eleven builders, so a
   fortified send is credited for being hard to hurt rather than just for its
   hit points. Divided by cost, that is the number a sender is really shopping
   for. If it is flat up the ladder the shrine is decoration; if it falls, the
   shrine is a trap.

   node tools/harness/shrineval.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 800 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  const out = await page.evaluate(() => {
    const hpScale = (typeof CREEP_HP_SCALE === 'number' ? CREEP_HP_SCALE : 1);
    const rate = (s) => {
      const hp = (s.hp || 1) * (s.bodies || 1) * TRAIT.hpScaleSend * hpScale;
      const armorCut = 1 - armorReduction(s.armor || 0);
      const eff = races.map((r) => {
        const mult = (ATTACK_PROFILE[r.id] || { vs:{} }).vs[s.aClass || 'medium'] ?? 1;
        return hp / Math.max(.05, mult * armorCut);
      }).sort((x, y) => x - y);
      /* MEDIAN, NOT MEAN. effHP is hit points divided by a multiplier, so the
         arithmetic mean of 1/mult is dominated by whichever builder is worst
         against the class — Tech meets fortified at 0.40, which alone doubles
         the average. Measured with the mean, every fortified rung was the best
         buy at every shrine level, which measured the tail and not the rung.
         The median builder is the one a sender is actually shopping against. */
      return eff[Math.floor(eff.length / 2)];
    };
    const rows = SENDS.filter((s) => !s.attacker).map((s) => ({
      id:s.id, name:s.name, shrine:s.shrine, cost:s.cost, income:s.income,
      aClass:s.aClass, air:!!s.air, bodies:s.bodies || 1,
      eff:Math.round(rate(s)),
      perGold:rate(s) / Math.max(1, s.cost),
      payback:s.cost / Math.max(1, s.income),          // income ticks to repay itself
    }));
    const byShrine = {};
    rows.forEach((r) => { (byShrine[r.shrine] = byShrine[r.shrine] || []).push(r); });
    const levels = Object.keys(byShrine).sort((a, b) => a - b).map((sh) => {
      const list = byShrine[sh];
      const best = list.slice().sort((a, b) => b.perGold - a.perGold)[0];
      return { shrine:Number(sh), n:list.length,
        meanPerGold:list.reduce((s, r) => s + r.perGold, 0) / list.length,
        bestPerGold:best.perGold, bestName:best.name, bestCost:best.cost,
        ceiling:Math.max(...list.map((r) => r.eff)),
        meanPayback:list.reduce((s, r) => s + r.payback, 0) / list.length };
    });
    return { rows, levels, lumberPrice:LUMBER_PRICE };
  });

  const p = (s, n) => String(s).padEnd(n);
  const f = (n, d = 2) => n.toFixed(d);
  console.log(`a shrine level costs 1 lumber (${out.lumberPrice}g)\n`);
  console.log('  ' + p('shrine', 9) + p('sends', 7) + p('effHP/gold', 13) + p('best rung', 22)
    + p('at', 9) + p('ceiling effHP', 15) + 'payback');
  out.levels.forEach((L) => console.log('  ' + p('L' + L.shrine, 9) + p(L.n, 7) + p(f(L.meanPerGold), 13)
    + p(L.bestName, 22) + p(L.bestCost + 'g', 9) + p(Math.round(L.ceiling).toLocaleString(), 15)
    + f(L.meanPayback, 1) + ' ticks'));

  if (process.argv.includes('--rungs')) {
    console.log('\n  ' + p('rung', 22) + p('shrine', 8) + p('cost', 9) + p('income', 8)
      + p('class', 11) + p('effHP', 11) + 'effHP/gold');
    out.rows.slice().sort((a, b) => a.shrine - b.shrine || a.cost - b.cost).forEach((r) => console.log('  '
      + p(r.name + (r.air ? ' (air)' : '') + (r.bodies > 1 ? ' x' + r.bodies : ''), 22)
      + p('L' + r.shrine, 8) + p(r.cost + 'g', 9) + p('+' + r.income, 8) + p(r.aClass, 11)
      + p(r.eff.toLocaleString(), 11) + f(r.perGold)));
  }

  const first = out.levels[0], last = out.levels[out.levels.length - 1];
  const climb = last.meanPerGold / Math.max(.0001, first.meanPerGold);
  console.log(`\n  effHP per gold, L${first.shrine} -> L${last.shrine}:  ${f(first.meanPerGold)} -> ${f(last.meanPerGold)}   (${f(climb)}x)`);
  console.log(`  ceiling a sender can put on the board:    ${Math.round(first.ceiling).toLocaleString()} -> ${Math.round(last.ceiling).toLocaleString()}`);

  /* THE VERDICT THE MODE RESTS ON. With the growth clock removed the shrine is
     the only thing that makes a sender stronger, so a ladder that does not pay
     per gold as it climbs leaves Classic exactly where it was. */
  const rising = out.levels.every((L, i) => i === 0 || L.meanPerGold >= out.levels[i - 1].meanPerGold * .9);
  console.log('\n  ' + (climb >= 1.15 && rising
    ? 'PASS — climbing the shrine buys more pressure per gold, so lumber has a job'
    : climb >= 1.15 ? 'MIXED — the top is better value than the bottom, but not monotonically'
    : 'FAIL — a higher shrine is not better value per gold; the upgrade is decoration'));
  if (errs.length) console.log('\nERRORS', errs.slice(0, 3));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
