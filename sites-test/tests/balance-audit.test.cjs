const {test}=require('node:test');
const assert=require('node:assert/strict');
const {boot,fundedArena,arenaCells}=require('../audit/runtime.cjs');

test('Initiate offers all seven Master fittings at the same initial price and can swap back to Fist',()=>{
 const {value}=boot();
 const out=value(`(()=>{const t=testTower('ninja','Initiate');
  const starter={name:towerDef(t.raceId,t.tier).name,damage:towerLiveStats(t).dmg,gold:t.invested,builds:buildableListFor('ninja').map(x=>x.def.name)};
  const options=weaponsFor(t).map(({def,tier})=>[def.name,weaponCost(t,tier)]);
  selectedTowerKey=t.key;selectedGroupKeys=[t.key];player.gold=4;
  const fist=TOWERS.ninja.findIndex(d=>d.name==='Fist Master');towerAction('weapon:'+fist);
  const refused=[t.tier,player.gold];player.gold=10;t.level=2;t.rank=4;t.rankBank=7;t.bolt='fire';t.kills=9;
  towerAction('weapon:'+fist);const fitted=[towerDef(t.raceId,t.tier).name,player.gold,t.invested,t.level,t.rank,t.rankBank,t.bolt,t.kills];
  towerAction('weapon:1');towerAction('weapon:'+fist);
  return {starter,options,refused,fitted,swapped:[towerDef(t.raceId,t.tier).name,player.gold,t.invested,t.level,t.rank,t.rankBank,t.bolt,t.kills]};})()`);
 assert.deepEqual(out.starter,{name:'Initiate',damage:8,gold:5,builds:['Initiate','Bulwark Stake']});
 assert.equal(out.options.length,7);assert.ok(out.options.every(([,cost])=>cost===5));
 assert.deepEqual(new Set(out.options.map(([name])=>name)),new Set(['Fist Master','Dagger Master','Sword Master','Mace Master','Spear Master','Shadow Master','Shuriken Master']));
 assert.deepEqual(out.refused,[0,4]);
 assert.deepEqual(out.fitted,['Fist Master',5,10,2,4,7,'fire',9]);
 assert.deepEqual(out.swapped,['Fist Master',3,12,2,4,7,'fire',9]);
});

test('Ninja fitting addition retains existing Master tier IDs and Bulwark durability',()=>{
 const {value}=boot();
 assert.deepEqual(value(`(()=>{const list=towerListFor('ninja'),wall=towerDef('ninja',list.findIndex(d=>d.special==='bulwark'));
  const dagger=testTower('ninja','Dagger Master'),c=testCreep(dagger.c+1,dagger.r+.5,{armor:8});testHit(dagger,c);
  return {existing:list.slice(1,7).map(d=>d.name),wall:[towerMaxHp(wall,wall.tier,0),wall.color,wall.symbol],daggerDamage:1e6-c.hp};})()`),
  {existing:['Dagger Master','Sword Master','Mace Master','Spear Master','Shadow Master','Shuriken Master'],wall:[1848,'#9aa7bd','⬛'],daggerDamage:30});
});

