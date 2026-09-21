/* Which maze shape is actually worth building?

   Gene: "we also need the AI to actually maze like we do, a spiral around the
   flag, or some kinda rows that a natural person would build in TDs, we should
   test realistic different kinds of mazes, not the incorrect AI ones, but also
   use AI to discover different maze patterns and store them in the playbook."

   A maze is worth exactly one thing: how many extra cells a creep has to walk
   for each tower you spent making it walk them. That is measurable, so the
   argument about which shape is better does not have to be an argument.

   Every candidate is laid on the SOUTH half at a fixed tower budget, the route
   is re-solved, and the result is scored as cells added per tower. A shape that
   seals a lane scores nothing at all — buildAt refuses those in play, and a
   pattern that relies on them is not a pattern.

   node tools/harness/mazes.js <url> [budget]
     --json writes the winning cell order for the playbook */
const { chromium, CHROME } = require('./lib');
const fs = require('fs');
const path = require('path');
const base = process.argv[2] || 'http://127.0.0.1:8771/';
const budget = Number(process.argv.find((a) => /^\d+$/.test(a)) || 90);
const WRITE = process.argv.includes('--json');

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 180)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  const out = await page.evaluate((budget) => {
    const HALF = 'south';
    const baseline = ['west', 'east'].map((s) => routeLength(HALF, s));

    /* ---- the shapes a person actually builds ---- */
    const inPlay = (r, c) => isBuildableCell(r, c, HALF);
    const push = (list, r, c) => { if (inPlay(r, c)) list.push({ r, c }); };

    /* THE SHAPES COME OUT OF THE GAME, NOT OUT OF THIS FILE. They used to be
       duplicated here, which is how a harness starts measuring a maze the rival
       does not build. MAZE_SHAPES is the playbook; this scores whatever is in
       it, plus the candidates below that have not earned a place yet. */
    const shapes = {};
    Object.keys(MAZE_SHAPES).forEach((name) => {
      shapes[name] = () => { const out = []; MAZE_SHAPES[name]((r, c) => push(out, r, c)); return out; };
    });

    /* ---- candidates under evaluation, not yet in the playbook ---- */

    /* DIAGONAL WEAVE — offset chevrons. A person builds this when they want the
       walk long without the wall reading as a corridor they can seal by mistake. */
    shapes.chevron = () => {
      const out = [];
      for (let band = 0; band < 7; band += 1) {
        const r = BAND_R0 + band * 3;
        for (let c = 2; c <= COLS - 3; c += 1) {
          const k = (c + band * 3) % 8;
          if (k < 5) push(out, r + (c % 2), c);
        }
      }
      return out;
    };

    /* DOUBLE HELIX — two interleaved serpentines out of phase, so a creep that
       escapes one is immediately inside the other. */
    shapes.helix = () => {
      const out = [];
      for (let r = BAND_R0; r <= BAND_R1; r += 3) {
        const phase = ((r - BAND_R0) / 3) % 2;
        for (let c = 1; c <= COLS - 2; c += 1) {
          const seg = Math.floor(c / 6) % 2;
          if (seg === phase) continue;
          push(out, r, c);
        }
      }
      return out;
    };

    /* FUNNEL — wide at the spawn end, tight at the ship, so the creeps bunch
       before the strongest part of the wall. */
    shapes.funnel = () => {
      const out = [];
      const rows = Math.floor((BAND_R1 - BAND_R0) / 2);
      for (let i = 0; i < rows; i += 1) {
        const r = BAND_R1 - i * 2;
        const inset = 1 + Math.floor(i * 1.4);
        for (let c = 1 + inset; c <= COLS - 2 - inset; c += 1) {
          if (Math.abs(c - DOOR_C) <= 1) continue;      // leave the door column walkable
          push(out, r, c);
        }
      }
      return out;
    };

    /* ---- score each one ---- */
    const score = (name, cells) => {
      towers.clear(); towersVersion += 1;
      let placed = 0, sealedAt = null;
      for (const cell of cells) {
        if (placed >= budget) break;
        if (towers.has(idx(cell.r, cell.c))) continue;   // towers are keyed by idx(r, c)
        const t = makeTower(cell.r, cell.c, 'ice', 0, 'player');
        t.buildUntil = 0; addTower(t);
        if (!routesAreOpen()) { towers.delete(t.key); towersVersion += 1; if (sealedAt === null) sealedAt = placed; continue; }
        placed += 1;
      }
      const after = ['west', 'east'].map((s) => routeLength(HALF, s));
      towers.clear(); towersVersion += 1;
      const gained = after.map((v, i) => (v == null || baseline[i] == null) ? 0 : v - baseline[i]);
      const total = gained.reduce((a, b) => a + b, 0);
      return { name, offered:cells.length, placed, sealedAt,
        west:gained[0], east:gained[1], total,
        perTower: placed ? total / placed : 0 };
    };

    const rows = Object.keys(shapes).map((k) => {
      let cells = [];
      try { cells = shapes[k](); } catch (e) { return { name:k, error:String(e).slice(0, 80) }; }
      return score(k, cells);
    });

    return { baseline, rows, budget, cols:COLS, band:[BAND_R0, BAND_R1],
      inPlaybook:Object.keys(MAZE_SHAPES), building:bestMazeShape(),
      ranking:MAZE_RANKING.slice(),
      best:rows.filter((r) => !r.error).sort((a, b) => b.perTower - a.perTower)[0] };
  }, budget);

  const p = (s, n) => String(s).padEnd(n);
  console.log(`maze bake-off — ${out.budget} towers each, south half, band rows ${out.band[0]}..${out.band[1]}`);
  console.log(`bare route: west ${out.baseline[0]} cells, east ${out.baseline[1]}\n`);
  console.log('  ' + p('shape', 12) + p('offered', 9) + p('placed', 8) + p('+west', 8) + p('+east', 8) + p('+total', 9) + 'cells per tower');
  out.rows.sort((a, b) => (b.perTower || 0) - (a.perTower || 0)).forEach((r) => {
    if (r.error) return console.log('  ' + p(r.name, 12) + 'ERROR ' + r.error);
    console.log('  ' + p(r.name, 12) + p(r.offered, 9) + p(r.placed, 8) + p(r.west, 8) + p(r.east, 8)
      + p(r.total, 9) + r.perTower.toFixed(2) + (r.sealedAt !== null ? `   (refused ${r.sealedAt === 0 ? 'from the start' : 'after ' + r.sealedAt})` : ''));
  });
  console.log(`\n  best measured: ${out.best.name} at ${out.best.perTower.toFixed(2)} cells of extra walk per tower`);
  console.log(`  in the playbook: ${out.inPlaybook.join(', ')}`);
  console.log(`  the rival builds: ${out.building}`);
  const stale = out.rows.filter((r) => {
    const noted = out.ranking.find((x) => x.name === r.name);
    return noted && Math.abs(noted.perTower - (r.perTower || 0)) > .08;
  });
  if (stale.length) {
    console.log('\n  MAZE_RANKING IS STALE — re-measured against what it claims:');
    stale.forEach((r) => {
      const noted = out.ranking.find((x) => x.name === r.name);
      console.log(`    ${r.name}: says ${noted.perTower.toFixed(2)}, measures ${(r.perTower || 0).toFixed(2)}`);
    });
  } else if (out.ranking.length) {
    console.log('  MAZE_RANKING matches this run');
  }
  if (out.best && out.best.name !== out.building) {
    console.log(`\n  the rival is NOT building the best shape — ${out.best.name} beats ${out.building}`);
  }
  console.log('  a shape that seals is refused the way buildAt refuses it in play, not scored for it');

  if (WRITE) {
    const file = path.join(__dirname, 'maze-playbook.json');
    fs.writeFileSync(file, JSON.stringify({ measuredAt:new Date().toISOString().slice(0, 10),
      budget:out.budget, baseline:out.baseline, ranking:out.rows.map((r) => ({ name:r.name, perTower:+(r.perTower || 0).toFixed(3), placed:r.placed, total:r.total })) }, null, 2));
    console.log('  wrote ' + file);
  }
  if (errs.length) console.log('\nERRORS', errs.slice(0, 4));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
