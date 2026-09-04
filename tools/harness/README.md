# Harness

Scripts that drive the real game in real Chrome, at phone size, and report
numbers instead of impressions. They exist because "does it fit on a phone",
"does the send pay what the button says" and "is this tower too strong" are
all questions the game can answer itself.

The game stays dependency-free. The harness needs `playwright-core` (the
driver only, no browser download) and the Chrome already on the machine:

```
cd tools/harness && npm i --no-save playwright-core
python3 -m http.server 8000          # from the repo root, in another shell
node tools/harness/drive.js http://127.0.0.1:8000/
```

Output goes to `tools/harness/out/` (gitignored). `OUT=/dir/` and
`CHROME=/path/to/chrome` override the defaults.

| script | what it does |
|---|---|
| `drive.js <url> <prefix> tour` | phone tour: menu, fresh arena, zoomed, double-tap, command bar, settings; screenshots + layout metrics JSON |
| `hud.js <url> [w h]` | measures every HUD readout and the board overlays; prints `hudContractReport()` |
| `desk.js <url> <prefix>` | desktop menu + arena screenshots and overlay rects |
| `econ.js <url>` | income ground truth: wave pay banks until the tick, send card == actual gain, wager bonus |
| `kits.js <url>` | tech kits: fit, refuse a second, burn/slow/sickness/floor, piercing stats, tier-up forfeit, rocket splash effects, picker |
| `bal.js <url> <waves> [set]` | equal-gold tower groups vs the same creep stream; sets `kits` (default) and `rockets` |
| `tp.js <url>` | towers.html Tech card at 390 and 1280 |

`bal.js` measures one tower group against ten creeps on an open lane, so it
sees damage and single-tower slows but not what a slow does to a whole maze.
Read its slow-kit numbers as a floor.

Why real Chrome and not headless-shell: `--window-size=390` in headless
Chrome lays out at about 500px (there is a minimum window width), so the
first "phone" screenshots were wrong. Playwright's mobile emulation is a
true 390px viewport.
