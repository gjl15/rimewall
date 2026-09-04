// Balance harness: equal-gold tower groups vs the same creep stream, using the game's own sim.
const { chromium, CHROME, OUT } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8766/';
const wavesArg = (process.argv[3] || '3,8,12').split(',').map(Number);
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 300)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.evaluate(() => { selectedRace = races.find((r) => r.id === 'tech'); renderRaceCards(); });
  await page.click('#start-button');
  await page.waitForTimeout(1200);
  const rows = await page.evaluate((waves) => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    const _leak = resolveLeak; resolveLeak = (c) => { c.hpAtLeak = c.hp; return _leak(c); };
    SFX.play = () => {};
    const place = (raceId, tier, count, kit) => {
      player.races = [raceId]; buildRaceIdx = 0; selectedTowerTier = tier; player.gold = 1e6;
      let placed = 0;
      for (let r = 44; r >= 30 && placed < count; r -= 1) for (let c = 1; c <= 9 && placed < count; c += 1) {
        if (!isBuildableCell(r, c)) continue;
        buildAt({ r, c });
        const t = towers.get(idx(r, c));
        if (t) { t.buildUntil = 0; if (kit) { t.kit = kit; t.invested += towerKitCost(t); } placed += 1; }
      }
      return placed;
    };
    const run = (label, cfg, waveN, n = 10, secs = 75) => {
      resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false; ghost = null;
      waveClock = 1e9; incomeClock = 1e9; if (enemy) { enemy.buildClock = 1e9; enemy.sendClock = 1e9; enemy.gold = 0; }
      player.lives = 9999; player.startLives = 9999;
      const stripped = [];
      cfg.forEach(([raceId, tier, , , opt]) => { if (opt && opt.noSplash) { const d = TOWERS[raceId][tier]; if (d.splashKits) { d.splashKits = false; stripped.push(d); } } });
      const placed = cfg.map(([raceId, tier, count, kit]) => place(raceId, tier, count, kit)).reduce((a, b) => a + b, 0);
      const gold = [...towers.values()].reduce((s, t) => s + t.invested, 0);
      const def = waveDefFor(waveN);
      const spawned = []; let t = 0, next = 0, i = 0;
      while (t < secs) {
        if (i < n && t >= next) { spawnCreep(def, 'south', i % 2 ? 'east' : 'west', false); spawned.push(creeps[creeps.length - 1]); i += 1; next += .9; }
        simulate(1 / 30); t += 1 / 30;
        if (i >= n && spawned.every((c) => c.hp <= 0)) break;
      }
      stripped.forEach((d) => { d.splashKits = true; });
      const dealt = spawned.reduce((s, c) => s + (c.maxHp - Math.max(0, c.leaked ? c.hpAtLeak : c.hp)), 0);
      const kills = spawned.filter((c) => c.hp <= 0 && !c.leaked).length;
      const leaks = spawned.filter((c) => c.leaked).length;
      return { label, towers: placed, gold, wave: waveN, hp: def.hp, armor: def.armor || 0, cls: def.aClass, dealt: Math.round(dealt), kills, leaks, t: +t.toFixed(0) };
    };
    const SETS = {
      rockets: [
        ['Rocket Rack ×1, no splash effects', [['tech', 2, 1, null, { noSplash: true }]]],
        ['Rocket Rack ×1, with fire·ice·toxic', [['tech', 2, 1]]],
        ['Seeker ×1, no splash effects (215g)', [['tech', 4, 1, null, { noSplash: true }]]],
        ['Seeker ×1, with fire·ice·toxic', [['tech', 4, 1]]],
        ['Ion Array ×1 (145g)', [['tech', 3, 1]]],
        ['Skyfall Brazier ×1 (fire T2, 95g)', [['fire', 2, 1]]],
        ['Mirelobber ×1 (poison T2, 150g)', [['poison', 2, 1]]],
        ['Blightspire ×2 (poison T1, 100g)', [['poison', 1, 2]]],
        ['Longshot ×3 (75g)', [['tech', 1, 3]]],
      ],
    };
    const configs = SETS[waves.set] || [
      ['Bolt ×6', [['tech', 0, 6]]],
      ['Fire Bolt ×3', [['tech', 0, 3, 'fire']]],
      ['Ice Bolt ×3', [['tech', 0, 3, 'ice']]],
      ['Toxic Bolt ×3', [['tech', 0, 3, 'toxic']]],
      ['Piercing Bolt ×3', [['tech', 0, 3, 'piercing']]],
      ['Frostflick ×5 (ice T0)', [['ice', 0, 5]]],
      ['Kindler ×5 (fire T0)', [['fire', 0, 5]]],
      ['Cairn ×5 (stone T0)', [['stone', 0, 5]]],
      ['Static Post ×5 (elec T0)', [['electricity', 0, 5]]],
      ['Longshot ×2', [['tech', 1, 2]]],
      ['Fire Longshot ×1', [['tech', 1, 1, 'fire']]],
      ['Piercing Longshot ×1', [['tech', 1, 1, 'piercing']]],
      ['Hailslinger ×1 (ice T1, 40g)', [['ice', 1, 1]]],
      ['Rocket Rack ×1 (85g)', [['tech', 2, 1]]],
      ['Skyfall Brazier ×1 (fire T2, 95g)', [['fire', 2, 1]]],
      ['Worldheart Coffer ×1 (earth T2, 100g)', [['earth', 2, 1]]],
      ['Arc Weaver ×1 (elec T2, 100g)', [['electricity', 2, 1]]],
    ];
    const out = [];
    for (const w of waves.list) for (const [label, cfg] of configs) out.push(run(label, cfg, w));
    return out;
  }, { list: wavesArg, set: process.argv[4] || 'kits' });
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad('config', 38) + pad('twr', 4) + pad('gold', 6) + pad('wave', 5) + pad('hp', 6) + pad('arm', 4) + pad('class', 10) + pad('dealt', 7) + pad('kills', 6) + pad('leaks', 6) + 't');
  for (const r of rows) console.log(pad(r.label, 38) + pad(r.towers, 4) + pad(r.gold, 6) + pad(r.wave, 5) + pad(r.hp, 6) + pad(r.armor, 4) + pad(r.cls, 10) + pad(r.dealt, 7) + pad(r.kills, 6) + pad(r.leaks, 6) + r.t);
  if (errs.length) console.log('ERRORS', errs.slice(0, 5));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 400)); process.exit(1); });
