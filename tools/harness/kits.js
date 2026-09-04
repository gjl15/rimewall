// Functional check of tech kits: stats, effects, non-lethal floor, splash effects, and the pickers.
const { chromium, CHROME, OUT } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8766/';
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 300)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  // pick Tech on the menu, then start
  await page.evaluate(() => { selectedRace = races.find((r) => r.id === 'tech'); previewRaceId = 'tech'; renderRaceCards(); });
  await page.waitForTimeout(300);
  await page.click('#start-button');
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelectorAll('.coach-card').forEach((c) => c.remove()));
  const r = await page.evaluate(() => {
    const out = { race: selectedRace.id };
    battlePaused = true; player.gold = 100000;
    // place a Bolt on the player's half; find a buildable cell
    let cell = null;
    for (let rr = 30; rr < 44 && !cell; rr += 1) for (let cc = 3; cc < 10 && !cell; cc += 1) if (isBuildableCell(rr, cc)) cell = { r: rr, c: cc };
    if (!cell) return { error: 'no buildable cell' };
    selectedTowerTier = 0;
    buildAt({ r: cell.r, c: cell.c });
    const key = idx(cell.r, cell.c); const t = towers.get(key);
    if (!t) return { error: 'tower not placed', cell };
    t.buildUntil = 0;
    selectedTowerKey = key; selectedGroupKeys = [key];
    out.base = (({ name, dmg, cd, range }) => ({ name, dmg, cd, range }))(towerLiveStats(t));
    // fit a fire kit
    const g0 = player.gold; towerAction('kit:fire');
    const sf = towerLiveStats(t);
    out.fire = { paid: g0 - player.gold, kit: t.kit, name: sf.name, dmg: sf.dmg, cd: sf.cd, range: sf.range, invested: t.invested };
    // second kit must be refused
    towerAction('kit:ice'); out.secondKitRefused = t.kit === 'fire';
    // a creep takes a fire-kit hit: expect one refreshing 'kit-burn' dot at 20% of dmg
    const c = spawnCreep(WAVES[0], 'south', 'west', false) || creeps[creeps.length - 1];
    const creep = creeps[creeps.length - 1];
    creep.hp = creep.maxHp = 1000;
    applyHitEffects(creep, t, sf); applyHitEffects(creep, t, sf);
    out.burn = { dots: creep.dots.filter((d) => d.tag === 'kit-burn').length, dps: creep.dots.find((d) => d.tag === 'kit-burn')?.dps, expect: +(sf.dmg * .2).toFixed(2), slow: creep.slowUntil > simTime ? creep.slowPct : 0 };
    // toxic kit on a second tower: non-lethal floor at 1 HP
    let cell2 = null;
    for (let rr = 30; rr < 44 && !cell2; rr += 1) for (let cc = 20; cc < 30 && !cell2; cc += 1) if (isBuildableCell(rr, cc)) cell2 = { r: rr, c: cc };
    buildAt({ r: cell2.r, c: cell2.c }); const t2 = towers.get(idx(cell2.r, cell2.c)); t2.buildUntil = 0;
    selectedTowerKey = t2.key; selectedGroupKeys = [t2.key]; towerAction('kit:toxic');
    const st = towerLiveStats(t2);
    const c2 = (spawnCreep(WAVES[0], 'south', 'east', false), creeps[creeps.length - 1]);
    c2.hp = c2.maxHp = 3; c2.shield = 0; c2.shieldMax = 0;
    applyHitEffects(c2, t2, st);
    for (let i = 0; i < 400; i += 1) updateCreep(c2, .05);   // 20s of sickness on a 3 HP creep
    out.toxic = { name: st.name, slow: c2.slowPct, dot: c2.dots.find((d) => d.tag === 'kit-toxic')?.dps, hpAfter: +c2.hp.toFixed(2), floorHeld: c2.hp >= 1 };
    // piercing kit stats
    let cell3 = null;
    for (let rr = 30; rr < 44 && !cell3; rr += 1) for (let cc = 10; cc < 12 && !cell3; cc += 1) if (isBuildableCell(rr, cc)) cell3 = { r: rr, c: cc };
    buildAt({ r: cell3.r, c: cell3.c }); const t3 = towers.get(idx(cell3.r, cell3.c)); t3.buildUntil = 0;
    selectedTowerKey = t3.key; selectedGroupKeys = [t3.key]; towerAction('kit:piercing');
    const sp = towerLiveStats(t3);
    out.piercing = { name: sp.name, dmg: sp.dmg, cd: sp.cd, range: sp.range, armorPierce: sp.armorPierce };
    // tier-up clears the kit
    towerAction('tier'); out.tierUpClearsKit = { tier: t3.tier, kit: t3.kit, name: towerLiveStats(t3).name, range: towerLiveStats(t3).range };
    // Rocket splash effects: hit a creep with a rocket-tier stats copy, check target + neighbour
    const rocket = towerDef('tech', 2); const stR = { ...rocket, color: '#80a6ff' };
    const a = (spawnCreep(WAVES[0], 'south', 'west', false), creeps[creeps.length - 1]);
    const b = (spawnCreep(WAVES[0], 'south', 'west', false), creeps[creeps.length - 1]);
    a.hp = a.maxHp = 5000; b.hp = b.maxHp = 5000; b.x = a.x + 1; b.y = a.y; b.half = a.half;
    resolveProjectileHit({ tower: t, stats: stR, target: a, tx: a.x, ty: a.y, half: a.half });
    const tags = (cr) => (cr.dots || []).map((d) => d.tag + ':' + d.dps.toFixed(1)).join(',');
    out.rocket = { targetDots: tags(a), targetSlow: a.slowPct, neighbourDots: tags(b), neighbourSlow: b.slowPct, splashKits: !!rocket.splashKits };
    // wisp inspect shows the picker for an un-kitted bolt
    selectedTowerKey = key; selectedGroupKeys = [key]; t.kit = null;
    const html = renderWispInspect();
    out.pickerButtons = (html.match(/data-wp-act="kit:/g) || []).length;
    out.ionUnchanged = towerDef('tech', 3).range === 15 && !towerDef('tech', 3).splashKits && !towerDef('tech', 5).splashKits;
    out.longshotRange = towerDef('tech', 1).range;
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  // screenshot of the phone sheet/wisp inspect with the picker
  await page.evaluate(() => { wispTab = 'inspect'; renderWispPanel('inspect'); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + 'kits-wisp.png' });
  if (errs.length) console.log('ERRORS', errs.slice(0, 8));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 400)); process.exit(1); });
