/* Can a defender ignore an armour class, or a shrine level, and get away with it?

   Gene: "There should be a variety of sends containing all armors types, flying,
   juggernaut, shield, healing, life stealing."

   A hole in this grid is a real advantage: if nothing at shrine 4 is medium,
   then a builder weak to medium simply never has to answer for it once the game
   gets going. This prints the ladder as a grid of armour class against shrine
   level, and lists the engine roles that no send carries.
   node tools/harness/ladder.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  const out = await page.evaluate(() => {
    const classes = ['unarmored', 'light', 'medium', 'heavy', 'fortified'];
    const shrines = [1, 2, 3, 4, 5];
    const grid = {}, airGrid = {};
    classes.forEach((c) => { grid[c] = {}; airGrid[c] = {}; shrines.forEach((sh) => { grid[c][sh] = 0; airGrid[c][sh] = 0; }); });
    const roles = {};
    SENDS.forEach((s) => {
      if (s.attacker) return;              // attackers are a different job, counted apart
      grid[s.aClass][s.shrine] += 1;
      if (s.air) airGrid[s.aClass][s.shrine] += 1;
      if (s.role) roles[s.role] = (roles[s.role] || 0) + 1;
    });
    /* Roles the engine can actually run, taken from spawnCreep's own branches,
       so this notices a capability nobody ever put on a card. */
    const engineRoles = ['regenerator', 'shieldbearer', 'juggernaut', 'deathheal', 'deathshield', 'warden', 'swarm'];
    return { classes, shrines, grid, airGrid, roles, engineRoles,
      total: SENDS.filter((s) => !s.attacker).length,
      attackers: SENDS.filter((s) => s.attacker).length };
  });

  const p = (s, n) => String(s).padEnd(n);
  console.log(`send ladder — ${out.total} sends and ${out.attackers} attackers\n`);
  console.log('  ' + p('armour class', 14) + out.shrines.map((sh) => p('shrine ' + sh, 10)).join(''));
  let holes = 0;
  out.classes.forEach((c) => {
    const cells = out.shrines.map((sh) => {
      const n = out.grid[c][sh], air = out.airGrid[c][sh];
      if (!n) { holes += 1; return p('—', 10); }
      return p(n + (air ? ` (${air} air)` : ''), 10);
    });
    console.log('  ' + p(c, 14) + cells.join(''));
  });

  const air = out.classes.filter((c) => out.shrines.some((sh) => out.airGrid[c][sh]));
  console.log('\n  air appears as: ' + air.join(', '));
  const missing = out.engineRoles.filter((r) => !out.roles[r]);
  console.log('  roles carried by a send: ' + Object.keys(out.roles).sort().join(', '));
  console.log('  roles the engine runs but no send carries: ' + (missing.length ? missing.join(', ') : 'none'));
  console.log('\n  empty cells in the grid: ' + holes + ' of ' + (out.classes.length * out.shrines.length));
  console.log('  (a hole is a class a defender never has to answer at that shrine level)');
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
