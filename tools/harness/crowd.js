/* crowd.js <index.html> : the late-game crowd. 380 towers in the player's maze and the creep cap
   (280) on the board; wall-clock ms per simulated second and ms per drawn frame. */
const fs=require('fs');const {chromium}=require('playwright');const HTML=fs.readFileSync(process.argv[2],'utf8');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||undefined,headless:true,args:['--no-sandbox','--disable-gpu']});
const p=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true})).newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,160)));
await p.route('https://rimewall.local/**',r=>{const u=r.request().url();const m=u.match(/\/([^\/]+\.(webp|png|json))$/);if(m&&fs.existsSync('test/'+m[1]))return r.fulfill({status:200,contentType:m[2]==='webp'?'image/webp':'image/png',body:fs.readFileSync('test/'+m[1])});return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:HTML});});
await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
await p.goto('https://rimewall.local/index.html');await p.waitForTimeout(800);await p.click('#start-button');await p.waitForTimeout(300);
await p.evaluate(()=>{soloRules=false;document.getElementById('mode-select').value='survival';pendingSeed=9;});await p.click('#lb-ready').catch(()=>{});await p.waitForTimeout(1200);
const r=await p.evaluate(()=>{document.querySelectorAll('.coach-card').forEach(c=>c.remove());SFX.play=()=>{};battlePaused=true;player.lives=1e9;
  const rids=['fire','ice','poison','electricity','earth','stone','gravity','tech'];let n=0;
  for(const c of mazeOrderSouth()){if(n>=380)break;if(!isBuildableCell(c.r,c.c,PLAYER_HALF))continue;const t=makeTower(c.r,c.c,rids[n%rids.length],1+(n%3),'player');addTower(t);t.buildUntil=-1;n++;}
  const big=SENDS.filter(s=>!s.attacker&&!s.air);const feed=()=>{let k=0;while(creeps.length<270&&k<400){const s=big[k%big.length];spawnSend({...s,hp:s.hp*400},PLAYER_HALF,k%2?'west':'east');k++;}};
  feed();for(let i=0;i<30*4;i++){simulate(1/30);if(i%30===0)feed();}
  const a=performance.now();let steps=0;for(let i=0;i<30*10;i++){simulate(1/30);steps++;if(i%15===0)feed();}const simMs=(performance.now()-a)/10;
  const b2=performance.now();for(let i=0;i<40;i++)renderFrame();const rMs=(performance.now()-b2)/40;
  return {towers:n,creeps:creeps.length,msPerSimSec:+simMs.toFixed(1),renderMs:+rMs.toFixed(2)};});
console.log(JSON.stringify({...r,errs}));await b.close();})();
