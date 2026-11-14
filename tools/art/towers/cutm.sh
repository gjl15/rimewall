#!/bin/bash
# cutm.sh <name> [bgcolor] : key a prop generated on a flat background (magenta by default, so white
# snow survives), remove the colour wherever it shows through, trim, pad to 96 px.
n=$1; bg=${2:-magenta}; t=$(mktemp -d)
if [ "$bg" = white ]; then
  convert $n-raw.png -alpha set -bordercolor white -border 1 -fuzz 10% -fill none -floodfill +0+0 white -shave 1x1 $t/b.png
else
  convert $n-raw.png -alpha set -channel RGBA -fuzz 32% -fill none -opaque "$bg" +channel $t/b.png
fi
convert $t/b.png -trim +repage -resize 92x92 -background none -gravity center -extent 96x96 $n-96.png
rm -r $t
