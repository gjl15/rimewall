// Phone-size tour of the game with real Chrome, for screenshots + layout metrics.
// usage: node drive.js <baseUrl> <outPrefix> [scenario]
const { chromium, CHROME, OUT } = require('./lib');
const fs = require('fs');
const base = process.argv[2] || 'http://127.0.0.1:8766/';
const prefix = process.argv[3] || 'g';
const scenario = process.argv[4] || 'tour';

const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    colorScheme: 'dark',
  });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text().slice(0, 200)); });
  page.on('pageerror', (e) => logs.push('pageerror: ' + String(e).slice(0, 200)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const shot = async (name, full = false) => { await page.screenshot({ path: OUT + prefix + '-' + name + '.png', fullPage: full }); };
  const metrics = async (label) => page.evaluate((label) => {
    const q = (s) => document.querySelector(s);
    const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
    const style = (el, p) => el ? getComputedStyle(el)[p] : null;
    return {
      label, inner: { w: innerWidth, h: innerHeight }, scroll: { w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, y: scrollY },
      body: document.body.className, uiMode: document.documentElement.dataset.ui || null,
      hud: rect(q('.hud')), viewport: rect(q('#map-viewport')), frame: rect(q('#map-frame')), frameTransform: style(q('#map-frame'), 'transform'),
      toggles: rect(q('.map-toggles')), zoomCtl: rect(q('.map-zoom-controls')), zoomHint: rect(q('.zoom-hint')), zoomHintText: q('.zoom-hint') ? q('.zoom-hint').innerText : null,
      coach: rect(q('.coach-card')), commandBar: rect(q('#command-bar')), quickSend: rect(q('#quick-send')), debugBar: rect(q('.debug-bar')), log: rect(q('#event-log')),
      shipLabel: rect(q('.ov-ship:last-of-type')), wisp: rect(q('.wisp-orb') || q('#wisp') || q('.wisp')),
      title: rect(q('.battle-title-row')), backBtn: rect(q('#back-button')),
      zoomLabel: q('#zoom-label') ? q('#zoom-label').textContent : null,
      touchAction: { html: style(document.documentElement, 'touchAction'), body: style(document.body, 'touchAction'), vp: style(q('#map-viewport'), 'touchAction') },
      visualScale: visualViewport.scale,
    };
  }, label);
  const out = { logs, steps: [] };

  if (scenario === 'tour') {
    await shot('menu', true);
    out.steps.push(await metrics('menu'));
    await page.click('#start-button');
    await page.waitForTimeout(2000);
    out.steps.push(await metrics('arena-fresh'));
    await shot('arena-fresh');
    await page.evaluate(() => document.querySelectorAll('.coach-card').forEach((c) => c.remove()));
    await page.waitForTimeout(300);
    await shot('arena', true);
    // zoom in twice via the on-screen control, then screenshot, then reset
    const vis = async (sel) => { const h = await page.$(sel); return h && await h.isVisible() ? h : null; };
    const zin = await vis('#zoom-in-button') || await vis('[data-act="zoomin"]') || await vis('[data-d="zoomin"]');
    out.zoomControlVisible = !!zin;
    out.zoomWidgets = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => /zoom|reset|^[+−-]$/i.test(b.textContent + ' ' + (b.getAttribute('aria-label') || '') + ' ' + b.id) && b.getBoundingClientRect().width > 0).map((b) => ({ id: b.id, text: b.textContent.trim().slice(0, 12), cls: b.className.slice(0, 40), ds: JSON.stringify(b.dataset) })));
    if (zin) { await zin.evaluate((b) => b.click()); await page.waitForTimeout(400); await zin.evaluate((b) => b.click()); await page.waitForTimeout(900); }
    else { await page.evaluate(() => { if (typeof smoothZoomTo === 'function') smoothZoomTo(1.5, playerAnchor()); }); await page.waitForTimeout(900); }
    out.steps.push(await metrics('zoomed'));
    await shot('arena-zoomed');
    const zr = await vis('#zoom-reset-button') || await vis('[data-act="zoomreset"]') || await vis('[data-d="zoomreset"]'); if (zr) { await zr.evaluate((b) => b.click()); await page.waitForTimeout(900); }
    // double-tap on rival ground (top third of the map) should toggle zoom
    const vp = await page.$('#map-viewport'); const vb = await vp.boundingBox();
    await page.touchscreen.tap(vb.x + vb.width * .5, vb.y + vb.height * .25);
    await page.waitForTimeout(120);
    await page.touchscreen.tap(vb.x + vb.width * .5, vb.y + vb.height * .25);
    await page.waitForTimeout(900);
    out.steps.push(await metrics('after-doubletap'));
    await shot('arena-doubletap');
    if (zr) { await zr.evaluate((b) => b.click()); await page.waitForTimeout(900); }
    // scroll to command bar
    await page.evaluate(() => { const cb = document.querySelector('#command-bar'); if (cb) cb.scrollIntoView({ block: 'start' }); });
    await page.waitForTimeout(400);
    await shot('command-bar');
    out.steps.push(await metrics('command-bar'));
    // settings
    const gear = await vis('#settings-open-hud');
    if (gear) { await page.evaluate(() => scrollTo(0, 0)); await gear.tap(); await page.waitForTimeout(600); await shot('settings'); out.steps.push(await metrics('settings')); await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
    // list visible buttons/ids for the report
    out.ids = await page.evaluate(() => [...document.querySelectorAll('button[id], [id$="-panel"], [id$="-sheet"], .sheet, #wisp-panel')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.id || e.className).slice(0, 80));
  }
  fs.writeFileSync(OUT + prefix + '-metrics.json', JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1).slice(0, 6000));
  await browser.close();
})().catch((e) => { console.error('DRIVE FAILED', String(e).slice(0, 300)); process.exit(1); });
