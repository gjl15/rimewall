/* Does an imbuing actually answer what a ninja cannot do?

   The regression has Ninja stalling at wave 13 with 195 towers and zero bolts
   fitted, which is the whole power budget of the race left on the table. Before
   changing anything about how it is sold, measure whether the thing being
   skipped is the thing that would have fixed it — a discovery problem and a
   power problem want opposite fixes.

   Blade meets fortified at 0.45. This parks one blade against one creep of each
   class and runs the same blade again with every bolt in turn.
   node tools/harness/imbue.js <url> [tier] */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';
const TIER = Number(process.argv[3] || 4);   // Spear Sentinel, the best-value rung

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1800);

  const out = await page.evaluate((tier) => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};
    const TARGETS = [
      { key:'light',     aClass:'light',     armor:4  },
      { key:'medium',    aClass:'medium',    armor:9  },
      { key:'heavy',     aClass:'heavy',     armor:16 },
      { key:'fortified', aClass:'fortified', armor:20 },
    ];
    const CREEP_HP = 3000, SECONDS = 20;
    const run = (bolt, target) => {
      resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
      towers.clear(); towersVersion += 1; creeps.length = 0;
      const row = SOUTH_TOP + 6, col = 12;
      const t = makeTower(row, col, 'ninja', tier, 'player');
      t.buildUntil = 0; if (bolt) t.bolt = bolt; addTower(t);
      spawnCreep(waveDefFor(4), 'south', 'west');
      const c = creeps[creeps.length - 1];
      c.hp = c.maxHp = CREEP_HP; c.spd = 0; c.slowPct = 0;
      c.aClass = target.aClass; c.armor = target.armor; c.air = false;
      c.x = col + 1.0; c.y = row;
      let frames = 0; const cap = SECONDS * 30;
      while (frames < cap && c.hp > 0) { simulate(1 / 30); frames += 1; }
      const dealt = CREEP_HP - Math.max(0, c.hp);
      matchOver = true; battleRunning = false;
      return Math.round(dealt / (frames / 30));
    };
    /* A SINGLE PARKED CREEP CANNOT SEE HALF OF THESE. Storm chains, Ice slows,
       Quake stuns, Warp shoves, Lumen lengthens the blade — against one target
       that is already standing still, every one of them correctly reads +0%
       damage, which is indistinguishable from the inert-imbuing bug that was
       real two commits ago. So each bolt also runs against a five-body clump
       that is allowed to walk, and reports whether it moved anything at all. */
    const crowd = (bolt) => {
      resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
      towers.clear(); towersVersion += 1; creeps.length = 0;
      const row = SOUTH_TOP + 6, col = 12;
      const t = makeTower(row, col, 'ninja', tier, 'player');
      t.buildUntil = 0; if (bolt) t.bolt = bolt; addTower(t);
      const mob = [];
      for (let i = 0; i < 5; i += 1) {
        spawnCreep(waveDefFor(4), 'south', 'west');
        const c = creeps[creeps.length - 1];
        c.hp = c.maxHp = 3000; c.aClass = 'medium'; c.armor = 9; c.air = false;
        c.x = col + .8 + (i % 2) * .7; c.y = row + (i - 2) * .45;
        mob.push(c);
      }
      let slowed = 0, held = 0, moved = 0, frames = 0;
      const x0 = mob.map((c) => c.x);
      while (frames < 300) {
        simulate(1 / 30); frames += 1;
        mob.forEach((c) => { if ((c.slowPct || 0) > 0) slowed = 1; if (c.stunUntil > simTime || c.knockUntil > simTime) held = 1; });
      }
      mob.forEach((c, i) => { if (Math.abs(c.x - x0[i]) > .25) moved = 1; });
      const dealt = mob.reduce((s, c) => s + (3000 - Math.max(0, c.hp)), 0);
      matchOver = true; battleRunning = false;
      return { dps:Math.round(dealt / (frames / 30)), slowed, held, moved };
    };

    const def = towerDef('ninja', tier);
    const rows = [{ bolt:'(none)', dps:{} }].concat(BOLT_MODS.map((m) => ({ bolt:m.id, name:m.name, dps:{} })));
    rows.forEach((r) => {
      TARGETS.forEach((tg) => { r.dps[tg.key] = run(r.bolt === '(none)' ? null : r.bolt, tg); });
      r.crowd = crowd(r.bolt === '(none)' ? null : r.bolt);
    });
    return { rows, keys:TARGETS.map((t) => t.key), towerName:def.name,
      towerCost:def.cost, boltCost:boltCost({ raceId:'ninja', tier }) };
  }, TIER);

  const p = (s, n) => String(s).padEnd(n);
  console.log(`ninja ${out.towerName} — ${out.towerCost}g to place, ${out.boltCost}g an imbuing\n`);
  console.log('  ' + p('imbuing', 16) + out.keys.map((k) => p(k, 11)).join('') + 'vs bare');
  const bare = out.rows[0];
  out.rows.forEach((r) => {
    const sum = out.keys.reduce((s, k) => s + r.dps[k], 0);
    const bsum = out.keys.reduce((s, k) => s + bare.dps[k], 0);
    const lift = r === bare ? '' : (sum / Math.max(1, bsum) - 1 >= 0 ? '+' : '') + Math.round((sum / Math.max(1, bsum) - 1) * 100) + '%';
    console.log('  ' + p(r.name || r.bolt, 16) + out.keys.map((k) => p(r.dps[k].toLocaleString(), 11)).join('') + lift);
  });

  console.log('\n  AGAINST A FIVE-BODY CLUMP THAT WALKS — where a control bolt can show up\n');
  console.log('  ' + p('imbuing', 16) + p('crowd dps', 12) + p('vs bare', 10) + 'does something');
  out.rows.forEach((r) => {
    const c = r.crowd, bc = bare.crowd;
    const lift = r === bare ? '' : (c.dps >= bc.dps ? '+' : '') + Math.round((c.dps / Math.max(1, bc.dps) - 1) * 100) + '%';
    const marks = [c.slowed && 'slows', c.held && 'holds', c.moved && 'shoves'].filter(Boolean);
    const verdict = r === bare ? '' : (c.dps > bc.dps * 1.03 || marks.length) ? (marks.length ? marks.join(' + ') : 'more damage') : 'NOTHING MEASURABLE';
    console.log('  ' + p(r.name || r.bolt, 16) + p(c.dps.toLocaleString(), 12) + p(lift, 10) + verdict);
  });
  const inert = out.rows.slice(1).filter((r) => {
    const c = r.crowd, bc = bare.crowd;
    return !(c.dps > bc.dps * 1.03 || c.slowed || c.held || c.moved)
      && out.keys.every((k) => r.dps[k] <= bare.dps[k] * 1.03);
  });
  console.log('\n  imbuings with no measurable effect anywhere: ' + (inert.length ? inert.map((r) => r.name).join(', ') : 'none'));

  const bestPlate = out.rows.slice(1).sort((a, b) => b.dps.fortified - a.dps.fortified)[0];
  console.log(`\n  bare blade into fortified:      ${bare.dps.fortified}`);
  console.log(`  best imbuing into fortified:    ${bestPlate.dps.fortified}  (${bestPlate.name})`);
  console.log(`  an imbuing multiplies plate by  ${(bestPlate.dps.fortified / Math.max(1, bare.dps.fortified)).toFixed(2)}x`);
  if (errs.length) console.log('\nERRORS', errs.slice(0, 3));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
