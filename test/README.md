# Test build — not the live game

`test/index.html` is Abdy's SHRINES 17 build (ChatGPT Sites source cea35b5c, his own handoff)
plus the shared-team-board fix and the Developer-mode diagnostics button. (Previously TEAM MATCH 14;
see git history.) It is served at
https://gjl15.github.io/rimewall/test/ so two phones can play the same build without the
ChatGPT site. The live game at the repo root is untouched by this folder.

Verified before adding: ChatGPT's own `tests/rimewall.test.cjs` 112/112 on this file; two-client
team test (teammate towers appear on each other's board, sells propagate, no echo); `node --check`.

This folder is a staging area. Features worth keeping get merged into the root `index.html`
deliberately, one at a time; this file is never copied over the root.
