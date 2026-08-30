# Brother Guide: Build Rimewall Together

Welcome to Rimewall. This guide gets a second contributor from “I have the link” to making safe, reviewable changes.

## Project links

- Repository: [gjl15/rimewall](https://github.com/gjl15/rimewall)
- Working backlog and idea log: [Rimewall master tracker](https://github.com/gjl15/rimewall/issues/2)
- Current public test link: [gjl15.github.io/wmw-remake-web](https://gjl15.github.io/wmw-remake-web/) — confirm that it matches the latest Rimewall `main` before treating it as the canonical build
- Collaboration rules: [COLLABORATION.md](COLLABORATION.md)
- Technical project notes: [CLAUDE.md](CLAUDE.md)

## Which tool should I use?

- Use the shared ChatGPT Rimewall Project for design discussion, screenshots, map ideas, balance notes, and decisions.
- Use Codex or a local code editor when you need to inspect or change repository files and test the game.
- Use GitHub issues for focused bugs and features.
- Use a GitHub pull request when code or repository documentation is ready for review.
- Use the master tracker as the high-level history. Completed items stay checked and crossed out.

GitHub is the code source of truth. A localhost URL works only on the computer that started that local server.

## First-time setup

1. Sign in to the GitHub account you want associated with the project.
2. Send that GitHub username to the repository administrator if it does not already have write access.
3. Accept the repository invitation, if GitHub sends one.
4. Accept the invitation to the shared ChatGPT Rimewall Project, using the ChatGPT account you intend to keep using.
5. Clone or open [`gjl15/rimewall`](https://github.com/gjl15/rimewall).
6. Read `README.md`, `CLAUDE.md`, `COLLABORATION.md`, and this guide.
7. Open the current game before changing map coordinates, gameplay rules, or mobile layout.

Clone locally:

```bash
git clone https://github.com/gjl15/rimewall.git
cd rimewall
```

## Start every change safely

Most game code is in one large `index.html`, so starting from stale code can erase someone else’s work.

```bash
git switch main
git pull --ff-only
git switch -c feature/short-description
```

Use a narrow branch name such as:

- `fix/mobile-hud-stacking`
- `balance/scout-opening-hp`
- `docs/send-stat-reference`

Do not make unrelated changes in the same branch.

## Ask ChatGPT or Codex for a change

A useful request includes the repository, branch, desired behavior, and acceptance test:

> Work in `gjl15/rimewall` on a new feature branch from the latest `main`. Fix the mobile HUD stacking at 390×844 without hiding gold, YOU, or RIVAL. Preserve the dependency-free/buildless architecture and the HUD contract. Review the diff for accidental whole-file replacement, check inline JavaScript syntax, and test the result in a phone viewport. Do not merge; open a pull request for review.

For balance work, include a reproducible seed or exact wave, element, maze, and expected outcome when possible.

## Test locally

Start a simple local server from the repository:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` on that computer.

At minimum:

- Start a match.
- Test the behavior you changed.
- Test both Quick and Precision build modes if placement is involved.
- Check the phone layout at 390×844 if UI is involved.
- Review the browser console.
- Run `git diff --check`.
- Review `git diff --stat` for an unexpectedly large rewrite.

Follow the additional verification instructions in `CLAUDE.md`.

## Push and request review

```bash
git status
git add <only-the-files-you-intended>
git commit -m "Describe the player-visible change"
git push -u origin HEAD
```

Open a pull request into `main`. In the description, include:

- What changed.
- Why.
- Exact test steps and results.
- Device/browser information.
- Screenshots for visible UI work.
- Known limitations or balance questions.
- The linked issue or master-tracker item.

Have the other contributor review or test the change before merging.

## Add ideas and report bugs

Use the [master tracker](https://github.com/gjl15/rimewall/issues/2) for broad ideas and project history. Open a separate issue when an item is ready to become focused work.

A good report says:

- What you observed.
- What you expected.
- Exact steps to reproduce it.
- Device, browser, orientation, game mode, and element/race.
- A screenshot or recording when useful.
- How we will know the fix works.

## Test multiplayer together

1. Confirm both devices are using the same verified live build.
2. One player creates a room and sends the generated invite link.
3. The second player opens the link on another real device.
4. Confirm both players can see the correct opponent name, element, and mode.
5. Build and cancel a tower on each device.
6. Send at least one creep in each direction and verify cost, income, arrival, and life loss.
7. Verify rival snapshots and match-end results.
8. Test a brief disconnect and record what happens after reconnecting.
9. Add failures to GitHub with steps, devices, browsers, and approximate time.

Two tabs on one device are useful for local testing but do not prove cross-device multiplayer works.

## Project guardrails

- Product name: **Rimewall**.
- Project attribution uses **ydba1**, not Abdy Lang-DPT.
- Preserve the core build–maze–defend–send–income loop.
- Add original systems, towers, maps, visuals, and audio.
- Do not extract or redistribute Warcraft III assets.
- Keep the game dependency-free and buildless unless the team explicitly changes that decision.
- Pull before editing `index.html`.
- Keep branches and pull requests small enough to review.
