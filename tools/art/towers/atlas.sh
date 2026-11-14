#!/bin/bash
# atlas.sh : pack keyed tower frames, todo.txt order, 8 per row -> towers-gen.webp + ids.txt.
# Only complete element lines are packed: a line half in the new style and half in the old reads as
# two games, so a line switches over when its last rung is done.
cd "$(dirname "$0")"; F=frames
: > ids.txt; files=""
for race in $(grep '^[a-z]' todo.txt | cut -d- -f1 | uniq); do
  ids=$(grep "^$race-" todo.txt | cut -d'|' -f1); ok=1
  for id in $ids; do [ -f $id-96.png ] || ok=0; done
  [ $ok = 1 ] && for id in $ids; do echo $id >> ids.txt; files="$files $id-96.png"; done
done
if [ -z "$files" ]; then echo "no complete line yet"; exit 0; fi
montage $files -tile 8x -geometry 96x96+0+0 -background none atlas.png
convert atlas.png -quality 90 -define webp:alpha-quality=100 -define webp:method=6 towers-gen.webp
echo "$(wc -l < ids.txt) frames, $(stat -c %s towers-gen.webp) bytes"
