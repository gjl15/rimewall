/* Every control in the game, counted, per screen and per device.

   "We need to take an inventory of all menu items and in game functionality,
   sort them, and simplify." Opinion is cheap here and the surface area is not
   knowable by eye, so count it: every visible, hittable control on every
   screen, grouped by the panel it lives in, with duplicates across panels
   called out — the same action offered in four places is four places to
   maintain and four things to read.
   node tools/harness/inventory.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const laptop = { viewport: { width: 1280, height: 800 } };

const SNAP = `(() => {
  const seen = [];
  document.querySelectorAll('button, [role="button"], select, input, a[href], [data-watch], [data-ring], [data-bolt], [data-send], [data-tower], [data-sheet-act], [data-wp-act]').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    if (r.bottom < 0 || r.top > innerHeight + 400) return;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none' || +st.opacity === 0) return;
    // which panel does it belong to?
    let owner = 'loose', n = el;
    while (n && n !== document.body) {
      const id = n.id || '';
      if (id) { owner = id; break; }
      n = n.parentElement;
    }
    // only count what a finger can actually reach: a control sitting behind a
    // full-screen overlay is not part of the surface area a person deals with
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    if (!top || !(top === el || el.contains(top) || top.contains(el))) return;
    const label = (el.getAttribute('aria-label') || el.textContent || el.value || el.id || el.tagName).trim().replace(/\\s+/g, ' ').slice(0, 34);
    seen.push({ owner, label, tag: el.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height) });
  });
  return seen;
})()`;

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const report = {};
  for (const [device, opts] of [['phone', phone], ['laptop', laptop]]) {
    const page = await (await browser.newContext(opts)).newPage();
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    const grab = async (name) => {
      const list = await page.evaluate(SNAP);
      report[device] = report[device] || {};
      report[device][name] = list;
    };
    await grab('1 title');
    await page.click('#start-button'); await page.waitForTimeout(700);
    await grab('2 race select');
    await page.click('#lb-ready'); await page.waitForTimeout(1800);
    await page.evaluate(() => { document.querySelectorAll('.coach-card').forEach((c) => c.remove()); SFX.play = () => {}; });
    await grab('3 arena, nothing selected');
    // with a tower selected: the state a person is in most of the match
    await page.evaluate(() => {
      player.gold = 1e6; player.lumber = 9;
      const t = makeTower(SOUTH_TOP + 6, 12, selectedRace.id, 1, 'player');
      t.buildUntil = 0; t.placedAt = -1000; addTower(t);
      selectedTowerKey = t.key; selectedGroupKeys = [t.key]; inspectEntity = { kind: 'tower' };
      renderTowerDetails(); renderRing(); sheetKey = ''; renderCommandSheet();
      if (touchUI()) { wispTab = 'inspect'; renderWispPanel('inspect'); railTab = 'tower'; renderRails(); }
    });
    await page.waitForTimeout(600);
    await grab('4 arena, tower selected');
    await page.close();
  }
  await browser.close();

  const p = (s, n) => String(s).padEnd(n);
  for (const device of ['phone', 'laptop']) {
    console.log('\n================ ' + device.toUpperCase() + ' ================');
    let total = 0;
    for (const [screen, list] of Object.entries(report[device])) {
      const byOwner = {};
      list.forEach((c) => { (byOwner[c.owner] = byOwner[c.owner] || []).push(c); });
      console.log('\n  ' + screen + '  —  ' + list.length + ' controls on screen');
      total = Math.max(total, list.length);
      Object.entries(byOwner).sort((a, b) => b[1].length - a[1].length).forEach(([owner, cs]) => {
        console.log('    ' + p(owner, 22) + p(cs.length, 5) + cs.slice(0, 6).map((c) => c.label).join(' | ').slice(0, 92));
      });
    }
    console.log('\n  busiest single screen: ' + total + ' controls');
  }

  // the same action offered in more than one place
  console.log('\n================ DUPLICATED ACTIONS ================');
  const sel = report.phone['4 arena, tower selected'].concat(report.laptop['4 arena, tower selected']);
  const norm = (l) => l.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10);
  const groups = {};
  sel.forEach((c) => { const k = norm(c.label); if (!k) return; (groups[k] = groups[k] || new Set()).add(c.owner); });
  Object.entries(groups).filter(([, owners]) => owners.size > 1)
    .sort((a, b) => b[1].size - a[1].size)
    .forEach(([k, owners]) => console.log('  ' + p(k, 14) + 'offered in ' + owners.size + ' panels: ' + [...owners].join(', ')));
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
