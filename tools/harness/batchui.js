/* Can you act on a MULTI-selection, on each layout?

   The sweep behind this found a real hole: the action ring only renders for a
   selection of exactly one, and the phone's command sheet early-returns while
   hidden — so box-selecting six towers on a desktop left zero upgrade
   affordances anywhere on screen. That is why batch upgrading felt impossible
   rather than merely awkward.

   This selects one tower, then several, and counts what a hand can actually
   reach in each case.
   node tools/harness/batchui.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const laptop = { viewport: { width: 1440, height: 900 } };

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  let bad = 0;
  for (const [label, opts] of [['PHONE', phone], ['LAPTOP', laptop]]) {
    const page = await (await browser.newContext(opts)).newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    await page.waitForTimeout(900);
    await page.click('#start-button'); await page.waitForTimeout(600);
    await page.click('#lb-ready'); await page.waitForTimeout(1800);

    const probe = await page.evaluate(() => {
      document.querySelectorAll('.coach-card').forEach((c) => c.remove());
      SFX.play = () => {};
      player.gold = 1e7; player.lumber = 9;
      const keys = [];
      for (let i = 0; i < 6; i += 1) {
        const t = makeTower(SOUTH_TOP + 6, 6 + i * 2, selectedRace.id, 1, 'player');
        t.buildUntil = 0; t.placedAt = -1000; addTower(t); keys.push(t.key);
      }
      /* Count only what is on screen AND on top at its own centre — a button
         behind a panel is not an affordance. */
      const reachable = () => [...document.querySelectorAll(
        '#td-level,#td-tier,#td-priority,#td-sell,#td-selectall,[data-ring],[data-sheet-act],[data-wp-act],[data-rail-act]')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          if (r.width < 4 || r.height < 4) return false;
          const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return !!at && (at === el || el.contains(at) || at.contains(el));
        }).map((el) => el.id || el.dataset.ring || el.dataset.sheetAct || el.dataset.wpAct || el.dataset.railAct);

      const show = () => {
        renderTowerDetails(); renderRing(); sheetKey = ''; renderCommandSheet();
        if (touchUI()) { wispTab = 'inspect'; renderWispPanel('inspect'); railTab = 'tower'; renderRails(); }
      };
      selectedTowerKey = keys[0]; selectedGroupKeys = [keys[0]];
      inspectEntity = { kind: 'tower' }; show();
      const one = reachable();

      selectedGroupKeys = keys.slice(); selectedTowerKey = keys[0]; show();
      const manyList = reachable();

      // and can a batch actually be levelled from that state?
      const lvlBefore = keys.reduce((s, k) => s + ((towers.get(k) || {}).level || 0), 0);
      towerAction('level');
      const lvlAfter = keys.reduce((s, k) => s + ((towers.get(k) || {}).level || 0), 0);
      return { one, many: manyList, selected: selectedGroupKeys.length, lvlBefore, lvlAfter };
    });
    await page.waitForTimeout(300);

    console.log('\n=== ' + label + ' ===');
    console.log('  1 tower selected  — reachable: ' + probe.one.length + '  ' + JSON.stringify(probe.one));
    console.log('  6 towers selected — reachable: ' + probe.many.length + '  ' + JSON.stringify(probe.many));
    console.log('  batch level: ' + probe.lvlBefore + ' -> ' + probe.lvlAfter + ' levels across 6 towers');
    const ok = probe.one.length > 0 && probe.many.length > 0 && probe.lvlAfter > probe.lvlBefore;
    console.log('  ' + (ok ? 'PASS' : 'FAIL — a selection with no way to act on it'));
    if (!ok) bad += 1;
    if (errs.length) { console.log('  ERRORS ' + errs.slice(0, 2)); bad += 1; }
    await page.close();
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
