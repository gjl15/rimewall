# Generated creep art

`frames/` holds one 96 px frame per creep (feet near the bottom, background keyed). `test/creeps-gen.webp`
is these frames packed 8 to a row in name order, and `test/index.html` lists the same order in
`GEN_CREEP_NAMES` with each frame's foot line in `GEN_CREEP_FOOT`.

To change a creep: generate a new image with the template in `prompts.txt`, save it as `<name>-raw.png`
next to these scripts, then

    ./cut.sh <name>                 # key, trim, pad to 96 px -> <name>-96.png; move it into frames/
    ./atlas.sh                      # packs frames/ into creeps-gen.webp + atlas-order/-foot.txt
    cp creeps-gen.webp ../../../test/
    python3 patch-atlas.py ../../../test/index.html    # rewrites the name and foot arrays
    node measure.js                 # grey count, hue buckets, confusable pairs at the 21 px cell

Needs ImageMagick, and Playwright for measure.js. Names are the creep's name in lower case with
everything but letters and digits removed.
