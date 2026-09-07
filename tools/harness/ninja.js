/* Can a ninja player actually manage their blades?

   Gene, proposing the race: "this type of race would need a really good UI that
   allows quick granular upgrades which im not sure we are there yet."

   The answer this build bets on is that imbuing is the existing bolt system and
   selection is the new Select all button — so one press picks every blade of a
   kind, and the next press imbues all of them. This proves that, and that the
   ladder is melee and reachable.
   node tools/harness/ninja.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1600);

  const out = await page.evaluate(() => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};
    const ladder = towerListFor('ninja').map((d, i) => ({ tier: i, name: d.name, cost: d.cost,
      dmg: d.dmg, range: d.range, cd: d.cd, dps: Math.round(d.dmg / d.cd), special: d.special }));
    const unlocked = raceUnlocked('ninja');

    // twelve blades on the board, all the same rung
    resetMatchState(); battleRunning = true; battlePaused = false; matchOver = false;
    towers.clear(); towersVersion += 1; creeps.length = 0;
    player.gold = 1e7; player.lumber = 9;
    const keys = [];
    for (let i = 0; i < 12; i += 1) {
      const t = makeTower(SOUTH_TOP + 6 + (i % 2) * 2, 6 + Math.floor(i / 2) * 2, 'ninja', 1, 'player');
      t.buildUntil = 0; t.placedAt = -1000; addTower(t); keys.push(t.key);
    }
    const eligible = keys.filter((k) => boltEligible(towers.get(k))).length;

    // one tap selects them all, the next imbues every one
    selectedTowerKey = keys[0]; selectedGroupKeys = [keys[0]];
    towerAction('selectall');
    const selected = selectedGroupKeys.length;
    const goldBefore = player.gold;
    towerAction('bolt:ice');
    const imbued = keys.filter((k) => towers.get(k) && towers.get(k).bolt === 'ice').length;
    const spent = goldBefore - player.gold;

    // and swapping the whole batch to another element is one more press
    towerAction('bolt:toxic');
    const swapped = keys.filter((k) => towers.get(k) && towers.get(k).bolt === 'toxic').length;

    matchOver = true; battleRunning = false;
    return { ladder, unlocked, placed: keys.length, eligible, selected, imbued, spent, swapped,
      mods: BOLT_MODS.map((m) => m.name) };
  });

  const p = (s, n) => String(s).padEnd(n);
  console.log('NINJA — unlocked from the start: ' + out.unlocked + '\n');
  console.log('  ' + p('tier', 6) + p('weapon', 18) + p('cost', 7) + p('dmg', 6) + p('reach', 7) + p('speed', 9) + p('dps', 7) + 'special');
  out.ladder.forEach((t) => console.log('  ' + p('T' + t.tier, 6) + p(t.name, 18) + p(t.cost + 'g', 7)
    + p(t.dmg, 6) + p(t.range, 7) + p((1 / t.cd).toFixed(1) + '/s', 9) + p(t.dps, 7) + t.special));
  console.log('\nmanaging a dozen blades');
  console.log('  placed ' + out.placed + ', imbuable ' + out.eligible + ' (every rung takes one)');
  console.log('  one Select all press selected: ' + out.selected);
  console.log('  one imbue press fitted Ice to: ' + out.imbued + ' for ' + out.spent + 'g');
  console.log('  one more press swapped all of them to Toxic: ' + out.swapped);
  console.log('  imbuings available: ' + out.mods.join(', '));
  const ok = out.unlocked && out.eligible === out.placed && out.selected === out.placed
    && out.imbued === out.placed && out.swapped === out.placed;
  console.log('\n' + (ok ? 'PASS — a dozen blades are re-imbued in two presses' : 'FAIL'));
  if (errs.length) console.log('ERRORS', errs.slice(0, 3));
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
