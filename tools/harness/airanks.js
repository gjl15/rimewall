/* airanks.js <index.html> : 25 minutes of Waves vs a brutal computer; prints the send upgrades it owns at 10/14/20/25 min. */
const fs=require('fs');const {chromium}=require('playwright');const HTML=fs.readFileSync(process.argv[2],'utf8');
(async()=>{const b=await chromium.launch({headless:true});const p=await (await b.newContext()).newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,160)));
await p.route('https://rimewall.local/**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:HTML}));
await p.goto('https://rimewall.local/index.html');await p.waitForTimeout(700);await p.click('#start-button');await p.waitForTimeout(300);
await p.evaluate(()=>{soloRules=false;document.getElementById('mode-select').value='skirmish';const a=document.getElementById('ai-select');if(a)a.value='brutal';pendingSeed=21;});await p.click('#lb-ready').catch(()=>{});await p.waitForTimeout(1500);
const r=await p.evaluate(()=>{SFX.play=()=>{};profile.noParticles=true;player.lives=1e9;battlePaused=false;const snaps={};const seen=new Set();let auras=0;
 for(let i=0;i<30*60*25&&!matchOver;i++){simulate(1/30);if(creeps.length>260)creeps.splice(0,creeps.length-260);if(i%30===0)for(const c of creeps)if(c.auraKind&&!seen.has(c)){seen.add(c);auras++;}
  const m=Math.round(simTime/60);if(i%(30*60)===0&&(m===10||m===14||m===20||m===25))snaps[m]=JSON.stringify(enemy.sendUps||{})+' lumberPrice '+lumberPrice(enemy)+' income '+Math.round(enemy.income);}
 snaps.end=JSON.stringify(enemy.sendUps||{});return {snaps,auras,min:Math.round(simTime/60)};});
console.log(JSON.stringify({...r,errs},null,1));await b.close();})();
