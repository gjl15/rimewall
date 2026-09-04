# Rimewall

Browser tower-defense lane-pusher, dependency-free. The entire game is one file:
`index.html` (~540KB — markup, CSS and JS inline). Deployed as a static file; no
build step, no package manager, no tests to run.

## Working with more than one session

Two sessions edit this repo: a Claude Code session on the laptop, and cloud
sessions from the web/iOS app. Both write the same single 540KB file.

**Pull before you touch `index.html`.**

```
git pull
```

If you have uncommitted edits: `git stash && git pull && git stash pop`, which
surfaces a real conflict instead of a silent loss.

This is not a formality. On 2026-08-29 commit `d851689` was authored from a
checkout that predated three commits already on `main`. It wrote the whole file
back, deleting 160 lines — 24 of them another session's work. Git recorded it as
an ordinary commit: no conflict, no warning, nothing to review. It was only
caught by chance a day later, and took a full re-apply (`8808332`) to recover.

Because the codebase is one enormous file, a whole-file write is the normal way
to edit it and also the way to erase someone else's work. Git cannot protect you
here; pulling first is the only thing that does.

A `SessionStart` hook in `.claude/settings.json` fetches and warns when this
checkout is behind `origin/main`. It never pulls for you — read-only by design.

Prefer small, committed, pushed increments over a long-held working tree. An
uncommitted change is one container reclaim away from gone.

## Verifying a change

There is no test suite. What works:

- **Syntax**: extract the inline `<script>` and run `node --check`.
- **Behaviour**: serve the directory (`python3 -m http.server`) and drive it with
  Playwright/Chromium at a phone viewport (390×844). Click `#start-button` to
  reach the arena. The onboarding Coach (`.coach-card`, z190) covers the command
  bar on a first match — remove it in tests before clicking the bars.
- **Harness**: `tools/harness/` drives the real game in real Chrome and prints
  numbers: phone layout metrics and screenshots (`drive.js`, `hud.js`), the
  income ground truth (`econ.js`), tech kits (`kits.js`), and equal-gold tower
  duels with the game's own `simulate` (`bal.js`). See its README. Use it
  before claiming a layout fits or a balance change is fair.
- **towers.html** bakes a copy of the tower tables so it renders offline. After
  any change to `races`, `TOWERS`, `TECH_KITS`, `ATTACK_PROFILE` or `TRAIT`,
  run `node tools/bake-towers.js` and commit the result.
- Google Fonts, jsdelivr and `broker.emqx.io` are blocked from cloud sandboxes,
  so cross-device multiplayer cannot be verified there. Only a real device can.

## Contracts

Some invariants are enforced in code rather than left to review. When you change
the arena HUD, keep `enforceHudContract()` passing — it re-fits the top bar on
every `renderHud()` and reports violations to the console. The requirements are
documented in the stylesheet under "TOP BAR CONTRACT".

Retired 2026-09-03: this file used to record "the bar stacks onto multiple rows
on a phone" as a known open issue. It was never happening. `hudContractReport()`
compared child `top` values, and under `align-items:center` a 54px brand sits
21px above a 13px label on the *same* row — so it reported a three-row stack on
every phone render. Measured at 390px the bar is 68px tall for a 54px tallest
child, all three children share vertical centre 34, and `scrollWidth ===
clientWidth`. The check now compares vertical centres and reports clean.

If a contract fires on every render, suspect the contract.

## House rules

- No Warcraft III assets, extracted or redistributed. Original code and art only.
- Keep it dependency-free and buildless — that is a feature, not an accident.
