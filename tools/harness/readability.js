/* DOES THE ART READ AT THE SIZE THE BOARD DRAWS IT?

   creepsheet.png shows every creep at 21px and again at 3x. At 3x they are
   detailed and distinct. At 21px — the only size a player ever sees in a match
   — they are near-identical smudges. "They all look the same" is an opinion, so
   measure it: render every sprite at board scale, reduce each to a colour and a
   coarse silhouette, and count how many pairs a person could not tell apart.

   Two numbers decide whether art is readable in a lane-pusher:
     HUE SPREAD     - at 21px, colour carries more identity than detail does
     SILHOUETTE     - the shape, after colour is thrown away

   node tools/harness/readability.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.click('#start-button'); await page.waitForTimeout(600);
  await page.click('#lb-ready'); await page.waitForTimeout(1800);

  const out = await page.evaluate(async () => {
    document.querySelectorAll('.coach-card').forEach((c) => c.remove());
    SFX.play = () => {};
    const S = Math.round(CELL);            // the board's own cell, in board px
    const GRID = 8;                        // silhouette signature resolution

    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const cx = cv.getContext('2d', { willReadFrequently: true });

    /* Draw one creep the way the board draws it, then reduce it. */
    const sample = (def) => {
      cx.clearRect(0, 0, S, S);
      const creep = { ...def, x: .5, y: .5, hp: def.hp, maxHp: def.hp, half: PLAYER_HALF,
        armor: def.armor || 0, armorShred: 0, aClass: def.aClass || 'medium', spd: def.spd || 2,
        shield: 0, dots: [], venom: 0, slowUntil: 0, slowPct: 0, frostUntil: 0, frostStacks: 0,
        frostPct: 0, frozenUntil: 0, freezeImmuneUntil: 0, stunUntil: 0, stasisUntil: 0,
        boss: false, bounty: 1, air: Boolean(def.air), cpIndex: 0, pathStep: 0, path: null };
      cx.save(); cx.translate(0, 0); cx.scale(S / CELL, S / CELL);
      try { drawCreep(cx, creep); } catch (e) { /* some roles need more state */ }
      cx.restore();
      const d = cx.getImageData(0, 0, S, S).data;
      let r = 0, g = 0, b = 0, n = 0;
      const sig = new Array(GRID * GRID).fill(0);
      for (let y = 0; y < S; y += 1) for (let x = 0; x < S; x += 1) {
        const i = (y * S + x) * 4, a = d[i + 3];
        if (a < 24) continue;
        r += d[i]; g += d[i + 1]; b += d[i + 2]; n += 1;
        sig[((y * GRID / S) | 0) * GRID + ((x * GRID / S) | 0)] += 1;
      }
      if (!n) return null;
      const max = Math.max(...sig) || 1;
      return { r: r / n, g: g / n, b: b / n, fill: n / (S * S), sig: sig.map((v) => v / max) };
    };

    const toHsl = (r, g, b) => {
      r /= 255; g /= 255; b /= 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
      if (!d) return { h: 0, s: 0, l };
      const s = d / (1 - Math.abs(2 * l - 1));
      let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return { h: (h * 60 + 360) % 360, s, l };
    };

    const defs = []; const seen = new Set();
    const add = (d) => { if (seen.has(d.name)) return; seen.add(d.name); defs.push(d); };
    WAVES.forEach((w) => add({ src: 'wave', ...w }));
    SENDS.forEach((s) => add({ src: 'send', ...sendCreepDef(s) }));

    const rows = [];
    for (const def of defs) {
      const s = sample(def);
      if (!s) continue;
      const hsl = toHsl(s.r, s.g, s.b);
      rows.push({ name: def.name, ...s, ...hsl });
    }

    const lines = [];
    lines.push(`cell the board draws a creep into: ${S}px · sampled ${rows.length} creeps`);

    /* HUE: how much of the wheel does the roster actually use? */
    const hues = rows.map((r) => r.h).sort((a, b) => a - b);
    const sats = rows.map((r) => r.s);
    const inBlue = rows.filter((r) => r.h >= 185 && r.h <= 260).length;
    lines.push(`\nCOLOUR at board scale`);
    lines.push(`  mean saturation ${(sats.reduce((a, b) => a + b, 0) / sats.length).toFixed(2)}`
      + ` · ${rows.filter((r) => r.s < .25).length}/${rows.length} are effectively grey (sat < .25)`);
    lines.push(`  ${inBlue}/${rows.length} sit in the blue-steel wedge (hue 185-260)`);
    const buckets = {};
    rows.forEach((r) => { const k = Math.floor(r.h / 30) * 30; buckets[k] = (buckets[k] || 0) + 1; });
    lines.push('  hue histogram (30 deg buckets): '
      + Object.keys(buckets).sort((a, b) => a - b).map((k) => `${k}:${buckets[k]}`).join('  '));

    /* CONFUSABLE PAIRS: close in colour AND close in shape. */
    const dist = (a, b) => {
      const dc = Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b) / 441;
      let ds = 0;
      for (let i = 0; i < a.sig.length; i += 1) ds += Math.abs(a.sig[i] - b.sig[i]);
      return { dc, ds: ds / a.sig.length };
    };
    let confus = 0; const worst = [];
    for (let i = 0; i < rows.length; i += 1) for (let j = i + 1; j < rows.length; j += 1) {
      const { dc, ds } = dist(rows[i], rows[j]);
      if (dc < .08 && ds < .12) { confus += 1; worst.push({ a: rows[i].name, b: rows[j].name, dc, ds }); }
    }
    const pairs = rows.length * (rows.length - 1) / 2;
    lines.push(`\nSILHOUETTE + COLOUR together`);
    lines.push(`  ${confus} of ${pairs} pairs are near-identical at ${S}px (colour within 8%, shape within 12%)`);
    worst.sort((a, b) => (a.dc + a.ds) - (b.dc + b.ds));
    worst.slice(0, 8).forEach((w) => lines.push(`    ${w.a} ~ ${w.b}`));
    lines.push(`  mean ink coverage of the cell: ${(rows.reduce((s, r) => s + r.fill, 0) / rows.length * 100).toFixed(0)}%`);

    /* TOWERS: same question, and tiers must differ from each other. */
    const errsIn = [];
    const tcv = document.createElement('canvas'); tcv.width = S; tcv.height = S;
    const tc = tcv.getContext('2d', { willReadFrequently: true });
    const tsample = (raceId, tier) => {
      tc.clearRect(0, 0, S, S);
      const t = { key: -1, r: 0, c: 0, raceId, tier, level: 0, owner: 'player', priority: 'first',
        buildUntil: -1, placedAt: -1, kills: 0, invested: 0, blockHp: 9, blockMaxHp: 9, underAttack: 0 };
      tc.save(); tc.scale(S / CELL, S / CELL);
      try { drawTower(tc, t); } catch (e) { errsIn.push(String(e).slice(0, 90)); }
      tc.restore();
      const d = tc.getImageData(0, 0, S, S).data;
      const sig = new Array(GRID * GRID).fill(0); let n = 0;
      for (let y = 0; y < S; y += 1) for (let x = 0; x < S; x += 1) {
        const i = (y * S + x) * 4; if (d[i + 3] < 24) continue;
        n += 1; sig[((y * GRID / S) | 0) * GRID + ((x * GRID / S) | 0)] += 1;
      }
      const max = Math.max(...sig) || 1;
      return { fill: n / (S * S), sig: sig.map((v) => v / max) };
    };
    lines.push(`\nTOWER TIERS — does rung N look different from rung N+1 at ${S}px?`);
    for (const race of races) {
      const list = towerListFor(race.id);
      const shots = list.map((_, t) => tsample(race.id, t)).filter((x) => x && x.fill > 0);
      if (shots.length < 2) { lines.push(`  ${race.name.padEnd(12)} (not drawable here)`); continue; }
      const steps = [];
      for (let i = 1; i < shots.length; i += 1) {
        let ds = 0;
        for (let k = 0; k < shots[i].sig.length; k += 1) ds += Math.abs(shots[i].sig[k] - shots[i - 1].sig[k]);
        steps.push(ds / shots[i].sig.length);
      }
      const growth = shots[shots.length - 1].fill / Math.max(.0001, shots[0].fill);
      lines.push(`  ${race.name.padEnd(12)} adjacent-tier shape change ${steps.map((s) => s.toFixed(2)).join(' ')}`
        + ` · top rung covers ${growth.toFixed(1)}x the ink of the first`);
    }
    if (errsIn.length) lines.push(`  (draw errors: ${[...new Set(errsIn)].slice(0, 2).join(' | ')})`);
    return lines.join('\n');
  });

  console.log(out);
  console.log('\nerrors:', errs.length ? errs.slice(0, 4) : 'none');
  await browser.close();
})();
