/* Does every element have a class it BEATS, not just classes that beat it?

   Gene: "it might be prudent to do an audit on the original wmw and how the
   races [work]."

   The thing worth taking from the original is structural rather than numeric:
   its damage types are paired — each one deals DOUBLE to some armour class and
   HALF to another. Razing doubles into fortified and halves into unarmored;
   piercing doubles into light and halves into medium. A type is defined by the
   trade, and every type has both sides of it.

   Ours are not all paired, and that is testable. This prints each element's
   best and worst multiplier and flags any race carrying a real penalty without
   a matching strength — a race that is bad at something and never good at
   anything has a weakness, not an identity.

   node tools/harness/profiles.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 800 } })).newPage();
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);

  const out = await page.evaluate(() => {
    const CLASSES = ['unarmored', 'light', 'medium', 'heavy', 'fortified'];
    return races.map((r) => {
      const prof = ATTACK_PROFILE[r.id] || { vs:{} };
      const vals = CLASSES.map((c) => ({ c, v: prof.vs[c] ?? 1 }));
      const hi = vals.slice().sort((a, b) => b.v - a.v)[0];
      const lo = vals.slice().sort((a, b) => a.v - b.v)[0];
      return { race:r.name, label:prof.label, hi, lo, spread: hi.v / lo.v,
        vals:vals.reduce((o, x) => (o[x.c] = x.v, o), {}) };
    }).sort((a, b) => a.hi.v - b.hi.v);
  });

  const p = (s, n) => String(s).padEnd(n);
  const CLASSES = ['unarmored', 'light', 'medium', 'heavy', 'fortified'];
  console.log('  ' + p('element', 14) + p('type', 10) + CLASSES.map((c) => p(c.slice(0, 9), 11)).join('')
    + p('best', 18) + 'worst');
  out.forEach((r) => console.log('  ' + p(r.race, 14) + p(r.label, 10)
    + CLASSES.map((c) => p(r.vals[c].toFixed(2), 11)).join('')
    + p(`${r.hi.v.toFixed(2)} ${r.hi.c}`, 18) + `${r.lo.v.toFixed(2)} ${r.lo.c}`));

  /* THE PAIRING TEST. The original's types all carry a double and a half. A
     race here with a steep penalty and no real strength is carrying one half of
     a trade it never gets paid for. */
  const STRONG = 1.4, WEAK = 0.7;
  const unpaired = out.filter((r) => r.lo.v <= WEAK && r.hi.v < STRONG);
  console.log('\n  a type should cut both ways: something it beats, something that beats it');
  console.log(`  (counting a real strength as >= ${STRONG}x and a real penalty as <= ${WEAK}x)\n`);
  if (unpaired.length) {
    console.log('  PENALTY WITHOUT A STRENGTH — weakness rather than identity:');
    unpaired.forEach((r) => console.log(`    ${p(r.race, 13)} best ${r.hi.v.toFixed(2)} into ${p(r.hi.c, 11)} worst ${r.lo.v.toFixed(2)} into ${r.lo.c}`));
  } else {
    console.log('  every element has a class it genuinely beats');
  }
  const noPenalty = out.filter((r) => r.lo.v > WEAK && r.hi.v >= STRONG);
  if (noPenalty.length) {
    console.log('\n  STRENGTH WITHOUT A PENALTY — nothing it does not want to meet:');
    noPenalty.forEach((r) => console.log(`    ${p(r.race, 13)} best ${r.hi.v.toFixed(2)}, worst only ${r.lo.v.toFixed(2)}`));
  }
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
