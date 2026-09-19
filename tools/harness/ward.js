/* The Bulwark Stake is cheap; its ward is what costs. Does each ward do the
   thing its card claims?

   Gene: "Bulwark tower ... lower the cost to < 5g. Upgradable via lumber to
   improve hp, hp regen, thorns dmg, slowing aura, enhancements to other towers."

   Five wards, one per stake, bought with lumber. Each is checked against a bare
   stake so the number is a difference and not an assertion.
   node tools/harness/ward.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1800);

  const out = await page.evaluate(() => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};
    const stakeTier = towerListFor('ice').length - 1;
    const def = towerDef('ice', stakeTier);

    const stake = (ward) => {
      resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
      towers.clear(); towersVersion += 1; creeps.length = 0;
      player.gold = 1e6; player.lumber = 9;
      const t = makeTower(SOUTH_TOP + 6, 12, 'ice', stakeTier, 'player');
      t.buildUntil = 0; addTower(t);
      if (ward) { selectedTowerKey = t.key; selectedGroupKeys = [t.key]; towerAction('ward:' + ward); }
      return towers.get(t.key);
    };

    // REINFORCE — more hit points than a bare stake
    const plainHp = stake(null).blockMaxHp;
    const reinfHp = stake('reinforce').blockMaxHp;

    // MEND — repairs itself when nothing is hitting it
    const mendT = stake('mend'); mendT.blockHp = mendT.blockMaxHp * .3;
    const mendBefore = mendT.blockHp;
    for (let i = 0; i < 60; i += 1) simulate(1 / 30);
    const mendAfter = mendT.blockHp;

    // THORNS — an attacker striking it takes damage back
    const thorn = (ward) => {
      const t = stake(ward);
      const def2 = sendCreepDef(SENDS.find((x) => x.id === 'ruiner'));
      spawnCreep(def2, 'south', 'west');
      const c = creeps[creeps.length - 1];
      c.hp = c.maxHp = 5e7; c.x = t.c + .4; c.y = t.r; c.spd = 0;
      c.state = 'attack'; c.blockTargetKey = t.key; c.attackClock = 0;
      const before = c.hp;
      for (let i = 0; i < 90; i += 1) simulate(1 / 30);
      return Math.round(before - c.hp);
    };
    const thornsOff = thorn(null), thornsOn = thorn('thorns');

    // CHILL — creeps nearby are slowed
    const chill = (ward) => {
      const t = stake(ward);
      spawnCreep(waveDefFor(3), 'south', 'west');
      const c = creeps[creeps.length - 1];
      c.hp = c.maxHp = 5e7; c.x = t.c + 1; c.y = t.r;
      for (let i = 0; i < 20; i += 1) simulate(1 / 30);
      return Math.round(c.slowPct || 0);
    };
    const chillOff = chill(null), chillOn = chill('chill');

    // BANNER — a neighbouring tower hits harder
    const banner = (ward) => {
      const t = stake(ward);
      const n = makeTower(t.r, t.c + 1, 'ice', 2, 'player');
      n.buildUntil = 0; addTower(n);
      return towerLiveStats(n).dmg;
    };
    const bannerOff = banner(null), bannerOn = banner('banner');

    matchOver = true; battleRunning = false;
    return { cost: def.cost, lumber: def.lumber || 0, wardLumber: wardCost(),
      plainHp, reinfHp,
      mendBefore: Math.round(mendBefore), mendAfter: Math.round(mendAfter),
      thornsOff, thornsOn, chillOff, chillOn, bannerOff, bannerOn };
  });

  const p = (s, n) => String(s).padEnd(n);
  console.log(`Bulwark Stake — ${out.cost}g${out.lumber ? ` + ${out.lumber} lumber` : ' (no lumber to place)'}; a ward costs ${out.wardLumber} lumber\n`);
  console.log('  ' + p('ward', 14) + p('without', 12) + p('with', 12) + 'effect');
  const row = (name, off, on, what) => console.log('  ' + p(name, 14) + p(off, 12) + p(on, 12) + what);
  row('reinforce', out.plainHp + ' hp', out.reinfHp + ' hp', `+${Math.round((out.reinfHp / out.plainHp - 1) * 100)}% hit points`);
  row('mend', out.mendBefore + ' hp', out.mendAfter + ' hp', `repaired ${out.mendAfter - out.mendBefore} hp in 2s`);
  row('thorns', out.thornsOff, out.thornsOn, 'damage returned to an attacker in 3s');
  row('chill', out.chillOff + '%', out.chillOn + '%', 'slow applied to a creep alongside it');
  row('banner', out.bannerOff, out.bannerOn, 'damage on the tower next door');

  const ok = out.reinfHp > out.plainHp && out.mendAfter > out.mendBefore
    && out.thornsOn > out.thornsOff && out.chillOn > out.chillOff && out.bannerOn > out.bannerOff
    && out.cost < 5;
  console.log('\n' + (ok ? 'PASS — the stake is under 5g and every ward does its job' : 'FAIL'));
  if (errs.length) { console.log('ERRORS', errs.slice(0, 3)); process.exit(1); }
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
