/* Do the numbers on the cards match the creeps that actually spawn?
   Every displayed health value should equal the creep the game builds from the
   same definition. This exists because CREEP_HP_SCALE was applied at spawn and
   nowhere else, so every tooltip read about half the truth.
   node tools/harness/tips.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button');
  await page.waitForTimeout(700);
  await page.click('#lb-ready');
  await page.waitForTimeout(2000);
  const out = await page.evaluate(() => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    battlePaused = true;
    const rows = [];
    // WAVES: what the banner claims vs what walks out of the gate
    [1, 5, 12, 20].forEach((n) => {
      const def = waveDefFor(n);
      wave = n;
      const before = creeps.length;
      spawnCreep(def, 'south', 'west', false);
      const c = creeps[creeps.length - 1];
      const shown = Number((waveStatLine(def, n).match(/· (\d+) HP/) || [])[1]);
      rows.push({ what:`wave ${n} ${def.name}`, shown, actual:c.maxHp, ok:shown === c.maxHp });
      creeps.length = before;
    });
    // SENDS: what the card claims vs what the purchase spawns
    ['hoverbarge', 'wolfrider', 'titan'].forEach((id) => {
      const sd = SENDS.find((s) => s.id === id);
      const before = creeps.length;
      spawnCreep(sendCreepDef(sd), 'south', 'west', true);
      const c = creeps[creeps.length - 1];
      const shown = Number((sendStatLine(sd).match(/^(\d+)hp/) || [])[1]);
      rows.push({ what:`send ${sd.name}`, shown, actual:c.maxHp, ok:shown === c.maxHp });
      creeps.length = before;
    });
    return rows;
  });
  const p = (s, n) => String(s).padEnd(n);
  console.log(p('what', 26) + p('card says', 12) + p('actually', 12) + 'match');
  out.forEach((r) => console.log(p(r.what, 26) + p(r.shown, 12) + p(r.actual, 12) + (r.ok ? 'yes' : 'NO')));
  console.log(out.every((r) => r.ok) ? 'every tooltip matches the creep' : 'MISMATCHES ABOVE');
  if (errs.length) console.log('ERRORS', errs.slice(0, 4));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
