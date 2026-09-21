# Art direction — a note for the laptop

Written from the cloud session on 2026-09-21, after Gene sent through a
[r/VibeCodeDevs post](https://www.reddit.com/r/VibeCodeDevs/s/6ytBVjk5Mz): a
futuristic racer vibe-coded in a month with Codex/GPT-5.5, and asked "how much
can we learn from this, and apply to continue the graphic work".

Short answer: **one thing, and it is the big one.** Most of their stack is the
opposite of ours on purpose. But the measurements below say our art has hit the
ceiling of the technique we are using, and theirs is the technique that lifts it.

---

## What they did

| | theirs | ours |
|---|---|---|
| Build | Vite + strict TypeScript | none — one `index.html` |
| Render | Three.js (3D) | 2D canvas, procedural |
| Physics | Rapier3D | none needed |
| Art | GPT Gen 2 → Magnific → Tripo3D (GLB) | canvas path commands in `rwBody` |
| Textures | base / normal / emissive / roughness maps | flat fills |
| Audio | Magnific SFX bank, Suno music | synthesised `SFX` |
| Tooling | a **custom editor built as they went** | `tools/harness/*` |

**Does not transfer, and we should not chase it:** Three.js, Rapier, Tripo3D,
HDRI panoramas, Vite/TS. Wrong genre, and every one of them breaks the house
rule that this thing is dependency-free and buildless. That rule has paid for
itself repeatedly; the post is not a reason to spend it.

**Transfers:** their assets are *generated raster*, ours are *hand-coded
vector*. That is the whole difference in ceiling.

**Already ours, and worth noticing:** they were most proud of the custom editor.
We have one — `artsheet`, `artboard`, `creepsheet`, `designshots`, and now
`readability`. `artboard.js`'s own header already says the thing that matters:
*"a contact sheet at 46px flatters silhouettes that vanish at 21px"*. Keep
judging art at board scale, never at sheet scale.

---

## What the measurements say

`node tools/harness/readability.js` — renders every sprite at the board's own
cell and reduces it to a colour and a coarse silhouette.

### Creeps, at the 21px cell the board actually draws

```
mean saturation 0.11 · 43/52 are effectively grey (sat < .25)
hue histogram (30° buckets): 0:29  30:1  90:1  180:13  210:7  330:1
261 of 1326 pairs are near-identical at 21px
mean ink coverage of the cell: 40%
```

**49 of 52 creeps are either grey or blue-teal.** Two hue families for the whole
roster. One pair in five is indistinguishable in a fight. Open
`out/creepsheet.png` and compare the columns: at 3× these are genuinely good
sprites — detailed, characterful, distinct. At 21px they are the same grey
smudge. *The art is drawn for a size the game never shows.*

### Towers — the finding that matters most

```
top rung covers 1.0–1.3× the ink of the first
  Ice 1.0×   Tech 1.0×   Electricity 1.0×
adjacent-tier shape change: Stone 0.03–0.09 (rungs essentially identical)
```

**Upgrading is invisible.** A 350g tier-5 occupies the same footprint as a 10g
tier-0. The tier silhouettes *do* differ in shape now — that work landed and it
shows on `artsheet-towers.png` — but they do not differ in **mass**, and mass is
what reads at 21px. This is the cheapest big win on the list.

---

## Direction, in order

**1. Make upgrades occupy more cell.** Scale the drawn body with tier — roughly
1.0 / 1.15 / 1.3 / 1.45 / 1.6 / 1.75 — and let the top rungs overhang the cell
slightly. No new assets, no file-size cost, and it makes the thing you spend
gold on visible. Re-run `readability.js`; target ≥1.6× ink from first rung to
last.

**2. Give the creep roster a hue system.** Not prettier sprites — *fewer greys*.
Bind hue to something the player must read in a fight; armour class is the
obvious candidate (unarmored / light / medium / heavy / fortified), so colour
starts carrying tactical information instead of decoration. Target: no more than
~8 of 52 under sat 0.25, and no hue bucket holding more than ~15.

**3. One light direction, everywhere.** They generate normal + emissive +
roughness maps; the flat-2D equivalent is a single fixed key light with a baked
rim highlight and a contact shadow. `f94e2cb` started this ("everything casts a
shadow") — finish it as a stated rule so every new sprite obeys it.

**4. Only then consider a generated sprite atlas.** This is the real lesson from
the post and the biggest lever, but it is also the one that costs something, so
go in with the numbers:

- `index.html` is **970 KB** today: 800 KB source, 166 KB already a base64 blob.
  So embedded binary assets are established precedent, not a new sin.
- 52 creeps + 11 races × 6 tiers ≈ 118 sprites. At 64px in one atlas that is
  roughly 150–400 KB of PNG, so ~200–550 KB of base64 — a 20–55% file increase.
- It stays buildless **only** if the atlas is committed as a data URI and never
  fetched. The moment it becomes a separate file we have a build step and an
  asset pipeline, and the house rule is gone.

My recommendation: do 1–3 first. They are free, they are measurable, and they
may well be enough. If after those the art still reads flat, then the atlas is
worth the weight — and do it for **creeps only** at first, where the readability
numbers are worst, rather than the whole board at once.

---

## Two caveats on my own numbers

- The silhouette signature is an 8×8 ink histogram. It catches "same blob,
  same colour" well; it will not notice that two sprites of similar mass are
  different creatures to a human eye. Treat 261/1326 as *an upper bound on
  confusable pairs*, not a count of real confusions.
- My first run reported 273 pairs and listed things like "Pathfinder ~
  Pathfinder" — names appear in both `WAVES` and `SENDS`, so some sprites were
  sampled twice and confused with themselves. Fixed (deduped by name); the
  numbers above are the corrected run. The tower half also failed on that first
  pass because I called `rwBody` with the wrong arguments — `drawTower(ctx,
  tower)` paints at `tower.c * CELL, tower.r * CELL`, not centred on the origin.

## Housekeeping the laptop should know

**`CHANGELOG.md` is 10 days stale.** 31 commits landed on 2026-09-20 — the whole
graphics push, including "The board has a colour again", "A Snowball Launcher
looks like a snowball launcher now", "The ring is gone, towers sit on their
cells" — and none of them touched it. The newest entry is still 2026-09-10.
Worth a catch-up entry while the reasoning is fresh, because that file is the
only record of *why* any of it was done.
