/* sealtest.js <index.html> : seal the south band with a full row of towers; send creeps; they must
   pick a tower in the wall, break it, and continue to the cave. */
const fs=require('fs');const {chromium}=require('playwright');const HTML=fs.readFileSync(process.argv[2],'utf8');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||undefined,headless:true,args:['--no-sandbox']});
const p=await (await b.newContext()).newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,160)));
await p.route('https://rimewall.local/**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:HTML}));
await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
await p.goto('https://rimewall.local/index.html');await p.waitForTimeout(800);await p.click('#start-button');await p.waitForTimeout(300);
await p.evaluate(()=>{soloRules=false;document.getElementById('mode-select').value='survival';pendingSeed=3;});await p.click('#lb-ready').catch(()=>{});await p.waitForTimeout(1200);
const r=await p.evaluate(()=>{battlePaused=true;player.lives=1000;
  // a full wall across the band one row above the flag: every route is sealed
  const row=S_MID_R-2;const wall=[];for(let c=0;c<COLS;c++){if(isBuildableCell(row,c,PLAYER_HALF)){const t=makeTower(row,c,'stone',0,'player');addTower(t);t.buildUntil=-1;wall.push(idx(row,c));}}
  const sealed=routeLength('south','west')===null&&routeLength('south','east')===null;
  for(let i=0;i<6;i++)spawnSend({...SENDS[1],hp:50000},PLAYER_HALF,i%2?'west':'east');
  const lives0=player.lives;let firstTarget=null,onWall=0,broken=0;const t0=performance.now();
  for(let i=0;i<30*240;i++){simulate(1/30);for(const c of creeps)if(c.state==='attack'&&c.blockTargetKey!=null){if(!firstTarget)firstTarget=c.blockTargetKey;}
    if(i%30===0){broken=wall.filter(k=>!towers.has(k)).length;}if(!creeps.some(c=>c.hp>0))break;}
  return {wallTowers:wall.length,sealed,firstTargetOnWall:wall.includes(firstTarget),wallBroken:wall.filter(k=>!towers.has(k)).length,livesLost:lives0-player.lives,creepsLeft:creeps.filter(c=>c.hp>0).length,ms:Math.round(performance.now()-t0),simSecs:Math.round(simTime)};});
console.log(JSON.stringify({...r,errs}));await b.close();})();
