/* Does a tower's imbuement work, whichever way it attacks?

   applyHitEffects had exactly two call sites, both inside resolveProjectileHit.
   Anything that was not a projectile therefore applied no race effect and no
   bolt imbuing at all — which killed two features quietly: the whole Beam
   element fought with no on-hit kit, and Ninja's Spear ignored whatever you
   imbued it with. Nothing tested it, which is why it survived.

   This fits the same bolt to one tower of each ATTACK SHAPE — projectile, beam,
   and pulse — and checks the creep actually carries the effect afterwards.
   node tools/harness/onhit.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

// one tower per firing path, and a bolt whose effect is trivially observable
const CASES = [
  { label: 'projectile (ice T0)',     race: 'ice',         tier: 0 },
  { label: 'beam (beam T0)',          race: 'beam',        tier: 0 },
  { label: 'beamline (ninja Spear)',  race: 'ninja',       tier: 4 },
  { label: 'pulse (gravity T2)',      race: 'gravity',     tier: 2 },
  { label: 'pulse (elec Thunder)',    race: 'electricity', tier: 3 },
];

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1800);

  const out = await page.evaluate((cases) => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};
    /* Toxic is the clearest tell: it leaves a dot tagged 'bolttoxic' and a slow,
       and neither is something any of these races does on its own. */
    const run = ({ race, tier }) => {
      resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
      towers.clear(); towersVersion += 1; creeps.length = 0;
      const row = SOUTH_TOP + 6, col = 12;
      const t = makeTower(row, col, race, tier, 'player');
      t.buildUntil = 0; addTower(t);
      const eligible = boltEligible(t);
      t.bolt = 'toxic';
      spawnCreep(waveDefFor(6), 'south', 'west');
      const c = creeps[creeps.length - 1];
      c.hp = c.maxHp = 5e7; c.spd = 0; c.slowPct = 0; c.armor = 0;
      c.x = col + 1; c.y = row;
      for (let i = 0; i < 200 && c.hp > 0; i += 1) simulate(1 / 30);
      const dots = (c.dots || []).map((d) => d.tag || '');
      matchOver = true; battleRunning = false;
      return { eligible, hurt: c.hp < 5e7, slowed: (c.slowPct || 0) > 0,
        toxicDot: dots.some((d) => d === 'bolttoxic') };
    };
    return cases.map((cs) => Object.assign({ label: cs.label }, run(cs)));
  }, CASES);

  const p = (s, n) => String(s).padEnd(n);
  console.log('a Toxic bolt fitted to one tower of each firing shape\n');
  console.log('  ' + p('firing path', 24) + p('imbuable', 10) + p('dealt dmg', 11) + p('slowed', 9) + 'toxic DoT');
  let bad = 0;
  out.forEach((r) => {
    const ok = !r.eligible || (r.slowed && r.toxicDot);
    if (!ok) bad += 1;
    console.log('  ' + p(r.label, 24) + p(r.eligible, 10) + p(r.hurt, 11) + p(r.slowed, 9) + r.toxicDot + (ok ? '' : '   <- IMBUING INERT'));
  });
  console.log('\n' + (bad ? `FAIL — ${bad} firing path(s) ignore their imbuement` : 'PASS — every firing path applies its imbuement'));
  if (errs.length) { console.log('ERRORS', errs.slice(0, 3)); bad += 1; }
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
