/* Does the middle of a button actually hit that button?

   "the clicking is still off set not in the correct area of the buttons."
   For every tower-action control on screen, take its own bounding box, aim at
   the exact centre, and ask the document what is there. Anything that answers
   with something else is a control you cannot press where you can see it.
   node tools/harness/hittest.js <url> */
const { chromium, CHROME, OUT } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  let bad = 0;
  for (const [label, opts] of [['PHONE', phone], ['LAPTOP', { viewport: { width: 1280, height: 800 } }]]) {
    const page = await (await browser.newContext(opts)).newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    await page.waitForTimeout(900);
    await page.click('#start-button'); await page.waitForTimeout(600);
    await page.click('#lb-ready'); await page.waitForTimeout(1600);

    const res = await page.evaluate(() => {
      document.querySelectorAll('.coach-card').forEach((c) => c.remove());
      SFX.play = () => {};
      player.gold = 1e7; player.lumber = 9;
      const t = makeTower(SOUTH_TOP + 6, 12, selectedRace.id, 1, 'player');
      t.buildUntil = 0; t.placedAt = -1000; addTower(t);
      selectedTowerKey = t.key; selectedGroupKeys = [t.key];
      inspectEntity = { kind: 'tower' };
      renderTowerDetails(); renderRing(); sheetKey = ''; renderCommandSheet();
      if (touchUI()) { wispTab = 'inspect'; renderWispPanel('inspect'); }

      const sels = ['#td-level', '#td-tier', '#td-priority', '#td-sell',
        '[data-ring="t-level"]', '[data-ring="t-tier"]', '[data-ring="t-sell"]', '[data-ring="t-priority"]',
        '[data-wp-act="level"]', '[data-wp-act="tier"]', '[data-wp-act="priority"]', '[data-wp-act="sell"]',
        '[data-sheet-act="level"]', '[data-sheet-act="tier"]', '[data-sheet-act="priority"]', '[data-sheet-act="sell"]'];
      const out = [];
      sels.forEach((s) => {
        const el = document.querySelector(s);
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const at = document.elementFromPoint(cx, cy);
        const ok = !!at && (at === el || el.contains(at));
        // if it missed, say what is there instead and how far off the element is
        let blocker = null, offset = null;
        if (!ok && at) {
          blocker = at.tagName.toLowerCase() + (at.id ? '#' + at.id : '') +
            (typeof at.className === 'string' && at.className ? '.' + at.className.trim().split(/\s+/)[0] : '');
          const br = at.getBoundingClientRect();
          offset = { dx: Math.round(br.left - r.left), dy: Math.round(br.top - r.top) };
        }
        out.push({ sel: s, ok, blocker, offset, box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } });
      });
      return out;
    });

    console.log('\n=== ' + label + ' ===');
    const miss = res.filter((r) => !r.ok);
    res.forEach((r) => console.log('  ' + (r.ok ? 'ok  ' : 'MISS') + '  ' + r.sel.padEnd(28)
      + JSON.stringify(r.box) + (r.ok ? '' : '   hits ' + r.blocker + '  offset ' + JSON.stringify(r.offset))));
    console.log('  ' + (miss.length ? miss.length + ' CONTROL(S) CANNOT BE PRESSED WHERE THEY APPEAR' : 'every control is hit at its own centre'));
    if (miss.length) bad += miss.length;
    if (errs.length) console.log('  ERRORS ' + errs.slice(0, 2));
    await page.screenshot({ path: OUT + 'hittest-' + label.toLowerCase() + '.png' });
    await page.close();
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
