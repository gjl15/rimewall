// Ground-truth check of the income economy: display == award, and wave pay rides the tick.
const { chromium, CHROME, OUT } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8766/';
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 200)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await page.click('#start-button');
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelectorAll('.coach-card').forEach((c) => c.remove()));
  const out = await page.evaluate(async () => {
    const r = {};
    // 1. wave rollover: gold must NOT change on the spot; it must arrive with the next tick
    battlePaused = true;
    const g0 = player.gold, due0 = levelPayDue;
    launchNextWave();
    r.rollover = { goldBefore: g0, goldAfter: player.gold, dueBefore: due0, dueAfter: levelPayDue, wave };
    // force a tick
    const g1 = player.gold;
    const expected = BASE_INCOME + incomePayout(player.income) + levelPayDue;
    payIncome();
    r.tick = { goldBefore: g1, goldAfter: player.gold, paid: player.gold - g1, expected, dueAfter: levelPayDue };
    // 2. send display == award, at low and high income
    const titan = SENDS.find((s) => s.id === 'titan') || SENDS[SENDS.length - 1];
    const check = (raw) => {
      player.income = raw; player.gold = 1e6; player.shrine = 9;
      barSendCollapsed = false; barBuildCollapsed = true; barStructKey = '';
      renderCommandBar(); barRefreshAffordable(); renderSendPanel(); refreshSendLocks();
      const card = document.querySelector(`[data-bar-gain="${titan.id}"]`);
      const note = document.querySelector(`[data-send-note="${titan.id}"]`);
      const cardShown = card ? card.textContent : null;
      const noteShown = note ? note.textContent : null;   // captured BEFORE the click: the click refreshes both
      const before = incomePayoutExact(player.income);
      const btn = document.querySelector(`[data-send="${titan.id}"]`);
      if (btn) btn.click();
      const after = incomePayoutExact(player.income);
      return { raw, cardShown, noteShown, actualGain: +(after - before).toFixed(1), rawAdded: player.income - raw };
    };
    r.sendLow = check(50);
    r.sendHigh = check(1000);
    r.hudIncomeLabel = document.getElementById('income-label').textContent;
    r.incomeTickWidth = document.getElementById('income-tick') ? document.getElementById('income-tick').style.width : 'MISSING';
    r.wagerBonusAt1000 = (player.income = 1000, wagerBonus());
    return r;
  });
  console.log(JSON.stringify(out, null, 1));
  if (errs.length) console.log('ERRORS', errs.slice(0, 6));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 400)); process.exit(1); });
