/* A bounded, seeded comparison of the existing computer upgrade policy.
 * Twelve legal spiral cells and 1000g per defense; no later income.
 * Natural ranks, all real projectiles/effects, pathing and leaks are enabled.
 * This is a scenario matrix, not a race tier list or a human skill model.
 */
const fs=require('node:fs'),path=require('node:path');
const {boot}=require('./runtime.cjs');
const b=boot();
const result=b.value("(()=>{const results=[];for(const race of races)for(const id of ['miner','breacher','breaker','ruiner','titan','rootleviathan']){mp.active=false;matchMode='classic';simTime=60;seedRng(20261025);player.lives=enemy.lives=100;towers.clear();towersVersion++;creeps.length=projectiles.length=effects.length=0;crystalCacheVersion=-1;refreshRouteDebug=()=>{};Object.assign(enemy,{raceId:race.id,gold:1000,lumber:0,economyGold:0,pressureGold:0,budgetGold:1000,goldSpent:0});const wall=referenceSpiralWall(sharedFlagCell(ENEMY_HALF),ENEMY_HALF,seatZone(ENEMY_HALF,0,1)).cells;for(const p of wall.slice(0,12)){const def=towerDef(race.id,0);if(!aiSpend(enemy,def.cost))break;const t=makeTower(p.r,p.c,race.id,0,'enemy');t.buildUntil=0;addTower(t);}for(let i=0;i<150&&aiUpgradeTower(enemy,ENEMY_HALF,5);i++){}const initial=towers.size,spent=1000-enemy.gold;const send=SENDS.find(s=>s.id===id);spawnSend(send,ENEMY_HALF,'west');spawnSend(send,ENEMY_HALF,'east');let ticks=0;while(creeps.some(c=>c.hp>0)&&ticks++<480){simTime+=.25;for(const c of creeps.filter(c=>c.hp>0))updateCreep(c,.25);for(const t of towers.values())updateTower(t,.25);for(let i=projectiles.length-1;i>=0;i--)if(!updateProjectile(projectiles[i],.25))projectiles.splice(i,1);}results.push({race:race.id,send:id,budget:1000,spent,towers:initial,towersDestroyed:initial-towers.size,livesLost:100-enemy.lives,duration:Math.min(ticks,480)*.25,unfinished:creeps.some(c=>c.hp>0)});}return results;})()");
const out=path.resolve(process.argv[2]||path.join(__dirname,'combat-matrix.json'));
fs.writeFileSync(out,JSON.stringify({method:"Seed 20261025, 12 cells, 1000g, actual computer upgrade policy, no ongoing income, two units one per lane, 120s cap. Unspent gold is reported. Outcome cannot establish human balance or a race ranking.",scenarios:result},null,2)+'\n');
console.log(JSON.stringify({output:out,scenarios:result.length,unfinished:result.filter(x=>x.unfinished).length,rows:result},null,2));

