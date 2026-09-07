/* How many creeps does one shot actually touch?

   Every previous answer to this was a hardcoded guess in the harness — a map
   from special name to a "bodies" multiplier — and the guess was wrong in both
   directions: it invented crowd damage for specials that have none, and missed
   chain, thunder and the gravity pulses, which hit groups through code paths
   that are not splashSpec. It also averaged control rungs (entangle, paralyze)
   into a damage score, which is what made Earth read as the worst race in the
   game when it is the best.

   So stop guessing. Stand each tower beside a packed lane of nine creeps too
   fat to die, let it fire, and count how many of them lost HP. Hooking
   applyDamage was tried first and silently measured zero for every race — see
   the note in measure().
   node tools/harness/crowd.js <url> [--full] */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

// death waves from tools/harness/regress.js, post AI-breadth fix
const DIED = { Ice: 11, Fire: 15, Earth: 12, Tech: 11, Crystal: 14, Poison: 13, Stone: 11, Electricity: 14, Gravity: 11, Beam: 13 };

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1600);

  const out = await page.evaluate(() => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};
    /* No patching. An earlier attempt reassigned applyDamage from here to hook
       it, which silently did nothing: the game's functions are script-scoped, so
       an assignment in this context makes a window global the game never calls,
       and every race measured a flat zero. Read the creeps instead — HP deltas
       cannot be scoped away. */
    const measure = (raceId, tier) => {
      resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
      towers.clear(); towersVersion += 1; creeps.length = 0;
      const list = towerListFor(raceId); const def = list[tier];
      // stand the tower beside the lane, then pack the lane in front of it
      const row = SOUTH_TOP + 6, col = 12;
      const t = makeTower(row, col, raceId, tier, 'player'); t.buildUntil = 0; addTower(t);
      /* spawnCreep pushes onto `creeps` and returns undefined — reading its
         return value is what made an earlier pass measure zero creeps for every
         race. Take the one it just appended. */
      const made = [];
      for (let i = 0; i < 9; i += 1) {
        spawnCreep(waveDefFor(1), 'south', 'west');
        const c = creeps[creeps.length - 1];
        if (!c || made.includes(c)) break;
        c.__cid = i; c.hp = c.maxHp = 5e8; c.spd = 0; c.slowPct = 0; c.armor = 0;
        c.x = col + 1.2 + (i % 3) * 0.6; c.y = row - 0.9 + Math.floor(i / 3) * 0.6;
        made.push(c);
      }
      const before = made.map((c) => c.hp);
      for (let i = 0; i < 240; i += 1) simulate(1 / 30);
      const hurt = made.filter((c, i) => before[i] - c.hp > 0.5);
      const total = made.reduce((s, c, i) => s + Math.max(0, before[i] - c.hp), 0);
      matchOver = true; battleRunning = false;
      return { tier, name: def.name, cost: def.cost, sp: def.special || '-',
        bodies: hurt.length, dealt: Math.round(total), lined: made.length };
    };

    return races.map((r) => ({
      race: r.name,
      tiers: towerListFor(r.id).map((_, i) => measure(r.id, i)),
    }));
  });

  const p = (s, n) => String(s).padEnd(n);
  const rows = [];
  out.forEach((r) => {
    const own = r.tiers.slice(0, r.tiers.length - 1);   // drop the shared Laser Cannon rung
    const first = own.find((t) => t.bodies >= 2);
    rows.push({ race: r.race, entry: first ? first.cost : null, entryName: first ? first.name : 'none',
      crowdRungs: own.filter((t) => t.bodies >= 2).length, of: own.length,
      widest: Math.max(...own.map((t) => t.bodies)), died: DIED[r.race] ?? null });
  });
  console.log('bodies hit by one tower, MEASURED from creep HP — no hardcoded special-to-bodies guess\n');
  console.log('  ' + p('race', 14) + p('first tower hitting 2+', 24) + p('costs', 9) + p('crowd rungs', 13) + p('widest', 8) + 'died wave');
  rows.sort((a, b) => (a.entry ?? 1e9) - (b.entry ?? 1e9))
    .forEach((r) => console.log('  ' + p(r.race, 14) + p(r.entryName, 24) + p(r.entry == null ? '—' : r.entry + 'g', 9) + p(r.crowdRungs + '/' + r.of, 13) + p(r.widest, 8) + (r.died ?? '?')));
  const have = rows.filter((r) => r.died != null);
  const mean = (a) => a.length ? (a.reduce((s, x) => s + x.died, 0) / a.length).toFixed(1) : '—';
  const cheap = have.filter((r) => (r.entry ?? 1e9) <= 50);
  const dear = have.filter((r) => (r.entry ?? 1e9) > 50);
  console.log('\n  crowd damage at 50g or less (' + cheap.length + '): mean death wave ' + mean(cheap));
  console.log('  crowd damage dearer, or none (' + dear.length + '): mean death wave ' + mean(dear));
  if (process.argv.includes('--full')) out.forEach((r) => {
    console.log('\n' + r.race.toUpperCase());
    r.tiers.forEach((t) => console.log('  ' + p('T' + t.tier, 5) + p(t.name, 22) + p(t.cost + 'g', 8) + p(t.sp, 13) + 'hits ' + t.bodies + ' of ' + t.lined + '   ' + t.dealt.toLocaleString() + ' dmg'));
  });
  if (errs.length) console.log('\nERRORS', errs.slice(0, 3));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
