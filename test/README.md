# Test build — not the live game

`test/index.html` is Abdy's TEAM MATCH 14 build (ChatGPT Sites source eead6081, his own handoff)
plus the shared-team-board fix, the Developer-mode diagnostics button, and the 2026-10-25 quick fixes:
computers send harder in every mode (Shrine ramp 2× faster, sends from 10s / wave 1 and 40% more
often, bigger economy tickets, no hoarding, Brutal rival by default; computers stop spreading tier-0
towers after 24 and upgrade instead, and a finishing computer never saves — the RIVAL dial on the setup
screen still goes down to Relaxed) and a 🎲 Random element chip for human players in the lobby. It is served at
https://gjl15.github.io/rimewall/test/ so two phones can play the same build without the
ChatGPT site. The live game at the repo root is untouched by this folder.

Verified before adding: ChatGPT's own `tests/rimewall.test.cjs` 86/86 on this file; two-client
team test (teammate towers appear on each other's board, sells propagate, no echo); `node --check`.

This folder is a staging area. Features worth keeping get merged into the root `index.html`
deliberately, one at a time; this file is never copied over the root.
