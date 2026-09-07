/* The pre-build card for a given tower, rendered and shot, plus a plain-text
   dump of every special's description so the odds and rates can be read at a
   glance instead of hunted for in the source.
   node tools/harness/cardshot.js <url> [raceId] [tier] */
const { chromium, CHROME, OUT } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';
const raceId = process.argv[3] || 'gravity';
const tier = Number(process.argv[4] || 2);

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark' })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1800);
  const text = await page.evaluate(({ raceId, tier }) => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    battlePaused = true;
    const def = towerDef(raceId, tier);
    // park the card somewhere visible and freeze it
    const anchor = document.getElementById('map-viewport');
    showCardInfo(def, raceId, anchor);
    const el = document.getElementById('card-info');
    el.style.left = '40px'; el.style.top = '60px'; el.style.width = '380px';
    window.hideCardInfo = () => {};
    const every = [];
    const seen = new Set();
    races.forEach((r) => towerListFor(r.id).forEach((t) => {
      const sp = t.special || 'basic';
      if (seen.has(sp)) return; seen.add(sp);
      every.push(`${sp.padEnd(12)} ${specialBlurb(sp) || '(no description)'}`);
    }));
    return { card:el.innerText, every };
  }, { raceId, tier });
  await page.waitForTimeout(300);
  await page.locator('#card-info').screenshot({ path: OUT + 'card-' + raceId + tier + '.png' });
  console.log('--- card ---\n' + text.card);
  console.log('\n--- every special ---');
  text.every.forEach((l) => console.log(l));
  const missing = text.every.filter((l) => l.includes('(no description)'));
  console.log(missing.length ? `\n${missing.length} SPECIALS WITH NO DESCRIPTION` : '\nevery special in the game has a described chance and rate');
  if (errs.length) console.log('ERRORS', errs.slice(0, 4));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
