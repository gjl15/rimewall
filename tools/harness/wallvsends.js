/* wallvsends.js <index.html> : a 120-tower maxed, attuned Fire + Ice wall against 16 World Titans, plain and with the
   send upgrades and aura creeps a brutal computer owns at minutes 10, 14, 20 and 25. Prints leaks for each. */
const fs=require('fs');const {chromium}=require('playwright');const HTML=fs.readFileSync(process.argv[2],'utf8');
(async()=>{const b=await chromium.launch({headless:true,args:['--no-sandbox']});const p=await (await b.newContext()).newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,160)));
await p.route('https://rimewall.local/**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:HTML}));
await p.goto('https://rimewall.local/index.html');await p.waitForTimeout(700);await p.click('#start-button');await p.waitForTimeout(300);
await p.evaluate(()=>{document.getElementById('mode-select').value='survival';pendingSeed=7;});await p.click('#lb-ready').catch(()=>{});await p.waitForTimeout(1200);
const r=await p.evaluate(()=>{document.querySelectorAll('.coach-card').forEach(c=>c.remove());SFX.play=()=>{};profile.noParticles=true;
  const PAIR=['fire','ice'];const cells=mazeOrderSouth().filter(c=>isBuildableCell(c.r,c.c,PLAYER_HALF));let n=0;
  for(const c of cells){if(n>=120)break;if(!isBuildableCell(c.r,c.c,PLAYER_HALF))continue;const rc=PAIR[n%2];const t=makeTower(c.r,c.c,rc,TOWERS[rc].length-1,'player');addTower(t);t.buildUntil=-1;t.level=MAX_LEVEL;t.rank=10;n++;}
  player.races=PAIR.slice();player.attune={fire:15,ice:15};towersVersion++;
  const top=SENDS.filter(s=>s.shrine===5&&!s.attacker&&!s.aura&&!s.air).sort((a,b)=>b.hp-a.hp)[0];
  const run=(ups,auras)=>{creeps.length=0;projectiles.length=0;effects.length=0;pendingSpawns.length=0;waveClock=1e9;player.lives=1e6;const l0=player.lives;
    let bodies=0;for(let i=0;i<8;i++){for(const side of ['west','east']){spawnSend(top,PLAYER_HALF,side,null,null,ups);bodies++;}}
    for(const a of auras)for(const side of ['west','east'])spawnSend(SENDS.find(s=>s.id===a),PLAYER_HALF,side,null,null,ups);
    const pack=creeps.slice();pack.forEach((c,i)=>{c.spawnDelay=0;});
    let steps=0;while(steps<30*240&&creeps.some(c=>c.hp>0&&!c.leaked)){simulate(1/30);steps++;}
    const leakedTop=pack.filter(c=>c.name===top.name&&c.leaked).length;
    return {leakedTopOf16:leakedTop,livesLost:l0-player.lives,secs:Math.round(steps/30)};};
  return {wall:n,send:top.name+' '+top.hp+'hp',
    plain:run({},[]),
    ai10:run({vigor:12,plating:4},[]),
    ai14:run({vigor:18,plating:14},['ironstandard','mendingtotem']),
    ai20:run({vigor:23,plating:22,haste:11},['battlehymn','ironstandard','mendingtotem']),
    ai25:run({vigor:23,plating:22,haste:18,warding:18,resolve:12},['battlehymn','ironstandard','mendingtotem'])};});
console.log(JSON.stringify({...r,errs}));await b.close();})();
