/* The send ladder, and how much wall each rung actually costs to stop.
   effHP = hp / (class multiplier x armour reduction) — what a wall of that
   element has to chew through. Prints the best and worst element for each rung
   so the counters are visible instead of implied.
   node tools/harness/sends.js <url> [shrineMax] */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';
const shrineMax = Number(process.argv[3] || 5);

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 800 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  const out = await page.evaluate((shrineMax) => {
    const classes = {};
    const rows = SENDS.filter((s) => s.shrine <= shrineMax).map((s) => {
      const hp = Math.round((s.hp || 1) * TRAIT.hpScaleSend * (typeof CREEP_HP_SCALE === 'number' ? CREEP_HP_SCALE : 1));
      const armorCut = 1 - armorReduction(s.armor || 0);
      const per = races.map((r) => {
        const mult = (ATTACK_PROFILE[r.id] || { vs:{} }).vs[s.aClass || 'medium'] ?? 1;
        return { race:r.name, eff: hp / Math.max(.01, mult * armorCut) };
      }).sort((a, b) => a.eff - b.eff);
      classes[s.aClass || 'medium'] = (classes[s.aClass || 'medium'] || 0) + 1;
      return { name:s.name, cost:s.cost, shrine:s.shrine, cls:s.aClass || 'medium', hp,
        best:per[0], worst:per[per.length - 1],
        spread:+(per[per.length - 1].eff / per[0].eff).toFixed(2),
        goldPerEffHp:+(s.cost / per[Math.floor(per.length / 2)].eff).toFixed(3) };
    });
    return { rows, classes };
  }, shrineMax);
  const p = (s, n) => String(s).padEnd(n);
  console.log('armour classes across the ladder:', JSON.stringify(out.classes));
  console.log(p('send', 18) + p('shr', 4) + p('cost', 7) + p('class', 11) + p('hp', 7) + p('easiest for', 22) + p('hardest for', 22) + 'spread');
  out.rows.forEach((r) => console.log(
    p(r.name, 18) + p(r.shrine, 4) + p(r.cost, 7) + p(r.cls, 11) + p(r.hp, 7)
    + p(`${r.best.race} ${Math.round(r.best.eff)}`, 22) + p(`${r.worst.race} ${Math.round(r.worst.eff)}`, 22) + r.spread + 'x'));
  if (errs.length) console.log('ERRORS', errs.slice(0, 4));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