test('shared Initiate fitting and Fist swaps preserve progress and charge only their owner',async()=>{
 const {host,guest,flush}=await fundedArena();const [cell]=arenaCells(host);
 host.run("for(const p of Object.values(mp.arenaPlayers))p.races=['ninja'];arenaBroadcast(true);");flush();
 guest.run('buildAt('+JSON.stringify(cell)+')');flush();
 host.run("for(const t of towers.values()){t.buildUntil=0;t.level=2;t.rank=4;t.rankBank=7;t.bolt='fire';t.kills=9;}arenaBroadcast(true);");flush();
 guest.run("const mine=[...towers.values()].find(isMine);selectedTowerKey=mine.key;selectedGroupKeys=[mine.key];towerAction('weapon:'+TOWERS.ninja.findIndex(d=>d.name==='Fist Master'));");flush();
 for(const client of [host,guest])assert.deepEqual(client.value("(()=>{const t=[...towers.values()][0];return [towerDef(t.raceId,t.tier).name,towerDef(t.raceId,t.tier).dmg,t.level,t.rank,t.rankBank,t.bolt,t.kills];})()"),['Fist Master',20,2,4,7,'fire',9]);
 assert.equal(host.run('player.gold'),100000);assert.equal(guest.run('player.gold'),99990);
 guest.run("towerAction('weapon:1')");flush();
 guest.run("towerAction('weapon:'+TOWERS.ninja.findIndex(d=>d.name==='Fist Master'))");flush();
 assert.equal(guest.run('player.gold'),99988);assert.equal(host.run('player.gold'),100000);
 for(const client of [host,guest])assert.equal(client.run("towerDef('ninja',[...towers.values()][0].tier).name"),'Fist Master');
});

test('Shadow full damage does not shrink with crowd size and keeps cross, range and half limits',()=>{
 for(const count of [1,2,4,10]){
  const {value}=boot();
  const out=value(`(()=>{const t=testTower('ninja','Shadow Master');t.bolt='fire';
   const group=Array.from({length:${count}},(_,i)=>testCreep(t.c+.5,t.r+.8+i*.05));
   const diagonal=testCreep(t.c+1.5,t.r+1.5),far=testCreep(t.c+.5,t.r+3),rival=testCreep(t.c+.5,t.r+1,{half:ENEMY_HALF});
   fireNinjaPulse(t,towerLiveStats(t));return {damage:group.map(c=>1e6-c.hp),burns:group.map(c=>c.dots.length),misses:[diagonal,far,rival].map(c=>1e6-c.hp),hits:t.landedHits,bank:t.rankBank};})()`);
  assert.deepEqual(out.damage,Array(count).fill(40));assert.ok(out.burns.every(n=>n===1));
  assert.deepEqual(out.misses,[0,0,0]);assert.equal(out.hits,count);assert.equal(out.bank,count);
 }
});

test('attacker cost ladder prices combat separately from recurring lumber income',()=>{
 const {value}=boot();
 assert.deepEqual(value("SENDS.filter(s=>s.attacker).map(s=>[s.id,s.lumber,s.woodIncome,s.cost,s.income])"),[
  ['sapper',10,.2,0,0],['breacher',20,.35,0,0],['breaker',30,.6,0,0],['ruiner',50,1.6,0,0]
 ]);
 const paybacks=value("SENDS.filter(s=>s.attacker).map(s=>sendRoi(s))");
 for(const [i,want] of [10/.2,20/.35,30/.6,50/1.6].entries())assert.ok(Math.abs(paybacks[i]-want)<1e-9);
});

test('shared human purchases charge the new attacker prices once and preserve teammate money',async()=>{
 for(const [id,price,income] of [['sapper',10,.2],['breacher',20,.35],['breaker',30,.6],['ruiner',50,1.6]]){
  const {host,guest,flush}=await fundedArena();
  host.run("for(const p of Object.values(mp.arenaPlayers)){p.shrine=5;p.lumber=100;p.woodIncome=0;}arenaBroadcast(true);");flush();
  guest.run("buySend("+JSON.stringify(id)+")");
  const command=guest.value("outbox.find(m=>m.t==='arena-command')");flush();
  assert.equal(guest.run('player.lumber'),100-price);
  assert.equal(guest.run('player.woodIncome'),income);
  assert.equal(host.run('player.lumber'),100);
  assert.equal(host.run('creeps.filter(c=>c.attacker).length'),2);
  host.run('mpOnMessage('+JSON.stringify(command)+')');flush();
  assert.equal(guest.run('player.lumber'),100-price);
  assert.equal(host.run('creeps.filter(c=>c.attacker).length'),2);
 }
});

