/* The send ladder after the clock came off it.

   Gene: "the send hp should never scale, otherwise theres no point in upgrading
   the shrine" and "attackers shouldnt cost gold, but lumber."

   Three things have to hold together or the mode breaks:
     1. a send's hit points are the same at minute 0 and minute 40, in EVERY mode
     2. the ladder still rises in price, so it reads as a ladder
     3. an attacker is buyable with lumber and no gold at all — and the four
        surfaces that print a price do not say "0g"
   node tools/harness/sendecon.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1800);

  const out = await page.evaluate(() => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};

    // 1. HIT POINTS DO NOT MOVE WITH THE CLOCK, in either mode
    const probe = SENDS.find((s) => s.id === 'wolfrider');
    const hpAt = (mode, t) => { matchMode = mode; simTime = t; return sendCreepDef(probe).hp; };
    const drift = { skirmish:[0, 600, 1200, 2400].map((t) => hpAt('skirmish', t)),
      classic:[0, 600, 1200, 2400].map((t) => hpAt('classic', t)) };
    matchMode = 'skirmish'; simTime = 0;

    // 2. THE LADDER STILL CLIMBS
    const econ = SENDS.filter((s) => !s.attacker);
    const byLevel = {};
    econ.forEach((s) => { (byLevel[s.shrine] = byLevel[s.shrine] || []).push(s.cost); });
    const bands = Object.keys(byLevel).sort((a, b) => a - b).map((k) => ({
      shrine:Number(k), lo:Math.min(...byLevel[k]), hi:Math.max(...byLevel[k]) }));
    const monotone = bands.every((b, i) => i === 0 || b.hi > bands[i - 1].hi);

    // 3. AN ATTACKER BUYS ON LUMBER WITH AN EMPTY PURSE
    const atk = SENDS.filter((s) => s.attacker).map((s) => ({
      name:s.name, cost:s.cost, lumber:s.lumber, income:s.income,
      label:sendPriceText(s), short:sendPriceText(s, true) }));
    const a0 = SENDS.find((s) => s.attacker);
    player.shrine = SHRINE_MAX; player.gold = 0; player.lumber = 0;
    const brokeAffordable = sendAffordable(a0);
    player.lumber = 9;
    const woodAffordable = sendAffordable(a0);
    const before = { lumber:player.lumber, gold:player.gold };
    const card = document.querySelector(`[data-send="${a0.id}"]`);
    if (card) card.click();
    const after = { lumber:player.lumber, gold:player.gold };

    // and no surface prints a zero-gold price
    renderSendPanel(); renderCommandBar(); if (typeof renderQuickSend === 'function') renderQuickSend();
    const texts = [...document.querySelectorAll('[data-send],[data-bar-send],[data-qsend],[data-sheet-send]')]
      .map((el) => el.textContent + ' ' + (el.getAttribute('title') || ''));
    const zeroGold = texts.filter((t) => /(^|[^\d])0g/.test(t)).length;

    return { drift, bands, monotone, atk, brokeAffordable, woodAffordable, before, after, zeroGold,
      surfaces:texts.length };
  });

  const p = (s, n) => String(s).padEnd(n);
  console.log('1. HIT POINTS AGAINST THE CLOCK  (0 / 10 / 20 / 40 minutes)');
  console.log('   skirmish  ' + out.drift.skirmish.join(' / '));
  console.log('   classic   ' + out.drift.classic.join(' / '));
  const flat = [...out.drift.skirmish, ...out.drift.classic].every((v) => v === out.drift.skirmish[0]);
  console.log('   ' + (flat ? 'flat in both modes' : 'STILL SCALING'));

  console.log('\n2. THE LADDER STILL CLIMBS');
  out.bands.forEach((b) => console.log('   ' + p('shrine ' + b.shrine, 11) + b.lo + 'g – ' + b.hi + 'g'));
  console.log('   ' + (out.monotone ? 'each band tops out above the one below it' : 'BANDS OVERLAP'));

  console.log('\n3. ATTACKERS COST LUMBER, NOT GOLD');
  out.atk.forEach((a) => console.log('   ' + p(a.name, 16) + p(a.cost + 'g', 7) + p(a.lumber + ' lumber', 11)
    + 'card reads ' + JSON.stringify(a.label) + ', chip ' + JSON.stringify(a.short)));
  console.log(`   affordable with 0 gold 0 lumber:  ${out.brokeAffordable}`);
  console.log(`   affordable with 0 gold 9 lumber:  ${out.woodAffordable}`);
  console.log(`   one press: lumber ${out.before.lumber} -> ${out.after.lumber}, gold ${out.before.gold} -> ${out.after.gold}`);
  console.log(`   send surfaces printing a "0g" price: ${out.zeroGold} of ${out.surfaces}`);

  const ok = flat && out.monotone && !out.brokeAffordable && out.woodAffordable
    && out.after.lumber < out.before.lumber && !out.zeroGold && !errs.length;
  console.log('\n' + (ok ? 'PASS' : 'FAIL'));
  if (errs.length) console.log('ERRORS', errs.slice(0, 3));
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
