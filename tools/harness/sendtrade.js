/* Does a nastier send actually pay you less?

   Gene: "in the original and what we had more aggressive sends cost more but had
   less income, that was the point like for example the air towers gave less
   income, thats the intent."

   That is the ladder's whole trade, so it is worth checking the table keeps it
   rather than assuming. Two questions:

     1. does payback get WORSE as you climb the shrine — is pressure bought at
        the cost of economy, or is it just the same deal at a bigger scale?
     2. do the awkward kinds — air, fortified, swarms, the role-carriers — pay
        less per gold than an ordinary body of the same price?

   A rung that is both hard to answer AND good economy is a free lunch, and the
   whole point of the ladder is that there is not one.

   node tools/harness/sendtrade.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 800 } })).newPage();
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);

  const out = await page.evaluate(() => {
    const econ = SENDS.filter((s) => !s.attacker).map((s) => ({
      name:s.name, shrine:s.shrine, cost:s.cost, income:s.income,
      air:!!s.air, aClass:s.aClass, role:s.role || '', bodies:s.bodies || 1,
      perGold: s.income / Math.max(1, s.cost),           // income bought per gold
      payback: s.cost / Math.max(1, s.income),           // ticks to repay
    }));
    const byShrine = {};
    econ.forEach((s) => { (byShrine[s.shrine] = byShrine[s.shrine] || []).push(s); });
    const levels = Object.keys(byShrine).sort((a, b) => a - b).map((k) => {
      const list = byShrine[k];
      return { shrine:Number(k), n:list.length,
        payback: list.reduce((a, b) => a + b.payback, 0) / list.length,
        perGold: list.reduce((a, b) => a + b.perGold, 0) / list.length };
    });

    /* The awkward kinds against the plain ones, like for like on nothing but
       "is this annoying to answer". */
    const mean = (f) => { const l = econ.filter(f); return l.length
      ? { n:l.length, perGold:l.reduce((a, b) => a + b.perGold, 0) / l.length,
          payback:l.reduce((a, b) => a + b.payback, 0) / l.length } : null; };
    const kinds = {
      'air':            mean((s) => s.air),
      'ground':         mean((s) => !s.air),
      'fortified':      mean((s) => s.aClass === 'fortified'),
      'unarmored':      mean((s) => s.aClass === 'unarmored'),
      'carries a role': mean((s) => !!s.role),
      'plain body':     mean((s) => !s.role && s.bodies === 1),
    };
    return { levels, kinds, econ };
  });

  const p = (s, n) => String(s).padEnd(n);
  const f = (n, d = 2) => n.toFixed(d);

  console.log('1. DOES CLIMBING COST YOU ECONOMY?\n');
  console.log('  ' + p('shrine', 9) + p('sends', 7) + p('income per gold', 18) + 'ticks to repay');
  out.levels.forEach((L) => console.log('  ' + p('L' + L.shrine, 9) + p(L.n, 7)
    + p(f(L.perGold, 4), 18) + f(L.payback, 1)));
  const first = out.levels[0], last = out.levels[out.levels.length - 1];
  const worse = last.payback > first.payback * 1.15;
  console.log('\n  ' + (worse
    ? `yes — L${first.shrine} repays in ${f(first.payback, 1)} ticks, L${last.shrine} in ${f(last.payback, 1)}. Pressure is bought with economy.`
    : `NO — L${first.shrine} ${f(first.payback, 1)} ticks vs L${last.shrine} ${f(last.payback, 1)}. The ladder is the same deal at a bigger scale.`));

  console.log('\n2. DO THE AWKWARD KINDS PAY LESS?\n');
  console.log('  ' + p('kind', 18) + p('sends', 7) + p('income per gold', 18) + 'ticks to repay');
  Object.keys(out.kinds).forEach((k) => { const v = out.kinds[k]; if (!v) return;
    console.log('  ' + p(k, 18) + p(v.n, 7) + p(f(v.perGold, 4), 18) + f(v.payback, 1)); });

  const airWorse = out.kinds.air && out.kinds.ground && out.kinds.air.perGold < out.kinds.ground.perGold;
  console.log('\n  air vs ground: ' + (airWorse
    ? `air pays ${f((1 - out.kinds.air.perGold / out.kinds.ground.perGold) * 100, 0)}% less income per gold — the intent holds`
    : 'AIR PAYS AS WELL AS OR BETTER THAN GROUND — the intent does not hold on this table'));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
