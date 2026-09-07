/* Check a review's claims against the running game, and re-check them after a fix.
   node tools/harness/verify.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';
const RACES = ['gravity', 'fire', 'ice', 'electricity', 'earth', 'poison'];

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1800);
  const out = await page.evaluate((raceIds) => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};
    const r = {};
    r.waveCount = WAVES.length;
    r.hudHardcodes20 = /\/20`/.test(renderHud.toString());
    r.loopMult = +WAVE_LOOP_MULT.toFixed(1);
    r.breadthLastWave = AI_BREADTH_LAST_WAVE;

    const waveHp = (n) => {
      const d = waveDefFor(n);
      const per = Math.round((d.hp || 1) * (d.boss ? 1 : TRAIT.hpScaleNeutral * waveHpMult(n)) * (d.role === 'juggernaut' ? 2.4 : 1) * CREEP_HP_SCALE);
      const cnt = Math.round((d.count || 6) * (d.boss ? 1 : 1.3));
      return { name: d.name, per, count: cnt, total: per * cnt };
    };
    r.waves = [23, 24, 25, 26, 27, 28, 49, 50, 51].map((n) => Object.assign({ n }, waveHp(n)));
    r.cliff = +(waveHp(24).total / waveHp(26).total).toFixed(2);
    r.cliff2 = +(waveHp(49).total / waveHp(51).total).toFixed(2);

    const tierRun = (raceId) => {
      selectedRace = races.find((x) => x.id === raceId);
      const sel = document.getElementById('mode-select'); if (sel) sel.value = 'survival';
      resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
      const bot = makeAlly(PLAYER_HALF, 0, raceId, 1);
      const marks = [sharedFlagCell(PLAYER_HALF)];
      const near = (c) => Math.min(...marks.map((m) => Math.hypot(c.r - m.r, c.c - m.c)));
      bot.zone = { c0: 0, c1: COLS - 1, label: 'all' };
      bot.spots = mazeOrderSouth().sort((a, b) => near(a) - near(b));
      bot.gold = 0;
      for (let i = 0; i < 40 * 40 * 20 && !matchOver && player.lives > 0 && wave <= 40; i += 1) {
        bot.gold = player.gold; updateAlly(bot, 1 / 20); player.gold = bot.gold;
        simulate(1 / 20);
      }
      /* Death wave of this stripped bot is NOT a difficulty number — it runs one
         seat off the player's purse against a full wave load. What it does
         measure honestly is the WALL the AI chooses to build, which is the thing
         a person actually plays against: how much gold went in, and how much
         damage per second stands at the end of it. */
      const tiers = {};
      let dps = 0, spend = 0;
      towers.forEach((t) => {
        tiers[t.tier] = (tiers[t.tier] || 0) + 1;
        const d = towerDef(t.raceId, t.tier);
        if (d) { dps += (d.dmg || 0) / Math.max(0.05, d.cd || 1); spend += d.cost || 0; }
      });
      const top = Math.max(...[...towers.values()].map((t) => t.tier), 0);
      matchOver = true; battleRunning = false;
      return { race: raceId, diedWave: wave, towers: towers.size, top, tiers, dps: Math.round(dps), spend };
    };
    r.bots = raceIds.map(tierRun);
    return r;
  }, RACES);
  const p = (s, n) => String(s).padEnd(n);
  console.log('WAVES.length =', out.waveCount, '| HUD still hardcodes /20:', out.hudHardcodes20, '| WAVE_LOOP_MULT =', out.loopMult);
  console.log('AI_BREADTH_LAST_WAVE =', out.breadthLastWave);
  console.log('\nwave curve across both loop boundaries');
  console.log('  ' + p('wave', 6) + p('creep', 24) + p('hp each', 11) + p('n', 4) + 'wave total');
  out.waves.forEach((w) => console.log('  ' + p(w.n, 6) + p(w.name, 24) + p(w.per.toLocaleString(), 11) + p(w.count, 4) + w.total.toLocaleString()));
  console.log('  wave 24 -> 26 drop:', out.cliff + 'x   (was 35.5x)');
  console.log('  wave 49 -> 51 drop:', out.cliff2 + 'x');
  console.log('\nthe wall the AI builds  (death wave here is a harness figure, not a difficulty rating)');
  console.log('  ' + p('race', 14) + p('towers', 8) + p('gold in', 9) + p('wall dps', 10) + p('top', 5) + 'tier spread');
  out.bots.forEach((b) => console.log('  ' + p(b.race, 14) + p(b.towers, 8) + p(b.spend + 'g', 9) + p(b.dps, 10) + p('T' + b.top, 5) + JSON.stringify(b.tiers)));
  const avg = (f) => Math.round(out.bots.reduce((s, b) => s + f(b), 0) / out.bots.length);
  console.log('  mean across races: ' + avg((b) => b.dps) + ' dps for ' + avg((b) => b.spend) + 'g');
  if (errs.length) console.log('\nERRORS', errs.slice(0, 4));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
