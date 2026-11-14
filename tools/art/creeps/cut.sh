#!/bin/bash
# cut.sh <name> : key the white background from <name>-raw.png, trim, square-pad to 96 px.
# The flood fill takes the background connected to the border; background seen through a gap
# (between an arm and a body, inside a wheel) is enclosed, so near-white blobs of 40 px or more
# are keyed too. Small near-white areas are highlights and stay.
n=$1; t=$(mktemp -d)
convert $n-raw.png -alpha set -bordercolor white -border 1 -fuzz 10% -fill none -floodfill +0+0 white -shave 1x1 $t/a.png
convert $t/a.png -alpha off -fuzz 5% -fill black +opaque white -fill white -opaque white $t/m.png
convert $t/m.png -define connected-components:area-threshold=40 -define connected-components:mean-color=true -connected-components 8 -threshold 50% $t/big.png
convert $t/a.png \( $t/a.png -alpha extract \( $t/big.png -negate \) -compose multiply -composite \) -alpha off -compose copy_opacity -composite $t/b.png
convert $t/b.png -trim +repage -resize 92x92 -background none -gravity center -extent 96x96 $n-96.png
rm -r $t
