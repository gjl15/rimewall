/* Gene: "lets merge the practice game logs across devices."

   The pooling that existed was copy a JSON blob, paste a JSON blob — and a full
   log is 428 kb, which nobody moves through a phone's clipboard. So this checks
   the thing that actually has to work: device A writes a file, device B reads
   it, and the rival on device B has learned from device A's games.

   Two browser contexts, separate localStorage, so it is a real second device
   rather than the same one twice.

   node tools/harness/logsync.js <url> */
const { chromium, CHROME } = require('./lib');
const base = process.argv[2] || 'http://127.0.0.1:8771/';

const boot = async (browser) => {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + 'index.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  return { ctx, page };
};

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const errs = [];

  // ---- device A: a player with a history ----
  const A = await boot(browser);
  A.page.on('pageerror', (e) => errs.push('A ' + String(e).slice(0, 140)));
  const made = await A.page.evaluate(() => {
    const mk = (i) => ({ at:new Date(Date.now() - i * 36e5).toISOString(), race:races[i % races.length].id,
      mode:'skirmish', team:1, wave:18 + (i % 18), kills:300 + i * 7, peakIncome:800 + i,
      peakTowers:90 + i, bolts:9, livesLeft:i % 4 ? 0 : 12, livesLost:100, leaksByWave:{ 17:2, 18:6 },
      result:i % 5 ? 'defeat' : 'victory', seed:i, startLives:100, difficulty:'normal', daily:false,
      name:'', aid:'deviceA', points:900 + i, rivalPlan:'maze', rivalLives:40, rival:'fire',
      secs:1300, goldEarned:9000, goldSpent:8800,
      build:Array.from({ length:LOG_BUILD_CAP }, (_, k) => [30 + (k % 26), 1 + (k % 40), k % 6, 1 + (k % 40)]) });
    const list = Array.from({ length:40 }, (_, i) => mk(i));
    saveMatchLog(list);
    return { mine:loadOwnLog().length, json:logExportPayload().length };
  });

  const file = await A.page.evaluate(async () => {
    const f = await buildLogFile();
    const buf = new Uint8Array(await f.blob.arrayBuffer());
    return { ext:f.ext, bytes:f.bytes, raw:f.raw, data:Array.from(buf) };
  });

  // ---- device B: a clean install ----
  const B = await boot(browser);
  B.page.on('pageerror', (e) => errs.push('B ' + String(e).slice(0, 140)));
  const before = await B.page.evaluate(() => ({ pool:loadMatchLog().length, mine:loadOwnLog().length,
    playbook:!!playbookFor('ice') }));

  const merge = (bytes) => B.page.evaluate(async (data) => {
    const blob = new Blob([new Uint8Array(data)]);
    const res = await readLogFile(new File([blob], 'rimewall-log.rwlog'));
    return { res, pool:loadMatchLog().length, mine:loadOwnLog().length };
  }, bytes);

  const first = await merge(file.data);
  const second = await merge(file.data);           // merging the same file twice must add nothing

  const learned = await B.page.evaluate(() => {
    const ids = races.map((r) => r.id).filter((id) => !!playbookFor(id));
    return { races:ids.length, sample:ids.slice(0, 4), min:MIN_PLAYBOOK_GAMES };
  });

  const kb = (n) => (n / 1024).toFixed(0) + 'kb';
  console.log(`  device A has ${made.mine} of its own matches\n`);
  console.log('  THE FILE');
  console.log(`    as JSON            ${kb(made.json)}   <- what the clipboard flow asked you to move`);
  console.log(`    as a .${file.ext} file   ${kb(file.bytes)}   ${file.ext === 'rwlog' ? `(${(made.json / file.bytes).toFixed(1)}x smaller)` : '(no compression in this browser)'}`);
  console.log('\n  DEVICE B');
  console.log(`    before            pool ${before.pool}, own ${before.mine}, ice playbook ${before.playbook}`);
  console.log(`    first merge       +${first.res.added} added, ${first.res.skipped} skipped -> pool ${first.pool}`);
  console.log(`    same file again   +${second.res.added} added, ${second.res.skipped} skipped -> pool ${second.pool}`);
  console.log(`    own records       ${second.mine}  (A's games join the pool, they do not become B's)`);
  console.log(`\n  the rival on B now has a playbook for ${learned.races} of ${11} elements (needs ${learned.min} games each)`);
  console.log(`    ${learned.sample.join(', ')}${learned.races > 4 ? ' …' : ''}`);

  const ok = first.res.ok && first.res.added === made.mine
    && second.res.added === 0 && second.res.skipped === made.mine
    && second.mine === 0 && learned.races > 0 && !errs.length;
  console.log('\n' + (ok ? 'PASS — a log crosses devices as a file, merges once, and teaches the rival' : 'FAIL'));
  if (errs.length) console.log('ERRORS', errs.slice(0, 4));
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
