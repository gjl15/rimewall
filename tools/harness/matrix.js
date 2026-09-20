/* Every race, every tier, against every armour class — measured, not modelled.

   Two people independently reported the same thing: "some towers are not
   damaging mobs... previously with stone and now with tech". Stone turned out to
   be a numeral floor hiding ordinary hits. Tech is unexplained, and a report
   that vague needs a grid rather than a guess.

   So: park one tower beside one creep of a known class, run it, and record the
   HP that actually left the creep. Anything reading 0 is a tower that cannot
   hurt that class at all — which is a very different thing from hurting it
   badly, and is what a player means by "does no damage".

   node tools/harness/matrix.js <url> [--full]
     --full prints every tier; the default prints the per-race summary. */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';
const FULL = process.argv.includes('--full');

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
    const SECONDS = 20;   // long enough that a slow tower still registers
    const TARGETS = [
      { key: 'unarmored', aClass: 'unarmored', armor: 0,  air: false },
      { key: 'light',     aClass: 'light',     armor: 4,  air: false },
      { key: 'medium',    aClass: 'medium',    armor: 9,  air: false },
      { key: 'heavy',     aClass: 'heavy',     armor: 16, air: false },
      { key: 'fortified', aClass: 'fortified', armor: 20, air: false },
      { key: 'air',       aClass: 'light',     armor: 6,  air: true },
    ];

    /* TIME TO KILL A REALISTIC CREEP, not damage against an invented one.
       The first version of this gave every target 50 million hit points so the
       window could never be truncated — and then Stone, Poison and Electricity
       reported over a MILLION dps each, because Petrifier drops a creep to 11
       HP, `halve` takes half of current, and Thunderspike chips a share of max.
       Percentage mechanics scale with whatever you hand them, so a fake fat
       creep does not measure a race, it measures the fake.
       Every target now has the same ordinary hit points and differs only in the
       class and armour a player would actually meet. Seconds-to-kill is also
       simply the better number: it is what someone means by "this tower isn't
       doing anything", and it needs no model of how damage composes. */
    const CREEP_HP = 3000;
    const measure = (raceId, tier, target) => {
      resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
      towers.clear(); towersVersion += 1; creeps.length = 0;
      const row = SOUTH_TOP + 6, col = 12;
      const t = makeTower(row, col, raceId, tier, 'player');
      t.buildUntil = 0; addTower(t);
      spawnCreep(waveDefFor(4), 'south', 'west');
      const c = creeps[creeps.length - 1];
      c.hp = c.maxHp = CREEP_HP; c.spd = 0; c.slowPct = 0;
      c.aClass = target.aClass; c.armor = target.armor; c.air = target.air;
      c.x = col + 1.3; c.y = row;          // one cell away: inside even a melee reach
      let frames = 0;
      const cap = SECONDS * 30;
      while (frames < cap && c.hp > 0) { simulate(1 / 30); frames += 1; }
      // effective dps, or 0 when it could not kill inside the window at all
      const killed = c.hp <= 0;
      const dealt = CREEP_HP - Math.max(0, c.hp);
      matchOver = true; battleRunning = false;
      return { ttk: killed ? +(frames / 30).toFixed(2) : null, dps: Math.round(dealt / (frames / 30)) };
    };

    return races.map((r) => {
      const list = towerListFor(r.id);
      const own = list.slice(0, list.length - 2);   // drop the shared Laser and Bulwark rungs
      const tiers = own.map((def, i) => {
        const row = { tier: i, name: def.name, groundOnly: !!def.groundOnly, special: def.special };
        TARGETS.forEach((tg) => { row[tg.key] = measure(r.id, i, tg).dps; });
        return row;
      });
      return { race: r.name, id: r.id, tiers };
    });
  });

  const p = (s, n) => String(s).padEnd(n);
  const KEYS = ['unarmored', 'light', 'medium', 'heavy', 'fortified', 'air'];

  if (FULL) {
    out.forEach((r) => {
      console.log('\n' + r.race.toUpperCase());
      console.log('  ' + p('tier', 6) + p('tower', 20) + KEYS.map((k) => p(k, 11)).join(''));
      r.tiers.forEach((t) => console.log('  ' + p('T' + t.tier, 6) + p(t.name, 20)
        + KEYS.map((k) => p(t[k] === 0 ? '0  ZERO' : t[k].toLocaleString(), 11)).join('')));
    });
  }

  console.log('\nDPS DELIVERED, averaged across a race\'s own tiers\n');
  console.log('  ' + p('race', 14) + KEYS.map((k) => p(k, 11)).join('') + 'worst class');
  const rows = out.map((r) => {
    const avg = {};
    KEYS.forEach((k) => { avg[k] = Math.round(r.tiers.reduce((s, t) => s + t[k], 0) / r.tiers.length); });
    const worst = KEYS.slice().sort((a, b) => avg[a] - avg[b])[0];
    return { race: r.race, avg, worst, overall: Math.round(KEYS.reduce((s, k) => s + avg[k], 0) / KEYS.length) };
  });
  rows.sort((a, b) => b.overall - a.overall);
  rows.forEach((r) => console.log('  ' + p(r.race, 14) + KEYS.map((k) => p(r.avg[k].toLocaleString(), 11)).join('')
    + r.worst + ' (' + r.avg[r.worst].toLocaleString() + ')'));

  // the actual question: which tower cannot hurt which class AT ALL
  const zeroes = [];
  out.forEach((r) => r.tiers.forEach((t) => KEYS.forEach((k) => {
    if (t[k] === 0) zeroes.push(`${r.race} T${t.tier} ${t.name} vs ${k}${t.groundOnly ? '  (groundOnly)' : ''}`);
  })));
  console.log('\nTOWERS THAT DEAL LITERALLY NOTHING TO A CLASS: ' + zeroes.length);
  zeroes.forEach((z) => console.log('  ' + z));
  if (errs.length) console.log('\nERRORS', errs.slice(0, 4));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
