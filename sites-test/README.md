# Rimewall test collaboration — SHARED ARENA 20

This directory is the editable copy of Abdy's currently published test Site:
https://rimewall-bulwark-test.abdylang-dpt.chatgpt.site

Integration branch: `test/sites-shared-arena-20` in `gjl15/rimewall`.
`SOURCE_REVISION.json` records the original Sites commit and checksums.
The runtime and existing test files were copied without changes from that commit.
This is a separate code lineage from the repository's root game and `/test/`.
Do not copy this index.html over either of those files.

## Gene / Claude: make a contribution

Use a fresh clone, or first commit/stash your current work. In a clean checkout:

```sh
git fetch origin
git switch -c gene/describe-the-change origin/test/sites-shared-arena-20
```

Choose a unique feature branch name for each task. Edit only the relevant
functions in `sites-test/dist/index.html` and `sites-test/dist/shared-arena.js`.
Keep all runtime assets together; this release is no longer a single-file game.
Add a failing regression test for a bug fix, then implement the fix.

From the repository root, run the dependency-free behavioral suite with Node 22:

```sh
node --test sites-test/tests/rimewall.test.cjs
git diff --check
```

Preview with a local HTTP server rooted at the runtime directory:

```sh
python3 -m http.server 8000 --directory sites-test/dist
```

Open http://localhost:8000. Rendering still needs browser checks; the Node suite
uses an inert DOM. Real-device multiplayer acceptance remains outstanding.

Before submitting, fetch the integration branch again and merge its latest
changes into your feature branch. Resolve conflicts function by function, rerun
the suite, then push your feature branch. Open a pull request with:

- **base:** `test/sites-shared-arena-20`
- **compare:** your `gene/...` branch
- Description: behavior changed, changed function names, tests and device checks,
  and any remaining limitations.

If you lack direct push permission, fork the repository and submit the same
pull request from your fork. Never force-push the integration branch.

## Review and publication

Abdy coordinates review, integration, and publication to the test Site. Merging
on GitHub alone does not publish to the ChatGPT test URL. The publishing session
must fetch the accepted GitHub commit and the latest Sites source, compare both
against this baseline, and merge accepted changes into the current Sites checkout.
Never replace a newer Sites file wholesale with this snapshot.

Run the regression suite and browser QA after integration. Publish the complete
`dist/`, including `shared-arena.js`, with the existing Sites project identity and
audience preserved. Record both GitHub and Sites commit IDs in the handoff.
Do not merge this branch into `main` until the separate main-integration review.
No deployment credentials or Sites hosting identity are included here.

## Current architecture and requirements

- One shared battlefield: teammates defend the same creeps with visible towers.
- Host simulates combat, waves, AI, leaks, and all player purses. Guests send
  ordered, acknowledged commands and render authoritative snapshots.
- Humans retain separate gold/lumber, purchases, and tower ownership; teammates
  share lives. Prevent duplicate purchases, sends, refunds, and unauthorized edits.
- North/south team identities and canonical map coordinates must remain stable
  across host/guest perspectives. Lobby Ready consent locks the starting roster.
- No Boards selector. Income sits in the header. The mobile Sends panel is
  compact but retains cost, income, ROI/payback, HP, armor, and speed details.
- Keep the host open; host migration is not implemented. Refresh both devices
  and create a fresh room when changing client versions.

The baseline passed 139/139 behavioral tests. Two browser clients were also
tested through the online relay; that does not establish a successful match on
two physical devices. Verify both players building, shared target damage, sends
on the opposing half, income, single-count leaks, matching outcomes, and phone
portrait/landscape layout before accepting multiplayer as complete.

## Historical documents and balance

`MULTIPLAYER_HANDOFF.md` describes TEAM MATCH 14 and is historical; its independent
simulation details and source-location statements do not describe this release.
Use this README and the actual code for the shared arena behavior.
`TEST_BUILD.md`, `BALANCE_UPDATE.md`, and the changelogs contain earlier plans and
release history. Preserve their history and reconcile requirements before porting.
Shrines 6–8, tower rank balance, and glyph tuning remain provisional. This GitHub
sync introduces no gameplay or balance changes and does not resolve that review.
