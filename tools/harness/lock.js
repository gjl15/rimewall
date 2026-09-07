/* How much of a creep's life does a wall spend holding it still?

   Several specials fire on a percentage and stop a creep dead: Electricity's
   stasis, Earth's stun, Ice's freeze, Tech's root, Gravity's slam. Only
   Gravity's has a cooldown. With enough towers the others can chain, and a
   creep that never moves is not a defence, it is a lock — the same thing
   Gravity's cooldown exists to prevent.

   This walks one creep past a wall of each element and reports the share of
   time it was unable to move.
   node tools/harness/lock.js <url> [towers] */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';
const nTowers = Number(process.argv[3] || 26);

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1800);
  const rows = await page.evaluate(({ nTowers }) => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};
    const out = [];
    for (const race of races) {
      const sel = document.getElementById('mode-select'); if (sel) sel.value = 'survival';
      selectedRace = race;
      resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
      player.lives = 99999; player.startLives = 99999;
      const marks = [sharedFlagCell(PLAYER_HALF)];
      const near = (c) => Math.min(...marks.map((m) => Math.hypot(c.r - m.r, c.c - m.c)));
      const spots = mazeOrderSouth().sort((a, b) => near(a) - near(b));
      let placed = 0;
      for (const s of spots) { if (placed >= nTowers) break; if (!isBuildableCell(s.r, s.c)) continue;
        const t = makeTower(s.r, s.c, race.id, 4, 'player'); t.buildUntil = 0; addTower(t); placed += 1; }
      // one very tough creep so it survives long enough to measure
      const def = Object.assign({}, waveDefFor(1), { hp:400000, spd:2, armor:0, aClass:'medium', name:'Dummy' });
      spawnCreep(def, 'south', 'west', false);
      const c = creeps[creeps.length - 1];
      c.hp = c.maxHp = 400000;
      let steps = 0, held = 0, slowed = 0;
      for (let i = 0; i < 30 * 45 && c.hp > 0; i += 1) {
        simulate(1 / 30); steps += 1;
        const stopped = c.stunUntil > simTime || c.stasisUntil > simTime || c.frozenUntil > simTime;
        if (stopped) held += 1;
        else if ((c.slowUntil > simTime && c.slowPct) || (c.frostUntil > simTime && c.frostPct)) slowed += 1;
      }
      out.push({ race:race.name, towers:placed,
        heldPct:+(held / Math.max(1, steps) * 100).toFixed(1),
        slowedPct:+(slowed / Math.max(1, steps) * 100).toFixed(1) });
      matchOver = true; battleRunning = false;
    }
    return out;
  }, { nTowers });
  const p = (s, n) => String(s).padEnd(n);
  console.log(`${nTowers} tier-5 towers, one creep, 45 seconds. "held" = it could not move at all.`);
  console.log(p('race', 14) + p('held %', 10) + 'slowed %');
  rows.sort((a, b) => b.heldPct - a.heldPct).forEach((r) => console.log(p(r.race, 14) + p(r.heldPct, 10) + r.slowedPct));
  if (errs.length) console.log('ERRORS', errs.slice(0, 4));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
