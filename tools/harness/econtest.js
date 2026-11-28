// node tools/harness/econtest.js test/index.html — lumber priced by income, send upgrades, aura sends,
// Roster Wars (one slot, unlocks, lumber ranks past 10, both lanes, sends allowed), computers buying both.
const fs=require('fs');const {chromium}=require('playwright');const HTML=fs.readFileSync(process.argv[2],'utf8');
(async()=>{const b=await chromium.launch({headless:true,args:['--no-sandbox']});const errs=[];
const open=async(mode)=>{const p=await (await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage();p.on('pageerror',e=>errs.push(mode+': '+String(e).slice(0,200)));
 await p.route('https://rimewall.local/**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:HTML}));
 await p.goto('https://rimewall.local/index.html');await p.waitForTimeout(700);await p.click('#start-button');await p.waitForTimeout(300);
 await p.evaluate(m=>{soloRules=false;document.getElementById('mode-select').value=m;pendingSeed=5;},mode);await p.click('#lb-ready').catch(()=>{});await p.waitForTimeout(1500);
 await p.evaluate(()=>{document.querySelectorAll('.coach-card').forEach(c=>c.remove());battlePaused=true;});return p;};
const out={};
// ---- waves: lumber price, send upgrades, auras ----
let p=await open('skirmish');
out.waves=await p.evaluate(()=>{const o={};
 o.price0=lumberPrice();player.income=5000;o.priceAt5k=lumberPrice();player.income=0;
 player.gold=1e6;player.lumber=0;const g0=player.gold;o.boughtVigor=buySendUpgrade(player,'vigor');o.vigorCost=g0-player.gold;
 for(let i=0;i<4;i++)buySendUpgrade(player,'vigor',true);buySendUpgrade(player,'warding',true);buySendUpgrade(player,'haste',true);
 o.ranks=JSON.stringify(player.sendUps);
 creeps.length=0;const s=SENDS.find(x=>x.id==='scout'||x.shrine===1&&!x.attacker&&!x.aura);buySendOne(s.id);
 const sent=creeps.filter(c=>c.sent&&c.half===ENEMY_HALF);o.sentBodies=sent.length;
 const plain=sendCreepDef(s);o.plainHp=plain.hp;o.upgradedHp=sent[0]&&sent[0].maxHp;o.shield=sent[0]&&Math.round(sent[0].shieldMax);o.spdUp=sent[0]&&+(sent[0].spd/plain.spd).toFixed(2);
 // auras: an Iron Standard and a War Drum walking with a pack
 creeps.length=0;player.shrine=5;player.lumber=100;
 spawnSend(SENDS.find(x=>x.id==='ironstandard'),PLAYER_HALF,'west');spawnSend(SENDS.find(x=>x.id==='wardrum'),PLAYER_HALF,'west');spawnSend(SENDS.find(x=>x.id==='mendingtotem'),PLAYER_HALF,'west');
 for(let i=0;i<3;i++)spawnSend(s,PLAYER_HALF,'west');
 const pack=creeps.slice();pack.forEach((c,i)=>{c.x=pack[0].x+i*.3;c.y=pack[0].y;});const plainOne=pack[3];plainOne.hp=plainOne.maxHp*.5;const hp0=plainOne.hp;
 battlePaused=false;for(let i=0;i<30;i++)simulate(1/30);battlePaused=true;
 o.auraArmor=(plainOne.auraArmorUntil||0)>simTime?plainOne.auraArmor:0;o.auraHaste=(plainOne.auraHasteUntil||0)>simTime?plainOne.auraHaste:0;o.healed=Math.round(plainOne.hp-hp0);
 o.auraCards=SENDS.filter(x=>x.aura).map(x=>x.name+':'+x.lumber+'L');
 return o;});
out.wavesState=await p.evaluate(()=>({over:matchOver,running:battleRunning,lives:player.lives,body:document.body.className}));console.log('waves',JSON.stringify(out.waves),JSON.stringify(out.wavesState),errs);
await p.evaluate(()=>{creeps.length=0;player.lives=Math.max(player.lives,100);});
await p.click('[data-mobile-panel="sends"]',{timeout:5000}).catch(e=>out.navErr=String(e).slice(0,80));await p.waitForTimeout(300);
out.wavesUi=await p.evaluate(()=>({tabs:[...document.querySelectorAll('#send-dock-tabs [data-dock-tab]')].filter(e=>e.offsetParent).map(e=>e.textContent.trim())}));
await p.click('[data-dock-tab="upgrades"]',{timeout:5000}).catch(e=>out.tabErr=String(e).slice(0,80));await p.waitForTimeout(250);
out.upgradesUi=await p.evaluate(()=>{const rows=[...document.querySelectorAll('.sendup-row')].map(r=>r.innerText.replace(/\s+/g,' '));const btn=document.querySelector('[data-send-up="plating"]');const before=sendUpRank(player,'plating');btn&&btn.click();return {rows:rows.length,first:rows[0],platingBefore:before,platingAfter:sendUpRank(player,'plating')};});
await p.screenshot({path:(process.env.SHOT||'/tmp/econ')+'-upgrades.png'});
await p.close();
// ---- roster ----
p=await open('roster');
out.roster=await p.evaluate(()=>{const o={};o.tab=desktopSendTab;o.unlocked=rosterUnlocked(player);
 player.gold=5e7;player.lumber=0;const s0=SENDS.find(s=>s.shrine<=player.shrine&&!s.lumber&&!s.aura);
 o.slot2BeforeUnlock=applyRosterAction(player,'recruit',{slot:1,id:s0.id}).ok;
 const gU=player.gold;o.unlock=rosterCommand('unlock',{});o.unlockCost=Math.round(gU-player.gold);o.unlockedAfter=rosterUnlocked(player);o.recruit=rosterCommand('recruit',{slot:0,id:s0.id});const u=player.rosterSlots[0];
 const L0=player.lumber,G0=player.gold;let ok=0;for(let r=1;r<=14;r++){if(rosterCommand('upgrade',{slot:0,unitId:u.id,id:'health',rank:r}))ok++;}
 o.healthRanks=u.ranks.health;o.ranksBought=ok;o.lumberSpentOnUnit=u.lumberSpent;o.goldSpentOnLumber=Math.round(G0-player.gold);o.income=player.income;
 o.recruit2=rosterCommand('recruit',{slot:1,id:s0.id});
 o.sendInRoster=buySend(s0.id)!==false;
 creeps.length=0;battlePaused=false;incomeClock=.001;simulate(1/30);battlePaused=true;
 const dep=creeps.filter(c=>c.sent&&c.half===ENEMY_HALF);o.deployed=dep.length;o.lanes=[...new Set(dep.map(c=>c.side))].join('+');
 const L1=player.lumber,G1=player.gold;const spent=u.goldSpent,ls=u.lumberSpent;o.sell=rosterCommand('sell',{slot:0,unitId:u.id});o.refundGold=Math.round(player.gold-G1);o.refundLumber=player.lumber-L1;o.expected=[Math.floor(spent/2),Math.floor(ls/2)];
 o.speedR50=+ROSTER_UPGRADES.find(x=>x.id==='speed').effect(50).toFixed(2);o.regenR50=+ROSTER_UPGRADES.find(x=>x.id==='regen').effect(50).toFixed(3);
 return o;});
console.log('roster',JSON.stringify(out.roster),errs);await p.click('[data-mobile-panel="sends"]',{timeout:5000}).catch(e=>out.navErr2=String(e).slice(0,80));await p.waitForTimeout(300);
out.rosterUi=await p.evaluate(()=>({tabs:[...document.querySelectorAll('#send-dock-tabs [data-dock-tab]')].filter(e=>e.offsetParent).map(e=>e.textContent.trim()),panel:!!document.querySelector('.roster-panel'),locks:[...document.querySelectorAll('.roster-lock')].map(e=>e.innerText.replace(/\s+/g,' '))}));
await p.screenshot({path:(process.env.SHOT||'/tmp/econ')+'-roster.png'});
await p.close();
// ---- computers over 14 minutes of Waves ----
p=await open('skirmish');
out.ai=await p.evaluate(()=>{player.lives=1e7;battlePaused=false;const seen=new Set();let auras=0;
 for(let i=0;i<30*840&&!matchOver;i++){simulate(1/30);if(i%30===0)for(const c of creeps)if(c.auraKind&&!seen.has(c)){seen.add(c);auras++;}if(creeps.length>260)creeps.splice(0,creeps.length-260);}
 return {min:Math.round(simTime/60),wave,enemyUps:JSON.stringify(enemy.sendUps||{}),aurasSeen:auras,enemyLumberPrice:lumberPrice(enemy),enemyIncome:Math.round(enemy.income)};});
await p.close();
console.log(JSON.stringify({...out,errs},null,1));await b.close();})();
