/* rosterroom.js <index.html> [sizes] : Roster Wars in a real room (BroadcastChannel fallback, relay aborted).
   Both people recruit two scouts; every phone must receive the other side's squad. Prints RESULT PASS/FAIL.
   2026-11-25: deployments were sent as t:'roster', the lobby's seat-list message, and never arrived. */
const fs=require('fs');const {chromium}=require('playwright');const HTML=fs.readFileSync(process.argv[2],'utf8');const SIZES=JSON.parse(process.argv[3]||'[1,1]');
(async()=>{const b=await chromium.launch({headless:true,args:['--no-sandbox','--disable-gpu']});const ctx=await b.newContext({viewport:{width:900,height:900}});const errs=[];
async function open(tag){const p=await ctx.newPage();p.on('pageerror',e=>errs.push(tag+': '+String(e).slice(0,250)));
await p.route('https://rimewall.local/**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:HTML}));
await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));await p.route(/emqx|jsdelivr/,r=>r.abort());
await p.goto('https://rimewall.local/index.html');await p.waitForTimeout(600);await p.evaluate(()=>{document.getElementById('mode-select').value='roster';});await p.click('#start-button');await p.waitForTimeout(400);return p;}
const A=await open('host'),B=await open('guest');
await A.evaluate(()=>{document.getElementById('mp-name').value='Gene';});await A.evaluate(()=>mpOpenRoom(false));await A.waitForFunction(()=>mp.code&&mp.transport,null,{timeout:20000});
const code=await A.evaluate(()=>mp.code);await A.waitForTimeout(12000);
await A.evaluate(s=>{lobbySetSize('south',s[0]);lobbySetSize('north',s[1]);document.getElementById('mode-select').value='roster';},SIZES);await A.waitForTimeout(500);
await B.evaluate(c=>{document.getElementById('mp-name').value='Abdy';document.getElementById('mp-code').value=c;},code);await B.evaluate(()=>mpOpenRoom(true));await B.waitForTimeout(14000);
for(const p of [A,B])await p.evaluate(()=>lobbyToggleReady());await A.waitForTimeout(3000);
await A.evaluate(()=>{document.getElementById('lb-ready')?.click();});await A.waitForTimeout(4000);
const st=p=>p.evaluate(()=>({mode:matchMode,seat:mpMySeatKey(),run:battleRunning,t:+simTime.toFixed(1),ic:+incomeClock.toFixed(1),target:mpSendTarget(),
  south:creeps.filter(c=>c.half==='south').length,north:creeps.filter(c=>c.half==='north').length,mine:(player.rosterSlots||[]).filter(Boolean).length,
  bots:[(enemy.rosterSlots||[]).filter(Boolean).length,...allies.map(a=>(a.rosterSlots||[]).filter(Boolean).length)],hostBots:mpHostRunsBots()}));
console.log('A',JSON.stringify(await st(A)));console.log('B',JSON.stringify(await st(B)));
for(const p of [A,B])await p.evaluate(()=>{document.querySelectorAll('.coach-card').forEach(c=>c.remove());player.gold=5000;rosterCommand('recruit',{slot:0,id:'scout'});rosterCommand('recruit',{slot:1,id:'scout'});});
for(let i=0;i<(+process.env.N||4);i++){await A.waitForTimeout(6000);console.log('A',JSON.stringify(await st(A)));console.log('B',JSON.stringify(await st(B)));}
const fa=await st(A),fb=await st(B);const ok=SIZES[1]===1&&SIZES[0]===1?(fa.south>0&&fb.south>0):(fa.north>0);console.log('RESULT',ok&&!errs.length?'PASS':'FAIL',errs);await b.close();})();
