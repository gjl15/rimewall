# Terrain props

`test/props.webp` is four 96 px frames in this order: pines, crystals, boulders, deadtree
(`TERRAIN_PROPS` in `test/index.html`, drawn by `drawTerrainProps`). Frames are in `frames/`.

They were generated with the creep template in `../creeps/prompts.txt`, worded as a "game prop
sprite", with a plain flat solid magenta background so that white snow survives the key (the
crystals were made on white). `cutm.sh <name> <bg colour>` keys and pads a `<name>-raw.png`; sample
the background with `convert x-raw.png -format "%[pixel:p{3,3}]" info:`. Then
`montage frames/{pines,crystals,boulders,deadtree}-96.png -tile 4x -geometry 96x96+0+0 -background none props.png`
and `convert props.png -quality 90 -define webp:alpha-quality=100 ../../../test/props.webp`.
