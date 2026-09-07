/* Towers must take MORE punishment than they used to, never less.

   Gene: "if we are including attackers we need the hp to be longer or take more
   attacks not less than what we had for blocked builds, the towers should have
   hp and the attack dmg should be clearly labeled so a strategy down the line
   could be reserving the front row for towers that have a lot of hp."

   The old rule was a flat 4 + tier swings, each swing a hard-coded 1. This
   checks the new curve never falls under that for an ordinary creep, that
   levelling actually buys durability, and that the Bulwark Stake is worth its
   lumber.
   node tools/harness/towerhp.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);

  const out = await page.evaluate(() => {
    const list = towerListFor('ice');
    const rows = list.map((def, tier) => {
      const hp0 = towerMaxHp(def, tier, 0);
      const hp5 = towerMaxHp(def, tier, 5);
      const swings = (hp, dmg) => Math.ceil(hp / dmg);
      return { tier, name: def.name, cost: def.cost, lumber: def.lumber || (def.name === 'Laser Cannon' ? 1 : 0),
        hp0, hp5, oldSwings: 4 + tier,
        plain: swings(hp0, SWING_DMG),
        plainL5: swings(hp5, SWING_DMG),
        breaker: swings(hp0, SWING_DMG * 3),
        ruiner: swings(hp0, SWING_DMG * 8) };
    });
    const atk = SENDS.filter((s) => s.attacker).map((s) => ({ name: s.name, dmg: SWING_DMG * s.breakPower }));
    return { rows, atk, swing: SWING_DMG };
  });

  const p = (s, n) => String(s).padEnd(n);
  console.log('an ordinary creep swing is worth ' + out.swing + ' damage; attackers: '
    + out.atk.map((a) => a.name + ' ' + a.dmg).join(', ') + '\n');
  console.log('  ' + p('tower', 20) + p('cost', 11) + p('HP', 8) + p('HP@L5', 8)
    + p('swings', 8) + p('was', 6) + p('@L5', 6) + p('Wallbrk', 9) + 'Ruiner');
  let regressed = 0;
  out.rows.forEach((r) => {
    const worse = r.plain < r.oldSwings;
    if (worse) regressed += 1;
    console.log('  ' + p(r.name, 20) + p(r.cost + 'g' + (r.lumber ? '+' + r.lumber + '🪵' : ''), 11)
      + p(r.hp0, 8) + p(r.hp5, 8) + p(r.plain + (worse ? ' !!' : ''), 8) + p(r.oldSwings, 6)
      + p(r.plainL5, 6) + p(r.breaker, 9) + r.ruiner);
  });
  const wall = out.rows.find((r) => r.name === 'Bulwark Stake');
  console.log('\n  towers that now take FEWER ordinary swings than before: ' + regressed + (regressed ? '  *** must be 0 ***' : '  (none)'));
  if (wall) console.log('  Bulwark Stake soaks ' + wall.plain + ' ordinary swings, ' + wall.breaker
    + ' from a Wallbreaker, ' + wall.ruiner + ' from a Siege Ruiner');
  const ok = regressed === 0 && wall && wall.ruiner >= 3;
  console.log('\n' + (ok ? 'PASS' : 'FAIL'));
  if (errs.length) console.log('ERRORS', errs.slice(0, 3));
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
