/* Gene: "things like snowball launcher shoulld look like a snowball launcher..
   all towers use gemini imagen or neo banana or something to get it looking
   better."

   Generated art is 1024x1024. A board cell is 21px at 100% zoom and 9.5px on a
   phone. Whether a detailed sprite survives that is not a matter of taste, so
   this renders one against the vector tower it would replace, at every size the
   board actually uses, and lets the comparison decide.

   node tools/harness/spritetest.js <url> <sprite.png> */
const { chromium, CHROME, OUT } = require('./lib');
const fs = require('fs');
const path = require('path');
const base = process.argv[2] || 'http://127.0.0.1:8771/';
const sprite = process.argv[3] || '/Users/melts/.claude/jobs/b02d050d/tmp/sprites/probe.png';

(async () => {
  const dataUri = 'data:image/png;base64,' + fs.readFileSync(sprite).toString('base64');
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await (await browser.newContext({ viewport: { width: 980, height: 460 }, deviceScaleFactor: 2, colorScheme: 'dark' })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  const info = await page.evaluate(async (uri) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = uri; });

    /* CROP TO THE SUBJECT FIRST. The model returns a 1024 square with the tower
       floating in the middle of a black field; drawn as-is into a 21px cell the
       tower occupies about eight pixels and the rest is padding. Key out the
       background and take the bounding box of what is left — this is the step
       that decides whether any of this is viable. */
    const w = img.width, h = img.height;
    const off = document.createElement('canvas'); off.width = w; off.height = h;
    const oc = off.getContext('2d'); oc.drawImage(img, 0, 0);
    const px = oc.getImageData(0, 0, w, h);
    const d = px.data;
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    const LUM = 42;                      // anything darker than this is background
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4;
        const l = (d[i] * .30 + d[i + 1] * .59 + d[i + 2] * .11);
        if (l < LUM) { d[i + 3] = 0; continue; }
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    oc.putImageData(px, 0, 0);
    const cw = Math.max(1, x1 - x0), chh = Math.max(1, y1 - y0);

    // the comparison sheet
    const SIZES = [9.5, 21, 32, 48];
    const cv = document.createElement('canvas');
    cv.width = 980; cv.height = 300;
    cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999';
    document.body.appendChild(cv);
    const c = cv.getContext('2d');
    c.fillStyle = '#0c1220'; c.fillRect(0, 0, cv.width, cv.height);
    c.font = '600 12px system-ui, sans-serif'; c.fillStyle = '#93a3c4'; c.textAlign = 'left';
    c.fillText('generated sprite, cropped to subject', 20, 26);
    c.fillText('the vector tower it would replace (Ice tier 1)', 20, 170);

    const iceTier = 1;
    SIZES.forEach((S, i) => {
      const x = 40 + i * 180, y = 60;
      c.fillStyle = '#93a3c4'; c.font = '600 10px ui-monospace, monospace'; c.textAlign = 'center';
      c.fillText(S + 'px' + (S === 21 ? '  (board 100%)' : S === 9.5 ? '  (phone)' : ''), x + 40, 52);
      // sprite, cropped, fitted into the cell
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      c.drawImage(off, x0, y0, cw, chh, x + 40 - S / 2, y + 40 - S / 2, S, S);
      // the same cell drawn by the game
      c.save();
      c.translate(x + 40, y + 190 + S / 2);
      const s = S / 20; c.scale(s, s);
      c.fillStyle = RW_ELEMENT.ice; c.strokeStyle = '#0c122099'; c.lineWidth = .9; c.lineJoin = 'round';
      rwBody(c, 'ice', 5, 8.5, 1.7, iceTier);
      c.restore();
    });
    return { w, h, crop: { x0, y0, cw, chh }, fill: +(cw * chh / (w * h) * 100).toFixed(1) };
  }, dataUri);

  const file = path.join(OUT, 'spritetest.png');
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 980, height: 300 } });
  console.log(`  generated ${info.w}x${info.h}, subject occupies ${info.fill}% of it`);
  console.log(`  cropped to ${info.crop.cw}x${info.crop.chh} at (${info.crop.x0},${info.crop.y0})`);
  console.log('  ' + file);
  if (errs.length) console.log('  ERRORS', errs.slice(0, 3));
  await browser.close();
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
