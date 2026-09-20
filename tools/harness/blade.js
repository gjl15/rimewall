/* What does a player actually SEE when they select a ninja blade?

   Measured: a ninja wall with no imbuings stalls at wave 13, and an imbuing is
   10g on a 5g tower. So the purchase is cheap, available, and skipped — which
   makes it a discovery question, and discovery questions are answered by
   looking at the surface rather than at the code.

   Shoots the tower panel on a phone and a laptop with a blade selected, and
   dumps the text of every control on it.
   node tools/harness/blade.js <url> */
const { chromium, CHROME, OUT } = require('./lib');
const path = require('path');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

const LAYOUTS = [
  { name: 'phone',  w: 390,  h: 844 },
  { name: 'laptop', w: 1280, h: 860 },
];

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  for (const L of LAYOUTS) {
    const ctx = await browser.newContext({ viewport: { width: L.w, height: L.h },
      deviceScaleFactor: 2, isMobile: L.w < 700, hasTouch: L.w < 700, colorScheme: 'dark' });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    await page.waitForTimeout(900);
    await page.evaluate(() => { selectedRace = races.find((r) => r.id === 'ninja'); });
    await page.click('#start-button'); await page.waitForTimeout(700);
    await page.click('#lb-ready'); await page.waitForTimeout(1800);

    const info = await page.evaluate(() => {
      document.querySelectorAll('.coach-card').forEach((c) => c.remove());
      SFX.play = () => {};
      player.races = ['ninja']; buildRaceIdx = 0; player.gold = 5000;
      const t = makeTower(SOUTH_TOP + 6, 12, 'ninja', 4, 'player');
      /* A JUST-PLACED TOWER GETS THE UNDO RING, not the action ring — that is
         the refund grace window doing its job. Age it past REFUND_GRACE or the
         probe measures the undo face and reports the actions as missing. */
      t.buildUntil = 0; t.placedAt = -1000; addTower(t);
      selectedTowerKey = t.key; selectedGroupKeys = [t.key];
      if (typeof renderTowerDetails === 'function') renderTowerDetails();
      if (typeof renderCommandSheet === 'function') renderCommandSheet();
      if (typeof renderRing === 'function') renderRing();
      const vis = (el) => { const r = el.getBoundingClientRect();
        return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== 'hidden'; };
      const rack = [...document.querySelectorAll('.bolt-rack')].filter(vis);
      const chips = [...document.querySelectorAll('.bolt-chip')].filter(vis);
      const note = [...document.querySelectorAll('[data-bolt-note]')].filter(vis)[0];
      const heads = [...document.querySelectorAll('.bolt-rack .panel-heading')].filter(vis);
      // is the rack scrolled out of reach rather than absent?
      let clipped = 0;
      const row = document.querySelector('.bolt-row');
      if (row) clipped = Math.max(0, row.scrollWidth - row.clientWidth);
      /* HOW MANY PRESSES FROM TAPPING THE TOWER TO THE RACK. On a phone the
         tower surface is the ring, and the rack lives in the wisp panel — so
         "not visible" and "unreachable" are different findings and the fix
         moves one of them, not the other. */
      const ringBtn = [...document.querySelectorAll('[data-ring="t-imbue"]')].filter(vis)[0];
      /* AND IT HAS TO BE THE THING UNDER THE THUMB. A sixth slot on a ring of
         56px discs is exactly where one button ends up sitting on another, and
         a control that renders but resolves to its neighbour is worse than one
         that is missing. Same check hittest.js makes of the other four. */
      let hitsSelf = null;
      if (ringBtn) {
        const r = ringBtn.getBoundingClientRect();
        const el = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
        hitsSelf = !!(el && (el === ringBtn || ringBtn.contains(el)));
      }
      let afterPress = null;
      if (ringBtn) {
        ringBtn.click();
        const r2 = [...document.querySelectorAll('.bolt-chip')].filter(vis);
        const n2 = [...document.querySelectorAll('[data-bolt-note]')].filter(vis)[0];
        const h2 = [...document.querySelectorAll('.bolt-rack .panel-heading')].filter(vis)[0];
        afterPress = { chips:r2.length, heading:h2 ? h2.textContent.trim() : null,
          note:n2 ? n2.textContent.trim() : null };
      }
      return {
        rackVisible: rack.length > 0,
        chipsVisible: chips.length,
        chipsTotal: document.querySelectorAll('.bolt-chip').length,
        heading: heads[0] ? heads[0].textContent.trim() : null,
        note: note ? note.textContent.trim() : null,
        clippedPx: clipped,
        towerName: towerDef('ninja', 4).name,
        why: { touchUI:typeof touchUI === 'function' ? touchUI() : null, battleRunning,
          groupLen:selectedGroupKeys.length, eligible:boltEligible(t),
          ringHidden:document.getElementById('action-ring')?.classList.contains('hidden'),
          ringBtns:document.querySelectorAll('[data-ring]').length },
        ringImbue: !!ringBtn, hitsSelf,
        ringLabel: ringBtn ? ringBtn.textContent.trim() : null,
        afterPress,
      };
    });

    const file = path.join(OUT, `blade-${L.name}.png`);
    await page.screenshot({ path: file });
    console.log(`\n=== ${L.name.toUpperCase()} (${L.w}x${L.h}) ===`);
    console.log(`  blade selected        ${info.towerName}`);
    console.log(`  rack on first sight   ${info.rackVisible ? 'visible' : 'NOT visible'}`);
    console.log(`  chips at zero presses ${info.chipsVisible} of ${info.chipsTotal}`);
    console.log(`  imbue button on ring  ${info.ringImbue ? JSON.stringify(info.ringLabel) : 'absent'}`);
    if (info.ringImbue) console.log(`  hit at its own centre ${info.hitsSelf}`);
    if (info.afterPress) {
      console.log(`  chips after 1 press   ${info.afterPress.chips} of ${info.chipsTotal}`);
      console.log(`  heading after press   ${JSON.stringify(info.afterPress.heading)}`);
      console.log(`  note after press      ${JSON.stringify(info.afterPress.note)}`);
    }
    console.log(`  rack heading          ${JSON.stringify(info.heading)}`);
    console.log(`  rack note             ${JSON.stringify(info.note)}`);
    if (info.clippedPx) console.log(`  row overflows by      ${info.clippedPx}px (scrolls)`);
    if (errs.length) console.log('  ERRORS', errs.slice(0, 3));
    console.log(`  shot                  ${file}`);
    await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
