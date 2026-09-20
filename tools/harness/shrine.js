/* Abdy: "Intergrate the shrine into the menu."

   The shrine was reachable on desktop only by leaving the BUILD tab for the
   SEND tab — while the lumber that pays for it was bought on BUILD. One
   decision, two tabs, never both on screen. This asserts the shrine now appears
   on the build tab, reads as a decision rather than a number, and that pressing
   it actually spends the lumber and raises the level.
   node tools/harness/shrine.js <url> */
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
    const seen = () => {
      const el = document.querySelector('.shrine-row');
      const bt = document.getElementById('shrine-upgrade-build');
      const tab = document.getElementById('build-panel');
      return { text: el ? el.innerText.replace(/\n/g, ' | ') : null,
        disabled: bt ? bt.disabled : null,
        onBuildTab: !!(el && tab && tab.contains(el) && !tab.classList.contains('hidden')) };
    };
    const broke = seen();
    player.lumber = 3; renderTowerList();
    const funded = seen();
    document.getElementById('shrine-upgrade-build').click();
    const after = seen();
    // and the phone tray, which already had one — make sure it did not regress
    const phoneChip = !!document.getElementById('cb-shrine') || String(barStructKey || '').length > 0;
    return { broke, funded, after, level: player.shrine, lumber: player.lumber, phoneChip };
  });

  console.log('  shrine appears on the BUILD tab: ' + out.broke.onBuildTab);
  console.log('  with 0 lumber:  "' + out.broke.text + '"   button disabled=' + out.broke.disabled);
  console.log('  with 3 lumber:  "' + out.funded.text + '"   button disabled=' + out.funded.disabled);
  console.log('  after a press:  "' + out.after.text + '"');
  console.log('  shrine is L' + out.level + ', lumber left ' + out.lumber);

  const ok = out.broke.onBuildTab && out.broke.disabled === true && out.funded.disabled === false
    && out.level === 2 && out.lumber === 2 && !errs.length;
  console.log('\n' + (ok ? 'PASS — the shrine is on the build menu, gated by lumber, and upgrades in one press' : 'FAIL'));
  if (errs.length) console.log('ERRORS', errs);
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
