/* You build a bolt. The panel is where it becomes something.

   Gene: "thers ballista here which is not what we wanted on the selct tower we
   want to build a bolt tower, and then on the right panel teher should be an
   easy to navigate way to change into ballista or multi shot, right now its too
   hard ot navigte and control."

   Four things have to be true:
     1. the build list offers the CHASSIS only — no ballista on an empty cell
     2. a placed bolt shows a weapon rack, with prices and what each gun is for
     3. one press fits it, keeping the tower's levels, imbuing and kills
     4. swapping a fitted weapon charges the difference, not full price
   node tools/harness/weaponrack.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 180)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.evaluate(() => { selectedRace = races.find((r) => r.id === 'tech'); });
  await page.click('#start-button'); await page.waitForTimeout(700);
  await page.click('#lb-ready'); await page.waitForTimeout(1700);

  const out = await page.evaluate(() => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};
    player.races = ['tech']; buildRaceIdx = 0; player.gold = 5000;
    renderTowerList();
    const buildList = [...document.querySelectorAll('.tower-row strong')].map((e) => e.textContent);

    // a placed, aged, levelled, imbued bolt
    const t = makeTower(SOUTH_TOP + 6, 12, 'tech', 0, 'player');
    t.buildUntil = 0; t.placedAt = -1000; t.level = 2; t.bolt = 'fire'; t.kills = 17;
    addTower(t);
    selectedTowerKey = t.key; selectedGroupKeys = [t.key];
    renderTowerDetails();

    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
    const chips = [...document.querySelectorAll('.weapon-chip')].filter(vis)
      .map((e) => e.textContent.replace(/\s+/g, ' ').trim());

    // fit the ballista
    const ballistaTier = towerListFor('tech').findIndex((d) => d.name === 'Ballista');
    const goldBefore = player.gold;
    towerAction('weapon:' + ballistaTier);
    const afterFit = { name:towerDef(t.raceId, t.tier).name, level:t.level, bolt:t.bolt,
      kills:t.kills, paid:goldBefore - player.gold };

    // swap ballista -> multishot, which should charge the difference
    const multiTier = towerListFor('tech').findIndex((d) => d.name === 'Multishot');
    const gold2 = player.gold;
    renderTowerDetails();
    towerAction('weapon:' + multiTier);
    const afterSwap = { name:towerDef(t.raceId, t.tier).name, paid:gold2 - player.gold,
      fullPrice:towerDef('tech', multiTier).cost };

    // and multishot actually throws more than one bolt
    resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
    towers.clear(); towersVersion += 1; creeps.length = 0; projectiles.length = 0;
    const m = makeTower(SOUTH_TOP + 6, 12, 'tech', multiTier, 'player');
    m.buildUntil = 0; m.placedAt = -1000; addTower(m);
    for (let i = 0; i < 5; i += 1) {
      spawnCreep(waveDefFor(4), 'south', 'west');
      const c = creeps[creeps.length - 1];
      c.hp = c.maxHp = 60000; c.spd = 0; c.x = 12 + 1.5 + i * .6; c.y = SOUTH_TOP + 6 + .5;
    }
    let maxInFlight = 0, marks = new Set();
    for (let i = 0; i < 60; i += 1) {
      simulate(1 / 30);
      maxInFlight = Math.max(maxInFlight, projectiles.length);
      projectiles.forEach((pr) => marks.add(pr.target));
    }
    const hurt = creeps.filter((c) => c.maxHp - c.hp > 0).length;
    matchOver = true; battleRunning = false;

    return { buildList, chips, afterFit, afterSwap,
      shots: towerDef('tech', multiTier).shots, maxInFlight, distinctMarks: marks.size, hurt,
      chassis: buildableListFor('tech').map(({ def }) => def.name) };
  });

  const p = (s, n) => String(s).padEnd(n);
  console.log('1. THE BUILD LIST');
  out.buildList.forEach((n) => console.log('   ' + n));
  const noWeapons = !out.buildList.some((n) => ['Ballista', 'Multishot', 'Siege Tank', 'Ion Array', 'Doomsday Silo'].includes(n));
  console.log('   ' + (noWeapons ? 'chassis only — no weapon offered on an empty cell' : 'STILL OFFERING WEAPONS'));

  console.log('\n2. THE RACK ON A PLACED BOLT');
  out.chips.forEach((c) => console.log('   ' + c));

  console.log('\n3. FITTING IT');
  console.log(`   became ${out.afterFit.name} for ${out.afterFit.paid}g`);
  console.log(`   kept level ${out.afterFit.level}, imbuing ${out.afterFit.bolt}, ${out.afterFit.kills} kills`);

  console.log('\n4. SWAPPING');
  console.log(`   ${out.afterSwap.name} charged ${out.afterSwap.paid}g against a ${out.afterSwap.fullPrice}g full price`);

  console.log('\n5. MULTISHOT FIRES ' + out.shots);
  console.log(`   ${out.maxInFlight} bolts in flight at once, ${out.distinctMarks} different creeps marked, ${out.hurt} of 5 damaged`);

  const ok = noWeapons && out.chips.length >= 4
    && out.afterFit.name === 'Ballista' && out.afterFit.level === 2 && out.afterFit.bolt === 'fire'
    && out.afterSwap.name === 'Multishot' && out.afterSwap.paid < out.afterSwap.fullPrice
    && out.maxInFlight > 1 && out.hurt > 1 && !errs.length;
  console.log('\n' + (ok ? 'PASS' : 'FAIL'));
  if (errs.length) console.log('ERRORS', errs.slice(0, 4));
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
