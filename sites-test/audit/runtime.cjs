/* Reuse the real shipped-code VM and two-client fixtures without registering
 * the main suite. The only replacement is the node:test registration function. */
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const filename=path.join(__dirname,'../tests/audit-runtime-virtual.cjs');
const source=fs.readFileSync(path.join(__dirname,'../tests/rimewall.test.cjs'),'utf8')
 .replace("const { test } = require('node:test');","const test = () => {};");
const compiled=new Module(filename,module);compiled.filename=filename;
compiled.paths=Module._nodeModulePaths(path.dirname(filename));
compiled._compile(source+'\nmodule.exports={boot,fundedArena,arenaCells,runningMultiplayerRoom};',filename);
module.exports=compiled.exports;

