/* IS NINJA PRICED AGAINST THE FIELD?

   Gene: "ninja needs to be more balanced to tower costs although I notice it's
   very strong early but weak later unless you're upgrading it."

   Ninja does not climb a power ladder — every rung costs 5g and power comes from
   eight levels at 10g x (level+1). So the fair comparison is not tower vs tower,
   it is GOLD vs DAMAGE: spend the same purse on one cell of each element and see
   what it buys, at an opening budget and at a late one.

   Reach is reported alongside, because a ninja that matches on paper still only
   covers the cells it can touch.
   node tools/harness/ninjacost.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1600);

  const out = await page.evaluate(() => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};
    resetMatchState(); selectedRace = races.find((r) => r.id === 'fire'); startBattle();
    battlePaused = true;

    /* Spend a budget on ONE cell, best-first: for a ladder race that means
       teching as high as the purse allows then levelling; for Ninja it means
       stepping to the weapon then levelling. Returns what the cell ends up
       being worth. */
    const spendOnOneCell = (raceId, budget) => {
      const list = towerListFor(raceId);
      let best = null;
      for (let tier = 0; tier < list.length; tier += 1) {
        const def = towerDef(raceId, tier);
        if (def.name === 'Laser Cannon' || def.dmg <= 0) continue;
        // ninja steps cost 5g each from tier 0; ladder races pay the rung price
        const stepCost = raceId === 'ninja' ? def.cost * (tier + 1) : def.cost;
        if (stepCost > budget) continue;
        const probe = { raceId, tier, level: 0 };
        let spent = stepCost;
        while (probe.level < ((def.maxLevel) || MAX_LEVEL)) {
          const c = towerLevelCost(probe);
          if (spent + c > budget) break;
          spent += c; probe.level += 1;
        }
        const stats = towerLiveStats({ ...probe, key: -1, c: 0, r: 0, owner: 'player', buildUntil: -1, priority: 'first', level: probe.level });
        const dps = effectiveDps(stats, raceId);
        if (!best || dps > best.dps) best = { name: def.name, tier, level: probe.level, spent, dps, range: stats.range };
      }
      return best;
    };

    const budgets = [10, 30, 80, 200, 400, 800];
    const ids = races.map((r) => r.id);
    const lines = [];
    lines.push('DAMAGE PER SECOND BOUGHT ON ONE CELL, at a fixed budget (reach in brackets)');
    lines.push('  budget   ' + ids.map((i) => i.slice(0, 6).padStart(8)).join(''));
    for (const b of budgets) {
      const row = ids.map((id) => {
        const r = spendOnOneCell(id, b);
        return (r ? Math.round(r.dps) : 0).toString().padStart(8);
      });
      lines.push(`  ${String(b).padStart(4)}g   ` + row.join(''));
    }
    lines.push('  reach    ' + ids.map((id) => {
      const r = spendOnOneCell(id, 800);
      return (r ? r.range.toFixed(1) : '-').padStart(8);
    }).join(''));

    lines.push('\nWHAT NINJA ACTUALLY BUYS, rung by rung, fully levelled');
    towerListFor('ninja').forEach((d, tier) => {
      if (d.dmg <= 0 || d.name === 'Laser Cannon') return;
      const def = towerDef('ninja', tier);
      let spent = def.cost * (tier + 1), lvl = 0;
      const probe = { raceId: 'ninja', tier, level: 0 };
      while (lvl < (def.maxLevel || MAX_LEVEL)) { probe.level = lvl; spent += towerLevelCost(probe); lvl += 1; }
      const stats = towerLiveStats({ raceId: 'ninja', tier, level: lvl, key: -1, c: 0, r: 0, owner: 'player', buildUntil: -1, priority: 'first' });
      lines.push(`  ${def.name.padEnd(16)} step-to ${String(def.cost * (tier + 1)).padStart(3)}g + ${lvl} levels`
        + ` = ${String(spent).padStart(4)}g total · ${String(Math.round(effectiveDps(stats, 'ninja'))).padStart(4)} dps · reach ${stats.range.toFixed(1)}`
        + ` · ${(spent / Math.max(1, effectiveDps(stats, 'ninja'))).toFixed(2)} g per dps`);
    });

    lines.push('\nGOLD PER DPS at each budget — lower is better value');
    lines.push('  budget   ' + ids.map((i) => i.slice(0, 6).padStart(8)).join(''));
    for (const b of budgets) {
      lines.push(`  ${String(b).padStart(4)}g   ` + ids.map((id) => {
        const r = spendOnOneCell(id, b);
        return (r && r.dps > 0 ? (r.spent / r.dps).toFixed(2) : '-').padStart(8);
      }).join(''));
    }
    return lines.join('\n');
  });

  console.log(out);
  console.log('\nerrors:', errs.length ? errs.slice(0, 4) : 'none');
  await browser.close();
})();
