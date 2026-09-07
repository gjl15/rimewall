/* How much of Gravity's control actually lands.

   Every gravity hit rolls an impulse. Displacements are gated by a 3s per-creep
   and a 3.5s per-tower cooldown, and a roll that lands on one while a cooldown
   is running used to return doing NOTHING — no shove, no stun, no slow. This
   counts the rolls and what became of them.
   node tools/harness/grav.js <url> [towers] [seconds] */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';
const nTowers = Number(process.argv[3] || 24);
const secs = Number(process.argv[4] || 60);

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1800);
  const out = await page.evaluate(({ nTowers, secs }) => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};
    const run = (fallback) => {
      selectedRace = races.find((r) => r.id === 'gravity');
      const sel = document.getElementById('mode-select'); if (sel) sel.value = 'survival';
      resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
      player.lives = 99999; player.startLives = 99999;
      // a wall of tier-2 pulses along the route
      const bot = makeAlly(PLAYER_HALF, 0, 'gravity', 1);
      const marks = [sharedFlagCell(PLAYER_HALF)];
      const near = (cell) => Math.min(...marks.map((m) => Math.hypot(cell.r - m.r, cell.c - m.c)));
      const spots = mazeOrderSouth().sort((a, b) => near(a) - near(b));
      let placed = 0;
      for (const s of spots) { if (placed >= nTowers) break; if (!isBuildableCell(s.r, s.c)) continue;
        const t = makeTower(s.r, s.c, 'gravity', 2, 'player'); t.buildUntil = 0; addTower(t); placed += 1; }
      // count what every impulse roll turns into
      const tally = { rolls:0, slow:0, displaced:0, wasted:0 };
      const realRoll = rollGravImpulse, realShove = shoveCreep;
      let pending = null;
      window.rollGravImpulse = (sp) => { const k = realRoll(sp); tally.rolls += 1; pending = k; return k; };
      window.shoveCreep = (...a) => { tally.displaced += 1; pending = null; return realShove(...a); };
      const realImpulse = gravityImpulse;
      window.gravityImpulse = (creep, tower, stats) => {
        const beforeSlow = creep.slowUntil, beforeStun = creep.stunUntil;
        pending = null;
        realImpulse(creep, tower, stats);
        if (pending) {
          // the roll was a displacement: did anything at all happen?
          if (creep.stunUntil > beforeStun) tally.displaced += 1;
          else if (creep.slowUntil > beforeSlow) tally.slow += 1;
          else tally.wasted += 1;
        } else if (creep.slowUntil > beforeSlow) tally.slow += 1;
      };
      let t = 0, n = 0, next = 0;
      const def = waveDefFor(6);
      while (t < secs) {
        if (n < 40 && t >= next) { spawnCreep(def, 'south', n % 2 ? 'east' : 'west', false); n += 1; next += 1.1; }
        simulate(1 / 30); t += 1 / 30;
      }
      window.rollGravImpulse = realRoll; window.shoveCreep = realShove; window.gravityImpulse = realImpulse;
      matchOver = true; battleRunning = false;
      return { towers:placed, ...tally };
    };
    return run(true);
  }, { nTowers, secs });
  const total = Math.max(1, out.rolls);
  console.log(`${out.towers} gravity towers, ${secs}s, ${out.rolls} impulse rolls`);
  console.log(`  displaced (shove or stun): ${out.displaced}  (${(out.displaced / total * 100).toFixed(1)}%)`);
  console.log(`  slowed instead:            ${out.slow}  (${(out.slow / total * 100).toFixed(1)}%)`);
  console.log(`  DID NOTHING:               ${out.wasted}  (${(out.wasted / total * 100).toFixed(1)}%)`);
  if (errs.length) console.log('ERRORS', errs.slice(0, 4));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
