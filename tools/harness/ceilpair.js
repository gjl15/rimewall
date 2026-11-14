/* ceiling.js <index.html> [race] [waves] : THE DEFENSIVE CEILING. Survival, the player's whole maze
   filled with the top rung of one element at max level and every hit rank (the strongest wall the
   game allows), then each wave n is spawned alone onto that wall and simulated until it is gone.
   Prints, per wave, the share of the wave that leaked and the wall's cost against the gold a player
   could have banked by then. The first wave that leaks is the ceiling. */
const fs=require('fs');const {chromium}=require('playwright');const HTML=fs.readFileSync(process.argv[2],'utf8');
const RACE=process.argv[3]||'fire';const ATT=+(process.argv[5]||0);const NTOW=+(process.argv[6]||9999);const HPX=(process.argv[7]||'1').split(',').map(Number);const WAVES=(process.argv[4]||'20,25,28,30,32,35,38,40,45,50').split(',').map(Number);
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||undefined,headless:true,args:['--no-sandbox']});
const p=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1})).newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,160)));
await p.route('https://rimewall.local/**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:HTML}));
await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
await p.goto('https://rimewall.local/index.html');await p.waitForTimeout(800);await p.click('#start-button');await p.waitForTimeout(300);
await p.evaluate(()=>{document.getElementById('mode-select').value='survival';pendingSeed=7;});await p.click('#lb-ready').catch(()=>{});await p.waitForTimeout(1200);
const TIER=process.env.TIER;await p.evaluate((x)=>{window.__PAIR=x;},process.env.PAIR||'');const res=await p.evaluate(({RACE,WAVES,ATT,NTOW,HPX,TIER})=>{document.querySelectorAll('.coach-card').forEach(c=>c.remove());SFX.play=()=>{};profile.noParticles=true;
  const list=TOWERS[RACE];let top=list.length-1-(list[list.length-1].bulwark||list[list.length-1].id==='bulwark'?1:0);if(TIER!=null)top=Math.min(top,+TIER);
  const cells=mazeOrderSouth().filter(c=>isBuildableCell(c.r,c.c,PLAYER_HALF));let cost=0;
  player.attune={[RACE]:ATT};let placed=0;for(const c of cells){if(placed>=NTOW)break;if(!isBuildableCell(c.r,c.c,PLAYER_HALF))continue;const PAIR=(window.__PAIR||'').split(',').filter(Boolean);const rc=PAIR.length?PAIR[placed%PAIR.length]:RACE;const tp=PAIR.length?Math.min(top,TOWERS[rc].length-2):top;const t=makeTower(c.r,c.c,rc,tp,'player');addTower(t);t.buildUntil=-1;if(TIER==null){t.level=MAX_LEVEL;t.rank=(typeof RANK_MAX!=='undefined'?RANK_MAX:0);}cost+=list[top].cost;placed++;}
  const nTow=[...towers.values()].filter(t=>t.half===PLAYER_HALF||isMine(t)).length;
  const out=[];
  for(const hx of HPX)for(const n of WAVES){creeps.length=0;projectiles.length=0;effects.length=0;pendingSpawns.length=0;wave=n;waveClock=1e9;player.lives=1e6;const before=player.lives;
    const def0=waveDefFor(n);const def={...def0,hp:Math.round(def0.hp*hx)};queueWaveSpawns(def);let steps=0;
    while(steps<30*400){simulate(1/30);steps++;if(steps>30*5&&!creeps.some(c=>c.hp>0)&&!pendingSpawns.length)break;}
    const lost=before-player.lives;const spawned=Math.round((def.count||6)*(def.boss?1:1.3));
    out.push({hx,wave:n,creep:def.name,hpEach:Math.round(def.hp*(def.boss?1:TRAIT.hpScaleNeutral*waveHpMult(n))*CREEP_HP_SCALE),livesLost:lost,leakShare:+(Math.min(1,lost/Math.max(1,spawned*(def.lives||1)))).toFixed(2),secs:Math.round(steps/30)});}
  return {race:RACE,topTower:list[top].name,towers:nTow,wallCost:cost,out};},{RACE,WAVES,ATT,NTOW,HPX,TIER});
console.log(JSON.stringify({...res,errs}));await b.close();})();
