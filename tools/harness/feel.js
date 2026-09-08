/* Do the §6 feel moments actually fire?

   Three of them are state the renderer reads rather than pixels: a tower knows
   when it was born and when it last gained a tier, and a damage numeral knows
   to set itself in the serif. A moment that never gets its timestamp is a
   moment that silently never plays, which is exactly the kind of thing that
   looks fine in a diff and is missing in the game.
   node tools/harness/feel.js <url> */
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
    resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
    towers.clear(); towersVersion += 1; creeps.length = 0;
    player.gold = 1e6; player.lumber = 9;

    // placement snap: a tower must know when it appeared
    const t = makeTower(SOUTH_TOP + 6, 12, selectedRace.id, 0, 'player');
    t.buildUntil = 0; addTower(t);
    const born = t.born;

    // tier-up: and when it last grew
    selectedTowerKey = t.key; selectedGroupKeys = [t.key];
    const tierBefore = t.tier;
    towerAction('tier');
    const after = towers.get(t.key) || t;

    // damage numerals: a big hit must ask for the serif
    const seen = [];
    const realPush = pushFx;
    spawnCreep(waveDefFor(9), 'south', 'west');
    const cr = creeps[creeps.length - 1];
    cr.hp = cr.maxHp = 5e6;
    applyDamage(cr, 400, t);
    effects.forEach((e) => { if (e.kind === 'num') seen.push({ serif: !!e.serif, text: e.text }); });

    matchOver = true; battleRunning = false;
    return { born, hasBorn: typeof born === 'number',
      tierBefore, tierAfter: after.tier, tierAt: after.tierAt, hasTierAt: typeof after.tierAt === 'number',
      nums: seen };
  });

  console.log('placement snap  — tower.born set:   ' + out.hasBorn + '  (' + out.born + ')');
  console.log('tier-up sweep   — tier ' + out.tierBefore + ' -> ' + out.tierAfter + ', tierAt set: ' + out.hasTierAt);
  console.log('damage numeral  — serif numerals:   ' + JSON.stringify(out.nums));
  const ok = out.hasBorn && out.tierAfter > out.tierBefore && out.hasTierAt
    && out.nums.some((n) => n.serif);
  console.log('\n' + (ok ? 'PASS — all three moments have what they need to play' : 'FAIL'));
  if (errs.length) { console.log('ERRORS', errs.slice(0, 3)); process.exit(1); }
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
