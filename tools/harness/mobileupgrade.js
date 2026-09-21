/* Gene: "upgrades arent working for anything really btw lets primarily work for
   moble."

   Every probe so far either set up its own selection in JS or tested one race.
   This does what a person on a phone does and nothing else: tap a tower, look
   at what appeared, press it, check the tower changed. Four races, every action.

   node tools/harness/mobileupgrade.js <url> */
const { chromium, CHROME, OUT } = require('./lib');
const path = require('path');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

const fire = async (page, x, y) => {
  await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y) || document.body;
    const o = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, isPrimary: true, button: 0 };
    el.dispatchEvent(new PointerEvent('pointerdown', o));
    el.dispatchEvent(new PointerEvent('pointerup', o));
    el.dispatchEvent(new MouseEvent('click', o));
  }, { x, y });
  await page.waitForTimeout(240);
};

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 },
    isMobile: true, hasTouch: true, deviceScaleFactor: 2, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 180)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await page.click('#start-button'); await page.waitForTimeout(700);
  await page.click('#lb-ready'); await page.waitForTimeout(1800);

  const rows = [];
  for (const raceId of ['ice', 'fire', 'tech', 'ninja']) {
    // fresh tower, nothing selected, exactly as a player arrives at it
    const spot = await page.evaluate((raceId) => {
      document.querySelectorAll('.coach-card').forEach((c) => c.remove());
      SFX.play = () => {};
      closeWispMenus();
      player.races = [raceId]; buildRaceIdx = 0; player.gold = 9000; player.lumber = 9;
      towers.clear(); towersVersion += 1;
      selectedTowerKey = null; selectedGroupKeys = [];
      const r = SOUTH_TOP + 6, c = 12;
      const t = makeTower(r, c, raceId, 0, 'player');
      t.buildUntil = 0; t.placedAt = -1000; addTower(t);
      renderFrame();
      const b = document.getElementById('fx-canvas').getBoundingClientRect();
      return { x: Math.round(b.left + (c + .5) / COLS * b.width),
        y: Math.round(b.top + (r + .5) / ROWS * b.height),
        name: towerDef(raceId, 0).name, level: t.level || 0 };
    }, raceId);

    await fire(page, spot.x, spot.y);

    const seen = await page.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect();
        return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== 'hidden'; };
      const list = [...document.querySelectorAll('[data-wp-act],[data-weapon],[data-sheet-act],[id^="td-"],[data-tray]')]
        .filter(vis).map((el) => {
          const r = el.getBoundingClientRect();
          return { key: el.dataset.wpAct || el.dataset.sheetAct || el.dataset.tray
              || (el.dataset.weapon !== undefined ? 'weapon' : '') || el.id,
            x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
        });
      return { list, selected: (selectedGroupKeys || []).length,
        wispOpen: !document.getElementById('wisp-panel')?.classList.contains('hidden') };
    });

    /* RE-QUERY THE BUTTON IMMEDIATELY BEFORE PRESSING IT. Coordinates captured
       once and reused go stale the moment an action re-renders the panel — press
       Level and every control below it moves, so the second press lands on
       whatever slid into that spot. That is a real hazard this codebase already
       has scars from, and a probe that caches coordinates cannot see it. */
    const press = async (key) => {
      const b = await page.evaluate((k) => {
        const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
        const el = [...document.querySelectorAll('[data-wp-act],[data-weapon]')].filter(vis)
          .find((e) => (e.dataset.wpAct || (e.dataset.weapon !== undefined ? 'weapon' : '')) === k);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      }, key);
      if (!b) return null;
      const before = await page.evaluate(() => {
        const t = towers.values().next().value;
        return t ? { tier: t.tier, level: t.level || 0, n: towers.size } : null;
      });
      await fire(page, b.x, b.y);
      const after = await page.evaluate(() => {
        const t = towers.values().next().value;
        return t ? { tier: t.tier, level: t.level || 0, n: towers.size } : { n: towers.size };
      });
      return { before, after, changed: JSON.stringify(before) !== JSON.stringify(after) };
    };

    const lvl = await press('level');
    const tier = await press('tier') || await press('weapon');
    rows.push({ raceId, name: spot.name, selected: seen.selected, wispOpen: seen.wispOpen,
      controls: [...new Set(seen.list.map((c) => c.key))].filter(Boolean),
      lvl, tier });
  }

  const p = (s, n) => String(s).padEnd(n);
  console.log('  PHONE 390x844 — tap the tower, then press what appeared\n');
  console.log('  ' + p('race', 7) + p('sel', 5) + p('panel', 7) + p('level', 22) + p('tier / weapon', 22) + 'controls on screen');
  let bad = 0;
  rows.forEach((r) => {
    const lv = !r.lvl ? 'NO CONTROL' : r.lvl.changed ? `${r.lvl.before.level} -> ${r.lvl.after.level}` : 'pressed, NO CHANGE';
    const ti = !r.tier ? 'NO CONTROL' : r.tier.changed ? `tier ${r.tier.before.tier} -> ${r.tier.after.tier}` : 'pressed, NO CHANGE';
    if (!r.lvl || !r.lvl.changed || !r.tier || !r.tier.changed) bad += 1;
    console.log('  ' + p(r.raceId, 7) + p(r.selected, 5) + p(r.wispOpen ? 'open' : 'SHUT', 7)
      + p(lv, 22) + p(ti, 22) + r.controls.join(',').slice(0, 40));
  });
  await page.screenshot({ path: path.join(OUT, 'mobileupgrade.png') });
  console.log('\n' + (bad ? `FAIL — ${bad} of ${rows.length} races cannot be upgraded on a phone` : 'PASS — every race upgrades on a phone'));
  if (errs.length) console.log('ERRORS', errs.slice(0, 3));
  await browser.close();
  process.exit(bad || errs.length ? 1 : 0);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
