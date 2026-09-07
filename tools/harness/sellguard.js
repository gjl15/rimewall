/* A mis-tap must never be able to delete a base.

   Gene: "ive sold an entire base when selected all instead of upgrading all of
   them." Two things are checked here:
     1. STABILITY — with a batch selected, does the action row stay put while
        the batch is upgraded? A tier upgrade rewrites the tower's name,
        description and next-tier line, and if that prose sits above the
        buttons, the row slides and the next tap lands one row off.
     2. THE GUARD — does a single press on Sell with many towers selected
        actually sell them, or does it arm and ask?
   node tools/harness/sellguard.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  let failed = false;
  for (const [label, opts] of [['PHONE', phone], ['LAPTOP', { viewport: { width: 1280, height: 800 } }]]) {
    const page = await (await browser.newContext(opts)).newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    await page.waitForTimeout(900);
    await page.click('#start-button'); await page.waitForTimeout(600);
    await page.click('#lb-ready'); await page.waitForTimeout(1600);

    const setup = await page.evaluate(() => {
      document.querySelectorAll('.coach-card').forEach((c) => c.remove());
      SFX.play = () => {};
      player.gold = 1e7; player.lumber = 9;
      const keys = [];
      for (let i = 0; i < 8; i += 1) {
        const t = makeTower(SOUTH_TOP + 6, 6 + i * 2, selectedRace.id, 0, 'player');
        t.buildUntil = 0; t.placedAt = -1000; addTower(t); keys.push(t.key);
      }
      selectedGroupKeys = keys; selectedTowerKey = keys[0];
      inspectEntity = { kind: 'tower' };
      renderTowerDetails(); sheetKey = ''; renderCommandSheet();
      if (touchUI()) { wispTab = 'inspect'; renderWispPanel('inspect'); }
      return { towers: towers.size, selected: selectedGroupKeys.length };
    });

    // where do the action buttons sit, before and after a batch tier upgrade?
    const spots = () => page.evaluate(() => {
      const out = {};
      const grab = (name, sel) => { const el = document.querySelector(sel); if (el) { const r = el.getBoundingClientRect(); if (r.height) out[name] = Math.round(r.y); } };
      grab('td-tier', '#td-tier'); grab('td-sell', '#td-sell');
      grab('wp-tier', '[data-wp-act="tier"]'); grab('wp-sell', '[data-wp-act="sell"]');
      grab('sheet-tier', '[data-sheet-act="tier"]'); grab('sheet-sell', '[data-sheet-act="sell"]');
      return out;
    });
    const before = await spots();
    await page.evaluate(() => { towerAction('tier'); sheetKey = ''; renderCommandSheet(); if (touchUI()) renderWispPanel('inspect'); renderTowerDetails(); });
    await page.waitForTimeout(350);
    const after = await spots();
    const moved = Object.keys(before).filter((k) => after[k] !== undefined && after[k] !== before[k]);

    // now the guard: one press of sell, with 8 selected
    const guard = await page.evaluate(() => {
      const n0 = towers.size;
      towerAction('sell');
      const n1 = towers.size;
      towerAction('sell');            // the confirming press
      return { before: n0, afterFirstPress: n1, afterSecondPress: towers.size };
    });

    const stable = moved.length === 0;
    const armed = guard.afterFirstPress === guard.before;
    const confirms = guard.afterSecondPress < guard.before;
    console.log('\n=== ' + label + ' ===');
    console.log('  set up ' + setup.towers + ' towers, ' + setup.selected + ' selected');
    console.log('  button positions before upgrade: ' + JSON.stringify(before));
    console.log('  button positions after upgrade:  ' + JSON.stringify(after));
    console.log('  buttons that MOVED under the finger: ' + (moved.length ? moved.join(', ') : 'none'));
    console.log('  one press of Sell with 8 selected: ' + guard.before + ' -> ' + guard.afterFirstPress + ' towers'
      + (armed ? '   (armed, nothing sold)' : '   *** SOLD ON ONE PRESS ***'));
    console.log('  second press: -> ' + guard.afterSecondPress + ' towers' + (confirms ? '   (confirmed)' : '   *** CONFIRM DID NOT WORK ***'));
    console.log('  ' + (stable && armed && confirms ? 'PASS' : 'FAIL'));
    if (!(stable && armed && confirms)) failed = true;
    if (errs.length) { console.log('  ERRORS ' + errs.slice(0, 3)); failed = true; }
    await page.close();
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
