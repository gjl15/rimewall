const fs=require('fs');const {chromium}=require('playwright');const HTML=fs.readFileSync(process.argv[2],'utf8');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||undefined,headless:true,args:['--no-sandbox']});
const p=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true})).newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,160)));
await p.route('https://rimewall.local/**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:HTML}));
await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
await p.goto('https://rimewall.local/index.html');await p.waitForTimeout(800);await p.click('#start-button');await p.waitForTimeout(300);
await p.evaluate(()=>{soloRules=false;document.getElementById('mode-select').value='survival';pendingSeed=3;});await p.click('#lb-ready').catch(()=>{});await p.waitForTimeout(1200);
const r=await p.evaluate(()=>{battlePaused=true;document.querySelectorAll('.coach-card').forEach(c=>c.remove());
  const cells=mazeOrderSouth().filter(c=>isBuildableCell(c.r,c.c,PLAYER_HALF));let ci=0;
  const T={};for(const id of ['ice','fire','poison','wind','electricity','earth','stone','gravity']){const c=cells[ci++];const t=makeTower(c.r,c.c,id,2,'player');addTower(t);t.buildUntil=-1;T[id]=t;}
  const fresh=()=>{creeps.length=0;for(let i=0;i<5;i++)spawnSend({...SENDS[3],hp:1e6},PLAYER_HALF,'west');const cs=creeps.slice();cs.forEach((c,i)=>{c.x=cs[0].x+i*.4;c.y=cs[0].y;});buildCreepGrid();return cs;};
  const hit=(c,id)=>{const st=towerLiveStats(T[id]);applyDamage(c,st.dmg,T[id]);applyHitEffects(c,T[id],st);};
  const out={};
  const cases=[['shatter','ice','fire'],['ignite','poison','fire'],['firestorm','wind','fire'],['storm','wind','electricity'],['superconduct','ice','electricity'],['crush','earth','gravity'],['crush2','stone','gravity'],['miasma','poison','wind']];
  for(const [name,a,b2] of cases){const cs=fresh();const c=cs[0];hit(c,a);if(a==='poison'){for(let i=0;i<4;i++)hit(c,a);}
    const others0=cs.slice(1).map(o=>o.hp+(o.venom||0)*0+((o.dots||[]).length));const hp0=c.hp;const fx0=effects.length;
    hit(c,b2);const label=effects.slice(fx0).find(e=>e.kind==='num'&&/^[A-Z]{4,}$/.test(e.text));
    out[name]={reaction:label?label.text:null,dmg:Math.round(hp0-c.hp),neighboursTouched:cs.slice(1).filter((o,i)=>o.hp<1e6*2&&(o.hp!==others0[i]||(o.dots||[]).length||(o.venom||0)>0)).length,shred:c.bulwarkArmorShredPct||0};
    // no reaction without a primer
  }
  { const cs=fresh();const c=cs[0];const fx0=effects.length;hit(c,'fire');out.noPrimer=!effects.slice(fx0).some(e=>e.kind==='num'&&/^[A-Z]{4,}$/.test(e.text)); }
  { const cs=fresh();const c=cs[0];hit(c,'ice');hit(c,'fire');hit(c,'ice');const fx0=effects.length;hit(c,'fire');out.cooldownBlocksSecond=!effects.slice(fx0).some(e=>e.text==='SHATTER'); }
  // rank scaling
  const t=T.fire;t.level=3;t.rank=47;t._stats=null;out.effectPowerMaxRank=+effectPower(t).toFixed(2);out.tierPotMax=+tierPot(t).toFixed(2);t.level=0;t.rank=0;out.effectPowerRank0=effectPower(t);
  // armour rules
  out.matrix=Object.fromEntries(Object.entries(ATTACK_PROFILE).map(([k,v])=>[k,v.chaos?'chaos':`+${elementStrongVs(k)} -${elementWeakVs(k)}`]));
  // the card
  const cs=fresh();out.card=armorAdviceHTML(cs[0].aClass).replace(/<[^>]+>/g,'');
  return out;});
console.log(JSON.stringify({...r,errs},null,1));await b.close();})();
