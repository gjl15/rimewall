/* Tap a placed tower on a phone and see what actually surfaces.

   Gene: "when i upgrade i keep selling instead, buttons seem misaligned" and
   "on the laptop theres 4 options around a tower when u click it why cant that
   surface on mobile as well?" Both are about the same four actions — level,
   tier, target, sell. This reports where they are, how big they are, and
   whether the row moves while you are looking at it.
   node tools/harness/towertap.js <url> */
const { chromium, CHROME, OUT } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' };

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  for (const [label, ctxOpts] of [['PHONE 390x844', phone], ['LAPTOP 1280x800', { viewport: { width: 1280, height: 800 } }]]) {
    const touch = !!ctxOpts.hasTouch;
    const ctx = await browser.newContext(ctxOpts);
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    await page.waitForTimeout(900);
    await page.click('#start-button'); await page.waitForTimeout(600);
    await page.click('#lb-ready'); await page.waitForTimeout(1600);

    /* Place the tower, then TAP IT ON THE CANVAS like a person does. Calling
       renderTowerDetails() directly is the mistake that has already hidden one
       bug in this project: it tests the panel, not the path that opens it. */
    const where = await page.evaluate(() => {
      document.querySelectorAll('.coach-card').forEach((c) => c.remove());
      SFX.play = () => {};
      player.gold = 100000; player.lumber = 5;
      const row = SOUTH_TOP + 6, col = 12;   // mid tier, so a level AND a tier upgrade both exist
      const t = makeTower(row, col, selectedRace.id, 1, 'player'); t.buildUntil = 0; addTower(t);
      // age it past the refund grace, or the ring shows its "undo" face instead
      // of the four actions this test is about
      t.placedAt = -1000;
      const r = document.getElementById('fx-canvas').getBoundingClientRect();
      return { x: r.left + ((col + .5) / COLS) * r.width, y: r.top + ((row + .5) / ROWS) * r.height };
    });
    /* Playwright's touchscreen.tap does not deliver pointer events to the page
       in this headless setup — it made a working mobile board look completely
       dead, which nearly got reported as a game bug. Dispatch the pointer pair
       the game actually listens for instead. */
    const tap = async (x, y) => {
      if (!touch) return page.mouse.click(x, y);
      return page.evaluate(({ x, y }) => {
        const el = document.elementFromPoint(x, y) || document.getElementById('fx-canvas');
        const mk = (type) => new PointerEvent(type, { bubbles: true, cancelable: true, composed: true,
          pointerId: 91, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerdown' ? 1 : 0 });
        el.dispatchEvent(mk('pointerdown')); el.dispatchEvent(mk('pointerup'));
      }, { x, y });
    };
    // count the raw events the viewport actually receives, so a harness failure
    // cannot be mistaken for a game bug
    await page.evaluate(() => {
      window.__ev = { pointerdown: 0, pointerup: 0, touchstart: 0, touchend: 0 };
      const vp = document.getElementById('map-viewport');
      ['pointerdown', 'pointerup', 'touchstart', 'touchend'].forEach((n) =>
        vp.addEventListener(n, () => { window.__ev[n] += 1; }, { capture: true, passive: true }));
    });
    await tap(where.x, where.y);
    await page.waitForTimeout(700);
    // did the tap actually land on the tower? a missed click would fake a "mobile is broken" result
    const landed = await page.evaluate((w) => {
      const r = document.getElementById('fx-canvas').getBoundingClientRect();
      return { selectedKey: selectedTowerKey, towerKeyWanted: idx(SOUTH_TOP + 6, 12),
        tappedCol: +(((w.x - r.left) / r.width) * COLS).toFixed(1), tappedRow: +(((w.y - r.top) / r.height) * ROWS).toFixed(1),
        wantCol: 12, wantRow: SOUTH_TOP + 6, touchUI: touchUI(), arena: document.body.classList.contains('arena'),
        battleRunning, matchOver, towerThere: towers.has(idx(SOUTH_TOP + 6, 12)), zoom: mapZoomScale };
    }, where);
    const ev = await page.evaluate(() => window.__ev);
    console.log('  raw events the viewport received: ' + JSON.stringify(ev));
    const onTop = await page.evaluate((w) => {
      const el = document.elementFromPoint(w.x, w.y);
      const chain = []; let n = el;
      while (n && chain.length < 4) { chain.push(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.') : '')); n = n.parentElement; }
      return chain.join('  <  ');
    }, where);
    console.log('  element under the finger: ' + onTop);
    console.log('\n=== ' + label + ' ===');
    console.log('  tap landed at col ' + landed.tappedCol + ' row ' + landed.tappedRow + ' (wanted ' + landed.wantCol + ',' + landed.wantRow + ')'
      + '  selected=' + (landed.selectedKey === landed.towerKeyWanted ? 'the tower' : String(landed.selectedKey))
      + '  touchUI=' + landed.touchUI + '  battleRunning=' + landed.battleRunning + '  towerThere=' + landed.towerThere + '  zoom=' + landed.zoom);

    const info = await page.evaluate(() => {
      const vis = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null; };
      const grab = (sel) => [...document.querySelectorAll(sel)].map((b) => ({
        label: (b.textContent || '').trim().slice(0, 22), box: vis(b) })).filter((b) => b.box);
      return {
        detailPanelShown: !document.getElementById('tower-details')?.classList.contains('hidden'),
        detailPanelBox: vis(document.getElementById('tower-details')),
        desktopActions: grab('#td-level, #td-tier, #td-priority, #td-sell'),
        sheetActions: grab('[data-sheet-act]'),
        wispActions: grab('[data-wp-act]'),
        sheetShown: !document.getElementById('command-sheet')?.classList.contains('hidden'),
        railActions: grab('[data-rail-act], .rail-act'),
        ringActions: grab('[data-ring]'),
        selected: selectedGroupKeys.length,
      };
    });

    /* THE DOUBLE-TAP. Gene: "double tapping goes into an upgrade, it doesn't go
       into selecting all." Tap the same tower twice quickly and report which
       happened — selection grew, or gold left the bank. */
    const dbl = await page.evaluate(() => { selectedTowerKey = null; selectedGroupKeys = []; lastTapKey = null;
      for (let i = 0; i < 6; i += 1) { const t = makeTower(SOUTH_TOP + 6, 14 + i * 2, selectedRace.id, 1, 'player'); t.buildUntil = 0; addTower(t); }
      renderTowerDetails(); return { gold: player.gold, sel: selectedGroupKeys.length, towers: towers.size }; });
    await tap(where.x, where.y); await page.waitForTimeout(90);
    await tap(where.x, where.y); await page.waitForTimeout(500);
    const dblAfter = await page.evaluate(() => ({ gold: player.gold, sel: selectedGroupKeys.length,
      lvl: [...towers.values()].reduce((s, t) => s + (t.level || 0), 0) }));

    // does the row move on its own? sample the same buttons twice, 1s apart
    const sample = () => page.evaluate(() => {
      const out = {};
      ['#td-level', '#td-tier', '#td-priority', '#td-sell'].forEach((s) => {
        const el = document.querySelector(s); if (!el) return;
        const r = el.getBoundingClientRect(); out[s] = Math.round(r.y);
      });
      out.__identity = document.querySelector('#td-sell')?.dataset.probe || 'unmarked';
      return out;
    });
    await page.evaluate(() => { const s = document.querySelector('#td-sell'); if (s) s.dataset.probe = 'ORIGINAL'; });
    const a = await sample(); await page.waitForTimeout(1200); const b = await sample();

    console.log('  tower-details panel visible:', info.detailPanelShown, info.detailPanelBox ? JSON.stringify(info.detailPanelBox) : '(no box — off screen or display:none)');
    const show = (name, list) => {
      console.log('  ' + name + ': ' + (list.length ? '' : 'NONE VISIBLE'));
      list.forEach((x) => console.log('      ' + String(x.label).padEnd(24) + 'y=' + String(x.box.y).padEnd(6) + 'h=' + String(x.box.h).padEnd(5) + 'w=' + x.box.w));
    };
    show('side-panel actions (#td-*)', info.desktopActions);
    show('command-sheet chips', info.sheetActions);
    show('wisp panel actions', info.wispActions);
    show('rail actions', info.railActions);
    show('RING around the tower', info.ringActions);
    const reachable = info.desktopActions.length + info.sheetActions.length + info.wispActions.length + info.railActions.length + info.ringActions.length;
    console.log('  ACTIONS A FINGER CAN REACH AFTER TAPPING THE TOWER: ' + reachable);
    console.log('  double tap -> selected ' + dbl.sel + ' then ' + dblAfter.sel + ' towers'
      + ' | gold ' + dbl.gold + ' -> ' + dblAfter.gold + (dblAfter.gold < dbl.gold ? '  <- IT SPENT GOLD instead of selecting' : '')
      + ' | levels bought: ' + dblAfter.lvl);
    console.log('  sell button survived 1.2s of ticking:', b.__identity === 'ORIGINAL' ? 'YES' : 'NO — the node was replaced under your finger');
    const moved = Object.keys(a).filter((k) => k !== '__identity' && a[k] !== b[k]);
    console.log('  buttons that moved on their own:', moved.length ? moved.join(', ') : 'none');
    if (errs.length) console.log('  ERRORS', errs.slice(0, 2));
    await page.screenshot({ path: OUT + 'towertap-' + label.split(' ')[0].toLowerCase() + '.png' });
    await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
