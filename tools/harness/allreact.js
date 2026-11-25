// node tools/harness/allreact.js test/index.html — every one of the 15 reactions fires, does what it says,
// needs its primer, and every element both starts one and finishes one. Also opens the Elements chart.
const fs=require('fs');const {chromium}=require('playwright');const HTML=fs.readFileSync(process.argv[2],'utf8');
(async()=>{const b=await chromium.launch({headless:true,args:['--no-sandbox']});
const p=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true})).newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
await p.route('https://rimewall.local/**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:HTML}));
await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
await p.goto('https://rimewall.local/index.html');await p.waitForTimeout(800);
// the chart from the home screen
await p.click('#home-elements');await p.waitForTimeout(300);
const home=await p.evaluate(()=>{const m=document.getElementById('elements-modal');const c=m.querySelector('.settings-card');return {open:!m.classList.contains('hidden'),rows:m.querySelectorAll('.el-table tbody tr').length,reactions:m.querySelectorAll('.el-rx article').length,mineFirst:m.querySelector('.el-rx article')?.classList.contains('mine'),overflow:c.scrollWidth>c.clientWidth+1};});
await p.screenshot({path:process.env.SHOT||'/tmp/elchart.png'});
await p.click('#el-close');
await p.click('#start-button');await p.waitForTimeout(300);
await p.evaluate(()=>{soloRules=false;document.getElementById('mode-select').value='survival';pendingSeed=3;});await p.click('#lb-ready').catch(()=>{});await p.waitForTimeout(1200);
const r=await p.evaluate(()=>{battlePaused=true;document.querySelectorAll('.coach-card').forEach(c=>c.remove());
  const cells=mazeOrderSouth().filter(c=>isBuildableCell(c.r,c.c,PLAYER_HALF));let ci=0;const T={};
  for(const id of ['ice','fire','poison','wind','electricity','earth','stone','gravity','tech','beam','ninja','crystal']){const c=cells[ci++];const t=makeTower(c.r,c.c,id,2,'player');addTower(t);t.buildUntil=-1;T[id]=t;}
  const fresh=()=>{creeps.length=0;for(let i=0;i<6;i++)spawnSend({...SENDS[3],hp:1e6,aClass:'medium'},PLAYER_HALF,'west');const cs=creeps.slice();cs.forEach((c,i)=>{c.x=cs[0].x+i*.35;c.y=cs[0].y;c.shield=0;c.shieldMax=0;});buildCreepGrid();return cs;};
  const stats=id=>{const st={...towerLiveStats(T[id])};st.dmg=100;return st;};
  const hit=(c,id)=>{const st=stats(id);applyDamage(c,st.dmg,T[id]);applyHitEffects(c,T[id],st);};
  const label=fx0=>effects.slice(fx0).filter(e=>e.kind==='num'&&e.big).map(e=>e.text).find(t=>REACTIONS.some(r=>r.name===t));
  const out={};
  for(const rx of REACTIONS){
    const cs=fresh();const c=cs[0];const primer=rx.primer[0];
    hit(c,primer);if(primer==='poison'){hit(c,primer);hit(c,primer);}
    const hp0=cs.map(o=>o.hp),venom0=c.venom||0,fx0=effects.length;
    hit(c,rx.trigger);
    const res={fired:label(fx0)===rx.name,targetDmg:Math.round(hp0[0]-c.hp),neighboursHit:cs.slice(1).filter((o,i)=>o.hp<hp0[i+1]).length};
    if(rx.id==='steam')res.slowed=cs.filter(o=>o.slowUntil>simTime&&o.slowPct>=35).length;
    if(rx.id==='toxicshock')res.venomUp=+((c.venom||0)/Math.max(1e-9,venom0)).toFixed(2);
    if(rx.id==='quake')res.stunned=cs.filter(o=>o.stunUntil>simTime).length;
    if(rx.id==='resonance'){res.exposed=c.exposedPct;const before=c.hp;applyDamage(c,100,null,true);res.next100=Math.round(before-c.hp);}
    if(rx.id==='execute'){const cs2=fresh();const k=cs2[0];k.maxHp=1000;hit(k,'gravity');k.hp=150;hit(k,'ninja');res.lowHpKilled=k.hp<=0;}
    // no reaction without the primer
    const cs3=fresh();const fx1=effects.length;hit(cs3[0],rx.trigger);res.noPrimerNoFire=label(fx1)!==rx.name;
    out[rx.id]=res;
  }
  const els=['ice','fire','poison','wind','electricity','earth','stone','gravity','tech','beam','ninja','crystal'];
  const coverage={startsNone:els.filter(e=>!REACTIONS.some(r=>r.primer.includes(e))),finishesNone:els.filter(e=>!REACTIONS.some(r=>r.trigger===e))};
  return {count:REACTIONS.length,coverage,out};});
// the chart in a match, from the menu
await p.evaluate(()=>{battlePaused=true;});await p.click('#hud-menu-button');await p.waitForTimeout(250);await p.click('#set-elements');await p.waitForTimeout(250);
const inMatch=await p.evaluate(()=>{const m=document.getElementById('elements-modal');return {open:!m.classList.contains('hidden'),settingsClosed:document.getElementById('settings-modal').classList.contains('hidden'),mine:[...m.querySelectorAll('.el-table tr.mine th')].map(e=>e.textContent),yours:m.querySelectorAll('.yours').length};});
const all=Object.values(r.out);const pass=r.count===15&&!r.coverage.startsNone.length&&!r.coverage.finishesNone.length&&all.every(x=>x.fired&&x.noPrimerNoFire)&&home.open&&inMatch.open&&!home.overflow&&!errs.length;
console.log(JSON.stringify({home,inMatch,...r,errs},null,1));console.log('RESULT',pass?'PASS':'FAIL');await b.close();})();
