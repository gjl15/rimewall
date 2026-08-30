# Rimewall Collaboration Guide

Rimewall is a dependency-free browser tower-defense lane-pusher inspired by the classic Wintermaul-style build–maze–defend–send–income loop. The project uses original code and original art.

## Sources of truth

| What | Source |
| --- | --- |
| Code | [`gjl15/rimewall`](https://github.com/gjl15/rimewall) |
| Working backlog and idea log | [Master backlog issue #2](https://github.com/gjl15/rimewall/issues/2) |
| Design discussion and decisions | Shared ChatGPT Rimewall Project, with durable decisions copied into issue #2 or repository docs |
| Current test link | The link in `README.md`; verify it matches the latest `main` before multiplayer testing |
| Map proposals | In-game Map Builder exports plus a linked GitHub issue |

The in-game Build Hub stores its checklist in the current browser only. It is useful for temporary notes, but it is not the shared project tracker.

## Non-negotiable project rules

- Use original code and original art. Do not extract or redistribute Warcraft III assets.
- Preserve the fundamental build–maze–defend–send–income loop while adding original systems, towers, maps, and visual improvements.
- Keep the project dependency-free and buildless unless that decision is explicitly revisited.
- Treat `main` as the stable shared branch.
- Pull the latest remote state before editing `index.html`.
- Prefer small changes, small commits, and short-lived branches.
- Project attribution uses **ydba1**, not Abdy Lang-DPT.

## Why syncing first matters

Most of the game currently lives in one large `index.html`. A stale editor can write the whole file back and silently erase someone else’s recently merged work without producing a normal merge conflict.

Before touching `index.html`:

```bash
git switch main
git pull --ff-only
git switch -c feature/short-description
```

If the worktree is dirty, stop and understand those changes before switching or pulling. Do not discard someone else’s work.

## Standard workflow

1. Choose one item from [the master tracker](https://github.com/gjl15/rimewall/issues/2), or open a focused issue for a new bug or feature.
2. Write a short acceptance test: what should change, on which device/mode, and how we will know it works.
3. Sync `main` and create a feature branch.
4. Make the smallest coherent change.
5. Review the diff for unintended whole-file rewrites.
6. Verify syntax and behavior.
7. Commit and push the feature branch.
8. Open a pull request and link the tracker item or issue.
9. Have the other contributor review or test it.
10. Merge, then mark the tracker item complete with `- [x] ~~strikethrough~~`. Do not delete completed history.

Suggested branch names:

- `fix/mobile-hud-stacking`
- `fix/multiplayer-reconnect`
- `feature/new-send-preview`
- `balance/opening-wave-hp`
- `docs/tower-stat-reference`

## Verification checklist

Run the checks that apply to the change:

- Review `git diff --check`.
- Review `git diff --stat`; an unexpectedly large rewrite is a stop signal.
- Extract the inline script and run `node --check`, as described in `CLAUDE.md`.
- Serve the repository locally and play through the changed behavior.
- Test touch UI at a 390×844 viewport.
- Test rotation and safe-area behavior on a phone when layout changed.
- Test Quick and Precision build modes when placement changed.
- Test cancel/full-refund behavior when construction changed.
- Use two real devices for cross-device multiplayer. Two tabs on one device only test the local fallback.
- Record the browser/device, mode, race/element, seed if shown, and exact steps for any failure.

## Pull request checklist

A pull request should state:

- What changed.
- Why it changed.
- How it was tested.
- Screenshots or a short recording for visible UI changes.
- Any balance questions or known limitations.
- The linked issue or exact master-tracker item.

Avoid mixing balance, UI, multiplayer, and refactoring into one pull request unless they are inseparable.

## Using the ChatGPT Project

Use the shared ChatGPT Project for design discussion, screenshots, balance notes, research, and decisions. Use GitHub for code, issues, pull requests, and the durable tracker.

Start a focused chat for each substantial outcome. Tell ChatGPT the repository, branch, acceptance test, and relevant tracker item. Before accepting a code change, confirm that it was based on the latest `main` and that the diff and browser behavior were checked.

Useful commands for the tracker thread:

- **Add:** “Add this to the Rimewall list: …”
- **Complete:** “Mark … complete and note the commit or PR.”
- **Reopen:** “Reopen … because …”
- **Idea:** “Record this as an idea, not committed work: …”
- **Status:** “Show the current Rimewall list.”

## Multiplayer test handoff

1. Both players open the same verified live build.
2. One player creates a room and copies the invite link.
3. The other player opens that exact link on a different device and joins.
4. Confirm both names, selected elements, game mode, and starting lives.
5. Test at least one tower build, one cancellation, one send in each direction, income changes, life loss, and match end.
6. Temporarily disconnect one device and record the recovery behavior.
7. Add every failure to GitHub with device/browser details and reproduction steps.

## Good issue format

```markdown
### Observed
What happened?

### Expected
What should happen instead?

### Reproduction
1. …
2. …
3. …

### Environment
Device, browser, orientation, game mode, element/race, room code if relevant.

### Acceptance test
A precise check that proves the fix works.
```
