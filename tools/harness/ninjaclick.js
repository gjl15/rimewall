/* Gene: "nina is stll not upgrqding".

   upgradepath.js says the controls are there, which means upgradepath.js is
   testing the wrong thing — it sets selectedTowerKey in JS and reads the DOM.
   A player TAPS A TOWER ON THE BOARD and then TAPS A BUTTON. Everything between
   those two acts is untested by a probe that skips them.

   So this does it with real pointer events at real coordinates, on both
   layouts, and checks the tower actually changed afterwards.

   node tools/harness/ninjaclick.js <url> */
const { chromium, CHROME, OUT } = require('./lib');
const path = require('path');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

const tap = async (page, x, y) => {
  await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y) || document.body;
    const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, isPrimary: true, button: 0 };
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
  }, { x, y });
  await page.waitForTimeout(220);
};

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  let bad = 0;
  for (const L of [{ n: 'laptop', w: 1280, h: 900 }, { n: 'phone', w: 390, h: 844 }]) {
    const ctx = await browser.newContext({ viewport: { width: L.w, height: L.h },
      isMobile: L.w < 700, hasTouch: L.w < 700, deviceScaleFactor: 2, colorScheme: 'dark' });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 180)));
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    await page.evaluate(() => { selectedRace = races.find((r) => r.id === 'ninja'); });
    await page.click('#start-button'); await page.waitForTimeout(700);
    await page.click('#lb-ready'); await page.waitForTimeout(1800);

    // put one aged ninja on the board and find where it is on screen
    const where = await page.evaluate(() => {
      document.querySelectorAll('.coach-card').forEach((c) => c.remove());
      SFX.play = () => {};
      player.races = ['ninja']; buildRaceIdx = 0; player.gold = 9000; player.lumber = 9;
      towers.clear(); towersVersion += 1;
      selectedTowerKey = null; selectedGroupKeys = [];
      const r = SOUTH_TOP + 6, c = 12;
      const t = makeTower(r, c, 'ninja', 0, 'player');
      t.buildUntil = 0; t.placedAt = -1000; addTower(t);
      renderFrame();
      const cv = document.getElementById('fx-canvas');
      const b = cv.getBoundingClientRect();
      return { x: b.left + (c + .5) / COLS * b.width, y: b.top + (r + .5) / ROWS * b.height,
        before: towerDef('ninja', t.tier).name, key: t.key };
    });

    await tap(page, Math.round(where.x), Math.round(where.y));

    // what upgrade controls are now on screen, and where
    const controls = await page.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect();
        return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== 'hidden'; };
      return [...document.querySelectorAll('[data-wp-act],[id^="td-"],[data-weapon],[data-sheet-act]')]
        .filter(vis).map((el) => {
          const r = el.getBoundingClientRect();
          return { id: el.id || el.dataset.wpAct || el.dataset.sheetAct || ('weapon:' + el.dataset.weapon),
            text: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 30),
            x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2),
            disabled: !!el.disabled };
        });
    });

    const selected = await page.evaluate(() => (selectedGroupKeys || []).length);
    console.log(`\n=== ${L.n.toUpperCase()} ===`);
    console.log(`  tapped the tower -> ${selected} selected`);
    if (!controls.length) console.log('  NO UPGRADE CONTROL ON SCREEN AFTER TAPPING THE TOWER');
    controls.forEach((c) => console.log(`    ${c.id.padEnd(14)} ${JSON.stringify(c.text).padEnd(32)}${c.disabled ? ' DISABLED' : ''}`));

    // press the weapon chip if one is offered, else the arm/tier control
    const weapon = controls.find((c) => c.id.startsWith('weapon:'));
    const arm = controls.find((c) => c.id === 'armhint' || c.id === 'td-tier');
    let result = 'nothing to press';
    if (weapon) { await tap(page, weapon.x, weapon.y); result = 'pressed a weapon chip'; }
    else if (arm) {
      await tap(page, arm.x, arm.y);
      const after = await page.evaluate(() => {
        const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
        return [...document.querySelectorAll('[data-weapon]')].filter(vis).map((el) => {
          const r = el.getBoundingClientRect();
          return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
        });
      });
      if (after.length) { await tap(page, after[0].x, after[0].y); result = `armed, then pressed 1 of ${after.length} chips`; }
      else result = 'pressed arm/tier but NO weapon chips appeared';
    }

    const end = await page.evaluate(() => {
      const t = towers.values().next().value;
      return t ? { name: towerDef(t.raceId, t.tier).name, tier: t.tier, level: t.level || 0 } : null;
    });
    console.log(`  ${result}`);
    console.log(`  tower: ${where.before}  ->  ${end ? end.name + ' (tier ' + end.tier + ')' : 'GONE'}`);
    const ok = end && end.name !== where.before;
    if (!ok) bad += 1;
    console.log('  ' + (ok ? 'UPGRADED' : 'DID NOT UPGRADE'));
    if (errs.length) { console.log('  ERRORS', errs.slice(0, 3)); bad += 1; }
    await page.screenshot({ path: path.join(OUT, `ninjaclick-${L.n}.png`) });
    await ctx.close();
  }
  console.log('\n' + (bad ? 'FAIL' : 'PASS — a ninja upgrades by tapping it and tapping a button'));
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
