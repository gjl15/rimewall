/* What the purse can buy versus what the wave brings, wave by wave.

   The board resize scaled gold by (COLS/32)^1.5 to pay for a longer wall, but
   wave HP did not move — so the same gold now buys the same wall AND more DPS
   per creep. This prints both sides so the ratio can be tuned instead of felt.

   node tools/harness/econ.js <url> [waves] [econScaleOverride]                */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';
const upto = Number(process.argv[3] || 20);
const scaleOverride = process.argv[4] ? Number(process.argv[4]) : null;

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  if (scaleOverride) await page.addInitScript((s) => { window.__ECON_SCALE__ = s; }, scaleOverride);
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await page.click('#start-button');
  await page.waitForTimeout(1500);
  const out = await page.evaluate((upto) => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    if (typeof closeLobby === 'function') closeLobby();
    const rows = [];
    // cheapest gold-per-DPS in the game, so "gold" converts to a comparable wall
    let bestGpd = Infinity, bestName = '';
    races.forEach((r) => (TOWERS[r.id] || []).forEach((t) => {
      const dps = effectiveDps(t); if (dps <= 0) return;
      const gpd = t.cost / dps; if (gpd < bestGpd) { bestGpd = gpd; bestName = `${r.name} ${t.name}`; }
    }));
    let gold = START_GOLD, t = FIRST_WAVE_DELAY, income = 0, ticks = 0;
    for (let w = 1; w <= upto; w += 1) {
      // gold in by the moment wave w lands
      const nowTicks = Math.floor(t / INCOME_PERIOD);
      while (ticks < nowTicks) { ticks += 1; gold += BASE_INCOME + incomePayout(income); }
      gold += 6 + Math.round(1.5 * Math.min(w, 30));                     // level pay
      const def = waveDefFor(w);
      const hpScale = def.boss ? 1 : TRAIT.hpScaleNeutral * waveHpMult(w);
      const perCreep = Math.round((def.hp || 1) * hpScale * (typeof CREEP_HP_SCALE === 'number' ? CREEP_HP_SCALE : 1));
      const count = Math.round((def.count || 6) * (def.boss ? 1 : 1.3));
      const waveHp = perCreep * count;
      gold += count * (def.bounty || 1) * BOUNTY_MULT;                   // clearing it pays
      rows.push({ w, name:def.name, cls:def.aClass, perCreep, count, waveHp,
        goldIn:Math.round(gold), dpsBuyable:Math.round(gold / bestGpd),
        // seconds of sustained fire the whole purse needs to clear the wave
        secsToClear:+(waveHp / Math.max(1, gold / bestGpd)).toFixed(1) });
      t += WAVE_PERIOD;
    }
    return { board:[COLS, ROWS].join('x'), econScale:+ECON_SCALE.toFixed(3), startGold:START_GOLD,
      baseIncome:BASE_INCOME, incomePeriod:INCOME_PERIOD, wavePeriod:WAVE_PERIOD,
      bestGpd:+bestGpd.toFixed(3), bestName, rows };
  }, upto);
  const p = (s, n) => String(s).padEnd(n);
  console.log(`board ${out.board}  ECON_SCALE ${out.econScale}  start ${out.startGold}g  base income ${out.baseIncome}/${out.incomePeriod}s  wave every ${out.wavePeriod}s`);
  console.log(`cheapest wall: ${out.bestName} at ${out.bestGpd} gold per point of dps`);
  console.log(p('wv', 4) + p('creep', 22) + p('class', 11) + p('hp', 7) + p('n', 4) + p('waveHP', 9) + p('goldIn', 8) + p('dps', 7) + 'secs to clear');
  out.rows.forEach((r) => console.log(p(r.w, 4) + p(r.name, 22) + p(r.cls, 11) + p(r.perCreep, 7) + p(r.count, 4) + p(r.waveHp, 9) + p(r.goldIn, 8) + p(r.dpsBuyable, 7) + r.secsToClear));
  if (errs.length) console.log('ERRORS', errs.slice(0, 4));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
