/* Does venom deliver what it says it will?

   Gene asked for "diagnostics on dot damage", and this file exists because the
   first answer was wrong. Measuring a tower FIRING gave 108-120% of the ladder
   figure and looked healthy — but every hit refreshes venomUntil, so a firing
   test can never see the cutoff. The loss happened only on the LAST hit, which
   is exactly the case Poison exists for: the creep that walks out of range and
   dies to the venom afterwards.

   So the assertion here is the ISOLATED one: inject a known pool, touch nothing
   else, and count what lands. The firing measurement is kept underneath it as
   context, not as the test.
   node tools/harness/poison.js <url> */
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
    const D = TRAIT.poisonDur;

    const fresh = () => {
      resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
      towers.clear(); towersVersion += 1; creeps.length = 0;
      spawnCreep(waveDefFor(3), 'south', 'west');
      const c = creeps[creeps.length - 1];
      c.hp = c.maxHp = 5e8; c.spd = 0; c.slowPct = 0; c.armor = 0;
      return c;
    };

    /* ---- the assertion: one known injection, then left alone -------------
       Injected exactly the way applyHitEffects does it, so this measures the
       real pool rather than a model of it. */
    const CHUNK = 1000;
    const isolate = (seconds) => {
      const c = fresh();
      c.venom = CHUNK / D;
      c.venomUntil = simTime + D;
      const before = c.hp;
      for (let i = 0; i < seconds * 30; i += 1) simulate(1 / 30);
      return { dealt: +(before - c.hp).toFixed(1), left: +(c.venom * D).toFixed(1) };
    };
    const atCutoff = isolate(D);
    const settled = isolate(D * 4);

    /* ---- context: a real tower firing for a while ----------------------- */
    const firing = (tier) => {
      const SEC = 20;
      resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
      towers.clear(); towersVersion += 1; creeps.length = 0;
      const row = SOUTH_TOP + 6, col = 12;
      const t = makeTower(row, col, 'poison', tier, 'player');
      t.buildUntil = 0; addTower(t);
      const def = towerDef('poison', tier);
      spawnCreep(waveDefFor(6), 'south', 'west');
      const c = creeps[creeps.length - 1];
      c.hp = c.maxHp = 5e6; c.spd = 0; c.slowPct = 0; c.armor = 0;
      c.x = col + 1; c.y = row;
      const before = c.hp;
      for (let i = 0; i < SEC * 30; i += 1) simulate(1 / 30);
      const shots = Math.floor(SEC / def.cd);
      const advertised = shots * (def.dmg + Math.min(c.maxHp * TRAIT.poisonStackPct, def.dmg));
      return { name: def.name, dmg: def.dmg, shots,
        dealt: Math.round(before - c.hp), advertised: Math.round(advertised),
        ratio: +((before - c.hp) / Math.max(1, advertised)).toFixed(2) };
    };

    return { dur: D, chunk: CHUNK, atCutoff, settled,
      firing: [0, 2, 5].map(firing),
      theory: +((1 - Math.exp(-1)) * 100).toFixed(1) };
  });

  const pct = (d) => ((d.dealt / out.chunk) * 100).toFixed(1) + '%';
  console.log(`ISOLATED — one injection of ${out.chunk} damage, poisonDur ${out.dur}s\n`);
  console.log('  by the cutoff at ' + out.dur + 's        ' + String(out.atCutoff.dealt).padEnd(9) + pct(out.atCutoff)
    + '   (pool holding ' + out.atCutoff.left + ')');
  console.log('  once settled             ' + String(out.settled.dealt).padEnd(9) + pct(out.settled)
    + '   (pool holding ' + out.settled.left + ')');
  console.log('\n  Exponential decay over one time-constant leaves ' + (100 - out.theory).toFixed(1)
    + '% unspent at the cutoff.');
  console.log('  That share used to be DELETED. It is paid out now, so settled must read 100%.');

  const p = (s, n) => String(s).padEnd(n);
  console.log('\nFIRING (context only — every hit refreshes the timer, so this cannot see the cutoff)\n');
  console.log('  ' + p('tower', 16) + p('bolt', 7) + p('shots', 7) + p('advertised', 12) + p('dealt', 10) + 'delivered');
  out.firing.forEach((r) => console.log('  ' + p(r.name, 16) + p(r.dmg, 7) + p(r.shots, 7)
    + p(r.advertised.toLocaleString(), 12) + p(r.dealt.toLocaleString(), 10) + (r.ratio * 100).toFixed(0) + '%'));

  const ok = out.settled.dealt >= out.chunk * .99;
  console.log('\n' + (ok
    ? 'PASS — the pool delivers everything it advertises'
    : `FAIL — ${(100 - (out.settled.dealt / out.chunk) * 100).toFixed(1)}% of the pool is destroyed unspent`));
  if (errs.length) { console.log('ERRORS', errs.slice(0, 3)); process.exit(1); }
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
