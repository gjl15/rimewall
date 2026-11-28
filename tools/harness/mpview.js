/* mpview.js <index.html> [sizes] : two real clients in a room (local channel). Each builds 5 towers; after 25 s it prints, per phone,
   the enemy towers it simulates and the opponent towers it mirrors. Every opponent must be drawn exactly once on every phone. */
const fs=require('fs');const {chromium}=require('playwright');const HTML=fs.readFileSync(process.argv[2],'utf8');const SIZES=JSON.parse(process.argv[3]||'[1,1]');
(async()=>{const b=await chromium.launch({headless:true,args:['--no-sandbox','--disable-gpu']});const ctx=await b.newContext({viewport:{width:900,height:900}});const errs=[];
async function open(tag){const p=await ctx.newPage();p.on('pageerror',e=>errs.push(tag+': '+String(e).slice(0,250)));
await p.route('https://rimewall.local/**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:HTML}));
await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));await p.route(/emqx|jsdelivr/,r=>r.abort());
await p.goto('https://rimewall.local/index.html');await p.waitForTimeout(600);await p.evaluate(()=>{document.getElementById('mode-select').value='skirmish';});await p.click('#start-button');await p.waitForTimeout(400);return p;}
const A=await open('host'),B=await open('guest');
await A.evaluate(()=>{document.getElementById('mp-name').value='Gene';});await A.evaluate(()=>mpOpenRoom(false));await A.waitForFunction(()=>mp.code&&mp.transport,null,{timeout:20000});
const code=await A.evaluate(()=>mp.code);await A.waitForTimeout(12000);
await A.evaluate(s=>{lobbySetSize('south',s[0]);lobbySetSize('north',s[1]);document.getElementById('mode-select').value='skirmish';},SIZES);await A.waitForTimeout(500);
await B.evaluate(c=>{document.getElementById('mp-name').value='Abdy';document.getElementById('mp-code').value=c;},code);await B.evaluate(()=>mpOpenRoom(true));await B.waitForTimeout(14000);
for(const p of [A,B])await p.evaluate(()=>lobbyToggleReady());await A.waitForTimeout(3000);
await A.evaluate(()=>{document.getElementById('lb-ready')?.click();});await A.waitForTimeout(4000);
const st=p=>p.evaluate(()=>{const all=[...towers.values()];return {me:mpMySeatKey(),hostBots:mpHostRunsBots(),view:mp.viewSeat,
  realEnemyTowers:all.filter(t=>t.owner==='enemy'||t.allyHalf===ENEMY_HALF).length,remoteMates:all.filter(t=>t.remoteSeat).length,
  mirrorTowers:(mp.snap&&mp.snap.towers||[]).length,myTowers:all.filter(t=>t.owner==='player'&&!t.remoteSeat&&t.allySeat==null).length,snapSeats:Object.fromEntries(Object.entries(mp.seatSnaps).map(([k,v])=>[k,(v.towers||[]).length])),
  north:mpSeatsInPlay('north').map(s=>s.kind+':'+s.index),south:mpSeatsInPlay('south').map(s=>s.kind+':'+s.index)};});
for(const P of [A,B])await P.evaluate(()=>{document.querySelectorAll('.coach-card').forEach(c=>c.remove());player.gold=9999;const z=seatZone(PLAYER_HALF,humanSeatIndex(),seatsOn(PLAYER_HALF));const cells=mazeOrderSouth().filter(c=>c.c>=z.c0&&c.c<=z.c1&&isBuildableCell(c.r,c.c,PLAYER_HALF)).slice(0,5);for(const c of cells){const t=makeTower(c.r,c.c,player.races[0],1,'player');addTower(t);t.buildUntil=-1;}towersVersion++;});
await A.waitForTimeout(25000);
console.log('A',JSON.stringify(await st(A)));console.log('B',JSON.stringify(await st(B)));
await A.screenshot({path:'mpA.png'});await B.screenshot({path:'mpB.png'});
console.log(errs);await b.close();})();
