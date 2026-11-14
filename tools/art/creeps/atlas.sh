#!/bin/bash
# atlas.sh : pack frames/*-96.png into an 8-column grid (name order) -> creeps-gen.webp here,
# plus atlas-order.txt and atlas-foot.txt (bottom of each frame's opaque pixels) for patch-atlas.py.
# Copy creeps-gen.webp to test/ afterwards.
cd "$(dirname "$0")/frames"
ls *-96.png | sed 's/-96.png$//' | sort > ../atlas-order.txt
montage $(sed 's/$/-96.png/' ../atlas-order.txt) -tile 8x -geometry 96x96+0+0 -background none ../atlas.png
convert ../atlas.png -quality 90 -define webp:alpha-quality=100 -define webp:method=6 ../creeps-gen.webp && rm ../atlas.png
: > ../atlas-foot.txt
for n in $(cat ../atlas-order.txt); do
  b=$(convert $n-96.png -alpha extract -threshold 10% -format "%@" info:)   # WxH+X+Y
  h=${b#*x}; h=${h%%+*}; y=${b##*+}; echo "$n $(( y + h ))" >> ../atlas-foot.txt
done
identify ../creeps-gen.webp | awk '{print $1,$3}'
