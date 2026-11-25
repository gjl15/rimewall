// node tools/harness/allreact.js test/index.html — every pair of the 12 elements has exactly one reaction (66),
// each fires in BOTH orders and never without the other element's mark. Also opens the Elements chart.
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
    const res={};
    for(const [first,second] of [[rx.primer[0],rx.trigger],[rx.trigger,rx.primer[0]]]){
      const cs=fresh();const c=cs[0];hit(c,first);if(first==='poison'){hit(c,first);hit(c,first);}
      const hp0=cs.map(o=>o.hp),fx0=effects.length;hit(c,second);
      res[first+'>'+second]={fired:label(fx0)===rx.name,dmg:Math.round(hp0[0]-c.hp),others:cs.slice(1).filter((o,i)=>o.hp<hp0[i+1]).length};
    }
    const cs3=fresh();const fx1=effects.length;hit(cs3[0],rx.trigger);res.noPrimerNoFire=label(fx1)!==rx.name;
    res.fired=Object.values(res).filter(v=>v&&v.fired).length===2;
    out[rx.id]=res;
  }
  { const cs=fresh();const c=cs[0];hit(c,'ninja');hit(c,'crystal');const before=c.hp;applyDamage(c,100,null,true);out.resonanceNext100=Math.round(before-c.hp); }
  { const cs=fresh();const k=cs[0];k.maxHp=1000;hit(k,'gravity');k.hp=150;hit(k,'ninja');out.executeKills=k.hp<=0; }
  { const cs=fresh();const c=cs[0];for(let i=0;i<6;i++){hit(c,'electricity');c.rx_toxicshock=0;hit(c,'poison');}out.toxicVenomAfter6=Math.round(c.venom); }
  const els=['ice','fire','poison','wind','electricity','earth','stone','gravity','tech','beam','ninja','crystal'];
  const pairs=new Map();for(const r of REACTIONS)for(const p of r.primer){const k=[p,r.trigger].sort().join('|');pairs.set(k,(pairs.get(k)||0)+1);}
  const missing=[];for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){const k=[els[i],els[j]].sort().join('|');if(!pairs.has(k))missing.push(k);}
  const coverage={pairs:pairs.size,missing,dupes:[...pairs].filter(([k,v])=>v>1).map(([k])=>k)};
  return {count:REACTIONS.length,coverage,out};});
// the chart in a match, from the menu
await p.evaluate(()=>{battlePaused=true;});await p.click('#hud-menu-button');await p.waitForTimeout(250);await p.click('#set-elements');await p.waitForTimeout(250);
const inMatch=await p.evaluate(()=>{const m=document.getElementById('elements-modal');return {open:!m.classList.contains('hidden'),settingsClosed:document.getElementById('settings-modal').classList.contains('hidden'),mine:[...m.querySelectorAll('.el-table tr.mine th')].map(e=>e.textContent),yours:m.querySelectorAll('.yours').length};});
const all=Object.entries(r.out).filter(([k,v])=>v&&typeof v==='object');const bad=all.filter(([k,x])=>!x.fired||!x.noPrimerNoFire).map(([k])=>k);r.bad=bad;
const pass=r.count===66&&r.coverage.pairs===66&&!r.coverage.missing.length&&!r.coverage.dupes.length&&!bad.length&&home.open&&home.reactions===11&&inMatch.open&&!home.overflow&&!errs.length;
console.log(JSON.stringify({home,inMatch,...r,errs},null,1));console.log('RESULT',pass?'PASS':'FAIL');await b.close();})();
