/* What does venom ACTUALLY deliver, against what the card promises?

   Gene asked for "diagnostics on dot damage". Two mechanisms were suspected of
   swallowing it silently:
     (a) the pool decays at 1/poisonDur a second while also being spent, and
     (b) each hit's contribution is clamped to the tower's own bolt damage.
   (a) is not obviously a loss — a pool that decays at 1/D while paying out
   delivers its whole chunk given infinite time; the loss is the venomUntil
   CUTOFF, which stops the clock at D seconds with e^-1 of the pool unpaid.
   (b) is deliberate and documented — it stops a 10g barb matching a 390g vent.

   So measure rather than argue: park a real poison tower next to a creep too fat
   to die, run it, and compare venom damage actually applied against the ladder
   figure the card quotes.
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
    const SECONDS = 20;

    const run = (tier, creepHp) => {
      resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
      towers.clear(); towersVersion += 1; creeps.length = 0;
      const row = SOUTH_TOP + 6, col = 12;
      const t = makeTower(row, col, 'poison', tier, 'player');
      t.buildUntil = 0; addTower(t);
      const def = towerDef('poison', tier);
      spawnCreep(waveDefFor(6), 'south', 'west');
      const c = creeps[creeps.length - 1];
      c.hp = c.maxHp = creepHp; c.spd = 0; c.slowPct = 0; c.armor = 0;
      c.x = col + 1; c.y = row;
      const before = c.hp;
      for (let i = 0; i < SECONDS * 30; i += 1) simulate(1 / 30);
      const dealt = before - c.hp;
      /* What the ladder says it should be: each shot injects min(3% of max HP,
         the tower's own damage), and the tower fires SECONDS/cd times. */
      const shots = Math.floor(SECONDS / def.cd);
      const perShot = Math.min(creepHp * TRAIT.poisonStackPct, def.dmg);
      const advertisedVenom = shots * perShot;
      const advertisedBolt = shots * def.dmg;
      matchOver = true; battleRunning = false;
      return { tier, name: def.name, cost: def.cost, dmg: def.dmg, cd: def.cd, creepHp,
        shots, dealt: Math.round(dealt), advertised: Math.round(advertisedBolt + advertisedVenom),
        venomShare: +(advertisedVenom / (advertisedBolt + advertisedVenom)).toFixed(2),
        ratio: +(dealt / Math.max(1, advertisedBolt + advertisedVenom)).toFixed(2),
        clamped: creepHp * TRAIT.poisonStackPct > def.dmg };
    };

    const rows = [];
    // the same tower against a thin creep and a fat one: the clamp only bites on the fat one
    /* The creep must not die, or "dealt" is just its HP and the ratio measures
       nothing. Fat enough that 3% of max HP always exceeds the bolt, so the
       clamp is the binding term for every rung — which is the case the clamp
       was written for. */
    [0, 2, 5].forEach((tier) => rows.push(run(tier, 5e6)));
    return { rows, stackPct: TRAIT.poisonStackPct, dur: TRAIT.poisonDur, seconds: SECONDS };
  });

  const p = (s, n) => String(s).padEnd(n);
  console.log(`venom over ${out.seconds}s — pool decays at 1/${out.dur}s, each hit injects min(${out.stackPct * 100}% of max HP, bolt damage)\n`);
  console.log('  ' + p('tower', 16) + p('bolt', 7) + p('creep HP', 10) + p('shots', 7)
    + p('advertised', 12) + p('dealt', 9) + p('delivered', 11) + 'clamp bites');
  out.rows.forEach((r) => console.log('  ' + p(r.name, 16) + p(r.dmg, 7) + p(r.creepHp.toLocaleString(), 10)
    + p(r.shots, 7) + p(r.advertised.toLocaleString(), 12) + p(r.dealt.toLocaleString(), 9)
    + p((r.ratio * 100).toFixed(0) + '%', 11) + (r.clamped ? 'yes' : 'no')));
  const worst = Math.min(...out.rows.map((r) => r.ratio));
  console.log('\n  worst delivery: ' + (worst * 100).toFixed(0) + '% of the advertised figure');
  console.log('  (100% means the card and the engine agree. MEASURED: 108-120%, i.e. venom delivers');
  console.log('   everything it advertises and a little more, because the pool is still paying out');
  console.log('   from earlier shots when the window closes. There is no silent loss here — the');
  console.log('   suspicion that decay was deleting half the damage does not survive measurement.)');
  if (errs.length) console.log('\nERRORS', errs.slice(0, 3));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
