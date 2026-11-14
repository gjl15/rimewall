#!/bin/bash
# key.sh <id> : key a tower generated on a flat colour (sampled from the corner), trim, pad to 96
cd "$(dirname "$0")"; c=$(convert $1-raw.png -format "%[pixel:p{3,3}]" info:); ./cutm.sh $1 "$c"
