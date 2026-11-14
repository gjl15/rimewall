# Generated tower art (in progress)

`todo.txt` lists every tower by sprite id (`race-tier-name`, the same key as the classic
`towers.webp`) with its subject and palette. Prompt: "Game sprite of <subject>, tier N of 6 defense
tower, seen from a top-down three-quarter view like a tower defense game, single building centered
and filling most of the frame, bold chunky readable silhouette, stylized hand-painted look, strong
rim light from the top-left, dominant <palette> palette, plain flat solid magenta background, no
text, no ground, no cast shadow". `key.sh <id>` keys `<id>-raw.png` to `<id>-96.png`.

`atlas.sh` packs only complete element lines into `towers-gen.webp`, and `patch.py` writes their
ids into `GEN_TOWER_IDS`; a line switches from the classic art when its last rung is done.
`drawGenTower` draws them, falling back to the classic sheet, then to the vectors.
