/* Is the spear thrown, and does it run on past what it hits?

   Gene: "ninja spear shouldnt be the same as beam, it should be a a spear
   literally being thrown."

   It carried special:'beamline' — the continuous-ray primitive Beam's whole
   identity rests on — so the melee assassin and the laser race drew the same
   effect, and there was no projectile in flight to look at at all because a ray
   resolves instantly. Three things have to be true now:

     1. firing it puts a real projectile on the board, with travel time
     2. that projectile is drawn as a spear, not as a ray
     3. it still pierces BEHIND its mark, which is what the card promises

   node tools/harness/spear.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 180)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1800);

  const out = await page.evaluate(() => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};
    const tier = towerListFor('ninja').findIndex((d) => d.name === 'Spear Sentinel');
    const def = towerDef('ninja', tier);

    resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
    towers.clear(); towersVersion += 1; creeps.length = 0; projectiles.length = 0;
    const row = SOUTH_TOP + 6, col = 12;
    const t = makeTower(row, col, 'ninja', tier, 'player');
    /* Target the NEAREST, or the default 'first' priority picks whichever creep
       is furthest along the route — which in a static probe is spawn order, and
       the first run of this aimed at the off-line control creep and reported the
       spear as hitting nothing but it. */
    t.priority = 'near';
    t.buildUntil = 0; addTower(t);

    /* THE MARK, AND ONE STANDING BEHIND IT. Behind means further from the tower
       along the same line — the bug this replaced caught the ones in FRONT. */
    const put = (dc) => {
      spawnCreep(waveDefFor(4), 'south', 'west');
      const c = creeps[creeps.length - 1];
      c.hp = c.maxHp = 40000; c.spd = 0; c.slowPct = 0;
      c.aClass = 'medium'; c.armor = 6; c.air = false;
      /* COLINEAR WITH THE TOWER CENTRE, which is (col + .5, row + .5) — not
         (col, row). Placing these on row put the creep behind the mark 0.697
         cells off the line against a width of 0.55, so the first run of this
         reported a pierce that was working as broken. */
      c.x = col + dc; c.y = row + .5; return c;
    };
    const mark = put(1.2);        // the target
    const behind = put(2.4);      // one cell further out, in line
    const aside = put(1.2);       // off the line entirely, but still inside reach
    aside.y = row + 2.7;

    let sawProjectile = 0, styles = {}, maxT = 0;
    for (let i = 0; i < 90; i += 1) {
      simulate(1 / 30);
      projectiles.forEach((p) => {
        sawProjectile += 1;
        styles[p.style] = (styles[p.style] || 0) + 1;
        maxT = Math.max(maxT, p.t);
      });
    }
    // which filter is rejecting the creep standing behind the mark?
    const tx = t.c + .5, ty = t.r + .5;
    const dx = mark.x - tx, dy = mark.y - ty;
    const len2 = dx * dx + dy * dy, len = Math.sqrt(len2);
    const reach = 1 + TRAIT.beamLineBehind / len;
    const proj = Math.max(0, Math.min(reach, ((behind.x - tx) * dx + (behind.y - ty) * dy) / len2));
    const diag = { towerHalf:halfOfRow(t.r), markHalf:mark.half, behindHalf:behind.half,
      len:+len.toFixed(3), reach:+reach.toFixed(3), t:+proj.toFixed(3),
      offLine:+Math.hypot(behind.x - (tx + dx * proj), behind.y - (ty + dy * proj)).toFixed(3),
      lineR:TRAIT.beamLineR };
    const hurt = (c) => Math.round(c.maxHp - c.hp);
    matchOver = true; battleRunning = false;
    return { special:def.special, name:def.name, speed:attackSpeedText(def),
      flight:projectileFlightTime(def.special), sawProjectile, styles, maxT:+maxT.toFixed(3),
      markHurt:hurt(mark), behindHurt:hurt(behind), asideHurt:hurt(aside),
      mult:TRAIT.beamLineMult, behindCells:TRAIT.beamLineBehind, diag };
  });

  console.log(`  ${out.name} — special ${JSON.stringify(out.special)}, card reads ${JSON.stringify(out.speed)}`);
  console.log(`  flight time            ${out.flight}s`);
  console.log(`  projectile frames seen ${out.sawProjectile}  styles ${JSON.stringify(out.styles)}`);
  console.log(`  longest time in flight ${out.maxT}s`);
  console.log(`\n  damage over 3 seconds`);
  console.log(`    the mark              ${out.markHurt.toLocaleString()}`);
  console.log(`    one cell BEHIND it    ${out.behindHurt.toLocaleString()}   (should be about ${Math.round(out.mult * 100)}% of the mark)`);
  console.log(`    off the line entirely ${out.asideHurt.toLocaleString()}   (should be 0)`);

  const thrown = out.special === 'spearthrow' && out.sawProjectile > 0 && !!out.styles.spearthrow;
  const pierces = out.behindHurt > 0 && out.asideHurt === 0;
  console.log('\n  ' + (thrown ? 'THROWN — a real projectile with travel time, drawn as a spear' : 'NOT THROWN'));
  console.log('  ' + (pierces ? 'PIERCES — carries on past the mark, and misses what is off the line' : 'DOES NOT PIERCE BEHIND'));
  console.log('\n' + (thrown && pierces && !errs.length ? 'PASS' : 'FAIL'));
  if (!pierces) console.log('  geometry ' + JSON.stringify(out.diag));
  if (errs.length) console.log('ERRORS', errs.slice(0, 4));
  await browser.close();
  process.exit(thrown && pierces && !errs.length ? 0 : 1);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
