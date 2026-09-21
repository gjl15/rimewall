/* Exactly what the shrine repricing did to every send, rung by rung.

   Gene, fairly: "why did u change the sned costs". He asked for the HP clock to
   come off; the repricing was my call on top of it. This prints the before and
   after so the size of that change is a table rather than a claim — and so
   reverting it is an informed decision.

   node tools/harness/repricing.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 800 } })).newPage();
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);

  const out = await page.evaluate(() => {
    // undo the scale to recover what each rung cost before the pass
    return SENDS.filter((s) => !s.attacker).map((s) => {
      const k = SHRINE_PRICE_SCALE[s.shrine] || 1;
      const wasCost = Math.round(s.cost / k), wasInc = Math.round(s.income / k);
      return { name:s.name, shrine:s.shrine, k,
        wasCost, nowCost:s.cost, wasInc, nowInc:s.income,
        wasPay:+(wasCost / Math.max(1, wasInc)).toFixed(1),
        nowPay:+(s.cost / Math.max(1, s.income)).toFixed(1) };
    }).sort((a, b) => a.shrine - b.shrine || a.nowCost - b.nowCost);
  });

  const p = (s, n) => String(s).padEnd(n);
  console.log('  ' + p('send', 20) + p('shrine', 8) + p('cost was', 10) + p('now', 9)
    + p('income was', 12) + p('now', 8) + 'ticks to repay');
  let lastShrine = null;
  out.forEach((r) => {
    if (r.shrine !== lastShrine) { console.log(`  -- shrine ${r.shrine}  (x${r.k})`); lastShrine = r.shrine; }
    const arrow = r.nowCost > r.wasCost ? 'UP  ' : 'down';
    console.log('  ' + p(r.name, 20) + p(arrow, 8) + p(r.wasCost + 'g', 10) + p(r.nowCost + 'g', 9)
      + p('+' + r.wasInc, 12) + p('+' + r.nowInc, 8) + `${r.wasPay} -> ${r.nowPay}`);
  });

  const up = out.filter((r) => r.nowCost > r.wasCost).length;
  const same = out.filter((r) => Math.abs(r.nowPay - r.wasPay) <= 0.15).length;
  console.log(`\n  ${up} sends got more expensive, ${out.length - up} got cheaper`);
  console.log(`  ${same} of ${out.length} repay in the same number of income ticks as before`);
  console.log('  (cost and income moved together on purpose — the economy per send is unchanged;');
  console.log('   what changed is how much creep a gold buys as you climb the shrine)');
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
