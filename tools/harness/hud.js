// Measure HUD children and the bottom-of-board overlays at phone size.
const { chromium, CHROME, OUT } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8766/';
const W = Number(process.argv[3] || 390), H = Number(process.argv[4] || 844);
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'dark',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 300)); });
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.click('#start-button');
  await page.waitForTimeout(1800);
  const r = await page.evaluate(() => {
    const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join(','); };
    const hud = document.querySelector('.hud');
    const kids = [...hud.querySelectorAll(':scope > *')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => ({ el: e.id || e.className.split(' ')[0], r: rect(e), text: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 40) }));
    const res = [...document.querySelectorAll('.resources > *')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => ({ el: e.className.split(' ').slice(0, 2).join('.'), r: rect(e), text: e.textContent.trim().slice(0, 16) }));
    const ms = [...document.querySelectorAll('.match-state > *')].map((e) => ({ el: e.id || e.className, r: rect(e), text: e.textContent.trim().slice(0, 16) }));
    const cs = getComputedStyle(document.querySelector('.resources'));
    return { hud: rect(hud), kids, res, ms, resourcesStyle: { flex: cs.flex, minWidth: cs.minWidth, overflow: cs.overflow, gap: cs.gap, width: cs.width, marginLeft: cs.marginLeft },
      matchStateStyle: (() => { const c = getComputedStyle(document.querySelector('.match-state')); return { flex: c.flex, overflow: c.overflow, width: c.width }; })(),
      contract: typeof hudContractReport === 'function' ? hudContractReport() : 'n/a',
      overlays: ['.map-toggles', '.map-zoom-controls', '.zoom-hint', '#arena-log', '#wisp', '.coach-card', '#map-frame', '#map-viewport', '#command-bar', '#cb-build', '#cb-send'].map((s) => s + ' ' + rect(document.querySelector(s))),
      shipLabels: [...document.querySelectorAll('.ov-ship')].map((e) => e.textContent.trim().replace(/\s+/g, ' ') + ' @ ' + rect(e)),
      brand: (() => { const b = document.querySelector('.hud-brand'); const c = getComputedStyle(b); const svg = b.querySelector('svg'); const cs = svg ? getComputedStyle(svg) : null;
        return { rect: rect(b), pad: c.padding, lh: c.lineHeight, font: c.font, display: c.display, alignItems: c.alignItems, svg: svg ? rect(svg) + ' w=' + cs.width + ' h=' + cs.height : null,
          kids: [...b.children].map((k) => k.tagName + ' ' + rect(k)) }; })(),
      hudStyle: (() => { const c = getComputedStyle(hud); return { minH: c.minHeight, pad: c.padding, h: c.height, border: c.borderWidth }; })(),
    };
  });
  console.log(JSON.stringify(r, null, 1));
  if (errs.length) console.log('CONSOLE', errs.slice(0, 10));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
