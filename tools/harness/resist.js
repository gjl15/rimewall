/* "Some towers are not damaging mobs" — Abdy, twice, about two different races.

   Stone was a numeral floor and is fixed. Tech is not a bug: Pierce meets
   fortified at 0.4 and a 6-damage Bolt Turret behind 20 armour lands under a
   point a shot. That is the class matrix working as designed. What was missing
   is that nothing said so WHILE IT HAPPENED, so a wall failing on a matchup
   looked exactly like a wall that was broken.

   This asserts the resisted mark fires where the matrix is punishing and stays
   quiet where it is not — otherwise it is noise, and noise teaches nothing.
   node tools/harness/resist.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1800);

  const out = await page.evaluate(() => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};
    const CASES = [
      { race: 'tech',  tier: 0, aClass: 'fortified', armor: 20, want: true,  why: 'Pierce 0.40 — the complaint' },
      { race: 'tech',  tier: 0, aClass: 'light',     armor: 4,  want: false, why: 'Pierce 1.50 — its best matchup' },
      { race: 'ninja', tier: 1, aClass: 'fortified', armor: 20, want: true,  why: 'Blade 0.45' },
      { race: 'earth', tier: 1, aClass: 'fortified', armor: 20, want: false, why: 'Siege 1.55 — the anti-plate race' },
      { race: 'stone', tier: 1, aClass: 'fortified', armor: 20, want: false, why: 'Crush 1.50' },
      { race: 'ice',   tier: 1, aClass: 'fortified', armor: 20, want: true,  why: 'Frost 0.55' },
      { race: 'fire',  tier: 1, aClass: 'medium',    armor: 9,  want: false, why: 'Blast 1.25' },
    ];
    return CASES.map((c) => {
      resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
      towers.clear(); towersVersion += 1; creeps.length = 0;
      const row = SOUTH_TOP + 6, col = 12;
      const t = makeTower(row, col, c.race, c.tier, 'player');
      t.buildUntil = 0; addTower(t);
      spawnCreep(waveDefFor(4), 'south', 'west');
      const k = creeps[creeps.length - 1];
      /* maxHp drives the numeral floor (max(6, maxHp*.004)), so a fake fat
         creep suppresses every numeral and the probe measures nothing. Ordinary
         hit points, topped back up each frame so the target cannot die. */
      k.hp = k.maxHp = 3000; k.spd = 0; k.slowPct = 0;
      k.aClass = c.aClass; k.armor = c.armor; k.air = false;
      k.x = col + 1.3; k.y = row;
      let marks = 0, nums = 0;
      const seen = new Set();
      for (let i = 0; i < 600; i += 1) {
        simulate(1 / 30);
        k.hp = k.maxHp;
        effects.forEach((f) => {
          /* Only DAMAGE numerals. Gold, venom and the frost bite are also
             kind 'num' and keep the mono face; serif is what marks a damage
             numeral, and counting the others read Ice as three misses. */
          if (f.kind !== 'num' || !f.serif || seen.has(f)) return;
          seen.add(f); nums += 1; if (f.resist) marks += 1;
        });
      }
      matchOver = true; battleRunning = false;
      return { ...c, nums, marks, got: nums > 0 && marks === nums };
    });
  });

  const p = (s, n) => String(s).padEnd(n);
  console.log('  ' + p('tower', 22) + p('vs', 12) + p('numerals', 10) + p('marked', 9) + 'expected');
  let bad = 0;
  out.forEach((r) => {
    const ok = r.got === r.want;
    if (!ok) bad += 1;
    console.log('  ' + p(r.race + ' T' + r.tier, 22) + p(r.aClass, 12) + p(r.nums, 10)
      + p(r.marks, 9) + (r.want ? 'resisted' : 'clean') + (ok ? '' : '   <-- WRONG') + '   ' + r.why);
  });
  console.log('\n' + (!bad && !errs.length ? 'PASS — the mark fires where the matrix punishes and nowhere else' : 'FAIL ' + bad + ' case(s)'));
  if (errs.length) console.log('ERRORS', errs);
  await browser.close();
  process.exit(bad || errs.length ? 1 : 0);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
