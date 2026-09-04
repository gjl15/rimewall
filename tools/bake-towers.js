#!/usr/bin/env node
/* Refresh the BAKED copy inside towers.html from index.html.

   towers.html reads the live game file when it can, but it draws a baked copy
   first so it always renders — offline, on file://, mid-deploy. That copy
   goes stale the moment a tower or tunable changes. Run this after any change
   to races / TOWERS / LASER_TOWER / ATTACK_PROFILE / TRAIT:

       node tools/bake-towers.js

   No dependencies. It rewrites exactly two lines in towers.html. */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const pagePath = path.join(root, 'towers.html');
let page = fs.readFileSync(pagePath, 'utf8');

function sliceLiteral(text, decl, open, close) {
  const at = text.indexOf(decl);
  if (at < 0) throw new Error('could not find ' + decl.trim() + ' in index.html');
  const start = text.indexOf(open, at);
  let depth = 0, inStr = null, esc = false, inLine = false, inBlock = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i], next = text[i + 1];
    if (inLine) { if (ch === '\n') inLine = false; continue; }
    if (inBlock) { if (ch === '*' && next === '/') { inBlock = false; i += 1; } continue; }
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '/' && next === '/') { inLine = true; i += 1; continue; }
    if (ch === '/' && next === '*') { inBlock = true; i += 1; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === open) depth += 1;
    else if (ch === close) { depth -= 1; if (!depth) return text.slice(start, i + 1); }
  }
  throw new Error('unbalanced literal for ' + decl.trim());
}
const evalLiteral = (text) => new Function('return (' + text + ')')();

const data = {
  races: evalLiteral(sliceLiteral(src, 'const races = [', '[', ']')),
  TOWERS: evalLiteral(sliceLiteral(src, 'const TOWERS = {', '{', '}')),
  LASER: evalLiteral(sliceLiteral(src, 'const LASER_TOWER = {', '{', '}')),
  PROFILE: evalLiteral(sliceLiteral(src, 'const ATTACK_PROFILE = {', '{', '}')),
  TRAIT: evalLiteral(sliceLiteral(src, 'const TRAIT = {', '{', '}')),
};

let sha = 'unknown';
try {
  sha = cp.execSync('git rev-parse --short HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  const dirty = cp.execSync('git status --porcelain -- index.html', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  if (dirty) sha += '+';
} catch (e) { /* not a git checkout; leave unknown */ }
const stamp = sha + ' / ' + new Date().toISOString().slice(0, 10);

const json = JSON.stringify(data);
if (json.includes('</script')) throw new Error('data would close the script tag');
let hits = 0;
page = page.replace(/^const BAKED = .*$/m, () => { hits += 1; return 'const BAKED = ' + json + ';'; });
page = page.replace(/^const BAKED_AT = .*$/m, () => { hits += 1; return "const BAKED_AT = '" + stamp + "';"; });
if (hits !== 2) throw new Error('towers.html no longer has the BAKED / BAKED_AT lines to replace');
fs.writeFileSync(pagePath, page);

const n = data.races.reduce((a, r) => a + (data.TOWERS[r.id] || []).length, 0);
console.log('towers.html baked: ' + data.races.length + ' races, ' + n + ' towers, stamp ' + stamp);