test('all AI attacker purchases convert only the missing lumber and charge the real purse',()=>{
 for(const [id,price,income] of [['sapper',10,.2],['breacher',20,.35],['breaker',30,.6],['ruiner',50,1.6]]){
  const {value}=boot();
  assert.deepEqual(value("(()=>{const ai=makeAlly(PLAYER_HALF,1,'earth',2),s=SENDS.find(s=>s.id==="+JSON.stringify(id)+");Object.assign(ai,{shrine:5,gold:499,lumber:"+ (price-1)+",economyGold:0,pressureGold:499,budgetGold:499});const rejected=aiBuySend(ai,PLAYER_HALF,s,'pressure');ai.gold++;ai.pressureGold++;ai.budgetGold++;const bought=aiBuySend(ai,PLAYER_HALF,s,'pressure');return [rejected,bought,ai.gold,ai.lumber,ai.woodIncome,creeps.length];})()"),[false,true,0,0,income,2]);
 }
});

test('shared Crystal groups and free bonus changes cannot cross human ownership',async()=>{
 const {host,guest,flush}=await fundedArena();const [a,b,c,d]=arenaCells(host);
 host.run("for(const p of Object.values(mp.arenaPlayers))p.races=['crystal'];arenaBroadcast(true);");flush();
 host.run('buildAt('+JSON.stringify(a)+');buildAt('+JSON.stringify(b)+');');flush();
 guest.run('buildAt('+JSON.stringify(c)+');buildAt('+JSON.stringify(d)+');');flush();
 assert.deepEqual(host.value("[...towers.values()].map(t=>crystalFormation(t).members.length)"),[2,2,2,2]);
 host.run("batchAction([...towers.values()].filter(isMine),'crystal:range');arenaBroadcast(true);");flush();
 assert.deepEqual(host.value("[...towers.values()].map(t=>[mpTowerSeatKey(t),t.crystalBonus||'damage'])"),[
  ['south:0','range'],['south:0','range'],['south:1','damage'],['south:1','damage']
 ]);
 assert.deepEqual(guest.value("[...towers.values()].map(t=>crystalFormation(t).members.length)"),[2,2,2,2]);
});

test('single player Crystal groups stay separate from friendly computer tower owners',()=>{
 const {value}=boot();
 assert.deepEqual(value("(()=>{const a=testTower('crystal',TOWERS.crystal[0].name);const b=makeTower(a.r,a.c+1,'crystal',0,'player');b.buildUntil=0;b.allySeat=1;b.allyHalf=PLAYER_HALF;addTower(b);return [crystalFormation(a).members.length,crystalFormation(b).members.length];})()"),[1,1]);
});

test('unaffordable attacker turns yield to regular pressure after the deadline or in finish mode',()=>{
 for(const finish of [false,true]){
  const {value}=boot();
  const row=value("(()=>{const ai=makeAlly(PLAYER_HALF,1,'tech',2);matchMode='classic';enemy.lives=100;simTime="+(finish?1:20)+";Object.assign(ai,{gold:4000,lumber:0,economyGold:0,pressureGold:4000,budgetGold:4000,shrine:5,towersBuilt:12,pressureTurn:5,preparingSince:0,preparingAttack:{id:'sapper'}});ai.attackPlan={mode:'"+(finish?"finish":"pressure")+"',opening:false,blocked:false,finish:"+finish+",burst:1,shrine:5,economyShare:.2,pressureShare:.45};aiSendPressure(ai,PLAYER_HALF);const waited=creeps.length===0&&ai.pressureTurn===5;if(!"+finish+"){simTime=41;aiSendPressure(ai,PLAYER_HALF);}return {waited,spent:4000-ai.gold,regular:creeps.filter(c=>!c.attacker).length,attackers:creeps.filter(c=>c.attacker).length,turn:ai.pressureTurn,gold:ai.gold};})()");
  if(!finish)assert.equal(row.waited,true);
  assert.ok(row.spent>0);assert.ok(row.regular>0);assert.equal(row.attackers,0);assert.ok(row.turn>5);assert.ok(row.gold>=0);
 }
});

