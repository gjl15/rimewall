# patch-atlas.py <index.html> : point the generated-creep code at the 8-column atlas built by atlas.sh
import sys, re, os
here = os.path.dirname(os.path.abspath(__file__))
path = sys.argv[1]; s = open(path).read()
order = open(os.path.join(here, 'atlas-order.txt')).read().split()
foot = dict(l.split() for l in open(os.path.join(here, 'atlas-foot.txt')).read().strip().splitlines())
names = ', '.join("'%s'" % n for n in order)
feet = ', '.join(('%.2f' % (int(foot[n]) / 96)).lstrip('0') for n in order)
def one(old, new):
    global s
    assert s.count(old) == 1, (old[:60], s.count(old)); s = s.replace(old, new)
s = re.sub(r"const GEN_CREEP_NAMES = \[[^\]]*\];", "const GEN_CREEP_NAMES = [%s];" % names, s, count=1)
s = re.sub(r"const GEN_CREEP_FOOT = \[[^\]]*\];", "const GEN_CREEP_FOOT = [%s];" % feet, s, count=1)
if 'GEN_CREEP_ALIAS' not in s:
    one("const GEN_CREEPS = { img:new Image(), ready:false };",
        "const GEN_CREEPS = { img:new Image(), ready:false, cols:8 };\nconst GEN_CREEP_ALIAS = { mossback:'mossbackregenerator' };   // the same beast under its send name")
    one("  return GEN_CREEP_NAMES.indexOf(String(creep.name || '').toLowerCase().replace(/[^a-z0-9]+/g, ''));",
        "  const n = String(creep.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');\n  return GEN_CREEP_NAMES.indexOf(GEN_CREEP_ALIAS[n] || n);")
    one("ctx.drawImage(GEN_CREEPS.img, genFrame * 96, 0, 96, 96,",
        "ctx.drawImage(GEN_CREEPS.img, (genFrame % GEN_CREEPS.cols) * 96, Math.floor(genFrame / GEN_CREEPS.cols) * 96, 96, 96,")
s = re.sub(r"New creep art \(preview, \d+ creeps\)", "New creep art (%d creeps)" % len(order), s)
open(path, 'w').write(s); print(len(order), 'frames')
