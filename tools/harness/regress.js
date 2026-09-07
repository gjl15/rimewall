/* Ten-race regression: how far does each element get?

   Rather than write a builder that would disagree with the game's own, this
   drives the ALLY AI already in the file — the same code that plays a bot
   teammate — with the player's purse, on the player's half, and reports the
   wave the run dies on. Comparable between builds; not a claim about how a
   human plays.

   node tools/harness/regress.js <url> [maxWave] [race,race,...] [econScale] [wavePressure] */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';
const maxWave = Number(process.argv[3] || 45);
const only = (process.argv[4] || '').split(',').filter(Boolean);
const econScale = process.argv[5] ? Number(process.argv[5]) : null;
const pressure = process.argv[6] ? Number(process.argv[6]) : null;

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await page.addInitScript((o) => {
    if (o.econScale) window.__ECON_SCALE__ = o.econScale;
    if (o.pressure) window.__WAVE_PRESSURE__ = o.pressure;
  }, { econScale, pressure });
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await page.click('#start-button');
  await page.waitForTimeout(1200);
  const out = await page.evaluate(async ({ maxWave, only }) => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    if (typeof closeLobby === 'function') closeLobby();
    SFX.play = () => {};
    const list = (only.length ? races.filter((r) => only.includes(r.id)) : races).map((r) => r.id);
    const rows = [];
    for (const raceId of list) {
      selectedRace = races.find((r) => r.id === raceId);
      const modeSel = document.getElementById('mode-select'); if (modeSel) modeSel.value = 'survival';   // no rival: measure the wall, not the duel
      resetMatchState();
      battleRunning = true; battlePaused = false; matchOver = false;
      // a bot that spends the PLAYER's purse on the PLAYER's half
      const bot = makeAlly(PLAYER_HALF, 0, raceId, 1);
      /* makeAlly zones a seat to one flank; a solo human holds the whole half,
         so widen it or the bot leaves a lane completely undefended and the
         number measures the zoning, not the race. */
      const marks = [sharedFlagCell(PLAYER_HALF)];
      const near = (cell) => Math.min(...marks.map((m) => Math.hypot(cell.r - m.r, cell.c - m.c)));
      bot.zone = { c0:0, c1:COLS - 1, label:'whole half' };
      bot.spots = mazeOrderSouth().sort((a, b) => near(a) - near(b));
      bot.gold = 0;
      let peakTowers = 0;
      for (let step = 0; step < maxWave * 40 * 30 && !matchOver && player.lives > 0 && wave <= maxWave; step += 1) {
        bot.gold = player.gold; updateAlly(bot, 1 / 20); player.gold = bot.gold;
        simulate(1 / 20);
        if (towers.size > peakTowers) peakTowers = towers.size;
      }
      rows.push({ race:races.find((r) => r.id === raceId).name, wave:Math.min(wave, maxWave), lives:Math.round(player.lives), towers:peakTowers, capped:wave > maxWave });
      matchOver = true; battleRunning = false;
    }
    return { rows, econ:+ECON_SCALE.toFixed(2), hpScale:+(typeof CREEP_HP_SCALE === 'number' ? CREEP_HP_SCALE : 1).toFixed(2) };
  }, { maxWave, only });
  const p = (s, n) => String(s).padEnd(n);
  const waves = out.rows.map((r) => r.wave).sort((a, b) => a - b);
  const median = waves.length % 2 ? waves[(waves.length - 1) / 2] : (waves[waves.length / 2 - 1] + waves[waves.length / 2]) / 2;
  console.log(`ECON_SCALE ${out.econ}  CREEP_HP_SCALE ${out.hpScale}  cap wave ${maxWave}`);
  console.log(p('race', 14) + p('died wave', 11) + p('lives left', 12) + 'peak towers');
  out.rows.forEach((r) => console.log(p(r.race, 14) + p(r.wave + (r.capped ? '+' : ''), 11) + p(r.lives, 12) + r.towers));
  console.log(`median death wave ${median}   worst ${waves[0]}   best ${waves[waves.length - 1]}`);
  if (errs.length) console.log('ERRORS', errs.slice(0, 4));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
