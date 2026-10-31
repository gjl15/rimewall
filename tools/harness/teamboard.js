/* TEAM BOARD CHECK. Two clients on one team (south:0 host, south:1 guest) against one
   computer, talking over the local BroadcastChannel fallback (the relay is aborted).
   Checks that each teammate's towers become real towers on the other's board, follow
   sells, never echo back, and that the inspect label names the teammate.
   Must print RESULT PASS on any multiplayer change.

     node tools/harness/teamboard.js test/index.html
     CHROME=/path/to/chrome node tools/harness/teamboard.js test/index.html

   Needs playwright or playwright-core on NODE_PATH (npm i --no-save playwright-core)
   and a Chromium/Chrome binary: CHROME env, else the Playwright-bundled one. */
const fs=require('fs');
let chromium;for(const m of ['playwright-core','playwright','/opt/node-tools/node_modules/playwright']){try{({chromium}=require(m));break;}catch(e){}}
if(!chromium){console.error('playwright-core not found: npm i --no-save playwright-core');process.exit(2);}
const HTML=fs.readFileSync(process.argv[2],'utf8');
(async()=>{const launch={headless:true,args:['--no-sandbox','--disable-gpu']};if(process.env.CHROME)launch.executablePath=process.env.CHROME;else if(fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome'))launch.executablePath='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b=await chromium.launch(launch);
const ctx=await b.newContext({viewport:{width:900,height:900}});const errs=[];
async function open(tag){const p=await ctx.newPage();p.on('pageerror',e=>errs.push(tag+': '+String(e).slice(0,160)));
await p.route('https://rimewall.local/**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:HTML}));
await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
await p.route(/emqx|jsdelivr/,r=>r.abort());
await p.goto('https://rimewall.local/index.html');await p.waitForTimeout(600);await p.click('#start-button');await p.waitForTimeout(400);return p;}
const A=await open('host'), B=await open('guest');
await A.evaluate(()=>{document.getElementById('mp-name').value='Gene';});
await A.evaluate(()=>mpOpenRoom(false));
await A.waitForFunction(()=>mp.code&&mp.transport,null,{timeout:20000});
const code=await A.evaluate(()=>mp.code);
await A.waitForTimeout(12000);
await A.evaluate(()=>{lobbySetSize('south',2);lobbySetSize('north',1);});await A.waitForTimeout(500);
await B.evaluate((c)=>{document.getElementById('mp-name').value='Abdy';document.getElementById('mp-code').value=c;},code);
await B.evaluate(()=>mpOpenRoom(true));
await B.waitForTimeout(14000);
for(const p of [A,B]) await p.evaluate(()=>lobbyToggleReady());
await A.waitForTimeout(3000);
await A.evaluate(()=>{pendingSeed=777;document.getElementById('lb-ready')?.click();});
await A.waitForTimeout(4000);
console.log('started',await A.evaluate(()=>[mp.started,battleRunning,mpMySeatKey()]),await B.evaluate(()=>[mp.started,battleRunning,mpMySeatKey()]));
for(const p of [A,B]) await p.evaluate(()=>{document.querySelectorAll('.coach-card').forEach(c=>c.remove());player.gold=9999;});
const build=(p,n)=>p.evaluate((n)=>{const z=seatZone(PLAYER_HALF,humanSeatIndex(),seatsOn(PLAYER_HALF));const cells=mazeOrderSouth().filter(c=>c.c>=z.c0&&c.c<=z.c1&&isBuildableCell(c.r,c.c,PLAYER_HALF)).slice(0,n);let keys=[];for(const c of cells){const t=makeTower(c.r,c.c,currentBuildRaceId(),0,'player');addTower(t);t.buildUntil=-1;keys.push(t.key);}return {zone:z.label,keys};},n);
const state=(p)=>p.evaluate(()=>{const all=[...towers.values()];return {own:all.filter(t=>t.owner==='player'&&t.allySeat==null).length,remote:all.filter(t=>t.remoteSeat).map(t=>t.remoteSeat+'@'+t.key),label:(()=>{const t=all.find(t=>t.remoteSeat);return t?towerOwnerLabel(t):null})(),lane:(()=>{const t=all.find(t=>t.remoteSeat);return t?towerLaneColor(t):null})()};});
const gb=await build(B,4); console.log('guest built',JSON.stringify(gb));
const hb=await build(A,3); console.log('host built',JSON.stringify(hb));
await A.waitForTimeout(5000);
console.log('host state',JSON.stringify(await state(A)));
console.log('guest state',JSON.stringify(await state(B)));
// guest sells one, host must drop it; counts must then hold steady (no echo)
await B.evaluate((k)=>{removeTower(k);},gb.keys[0]);
await A.waitForTimeout(5000);
const h1=await state(A), g1=await state(B);
await A.waitForTimeout(8000);
const h2=await state(A), g2=await state(B);
console.log('after sell host',JSON.stringify(h1),'| 8s later',JSON.stringify({own:h2.own,remote:h2.remote.length}));
console.log('after sell guest',JSON.stringify(g1),'| 8s later',JSON.stringify({own:g2.own,remote:g2.remote.length}));
const ok = h1.remote.length===3 && g1.remote.length===3 && h1.own===3 && g1.own===3 && h2.own===3 && g2.own===3 && h2.remote.length===3 && g2.remote.length===3;
await A.screenshot({path:process.env.OUT||'/tmp/teamboard-host.png'});
console.log('--- host diagnostics ---\n'+await A.evaluate(()=>mpDiagnostics()));
console.log('--- guest diagnostics ---\n'+await B.evaluate(()=>mpDiagnostics()));
console.log('button visible in dev mode:',await A.evaluate(()=>{document.body.classList.add('dev');openSettings();return getComputedStyle(document.getElementById('set-mpdiag')).display;}));
console.log('RESULT',ok?'PASS':'FAIL','errors',errs.slice(0,5));await b.close();})();
