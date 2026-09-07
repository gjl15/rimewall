/* Shared bits for the harness scripts. The game stays dependency-free; the
   harness needs playwright-core (browser driver only, no browser download)
   and uses the Chrome already installed on the machine.

     npm i --no-save playwright-core        (in tools/harness, or anywhere on NODE_PATH)
     node tools/harness/econ.js http://127.0.0.1:8000/

   Serve the repo first: python3 -m http.server 8000. Screenshots and reports
   land in tools/harness/out/ (gitignored). Override with OUT=/some/dir/. */
const path = require('path');
const fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright-core')); }
catch (e) { console.error('playwright-core not found: run  npm i --no-save playwright-core  in tools/harness'); process.exit(2); }
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = (process.env.OUT || path.join(__dirname, 'out')).replace(/\/?$/, '/');
fs.mkdirSync(OUT, { recursive: true });
module.exports = { chromium, CHROME, OUT };
