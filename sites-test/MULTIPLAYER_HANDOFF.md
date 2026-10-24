# Rimewall multiplayer handoff for Gene / Claude Code

The live test URL is https://rimewall-bulwark-test.abdylang-dpt.chatgpt.site.
The expected home badge is TEAM MATCH 14.

## Source location and coordination

This test Site is backed by its own Sites source repository. It is not an
up-to-date checkout of gjl15/rimewall. The GitHub branch
`test/consolidated-gameplay-2026-10-18` was read through the GitHub connector
at b1ecc682ef972db643d1ee68aead32e7d6354585 during this task. No GitHub branch,
PR comment, or email was written in this task. The included SOURCE_REVISION.txt
identifies the exact pushed Sites source used by this package.

Please compare and merge relevant functions into a fresh checkout of the GitHub
branch. The complete index.html is provided for inspection; replacing GitHub's
whole file from this different source history would risk discarding other work.

## User reproduction

1. Two people open the test Site and choose Classic Wars, 2v2.
2. One creates a room; the other joins. Both appear on the same team in the lobby.
3. Both check Ready, and the host starts.
4. The user reports that gameplay becomes one human versus the brother and two
   computers, despite the lobby showing them as allies.
5. Earlier reports also described Ready flicker and incorrect teammate labels.
No console error was supplied. The report is from two people playing on devices;
we have not verified a device-specific matrix.

## Confirmed bugs in the previous test source

- The income panel unconditionally displayed the other connected person's name
  under THEIRS. This was fixed before the latest runtime follow-up.
- Lobby heartbeats replaced Ready controls and stale messages could roll back
  newer consent. Sequenced request acknowledgments and state updates fixed this.
- Match-result reception unconditionally inverted the other human's result,
  giving teammates opposite win/loss outcomes.
- Hosted AI sends traveled under the human host SID and were labeled with the
  host's name at the guest. Explicit source-seat identity fixes attribution.
- Bot leaks were subtracted from enemy.lives and immediately overwritten by
  shared-life synchronization because the seat leak counter had not changed.
- Post-start seat/edit requests were not consistently rejected.

## Runtime changes in TEAM MATCH 14

- Lock a snapshot of ready roster identities at the shared match seed.
- Reject post-start lobby seating edits.
- Resolve attack source and target seats, verify sender ownership, and refuse
  attacks between seats on the same team.
- Keep source-seat identity for AI attacks sent through the host.
- Update and publish bot seat leak counts before deriving shared life pools.
- Propagate the same outcome to teammates, inverse to opponents, with final
  leak totals and no result echo.
- Extract the existing send purchase callback into buySend so the shipped
  action can be exercised directly in behavioral regression tests.

## Verification and limits

Run `node --test tests/rimewall.test.cjs` from the package root. The tests read
and execute dist/index.html directly; no package installation is required.
The new two-client runtime harness uses actual startBattle and buySend rather
than replacing the start with a fake. Only viewport/canvas helpers are inert.
It checks targeting, hosted AI attribution, friendly-fire rejection, shared life
losses, blocked late team changes, and both teammates' matching final results.

These checks do not establish cross-device broker timing or mobile rendering.
The available preview browser was blocked by its URL access policy, so real
phone testing is still needed after both players load the same release.

The Sites version already orders desktopSendPool using orderedSends in each
visible send tab. Claims about a differently ordered GitHub dock may describe
that branch's older source. Earth Tremor and mobile control reports in the
pasted message were not independently investigated in this multiplayer fix.
