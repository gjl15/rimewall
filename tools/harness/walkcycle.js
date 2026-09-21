/* Does the walk cycle actually walk, and does it stop when the creep does?

   Two frames are only an animation if both get used, and tying the cycle to
   distance rather than to the clock is only worth doing if it holds up under
   the three cases that made the clock wrong:

     1. a creep at full speed alternates poses
     2. a SLOWED creep alternates more slowly, because it covers less ground
     3. a FROZEN creep does not march on the spot

   node tools/harness/walkcycle.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 180)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1700);

  const out = await page.evaluate(async () => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};
    for (let i = 0; i < 120 && !(SPRITE_SHEETS.creep.ready && SPRITE_SHEETS.creep2.ready); i += 1) {
      await new Promise((r) => setTimeout(r, 50));
    }

    /* Count which sheet each draw came from by watching drawSprite itself —
       reading the canvas back would only tell us the pixels changed, not which
       pose produced them. */
    const seen = {};
    const real = window.drawSprite;
    window.drawSprite = function (ctx, kind, id, x, y, size) {
      if (kind === 'creep' || kind === 'creep2') seen[kind] = (seen[kind] || 0) + 1;
      return real.apply(this, arguments);
    };
    const run = (setup, frames) => {
      for (const k of Object.keys(seen)) delete seen[k];
      resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
      towers.clear(); towersVersion += 1; creeps.length = 0;
      spawnCreep(waveDefFor(8), 'south', 'west');
      const c = creeps[0];
      c.hp = c.maxHp = 1e7;
      setup(c);
      for (let i = 0; i < frames; i += 1) { simulate(1 / 30); renderFrame(); }
      const walked = +(c.walked || 0).toFixed(2);
      matchOver = true; battleRunning = false;
      return { walked, a: seen.creep || 0, b: seen.creep2 || 0 };
    };

    const full = run(() => {}, 180);
    const slowed = run((c) => { c.slowUntil = simTime + 999; c.slowPct = 80; }, 180);
    const frozen = run((c) => { c.frozenUntil = simTime + 999; }, 180);
    window.drawSprite = real;
    return { full, slowed, frozen, stride: SPRITE_STRIDE };
  });

  const p = (s, n) => String(s).padEnd(n);
  console.log(`  a pose swap every ${out.stride} cells walked, over 6 seconds of sim\n`);
  console.log('  ' + p('case', 12) + p('cells walked', 15) + p('pose 1', 10) + p('pose 2', 10) + 'reads as');
  const row = (name, r, expect) => console.log('  ' + p(name, 12) + p(r.walked, 15) + p(r.a, 10) + p(r.b, 10) + expect);
  row('full speed', out.full, out.full.b > 0 ? 'walking' : 'STUCK ON ONE POSE');
  row('80% slow', out.slowed, out.slowed.b > 0 ? 'walking, slower' : 'one pose');
  row('frozen', out.frozen, out.frozen.b === 0 || out.frozen.walked === 0 ? 'stopped' : 'MARCHING ON THE SPOT');

  const walks = out.full.a > 0 && out.full.b > 0;
  const slower = out.slowed.walked < out.full.walked;
  const stops = out.frozen.walked === 0;
  console.log('');
  console.log('  ' + (walks ? 'both poses drawn at full speed' : 'ONLY ONE POSE EVER DRAWN'));
  console.log('  ' + (slower ? `slowing it covers less ground (${out.slowed.walked} vs ${out.full.walked}) so it strides less` : 'SLOW DID NOT CHANGE THE CYCLE'));
  console.log('  ' + (stops ? 'a frozen creep does not march on the spot' : 'A FROZEN CREEP IS STILL CYCLING'));
  const ok = walks && slower && stops && !errs.length;
  console.log('\n' + (ok ? 'PASS' : 'FAIL'));
  if (errs.length) console.log('ERRORS', errs.slice(0, 3));
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
