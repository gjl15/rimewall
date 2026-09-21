/* Gene: "thers a bug in upgrading tech and ninja."

   Both are rack races now, and towerTierUp deliberately refuses to step onto a
   weapon — so the question is whether the TIER button still leads anywhere on
   the surfaces a player actually uses. This walks every upgrade route a placed
   tower has, on both layouts, for both rack races and one ordinary race as the
   control.
   node tools/harness/upgradepath.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const out = [];
  for (const L of [{ n: 'laptop', w: 1280, h: 900 }, { n: 'phone', w: 390, h: 844 }]) {
    const ctx = await browser.newContext({ viewport: { width: L.w, height: L.h },
      isMobile: L.w < 700, hasTouch: L.w < 700 });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    await page.waitForTimeout(900);
    await page.click('#start-button'); await page.waitForTimeout(700);
    await page.click('#lb-ready'); await page.waitForTimeout(1700);

    const res = await page.evaluate((layout) => {
      document.querySelectorAll('.coach-card').forEach((c) => c.remove());
      SFX.play = () => {};
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
      const rows = [];
      /* Tech has TWO chassis rungs, so the route only proves out if the second
         one also reaches the rack — the bolt can still tier to the long bolt,
         and it was the long bolt that used to dead-end on a phone. */
      for (const [raceId, startTier] of [['tech', 0], ['tech', 1], ['ninja', 0], ['ice', 0]]) {
        player.races = [raceId]; buildRaceIdx = 0; player.gold = 9000; player.lumber = 9;
        towers.clear(); towersVersion += 1;
        const t = makeTower(SOUTH_TOP + 6, 12, raceId, startTier, 'player');
        t.buildUntil = 0; t.placedAt = -1000; addTower(t);
        selectedTowerKey = t.key; selectedGroupKeys = [t.key];
        renderTowerList(); renderTowerDetails();
        if (typeof renderRing === 'function') renderRing();
        if (typeof renderCommandSheet === 'function') renderCommandSheet();

        const up = towerTierUp(t);
        // what the TIER control says on this layout
        /* READ THE SURFACE THE PLAYER IS ON. The desktop panel's markup exists in
           the DOM on a phone too, just hidden — so preferring #td-tier reported
           the laptop's button as if it were the phone's and made a broken phone
           look fixed. Visible controls only, ring first on touch. */
        /* OPEN THE SURFACE A PHONE ACTUALLY OPENS. Selecting a tower by tap
           opens the wisp inspect panel on touch; setting selectedTowerKey
           directly does not, so the probe was reading a closed panel and calling
           it a missing control. */
        if (typeof touchUI === 'function' && touchUI()) { wispTab = 'inspect'; renderWispPanel('inspect'); }
        const tierBtn = [...document.querySelectorAll('[data-wp-act="tier"],[data-wp-act="armhint"],#td-tier')].filter(vis)[0];
        const lvlBtn = [...document.querySelectorAll('[data-wp-act="level"],#td-level')].filter(vis)[0];
        const rack = [...document.querySelectorAll('.weapon-chip')].filter(vis).length;
        const ringWeapon = [...document.querySelectorAll('[data-wp-act="armhint"]')].filter(vis).length;
        /* THE ROUTE FORWARD, whatever shape it takes. A rack race has no tier to
           take; what it must have is a way to reach the rack from the surface
           the player is actually on. */
        const ringBtn = [...document.querySelectorAll('[data-wp-act="armhint"]')].filter(vis)[0];
        let rackAfterPress = 0;
        if (ringBtn) { ringBtn.click(); rackAfterPress = [...document.querySelectorAll('.weapon-chip')].filter(vis).length; }

        // can the player actually level it up?
        const g0 = player.gold, l0 = t.level || 0;
        towerAction('level');
        const levelled = (t.level || 0) > l0;

        rows.push({ layout, race:raceId, chassis:towerDef(raceId, startTier).name,
          tierUpTo: up ? up.next.name : null,
          tierLabel: tierBtn ? tierBtn.textContent.replace(/\s+/g, ' ').trim().slice(0, 34) : 'NO TIER CONTROL',
          tierDisabled: tierBtn ? !!tierBtn.disabled : null,
          lvlLabel: lvlBtn ? lvlBtn.textContent.replace(/\s+/g, ' ').trim().slice(0, 28) : 'NO LEVEL CONTROL',
          levelled, weaponChips:rack, ringWeapon, rackAfterPress,
          ringBtns:[...document.querySelectorAll('[data-ring]')].filter(vis).length,
          trayBtns:[...document.querySelectorAll('[data-wp-act]')].filter(vis).length,
          touch:typeof touchUI === 'function' ? touchUI() : null,
          running:battleRunning });
      }
      return { rows, errs:[] };
    }, L.n);
    out.push(...res.rows);
    if (errs.length) out.push({ layout:L.n, race:'—', tierLabel:'PAGE ERROR ' + errs[0] });
    await ctx.close();
  }

  const p = (s, n) => String(s).padEnd(n);
  console.log('  ' + p('layout', 9) + p('race', 7) + p('chassis', 17) + p('tier leads to', 15)
    + p('tier button says', 36) + p('levels?', 9) + 'rack');
  out.forEach((r) => console.log('  ' + p(r.layout, 9) + p(r.race, 7) + p(r.chassis || '', 17)
    + p(r.tierUpTo || '—', 15) + p(JSON.stringify(r.tierLabel), 36)
    + p(r.levelled ? 'yes' : 'NO', 9)
    + (r.weaponChips != null ? (r.weaponChips + ' chips'
        + (r.ringWeapon ? `, ring ARM -> ${r.rackAfterPress}` : '')) : '')
    + `  [ring ${r.ringBtns} panel ${r.trayBtns} touch ${r.touch}]`));

  const stuck = out.filter((r) => r.race !== 'ice' && r.race !== '—'
    && !r.tierUpTo && !r.weaponChips && !r.rackAfterPress);
  const noLevel = out.filter((r) => r.race !== '—' && r.levelled === false);
  console.log('');
  if (stuck.length) console.log('  STUCK — no tier to take and no rack on screen: '
    + stuck.map((r) => `${r.race} on ${r.layout}`).join(', '));
  if (noLevel.length) console.log('  CANNOT LEVEL: ' + noLevel.map((r) => `${r.race} on ${r.layout}`).join(', '));
  if (!stuck.length && !noLevel.length) console.log('  every placed tower has a route forward on both layouts');
  await browser.close();
  process.exit(stuck.length || noLevel.length ? 1 : 0);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
