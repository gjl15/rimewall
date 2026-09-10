/* MANAGING A REAL NINJA BOARD, NOT A TIDY ONE.

   ninja.js proves a dozen blades OF ONE RUNG re-imbue in two presses. That is
   not the board Gene played. The point of the race is picking weapons, so a real
   dojo is daggers AND swords AND maces AND spears, each on its own rung, each
   levelling separately — and "Select all" filters on raceId AND tier.

   Gene: "With ninja I had to make so many and it was impossible to easily and
   quickly group towers to upgrade or imbue them."

   So count the presses on a mixed board, and check the two things that would
   make it cheap: reaching box/lasso, and reaching the second-element licence.

   node tools/harness/blademgmt.js <url> */
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
    const lines = [];

    /* A DOJO AS PLAYED: 36 blades spread over the five weapons plus initiates. */
    resetMatchState();
    selectedRace = races.find((r) => r.id === 'ninja');
    startBattle();
    player.gold = 1e6; player.lives = 1e6; battlePaused = true;
    const cells = mazeOrderSouth().filter((c) => isBuildableCell(c.r, c.c, PLAYER_HALF));
    const mix = [0, 1, 1, 2, 2, 3, 4, 5];   // what a person ends up with
    let n = 0;
    for (const c of cells) {
      if (n >= 36) break;
      const t = makeTower(c.r, c.c, 'ninja', mix[n % mix.length], 'player');
      addTower(t); t.buildUntil = -1; t.level = n % 3; n += 1;
    }
    const mine = [...towers.values()].filter(isMine);
    const rungs = {};
    mine.forEach((t) => { rungs[t.tier] = (rungs[t.tier] || 0) + 1; });
    lines.push(`board: ${mine.length} blades across ${Object.keys(rungs).length} rungs — `
      + Object.entries(rungs).map(([k, v]) => `${towerDef('ninja', +k).name} x${v}`).join(', '));

    /* SELECT ALL, driven for real: tap a blade, press it, press it again. */
    const groupsNeeded = new Set(mine.map((t) => `${t.raceId}:${t.tier}`)).size;
    lines.push(`\n"Select all" rungs on this board: ${groupsNeeded}`);
    const anyBlade = mine[0];
    selectedTowerKey = anyBlade.key; selectedGroupKeys = [anyBlade.key];
    towerAction('selectall');
    const afterOne = selectedGroupKeys.length;
    towerAction('selectall');
    const afterTwo = selectedGroupKeys.length;
    lines.push(`  tap a blade, press Select all -> ${afterOne} selected (its rung)`);
    lines.push(`  press it again          -> ${afterTwo} selected (every blade you own)`);
    lines.push(`  covering all ${mine.length} blades: ${afterTwo === mine.length ? '3 presses total' : `STILL ${groupsNeeded} x 3 = ${groupsNeeded * 3} presses`}`);

    // and the batch actions must accept a MIXED-rung group
    const goldBefore = player.gold;
    towerAction('level');
    const levelled = [...towers.values()].filter((t) => isMine(t) && t.level > 0).length;
    lines.push(`  one LEVEL press on the mixed selection: ${levelled}/${mine.length} blades levelled for ${goldBefore - player.gold}g`);
    towerAction('bolt:toxic');
    const imbued = [...towers.values()].filter((t) => isMine(t) && t.bolt === 'toxic').length;
    lines.push(`  one IMBUE press on the mixed selection: ${imbued}/${mine.length} blades imbued`);

    /* Levels make it worse: a level press only levels what can still level. */
    const lvlSpread = new Set(mine.map((t) => `${t.tier}:${t.level}`)).size;
    lines.push(`  levels differ too — ${lvlSpread} distinct (rung, level) combinations on this board.`);

    /* CAN A PHONE REACH BOX / LASSO AND THE LICENCE AT ALL? */
    lines.push('\nreachability on a phone (arena rails):');
    railTab = 'tools'; renderRails();
    const toolsHtml = document.getElementById('rail-right').innerHTML;
    const has = (s) => toolsHtml.includes(s);
    lines.push(`  TOOLS drawer: box ${has('rail-tool="box"') ? 'yes' : 'NO'} · lasso ${has('rail-tool="lasso"') ? 'yes' : 'NO'}`
      + ` · lumber ${has('rail-tool="lumber"') ? 'yes' : 'NO'} · shrine ${has('rail-tool="shrine"') ? 'yes' : 'NO'}`
      + ` · LICENCE 2nd element ${has('licen') || has('Licen') ? 'yes' : 'NO'}`);
    railTab = null; renderRails();
    const leftHtml = document.getElementById('rail-left').innerHTML;
    lines.push(`  SELECT on the left rail (1 tap to arm, no drawer): ${leftHtml.includes('data-rail-select') ? 'yes' : 'NO'}`);
    const licenceInSidePanel = Boolean(document.getElementById('license-button'));
    lines.push(`  #license-button present in this (phone) layout: ${licenceInSidePanel}`);
    railTab = null; renderRails();

    /* What DOES the licence cost, for the answer to "how do I buy one". */
    lines.push(`\nsecond element: ${LUMBER_PRICE}g per lumber x 2 = ${LUMBER_PRICE * 2}g, and only races you have unlocked`);
    lines.push(`  you currently hold: ${player.races.join(', ')} · lumber ${player.lumber}`);

    return lines.join('\n');
  });

  console.log(out);
  console.log('\nerrors:', errs.length ? errs.slice(0, 4) : 'none');
  await browser.close();
})();
