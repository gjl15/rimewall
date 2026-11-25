// node tools/harness/rostertest.js test/index.html  — Roster Wars: recruit, upgrade, sell, deploy, split, AI, panel
const fs=require('fs');const {chromium}=require('playwright');const HTML=fs.readFileSync(process.argv[2],'utf8');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||undefined,headless:true,args:['--no-sandbox']});
const p=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true})).newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
await p.route('https://rimewall.local/**',r=>{const u=new URL(r.request().url());const f=u.pathname.replace(/^\//,'');if(f&&f!=='index.html'&&fs.existsSync('test/'+f))return r.fulfill({status:200,body:fs.readFileSync('test/'+f)});r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:HTML});});
await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
await p.goto('https://rimewall.local/index.html');await p.waitForTimeout(800);await p.click('#start-button');await p.waitForTimeout(300);
await p.evaluate(()=>{soloRules=false;document.getElementById('mode-select').value='roster';pendingSeed=5;});await p.click('#lb-ready').catch(()=>{});await p.waitForTimeout(1500);
const r=await p.evaluate(()=>{document.querySelectorAll('.coach-card').forEach(c=>c.remove());battlePaused=true;
  const o={mode:matchMode,lumber:player.lumber,bodyClass:document.body.classList.contains('mode-roster'),waveLabel:document.getElementById('wave-label').textContent,period:currentIncomePeriod()};
  o.sendBlocked=buySend(SENDS[0].id)===false;
  player.gold=100000;const s0=SENDS.find(s=>s.shrine<=player.shrine&&!s.lumber);
  const g0=player.gold;o.recruit=rosterCommand('recruit',{slot:0,id:s0.id});o.recruitCost=g0-player.gold;o.sendCost=s0.cost;
  const u=player.rosterSlots[0];
  const g1=player.gold;o.upHealth=rosterCommand('upgrade',{slot:0,unitId:u.id,id:'health',rank:1});o.upCost=g1-player.gold;o.incomeAfterHealth=player.income;
  o.shieldRegenNeedsShield=rosterCommand('upgrade',{slot:0,unitId:u.id,id:'shieldRegen',rank:1})===false;
  const g2=player.gold;const spent=u.goldSpent;o.sell=rosterCommand('sell',{slot:0,unitId:u.id});o.refund=player.gold-g2;o.refundExpected=Math.floor(spent/2);o.incomeAfterSell=player.income;
  // a squad: 3 units, one with split 2 and shield, one with shield aura
  for(let i=0;i<3;i++)rosterCommand('recruit',{slot:i,id:s0.id});
  const U=player.rosterSlots;
  for(let k=1;k<=2;k++)rosterCommand('upgrade',{slot:0,unitId:U[0].id,id:'split',rank:k});
  rosterCommand('upgrade',{slot:0,unitId:U[0].id,id:'shield',rank:1});
  rosterCommand('upgrade',{slot:1,unitId:U[1].id,id:'shieldAura',rank:1});
  rosterCommand('upgrade',{slot:2,unitId:U[2].id,id:'slow',rank:1});
  o.woodIncome=player.woodIncome;o.income=player.income;
  // one payout: deploy
  creeps.length=0;battlePaused=false;const goldBefore=player.gold;incomeClock=0.001;simulate(1/30);
  const mine=creeps.filter(c=>c.half===ENEMY_HALF&&c.sent);o.deployed=mine.length;o.lane=mine[0]?.side;o.paid=Math.round(player.gold-goldBefore);
  o.expectedPay=goldIncomePerCycle(player.income);
  const sp=mine.find(c=>c.splitCount);o.splitCount=sp?.splitCount;o.shield=sp?.shield;o.slowRes=+(mine.find(c=>c.slowResistance)?.slowResistance||0).toFixed(2);
  for(let i=0;i<30;i++)simulate(1/30);
  o.auraShielded=mine.filter(c=>c.rosterAuraShieldGiven).length;
  // kill the splitter
  const before=creeps.length;sp.shield=0;applyDamage(sp,1e9,null);o.children=creeps.length-before;
  const kids=creeps.filter(c=>c.isRosterSplit);o.childHp=Math.round(kids[0]?.maxHp||0);o.parentMaxHp=Math.round(sp.maxHp);
  // a split family costs one life
  const lives0=enemy.lives;kids.forEach(k=>resolveLeak(k));o.familyLives=lives0-enemy.lives;
  // lane alternates
  incomeClock=0.001;const n0=creeps.length;simulate(1/30);o.secondLane=creeps.slice(n0).find(c=>c.sent&&c.half===ENEMY_HALF)?.side;
  // AI roster over 3 minutes
  player.lives=1e6;enemy.gold=20000;for(let i=0;i<30*180;i++){simulate(1/30);if(creeps.length>200)creeps.length=0;}
  o.aiSlots=(enemy.rosterSlots||[]).filter(Boolean).map(u=>u.sendId+':'+Object.values(u.ranks).reduce((a,b)=>a+b,0));
  o.aiIncome=enemy.income;o.enemyRosterOnMyHalf=creeps.filter(c=>c.half===PLAYER_HALF&&c.sent).length;
  battlePaused=true;return o;});
// the panel on the phone
await p.evaluate(()=>{document.querySelectorAll('.coach-card').forEach(c=>c.remove());});
await p.click('[data-mobile-panel="sends"]').catch(e=>r.clickErr=String(e).slice(0,100));await p.waitForTimeout(400);
r.panel=await p.evaluate(()=>{const ps=[...document.querySelectorAll('.roster-panel')].filter(e=>e.offsetParent);const q=ps[0];if(!q)return null;
  const btns=[...q.querySelectorAll('button')].filter(b=>b.offsetParent);const small=btns.filter(b=>b.getBoundingClientRect().height<44).length;
  const navLabel=document.querySelector('[data-mobile-panel="sends"] small')?.textContent;
  return {visible:ps.length,buttons:btns.length,under44:small,overflowX:q.scrollWidth>q.clientWidth+1,navLabel,slotText:[...q.querySelectorAll('[data-roster-slot] strong')].map(e=>e.textContent)};});
await p.screenshot({path:process.env.SHOT||'/tmp/roster-phone.png'});
// select slot 1 and upgrade through the UI
r.uiUpgrade=await p.evaluate(()=>{const q=[...document.querySelectorAll('.roster-panel')].find(e=>e.offsetParent);if(!q)return 'no panel';
  const inc0=player.income;q.querySelector('[data-roster-slot="1"]').click();
  const q2=[...document.querySelectorAll('.roster-panel')].find(e=>e.offsetParent);const btn=q2.querySelector('[data-roster-upgrade="armor"]');if(!btn)return 'no button';btn.click();return player.income-inc0;});
await p.waitForTimeout(300);await p.screenshot({path:(process.env.SHOT||'/tmp/roster-phone.png').replace('.png','-unit.png')});
console.log(JSON.stringify({...r,errs},null,1));await b.close();})();
