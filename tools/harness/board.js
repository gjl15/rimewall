/* Leaderboard check: score a spread of synthetic runs, confirm the ordering is
   sane, then render the Records sheet and shoot it.
   node tools/harness/board.js <url> */
const { chromium, CHROME, OUT } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 1400 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 250)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  const res = await page.evaluate(() => {
    const mk = (o) => Object.assign({ at:Date.now() - Math.random() * 8.64e7, race:'ice', rival:'fire', mode:'skirmish',
      team:1, result:'defeat', wave:10, secs:600, kills:300, livesLost:20, goldEarned:4000, goldSpent:3500,
      peakIncome:120, sends:8, peakTowers:40, bolts:2, leaksByWave:{}, livesLeft:80, startLives:100,
      difficulty:'normal', daily:false, name:'', aid:'' }, o);
    const cases = [
      ['A daily defeat W14',      mk({ wave:14, kills:520, peakIncome:180, goldSpent:6200, livesLeft:61, livesLost:39, secs:840, difficulty:'hard', name:'Gene' })],
      ['B survival grind W27',    mk({ mode:'survival', wave:27, kills:1180, peakIncome:40, goldSpent:14200, livesLeft:8, livesLost:92, secs:1980, name:'Abdy' })],
      ['C fast brutal win W9',    mk({ wave:9, kills:310, peakIncome:340, goldSpent:4100, livesLeft:22, livesLost:3, secs:480, startLives:25, difficulty:'brutal', result:'victory', name:'Gene' })],
      ['D slow same-wave defeat', mk({ wave:14, kills:520, peakIncome:180, goldSpent:6200, livesLeft:61, livesLost:39, secs:2400, difficulty:'hard', name:'Slowpoke' })],
      ['E leaky same-wave',       mk({ wave:14, kills:520, peakIncome:180, goldSpent:6200, livesLeft:5, livesLost:95, secs:840, difficulty:'hard', name:'Leaky' })],
    ];
    const scored = cases.map(([label, m]) => ({ label, points:matchPoints(m), bracket:bracketOf(m) }));
    // write them into the log so the Records sheet has something to rank
    const rows = cases.map(([, m]) => Object.assign(m, { points:matchPoints(m) }));
    try { localStorage.setItem('rimewall.matchlog.v1', JSON.stringify(rows)); } catch (e) {}
    return { scored, brackets:[...new Set(scored.map((s) => s.bracket))] };
  });
  console.log('scored:');
  res.scored.forEach((s) => console.log(`  ${String(s.points).padStart(7)}  ${s.label}   [${s.bracket}]`));
  console.log('brackets:', res.brackets.join(' | '));

  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(900);
  const shown = await page.evaluate(() => {
    const html = recordsContent();
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;inset:0;z-index:9999;overflow:auto;padding:18px;background:#0b1020;color:#dbe4fa;font:13px Manrope,system-ui,sans-serif';
    host.innerHTML = html; document.body.appendChild(host);
    return { hasBoard: html.includes('LEADERBOARD'), rows:(html.match(/learn-row/g) || []).length };
  });
  console.log('records sheet:', JSON.stringify(shown));
  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + 'leaderboard.png' });
  if (errs.length) console.log('ERRORS', errs.slice(0, 6));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 400)); process.exit(1); });
