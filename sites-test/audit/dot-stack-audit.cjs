/* Compare the shipped 30-DOT rule with Infinity inside an isolated real-game VM.
 * No game source or hosted rule is changed. Fixed defenses are conditional
 * snapshots of early-built towers, not an economy or full-match simulation.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {boot}=require('./runtime.cjs');
const mode=process.argv[2]||'all';
const output=path.resolve(process.argv[3]||path.join(__dirname,'dot-stack-audit.json'));
const b=boot();
b.run(`
globalThis.dotWeaponNames=['Fist Master','Dagger Master','Sword Master','Mace Master','Spear Master','Shadow Master','Shuriken Master'];
globalThis.dotRankProfiles={};
for(const name of dotWeaponNames){
 towers.clear();creeps.length=0;effects.length=0;simTime=0;seedRng(20261025);
 const t=testTower('ninja',name),c=testCreep(t.c+1,t.r+.5,{hp:1e12,maxHp:1e12});
 let next=0;const points={};
 for(const minute of [8,17.5,24.5]){
  const active=minute*60*.5;
  while(next<active){simTime=next;const cd=towerLiveStats(t).cd;
   if(name==='Fist Master')testHit(t,c);else grantTowerXp(t,1);
   next+=cd;
  }
  const stats=towerLiveStats(t);
  points[minute]={level:t.level,rank:t.rank||0,rankBank:t.rankBank||0,landedHits:t.landedHits||0,totalRank:towerTotalRank(t),damage:stats.dmg,aps:1/stats.cd,range:stats.range};
 }
 dotRankProfiles[name]=points;
}
function dotSetup(cap,minute,seed){
 mp.active=false;matchMode='classic';simTime=minute*60;battleRunning=true;matchOver=false;
 seedRng(seed);player.lives=enemy.lives=1000;
 towers.clear();towersVersion++;creeps.length=projectiles.length=effects.length=0;
 crystalCacheVersion=-1;refreshRouteDebug=()=>{};TRAIT.dotCap=cap===null?Infinity:cap;
}
function dotTower(p,name,minute,bolt){
 const tier=TOWERS.ninja.findIndex(d=>d.name===name),t=makeTower(p.r,p.c,'ninja',tier,'enemy');
 Object.assign(t,dotRankProfiles[name][minute]);
 t.buildUntil=0;t.cooldown=0;t.bolt=bolt;t.priority='first';
 t.blockHp=t.blockMaxHp=towerMaxHp(towerDef('ninja',tier),tier,t.level);
 addTower(t);return t;
}
function dotFocusCells(name,minute,count){
 const range=dotRankProfiles[name][minute].range,cells=[];
 for(let r=NORTH_TOP+3;r<NORTH_BOT-3;r++)for(let c=3;c<COLS-3;c++){
  if(terrainAt(r,c)!==T.FLOOR||protectedCells.has(idx(r,c)))continue;
  const possible=[];
  for(let dr=-Math.ceil(range);dr<=Math.ceil(range);dr++)for(let dc=-Math.ceil(range);dc<=Math.ceil(range);dc++){
   if((!dr&&!dc)||Math.hypot(dr,dc)>range)continue;
   if(name==='Shadow Master'&&dr!==0&&dc!==0)continue;
   const p={r:r+dr,c:c+dc};
   if(isBuildableCell(p.r,p.c,ENEMY_HALF))possible.push(p);
  }
  if(possible.length>=count)return {target:{r,c},cells:possible.sort((a,b)=>Math.hypot(a.r-r,a.c-c)-Math.hypot(b.r-r,b.c-c)).slice(0,count)};
 }
 throw Error('No legal focus arrangement for '+name+' / '+count);
}
function dotCase(config){
 const {cap,minute,seed,weapon,bolt,count,sendId,layout}=config;
 dotSetup(cap,minute,seed);
 const names=layout==='maze'?dotWeaponNames:[weapon];
 let center=null,cells;
 if(layout==='maze')cells=spiralMazeSpots(ENEMY_HALF,seatZone(ENEMY_HALF,0,1)).slice(0,count);
 else{const p=dotFocusCells(weapon,minute,count);cells=p.cells;center=p.target;}
 if(cells.length!==count)throw Error('Incorrect defense size');
 for(let i=0;i<cells.length;i++)dotTower(cells[i],names[i%names.length],minute,bolt==='mixed'?(i%2?'toxic':'fire'):bolt);
 if(layout==='maze'&&(routeLength(ENEMY_HALF,'west')===null||routeLength(ENEMY_HALF,'east')===null))throw Error('Blocked maze fixture');
 const initialTowers=towers.size,send=SENDS.find(s=>s.id===sendId);
 const sides=layout==='maze'?['west','east']:['west'];
 for(const side of sides)spawnSend(send,ENEMY_HALF,side);
 if(center)for(const c of creeps){c.x=center.c+.5;c.y=center.r+.5;c.stunUntil=1e9;}
 const initialHp=creeps.reduce((s,c)=>s+c.hp,0),initialArmor=creeps[0].armor;
 const ranksAtStart=[...towers.values()].map(towerTotalRank);
 const start=simTime,dt=config.dt||.05,limit=layout==='maze'?180:240;
 let peakStacks=0,stackTicks=0,damageAt15=null,damageAt30=null;
 const history=[];
 for(let tick=1;tick<=Math.round(limit/dt);tick++){
  simTime=start+tick*dt;
  for(const c of creeps)if(c.hp>0)updateCreep(c,dt);
  for(const t of towers.values())updateTower(t,dt);
  for(let i=projectiles.length-1;i>=0;i--)if(!updateProjectile(projectiles[i],dt))projectiles.splice(i,1);
  for(const c of creeps){peakStacks=Math.max(peakStacks,(c.dots||[]).length);stackTicks+=(c.dots||[]).length;}
  const damage=initialHp-creeps.reduce((s,c)=>s+Math.max(0,c.hp),0);
  if(tick===Math.round(15/dt))damageAt15=damage;
  if(tick===Math.round(30/dt))damageAt30=damage;
  if(tick%Math.round(1/dt)===0)history.push([tick*dt,Math.round(creeps.reduce((s,c)=>s+Math.max(0,c.hp),0)),creeps.reduce((s,c)=>s+(c.dots||[]).length,0)]);
  if(tick%Math.round(1/dt)===0)for(let i=effects.length-1;i>=0;i--)if(effects[i].until<simTime)effects.splice(i,1);
  if(!creeps.some(c=>c.hp>0))break;
 }
 const remaining=creeps.filter(c=>c.hp>0),leaks=1000-enemy.lives,kills=sides.length-leaks-remaining.length;
 return {...config,initialHp,initialArmor,initialTowers,initialRanks:ranksAtStart,
  duration:Math.round((simTime-start)*100)/100,kills,leaks,unfinished:remaining.length,
  remainingHp:Math.round(remaining.reduce((s,c)=>s+c.hp,0)),damageAt15:layout==='focus'?(damageAt15??initialHp):null,damageAt30:layout==='focus'?(damageAt30??initialHp):null,
  peakStacks,stackTicks,towersDestroyed:initialTowers-towers.size,finalRanks:[...towers.values()].map(towerTotalRank)};
}
`);
const profiles=b.value('dotRankProfiles');
const scenarios=[];
if(mode==='focus'||mode==='all'){
 const cases=[[8,'titan'],[8,'ruiner'],[17.5,'ironleviathan'],[24.5,'heartwoodgiant'],[24.5,'rootleviathan'],[24.5,'eternaldragon']];
 for(const [minute,sendId] of cases)for(const weapon of ['Fist Master','Dagger Master','Shadow Master','Shuriken Master'])for(const bolt of ['fire','toxic'])for(const seed of [20261025,20261026,20261027])for(const cap of [30,null]){
  const config={layout:'focus',cap,minute,seed,weapon,bolt,count:weapon==='Shadow Master'?10:20,sendId};
  scenarios.push(b.value('dotCase('+JSON.stringify(config)+')'));
 }
 // The cap should not change an ordinary single tower below 30 effects.
 for(const weapon of ['Fist Master','Dagger Master'])for(const bolt of ['fire','toxic'])for(const cap of [30,null]){
  scenarios.push(b.value('dotCase('+JSON.stringify({layout:'focus',cap,minute:24.5,seed:20261025,weapon,bolt,count:1,sendId:'rootleviathan'})+')'));
 }
}
if(mode==='maze'||mode==='all'){
 for(const [minute,sendId] of [[8,'titan'],[8,'ruiner'],[17.5,'ironleviathan'],[24.5,'heartwoodgiant'],[24.5,'rootleviathan'],[24.5,'eternaldragon']])for(const count of [24,48])for(const bolt of ['fire','toxic','mixed'])for(const seed of [20261025,20261026,20261027])for(const cap of [30,null]){
  scenarios.push(b.value('dotCase('+JSON.stringify({layout:'maze',cap,minute,seed,weapon:'mixed',bolt,count,sendId})+')'));
 }
}
if(mode==='cadence'||mode==='all'){
 for(const [minute,sendId] of [[8,'titan'],[24.5,'rootleviathan'],[24.5,'eternaldragon']])for(const weapon of ['Fist Master','Dagger Master'])for(const seed of [20261025,20261026,20261027])for(const cap of [30,null]){
  scenarios.push(b.value('dotCase('+JSON.stringify({layout:'focus',cap,minute,seed,weapon,bolt:'fire',count:20,sendId,dt:1/60})+')'));
 }
}
if(mode==='maze-cadence'||mode==='all'){
 for(const [minute,sendId,bolt] of [[8,'titan','mixed'],[17.5,'ironleviathan','toxic'],[24.5,'rootleviathan','mixed'],[24.5,'eternaldragon','mixed']])for(const seed of [20261025,20261026,20261027])for(const cap of [30,null]){
  scenarios.push(b.value('dotCase('+JSON.stringify({layout:'maze',cap,minute,seed,weapon:'mixed',bolt,count:48,sendId,dt:1/60})+')'));
 }
}
for(const r of scenarios)if(r.cap===30)assert.ok(r.peakStacks<=30,'capped run exceeded 30');
for(const r of scenarios.filter(r=>r.count===1&&r.cap===30)){
 const other=scenarios.find(x=>x.count===1&&x.cap===null&&x.weapon===r.weapon&&x.bolt===r.bolt);
 assert.equal(other.duration,r.duration);assert.equal(other.remainingHp,r.remainingHp);assert.equal(other.peakStacks,r.peakStacks);
}
if(scenarios.length&&mode!=='maze')assert.ok(scenarios.some(r=>r.cap===null&&r.peakStacks>30),'uncapped run never exceeded cap');
const invariantChecks=b.value(`(()=>{const out=[];for(const bolt of ['fire','toxic']){
 dotSetup(null,0,20261025);const t=testTower('ninja','Fist Master');t.bolt=bolt;
 const c=testCreep(t.c+1,t.r+.5,{hp:1e6,maxHp:1e6,stunUntil:1e9});
 for(let i=0;i<100;i++)applyBoltEffects(c,t,towerLiveStats(t));
 for(let tick=1;tick<=82;tick++){simTime=tick*.05;updateCreep(c,.05);}
 out.push({bolt,expiredStacks:c.dots.length,rankHits:t.landedHits||0});
 }dotSetup(null,0,20261025);const t=testTower('ninja','Fist Master');t.bolt='toxic';
 const c=testCreep(t.c+1,t.r+.5,{hp:100,maxHp:100,stunUntil:1e9});
 for(let i=0;i<100;i++)applyBoltEffects(c,t,towerLiveStats(t));
 for(let tick=1;tick<=82;tick++){simTime=tick*.05;updateCreep(c,.05);}
 return {expiry:out,toxicMinimumHp:c.hp};})()`);
assert.ok(invariantChecks.expiry.every(r=>r.expiredStacks===0&&r.rankHits===0));
assert.equal(invariantChecks.toxicMinimumHp,1);
const result={sourceCommit:'f1c843672a520ceea4aa669050ad0f31f20168c3',mode,
 method:'Actual shipped VM, .05-second steps plus a 1/60-second cadence check, three seeds, untrained sends. 30 vs Infinity only in VM. Conditional early-built ranks from one credited target and 50% firing time. Natural ranks continue during combat. Focus targets are held still on a legal floor cell with every tower in range (Shadow cross geometry respected); they cannot attack towers, so this isolates damage and excludes Toxic movement value. Maze uses 24/48 legal cells from the actual spiralMazeSpots placement policy, two actual moving sends, real attacks/destruction/leaks and no ongoing building/income. Damage-at-time metrics apply only to focus cases; leaked bodies are not treated as damage in the maze report. These are bounded scenarios, not full matches or device-performance certification.',
 profiles,invariantChecks,scenarios};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
const summary={output,scenarios:scenarios.length,uncappedPeak:Math.max(...scenarios.filter(r=>r.cap===null).map(r=>r.peakStacks)),focus:scenarios.filter(r=>r.layout==='focus'&&r.seed===20261025&&r.weapon==='Fist Master'&&r.count===20).map(({history,...r})=>r)};
console.log(JSON.stringify(summary,null,2));
