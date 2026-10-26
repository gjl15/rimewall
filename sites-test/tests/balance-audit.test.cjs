const {test}=require('node:test');
const assert=require('node:assert/strict');
const {boot,fundedArena,arenaCells}=require('../audit/runtime.cjs');

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

