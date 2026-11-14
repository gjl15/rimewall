# patch.py <index.html> : generated tower atlas, matched by sprite id, ahead of the classic sheet
import sys, os
here = os.path.dirname(os.path.abspath(__file__))
p = sys.argv[1]; s = open(p).read()
ids = open(os.path.join(here, 'ids.txt')).read().split()
arr = "const GEN_TOWER_IDS = [%s];" % ', '.join("'%s'" % i for i in ids)
def one(old, new):
    global s
    assert s.count(old) == 1, (old[:70], s.count(old)); s = s.replace(old, new)
if 'const GEN_TOWER_IDS' in s:
    import re; s = re.sub(r"const GEN_TOWER_IDS = \[[^\]]*\];", arr, s, count=1)
else:
    one("function spriteIdForTower(raceId, tier, name) {", arr + r"""
/* GENERATED TOWER ART (art pass, 2026-11-14). Towers redrawn in the creeps' painted style, each
   standing on its own base, keyed by the same sprite id as the classic sheet, so a line that has
   not been redrawn yet falls back to the classic frame and then to the vector. */
const GEN_TOWERS = { img:new Image(), ready:false, cols:8, index:{} };
GEN_TOWER_IDS.forEach((id, i) => { GEN_TOWERS.index[id] = i; });
GEN_TOWERS.img.onload = () => { GEN_TOWERS.ready = true; };
GEN_TOWERS.img.src = 'towers-gen.webp';
function drawGenTower(ctx, sid) {
  if (!GEN_TOWERS.ready || (typeof profile !== 'undefined' && profile && profile.classicArt)) return false;
  const i = GEN_TOWERS.index[sid];
  if (i === undefined) return false;
  // a little larger than the classic frame, feet on the plinth line, centred on the cell
  ctx.drawImage(GEN_TOWERS.img, (i % GEN_TOWERS.cols) * 96, Math.floor(i / GEN_TOWERS.cols) * 96, 96, 96, -11, -13.2, 22, 22);
  return true;
}
function spriteIdForTower(raceId, tier, name) {""")
    one(": stats.special === 'bola' ? drawTechBolaStructure(ctx) : drawSprite(ctx, 'tower', sid, 0, -1.2, 19);",
        ": stats.special === 'bola' ? drawTechBolaStructure(ctx) : (drawGenTower(ctx, sid) || drawSprite(ctx, 'tower', sid, 0, -1.2, 19));")
open(p, 'w').write(s); print(len(ids), 'tower frames')
