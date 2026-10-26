/* Reproducible audit of the shipped shared test source.
 * Measurements use actual game functions; static comparisons are labeled.
 * Run: node sites-test/audit/balance-audit.cjs [output.json]
 */
const fs=require('node:fs'),path=require('node:path');
const {boot,fundedArena,arenaCells}=require('./runtime.cjs');
(async()=>{
 const result={method:"Real shipped-code VM; static economy and direct-damage reference, plus two-client correctness probes. No phone or full-match balance certification."};
 const b=boot();
 result.attackers=b.value("SENDS.filter(s=>s.attacker).map(s=>({id:s.id,name:s.name,shrine:s.shrine,lumber:s.lumber,woodIncome:s.woodIncome,hp:s.hp,armor:s.armor,strikeDamage:SWING_DMG*s.breakPower,paybackCycles:sendRoi(s),classicPaybackSeconds:sendRoi(s)*15,wavePaybackSeconds:sendRoi(s)*25}))");
 result.lateShrines=b.value("SENDS.filter(s=>s.shrine>=6).map(s=>({name:s.name,shrine:s.shrine,gold:s.cost,lumber:s.lumber||0,goldIncome:s.income,woodIncome:s.woodIncome||0,paybackCycles:sendRoi(s),spawnHp:sendShownHp(s)}))");
 result.rankProgression=b.value("(()=>{const standard=makeTower(SOUTH_TOP+6,12,'tech',0,'player'),splash=makeTower(SOUTH_TOP+6,12,'fire',1,'player');return {standard:Array.from({length:20},(_,r)=>rankNeed(r,standard)),splash:Array.from({length:20},(_,r)=>rankNeed(r,splash)),ordinaryRank10DamageMult:(1+.1*3)*(1+.02*7+.05*2),ordinaryRank10AttackRateMult:1+.01*7,uncapped:RANK_MAX===Infinity};})()");
 result.directDamage=b.value("(()=>{const rows=[];for(const race of races)for(let tier=0;tier<TOWERS[race.id].length;tier++){const def=towerDef(race.id,tier);if(!def.dmg)continue;for(const aClass of ['unarmored','light','medium','heavy','fortified']){towers.clear();creeps.length=0;const t=testTower(race.id,def.name);const c=testCreep(t.c+.7,t.r+1,{hp:13500,maxHp:13500,armor:24,aClass});const hp=c.hp;applyDamage(c,100,t);const fraction=(hp-c.hp)/100;rows.push({race:race.id,tower:def.name,tier,cost:def.cost,range:def.range,attacksPerSecond:1/def.cd,aClass,damageFraction:fraction,directDps:def.dmg/def.cd*fraction,directDpsPerGold:def.dmg/def.cd*fraction/def.cost});}}return rows;})()");
 result.training=b.value("(()=>{const s=SENDS.find(s=>s.id==='titan'),t=trainedSend(s,1);return {firstLumberCost:100,base:{gold:s.cost,income:s.income,hp:s.hp,speed:s.spd,armor:s.armor},level1:{gold:t.cost,income:t.income,hp:t.hp,speed:t.spd,armor:t.armor},trainingGrantsDirectIncome:false};})()");
 // The fixture uses the real join, Ready, start, build, command and snapshot paths.
 {
 const {host,guest,flush}=await fundedArena();const [a,c]=arenaCells(host);
 host.run("for(const p of Object.values(mp.arenaPlayers))p.races=['crystal'];arenaBroadcast(true);");flush();
 host.run('buildAt('+JSON.stringify(a)+')');flush();guest.run('buildAt('+JSON.stringify(c)+')');flush();
 result.crystalOwnership=host.value("(()=>{const ts=[...towers.values()];const before=ts.map(t=>({seat:mpTowerSeatKey(t),bonus:t.crystalBonus||'damage',members:crystalFormation(t).members.length}));batchAction([ts.find(t=>mpTowerSeatKey(t)===mpMySeatKey())],'crystal:range');return {before,after:ts.map(t=>({seat:mpTowerSeatKey(t),bonus:t.crystalBonus||'damage',members:crystalFormation(t).members.length}))};})()");
 }
 {
 const {host,guest,flush}=await fundedArena();
 host.run("for(let i=0;i<400;i++)testCreep(12, SOUTH_TOP+8,{hp:100,maxHp:100});arenaBroadcast(true);");flush();
 const at400=guest.value("({creeps:creeps.length,seq:mp.arenaReceivedSeq})");
 host.run("testCreep(12,SOUTH_TOP+8,{hp:100,maxHp:100});arenaBroadcast(true);");
 const bytes=host.run("outbox.filter(m=>m.t==='arena-state').map(m=>JSON.stringify(m).length).at(-1)");flush();
 result.snapshotPopulation={at400,at401:guest.value("({creeps:creeps.length,seq:mp.arenaReceivedSeq})"),hostCreeps:host.run("creeps.length"),payloadCharactersAt401:bytes};
 }
 // Actual movement, tower fire, projectiles, rank promotion, damage and leaks.
 // A fixed Tech opening is an integration check, not a model of all human defenses.
 result.attackerCombat=b.value("(()=>{const out=[];for(const send of SENDS.filter(s=>s.attacker)){matchMode='classic';mp.active=false;simTime=60;player.lives=enemy.lives=100;towers.clear();towersVersion++;creeps.length=0;projectiles.length=0;effects.length=0;refreshRouteDebug=()=>{};const wall=referenceSpiralWall(sharedFlagCell(ENEMY_HALF),ENEMY_HALF,seatZone(ENEMY_HALF,0,1)).cells;for(const p of wall.slice(0,12)){const t=makeTower(p.r,p.c,'tech',0,'enemy');t.buildUntil=0;addTower(t);}const initialTowers=towers.size;spawnSend(send,ENEMY_HALF,'west');spawnSend(send,ENEMY_HALF,'east');let ticks=0;while(creeps.some(c=>c.hp>0)&&ticks++<480){simTime+=.25;for(const c of creeps.filter(c=>c.hp>0))updateCreep(c,.25);for(const t of towers.values())updateTower(t,.25);for(let i=projectiles.length-1;i>=0;i--)if(!updateProjectile(projectiles[i],.25))projectiles.splice(i,1);}out.push({name:send.name,lumber:send.lumber,duration:Math.min(480,ticks)*.25,towersDestroyed:initialTowers-towers.size,livesLost:100-enemy.lives,livingAttackers:creeps.filter(c=>c.hp>0).length,unfinished:creeps.some(c=>c.hp>0)});}return out;})()");
 const target=path.resolve(process.argv[2]||path.join(__dirname,'results.json'));fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({output:target,attackers:result.attackers,crystalOwnership:result.crystalOwnership,snapshotPopulation:result.snapshotPopulation,attackerCombat:result.attackerCombat,referenceRows:result.directDamage.length},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});

