/* Dependency-free behavioral regression checks. These run the actual shipped
 * inline script in a VM with a deliberately inert DOM, not a browser or a
 * replacement game implementation. Browser rendering QA is a separate step. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const VM_TIMEOUT=Number(process.env.RIMEWALL_TEST_TIMEOUT_MS)||10000;
const html = fs.readFileSync(path.join(__dirname, '../dist/index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>{const src=m[1]?.match(/src="([^"]+)"/);return src?fs.readFileSync(path.join(__dirname,'../dist',src[1]),'utf8'):m[2];});

function boot() {
  const elements = new Map();
  const noop = () => {};
  const classes = () => {
    const set = new Set();
    return { add:(...xs) => xs.forEach((x) => set.add(x)), remove:(...xs) => xs.forEach((x) => set.delete(x)),
      contains:(x) => set.has(x), toggle:(x, on) => { const yes = on ?? !set.has(x); yes ? set.add(x) : set.delete(x); return yes; } };
  };
  const canvas = new Proxy({}, { get:(target, key) => target[key] ?? (key === 'measureText'
    ? () => ({ width:20 }) : key === 'createLinearGradient' || key === 'createRadialGradient'
      ? () => ({ addColorStop:noop }) : noop), set:(target, key, value) => (target[key] = value, true) });
  function element(id = '') {
    if (elements.has(id)) return elements.get(id);
    const out = { id, innerHTML:'', textContent:'', value:id === 'mode-select' ? 'classic' : '1',
      checked:false, width:1280, height:900, clientWidth:1280, clientHeight:900, offsetWidth:1280,
      dataset:{}, style:{ setProperty:noop, removeProperty:noop }, classList:classes(),
      addEventListener:noop, removeEventListener:noop, setAttribute:noop, getAttribute:() => null,
      appendChild:noop, append:noop, remove:noop, click:noop, focus:noop, scrollBy:noop, scrollTo:noop,
      scrollIntoView:noop, closest:() => null, contains:() => false,
      getContext:() => canvas, getBoundingClientRect:() => ({ x:0, y:0, left:0, top:0, width:1280, height:900, right:1280, bottom:900 }),
      querySelectorAll:() => [], querySelector:(selector) => element(selector),
    };
    elements.set(id, out); return out;
  }
  const documentEvents = new Map();
  const document = { body:element('body'), documentElement:element('html'), head:element('head'),
    getElementById:element, querySelector:element, querySelectorAll:() => [], createElement:element,
    addEventListener:(type,callback) => { const handlers=documentEvents.get(type)||[];handlers.push(callback);documentEvents.set(type,handlers); }, removeEventListener:noop, hidden:false };
  const data = new Map();
  const storage = { getItem:(key) => data.get(key) ?? null, setItem:(key, value) => data.set(key, String(value)), removeItem:(key) => data.delete(key) };
  const sandbox = { console, document, localStorage:storage, sessionStorage:storage,
    navigator:{}, location:{ search:'', origin:'https://rimewall.test', pathname:'/', protocol:'https:' },
    innerWidth:1280, innerHeight:900, devicePixelRatio:1, visualViewport:null,
    requestAnimationFrame:() => 1, cancelAnimationFrame:noop, setTimeout:() => 1, clearTimeout:noop,
    setInterval:() => 1, clearInterval:noop, addEventListener:noop, removeEventListener:noop,
    matchMedia:() => ({ matches:false, addEventListener:noop }), getComputedStyle:() => ({ getPropertyValue:() => '0', display:'block' }),
    Image:class { constructor() { this.complete = false; this.width = this.height = 0; } addEventListener() {} },
    performance:{ now:() => 0 }, URL, URLSearchParams, Blob, TextEncoder, TextDecoder,
    fetch:async () => ({ ok:false, json:async () => ({}) }),
    ResizeObserver:class { observe() {} disconnect() {} },
  };
  sandbox.window = sandbox; sandbox.self = sandbox;
  const context = vm.createContext(sandbox);
  for (const source of scripts) new vm.Script(source, { filename:'dist/index.html' }).runInContext(context, { timeout:10000 });
  const run = (source) => vm.runInContext(source, context, { timeout:VM_TIMEOUT });
  run(`SFX.play = () => {}; simTime = 10; battleRunning = true; battlePaused = false;
    matchOver = false; towers.clear(); creeps.length = 0; projectiles.length = 0;
    function testTower(raceId, name) {
      const tier = towerListFor(raceId).findIndex(d => d.name === name);
      if (tier < 0) throw Error('Missing test tower: ' + name);
      const t = makeTower(SOUTH_TOP + 6, 12, raceId, tier, 'player');
      t.buildUntil = 0; t.priority = 'near'; towers.set(t.key, t); return t;
    }
    function testCreep(x, y, opts = {}) {
      spawnCreep(waveDefFor(4), PLAYER_HALF, 'west');
      const c = creeps[creeps.length - 1];
      Object.assign(c, { x, y, hp:1e6, maxHp:1e6, armor:0, aClass:'siege', shield:0,
        shieldMax:0, regen:0, air:false, boss:false, spd:2, cpIndex:0 }, opts); return c;
    }
    function testHit(t, c) {
      const stats = towerLiveStats(t);
      resolveProjectileHit({tower:t, stats, target:c, half:c.half,
        sx:t.c + .5, sy:t.r + .5, tx:c.x, ty:c.y, x:c.x, y:c.y, style:stats.special});
    }`);
  return { run, value:(source) => JSON.parse(JSON.stringify(run(source))), elements, canvas, documentEvents };
}

test('all inline scripts parse and the actual application boots in dev mode', () => {
  assert.equal(scripts.length, 2);
  const { run } = boot();
  assert.equal(run('SITE_DEV_BUILD && profile.devUnlockAll && races.every(r => raceUnlocked(r.id))'), true);
});

test('Bulwarks cannot be imbued, show no imbuement rack, and reject purchase', () => {
  const { run, value } = boot();
  assert.equal(run(`races.every(r => { const t = testTower(r.id, 'Bulwark Stake'); return !boltEligible(t) && boltPanelHtml([t]) === ''; })`), true);
  assert.deepEqual(value(`(() => { const t = testTower('tech', 'Bulwark Stake');
    selectedTowerKey = t.key; selectedGroupKeys = [t.key]; player.gold = 999;
    towerAction('bolt:fire'); return {gold:player.gold, bolt:t.bolt || null}; })()`), { gold:999, bolt:null });
});

test('all three send pools sort by shrine then ROI without mutating stable IDs', () => {
  const { run, value } = boot();
  assert.equal(run(`(() => { const ids = SENDS.map(s => s.id).join(',');
    for (const tab of ['sends', 'flying', 'attackers']) { desktopSendTab = tab; const list = desktopSendPool();
      for (let i=1;i<list.length;i++) { const a=list[i-1], b=list[i];
        if (a.shrine > b.shrine || (a.shrine === b.shrine && sendRoi(a) > sendRoi(b))) return false; }
    } return ids === SENDS.map(s => s.id).join(','); })()`), true);
  assert.deepEqual(value(`SENDS.filter(s => s.attacker).map(s => [s.id, s.cost, s.lumber, s.woodIncome])`),
    [['sapper',0,10,.2], ['breacher',0,20,.35], ['breaker',0,30,.6], ['ruiner',0,50,1.6]]);
  assert.deepEqual(value(`[sendGlyph(SENDS[0]), sendGlyph(SENDS.find(s => s.air)), sendGlyph(SENDS.find(s => s.attacker))]`), ['↗','▲','⚒']);
});

test('rival and ally computers can buy Shrine 5 in Classic and wave modes', () => {
  const { run, value } = boot();
  assert.deepEqual(value(`(() => { matchMode='classic'; const a=[0,120,240,360,480].map(n => {simTime=n; return desiredAiShrine();});
    matchMode='survival'; const b=[0,4,8,12,16].map(n => {wave=n; return desiredAiShrine();}); return [a,b]; })()`),
    [[1,2,3,4,5],[1,2,3,4,5]]);
  assert.equal(run(`(() => { matchMode='classic'; simTime=840;
    Object.assign(enemy,{shrine:1,lumber:10,gold:0,buildClock:100,upgradeClock:100,sendClock:100});
    for(let i=0;i<4;i++) updateEnemyAI(.01);
    const ally=makeAlly(PLAYER_HALF,0,'tech',1);
    Object.assign(ally,{shrine:1,lumber:10,gold:0,buildClock:100,upgradeClock:100,sendClock:100});
    for(let i=0;i<4;i++) updateAlly(ally,.01);
    return enemy.shrine===5 && ally.shrine===5 && enemy.lumber===6 && ally.lumber===6; })()`), true);
});

test('Tech has one buildable chassis; weapon conversion keeps levels and imbuement', () => {
  const { run, value } = boot();
  assert.deepEqual(value(`TOWERS.tech.filter(d => !d.weapon).map(d => d.name)`), ['Bolt Platform']);
  assert.deepEqual(value(`(() => { const t=testTower('tech','Bolt Platform'); t.level=2; t.bolt='fire';
    player.gold=999; selectedTowerKey=t.key; selectedGroupKeys=[t.key];
    const tier=TOWERS.tech.findIndex(d=>d.special==='bola'); towerAction('weapon:'+tier);
    return {special:towerDef(t.raceId,t.tier).special,level:t.level,bolt:t.bolt,gold:player.gold,selection:selectionTowers().length,own:isMine(t)}; })()`),
    {special:'bola',level:2,bolt:'fire',gold:944,selection:1,own:true});
});

test('Ninja range hierarchy and distinct weapon definitions', () => {
  const { run } = boot();
  assert.equal(run(`(() => { const [i,d,s,m,p,h,k,f]=TOWERS.ninja;
    return f.range<d.range && h.range<d.range && [s,m,p,k].every(w=>d.range<w.range)
      && TOWERS.ninja.every(w=>w===k || w.range<k.range) && !k.airOnly
      && i.chassis && f.weapon && TOWERS.ninja.filter(w=>w.weapon).length===7 && new Set(TOWERS.ninja.filter(w=>w.weapon).map(w=>w.weaponKind)).size===7 && d.armorPierce===8; })()`), true);
});

test('Fist double hit includes a second imbuement proc at exactly the 50% threshold', () => {
  const { value } = boot();
  assert.deepEqual(value(`(() => { const t=testTower('ninja','Fist Master'); t.bolt='fire';
    const c=testCreep(t.c+1,t.r+.5); let effects=0; const original=applyHitEffects;
    applyHitEffects=(...args)=>{effects++;original(...args);}; rng=()=>.499;
    testHit(t,c); const a={damage:1e6-c.hp,effects,burn:c.dots.reduce((s,d)=>s+d.dps,0)};
    c.hp=1e6;c.dots=[];effects=0;rng=()=>.5;testHit(t,c);
    return [a,{damage:1e6-c.hp,effects,burn:c.dots.reduce((s,d)=>s+d.dps,0)}]; })()`),
    [{ damage:40, effects:2, burn:20*.2/3*2 }, { damage:20, effects:1, burn:20*.2/3 }]);
});

test('Sword crit is 30% at 2.5x damage', () => {
  const { value } = boot();
  assert.deepEqual(value(`(() => { const t=testTower('ninja','Sword Master'), c=testCreep(t.c+1,t.r+.5);
    rng=()=>.299;testHit(t,c);const crit=1e6-c.hp;c.hp=1e6;rng=()=>.3;testHit(t,c);
    return [crit,1e6-c.hp]; })()`), [100,40]);
});

test('Mace damage travels outward, hits once, hits harder at the edge, and shreds armor', () => {
  const { value } = boot();
  const out = value(`(() => { const t=testTower('ninja','Mace Master');
    const a=testCreep(t.c+1,t.r+.5,{armor:10}), b=testCreep(t.c+3,t.r+.5,{armor:10});
    fireNinjaPulse(t,towerLiveStats(t));const p=projectiles[0];
    const initial=[a.hp,b.hp];updateProjectile(p,.1);const early=[a.hp,b.hp];
    updateProjectile(p,.36);const late=[a.hp,b.hp],shred=[a.maceArmorShred,b.maceArmorShred];
    updateProjectile(p,.01);return {initial,early,late,shred,final:[a.hp,b.hp]}; })()`);
  assert.deepEqual(out.initial,[1e6,1e6]); assert.ok(out.early[0]<1e6); assert.equal(out.early[1],1e6);
  assert.ok(1e6-out.late[1]>1e6-out.late[0]); assert.deepEqual(out.shred,[3,3]); assert.deepEqual(out.final,out.late);
});

test('Spear hits targets directly behind the mark, not off-axis or opposite-half creeps', () => {
  const { value } = boot();
  assert.deepEqual(value(`(() => { const t=testTower('ninja','Spear Master');
    const mark=testCreep(t.c+1.5,t.r+.5), behind=testCreep(t.c+2.5,t.r+.5),
      aside=testCreep(t.c+2.5,t.r+2), rival=testCreep(t.c+2.5,t.r+.5,{half:ENEMY_HALF});
    testHit(t,mark);return [mark,behind,aside,rival].map(c=>1e6-c.hp); })()`), [75,33.75,0,0]);
});

test('Shadow emits only an orthogonal pulse and deals full damage to each target', () => {
  const { value } = boot();
  const out=value(`(() => {const t=testTower('ninja','Shadow Master');
    const n=testCreep(t.c+.5,t.r-.5), e=testCreep(t.c+1.5,t.r+.5), diagonal=testCreep(t.c+1.5,t.r+1.5);
    fireNinjaPulse(t,towerLiveStats(t));return {damage:[n,e,diagonal].map(c=>1e6-c.hp),projectiles:projectiles.length};})()`);
  assert.equal(out.damage[0],40); assert.equal(out.damage[0],out.damage[1]);
  assert.equal(out.damage[2],0); assert.equal(out.projectiles,0);
});

test('Shuriken hits ground and air but chains only once, from air to air', () => {
  const { run, value } = boot();
  const out=value(`(() => {const t=testTower('ninja','Shuriken Master');
    const ground=testCreep(t.c+1,t.r+.5), a=testCreep(t.c+1.5,t.r+.5,{air:true}), b=testCreep(t.c+2,t.r+.5,{air:true});
    const selected=pickTarget(t,towerLiveStats(t));testHit(t,a);const bounce=projectiles.shift();
    resolveProjectileHit(bounce);return {selected:selected.id===ground.id,ground:1e6-ground.hp,air:[1e6-a.hp,1e6-b.hp],extras:projectiles.length};})()`);
  assert.equal(out.selected,true); assert.equal(out.ground,0); assert.equal(out.air[0],50); assert.equal(out.air[1],35); assert.equal(out.extras,0);
  assert.equal(run(`creeps.forEach(c=>c.air=false); testHit([...towers.values()][0],creeps[0]); pickTarget([...towers.values()][0],towerLiveStats([...towers.values()][0]))!==null && projectiles.length===0`),true);
});

test('Bola roots only on the third shot, caps at three, and never roots air or stuns', () => {
  const { value } = boot();
  const out=value(`(() => {const t=testTower('tech','Bola Rig');const group=[];
    for(let i=0;i<5;i++)group.push(testCreep(t.c+1+i*.1,t.r+.5));
    const air=testCreep(t.c+1.2,t.r+.5,{air:true});testHit(t,group[0]);testHit(t,group[0]);
    const before=group.filter(c=>c.rootUntil>simTime).length;testHit(t,group[0]);
    const after=group.filter(c=>c.rootUntil>simTime).length;
    t.bolaTick=2;testHit(t,group[3]);
    return {before,after,cap:group.filter(c=>c.rootUntil>simTime).length,air:air.rootUntil,
      stun:group.some(c=>c.stunUntil>simTime),duration:group[0].rootUntil-simTime};})()`);
  assert.deepEqual(out,{before:0,after:3,cap:3,air:0,stun:false,duration:1.25});
});

test('Bola root immunity survives a second rig; bosses receive a slow only', () => {
  const { value } = boot();
  const out=value(`(() => {const t=testTower('tech','Bola Rig'),c=testCreep(t.c+1,t.r+.5);t.bolaTick=2;testHit(t,c);
    const until=c.rootUntil;simTime=until+.01;const other={...t,key:t.key+1,bolaTick:2};testHit(other,c);
    const notExtended=c.rootUntil===until;simTime=until+.76;other.bolaTick=2;testHit(other,c);
    const rerooted=c.rootUntil>simTime;creeps.length=0;const boss=testCreep(t.c+1,t.r+.5,{boss:true});
    t.bolaTick=2;testHit(t,boss);return {notExtended,rerooted,bossRoot:boss.rootUntil,bossSlow:boss.slowPct};})()`);
  assert.deepEqual(out,{notExtended:true,rerooted:true,bossRoot:0,bossSlow:60});
});

test('Root stops movement but permits attacker swings and regeneration', () => {
  const { value } = boot();
  const out=value(`(() => {const t=testTower('tech','Bolt Platform');
    const c=testCreep(t.c+1,t.r+.5,{rootUntil:simTime+1,hp:900000,regen:.01,state:'attack',blockTargetKey:t.key,attackClock:0});
    const before=[c.x,c.y],hp=t.blockHp;moveAlong(c,{r:t.r,c:t.c+2},.1);updateCreep(c,.1);
    return {stationary:c.x===before[0]&&c.y===before[1],swung:t.blockHp<hp,regenerated:c.hp>900000};})()`);
  assert.deepEqual(out,{stationary:true,swung:true,regenerated:true});
});

test('Multishot behavior stays fixed at three full-damage, distinct-target shots', () => {
  const { value } = boot();
  assert.deepEqual(value(`(() => {const t=testTower('tech','Multishot');for(let i=0;i<5;i++)testCreep(t.c+1+i*.2,t.r+.5);
    updateTower(t,.01);const ids=new Set(projectiles.map(p=>p.target.id));const a={shots:projectiles.length,unique:ids.size,damage:projectiles.map(p=>p.stats.dmg)};
    projectiles.length=0;creeps.splice(1);t.cooldown=0;updateTower(t,.01);return [a,projectiles.length,towerLiveStats(t).shots];})()`),
    [{shots:3,unique:3,damage:[96,96,96]},1,3]);
});

test('all new code-native tower and projectile draw branches execute', () => {
  const { run, canvas } = boot();
  // A recording-less canvas checks draw API compatibility, not visual quality.
  run('globalThis.testCanvas = null');
  // Pass a host object directly; no browser evaluation or screenshot is involved.
  const draw = run('(ctx) => { for(const def of TOWERS.ninja) drawNinjaWeaponStructure(ctx,def); drawTechBolaStructure(ctx); for(const raceId of ["ninja","tech"]) for(const def of TOWERS[raceId]) { const t=testTower(raceId,def.name); drawTowerStructure(ctx,t,towerLiveStats(t),false,"#ffffff"); drawProjectile(ctx,{tower:t,stats:towerLiveStats(t),style:def.special,x:13,y:SOUTH_TOP+6,sx:12.5,sy:SOUTH_TOP+6.5,tx:14,ty:SOUTH_TOP+6.5,t:.1,dur:.45}); } return true; }');
  assert.equal(draw(canvas),true);
});

test('the first three ranks keep the agreed damage, range, and attacks/s bonuses', () => {
  const {run}=boot();
  assert.equal(run(`(() => {
    for(const race of ['tech','ninja','earth','crystal']) {
      const t=testTower(race,TOWERS[race][0].name),base=towerDef(race,0);
      grantTowerXp(t,[0,1,2].reduce((sum,r)=>sum+rankNeed(r,t),0));
      const live=towerLiveStats(t);
      if(t.level!==3 || !canLevel(t) || towerRankCost(t).gold!==0 || towerRankCost(t).lumber!==1)return false;
      if(Math.abs(live.dmg-base.dmg*1.3)>.001 || live.range!==base.range+1.5 || Math.abs(1/live.cd-(1/base.cd+.3))>1e-9)return false;
    } return true;
  })()`),true);
});

test('actual landed hits earn rank one at five hits with no gold or lumber', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    const t=testTower('ninja','Initiate'),c=testCreep(13, t.r+.5);
    player.gold=0;player.lumber=0;
    rng=()=>.5; // Exercise five single strikes; combo rank credit has separate coverage.
    for(let i=0;i<4;i++)testHit(t,c);
    const before=[towerTotalRank(t),t.rankBank];
    testHit(t,c);
    return {before,after:[towerTotalRank(t),t.rankBank,t.landedHits,player.gold,player.lumber]};
  })()`),{before:[0,4],after:[1,0,5,0,0]});
});

test('all ranks are earned freely from zero, carrying excess hits across ranks', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    const t=testTower('ninja','Initiate');player.gold=0;player.lumber=0;
    grantTowerXp(t,600);
    const first=[towerTotalRank(t),t.level,t.rank,t.rankBank];
    grantTowerXp(t,2401);
    const later=[towerTotalRank(t),t.rankBank];
    grantTowerXp(t,1e9);
    return {first,later,max:[towerTotalRank(t)>50,canLevel(t),player.gold,player.lumber,t.rankBank>0]};
  })()`),{first:[8,3,5,60],later:[14,336],max:[true,true,0,0,true]});
});

test('paid finishing uses gold only for ranks 1–3, then lumber, without inventing hits', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    const t=testTower('ninja','Initiate');player.gold=100;player.lumber=5;
    grantTowerXp(t,2);boostTowerRank(t);
    const first=[towerTotalRank(t),player.gold,player.lumber,t.landedHits,t.rankBoost,t.rankBank];
    boostTowerRank(t);boostTowerRank(t);
    const third=[towerTotalRank(t),player.gold,player.lumber];
    boostTowerRank(t);
    const fourth=[towerTotalRank(t),player.gold,player.lumber,t.landedHits];
    const before=[player.gold,player.lumber];grantTowerXp(t,1e6);
    return {first,third,fourth,free:[player.gold===before[0],player.lumber===before[1]]};
  })()`),{first:[1,90,5,2,3,0],third:[3,40,5],fourth:[4,40,4,2],free:[true,true]});
});

test('paid ranks reject other owners, construction and missing currency, but continue above 50', () => {
  const {run}=boot();
  assert.equal(run(`(() => {
    const t=testTower('tech','Bolt Platform');player.gold=999;player.lumber=99;
    t.allySeat=1;if(boostTowerRank(t))return false;delete t.allySeat;
    t.owner='enemy';if(boostTowerRank(t))return false;t.owner='player';
    t.buildUntil=simTime+5;if(boostTowerRank(t))return false;t.buildUntil=0;
    player.gold=0;if(boostTowerRank(t))return false;
    t.level=3;player.lumber=0;if(boostTowerRank(t))return false;
    t.rank=47;player.gold=999;player.lumber=99;
    return boostTowerRank(t) && towerTotalRank(t)===51 && player.gold===999 && player.lumber===93;
  })()`),true);
});

test('mixed rank batch spends each currency once and skips unaffordable towers', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    const low=testTower('ninja','Initiate');
    const high=makeTower(low.r,low.c+2,'tech',0,'player');high.buildUntil=0;high.level=3;addTower(high);
    const poor=makeTower(low.r,low.c+4,'ninja',0,'player');poor.buildUntil=0;poor.level=2;addTower(poor);
    selectedTowerKey=low.key;selectedGroupKeys=[low.key,high.key,poor.key];
    player.gold=10;player.lumber=1;towerAction('level');
    return [towerTotalRank(low),towerTotalRank(high),towerTotalRank(poor),player.gold,player.lumber];
  })()`),[1,4,2,0,0]);
});

test('tier and weapon changes preserve earned ranks and partial hit progress', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    const t=testTower('ice',TOWERS.ice[0].name);grantTowerXp(t,14);
    selectedTowerKey=t.key;selectedGroupKeys=[t.key];player.gold=10000;towerAction('tier');
    const tiered=[t.tier,towerTotalRank(t),t.rankBank,t.landedHits];
    const n=testTower('ninja','Initiate');grantTowerXp(n,14);
    selectedTowerKey=n.key;selectedGroupKeys=[n.key];towerAction('weapon:3');
    return [tiered,[n.tier,towerTotalRank(n),n.rankBank,n.landedHits]];
  })()`),[[1,1,9,14],[3,1,9,14]]);
});

test('splash starts five positions ahead on the agreed requirement sequence', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {const a=testTower('tech','Ballista'),b=testTower('ninja','Initiate');return [[0,1,2,3].map(r=>rankNeed(r,a)),[0,1,2,3].map(r=>rankNeed(r,b))];})()`),[[100,125,150,200],[5,10,25,50]]);
});

test('multishot credits each distinct enemy hit in its volley', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {const t=testTower('tech','Multishot');for(let i=0;i<3;i++)testCreep(t.c+1+i*.2,t.r+.5);updateTower(t,.1);const volley=projectiles.splice(0);volley.forEach(resolveProjectileHit);return [t.landedHits,t.rankBank,t.rank||0];})()`),[3,3,0]);
});

test('Crystal links cap at four, stay owner-isolated, and switch bonuses for free', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    const ts=[];for(let i=0;i<8;i++){const t=makeTower(SOUTH_TOP+6,8+i,'crystal',0,'player');t.buildUntil=0;towers.set(t.key,t);ts.push(t);}towersVersion++;
    const first=crystalFormation(ts[0]),last=crystalFormation(ts[7]);
    player.gold=987;player.lumber=9;batchAction([ts[0]],'crystal:speed');
    const live=towerLiveStats(ts[0]),base=towerDef('crystal',0);
    return {sizes:[first.members.length,last.members.length],separate:first!==last,
      synced:first.members.every(t=>t.crystalBonus==='speed'),speed:Math.abs(live.cd-base.cd/1.15)<1e-9,
      gold:player.gold,lumber:player.lumber,choices:Object.keys(CRYSTAL_BONUSES)};
  })()`),{sizes:[4,4],separate:true,synced:true,speed:true,gold:987,lumber:9,choices:['damage','speed','range']});
});

test('Crystal chaos deals 100% through armor and every armor class without armor reduction', () => {
  const {value,run}=boot();
  assert.deepEqual(value(`(() => {const t=testTower('crystal','Shardcaster');return ['unarmored','light','medium','heavy','fortified'].map(aClass=>{const c=testCreep(t.c+1,t.r+.5,{armor:100,aClass});applyDamage(c,100,t);return [1e6-c.hp,c.armor,c.armorShred];});})()`),Array(5).fill([100,100,0]));
  assert.equal(run(`!Object.hasOwn(CRYSTAL_BONUSES,'shred') && !batchPanelHtml([...towers.values()]).includes('crystal:shred')`),true);
});

test('Earth Fault Line hits only aligned ground enemies behind its primary target', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {const t=testTower('earth',TOWERS.earth[0].name);t.earthStyle='fault';rng=()=>1;
    const mark=testCreep(t.c+1.5,t.r+.5),behind=testCreep(t.c+2.5,t.r+.5),side=testCreep(t.c+2.5,t.r+2),air=testCreep(t.c+2.7,t.r+.5,{air:true}),rival=testCreep(t.c+2.5,t.r+.5,{half:ENEMY_HALF});
    const stats=towerLiveStats(t);earthImpact(t,stats,{sx:t.c+.5,sy:t.r+.5},mark);return [mark,behind,side,air,rival].map(c=>Math.round((1e6-c.hp)/stats.dmg*100));})()`),[0,35,0,0,0]);
});

test('Earth Tremor waits 0.6s and stays at the original ground impact point', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {const t=testTower('earth',TOWERS.earth[0].name);t.earthStyle='tremor';rng=()=>1;
    const mark=testCreep(t.c+1.5,t.r+.5),near=testCreep(t.c+2,t.r+.5),air=testCreep(t.c+2,t.r+.5,{air:true});testHit(t,mark);
    const p=projectiles.shift();const before=near.hp,airBefore=air.hp;updateProjectile(p,.59);const waiting=near.hp===before;
    mark.x+=10;updateProjectile(p,.02);return [p.dur,waiting,Math.round((before-near.hp)/towerLiveStats(t).dmg*100),airBefore-air.hp];})()`),[.6,true,25,0]);
});

test('Stone cannot acquire Earth abilities, and its three critical profiles work', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {const t=testTower('stone',TOWERS.stone[0].name);player.gold=9999;
    batchAction([t],'earth:fault');const noEarth=!t.earthStyle;
    const c=testCreep(t.c+1,t.r+.5);const base=towerLiveStats(t).dmg;
    const out=[];for(const style of ['frequent','heavy','steady']) {batchAction([t],'stone:'+style);rng=()=>0;c.hp=1e6;t.stoneStrikes=style==='steady'?3:0;testHit(t,c);out.push(Math.round((1e6-c.hp)/base*100));}
    return [noEarth,out];})()`),[true,[180,350,250]]);
});

test('Target Painter defaults to First, holds its mark, and supports Strongest selection', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {const t=testTower('tech','Bolt Platform');player.gold=999;selectedTowerKey=t.key;selectedGroupKeys=[t.key];towerAction('weapon:'+TOWERS.tech.findIndex(d=>d.special==='targetpainter'));
    const lead=testCreep(t.c+1,t.r+.5,{cpIndex:2,hp:10000}),strong=testCreep(t.c+2,t.r+.5,{cpIndex:1,hp:20000});
    updatePainter(t,towerLiveStats(t));const first=t.paintedId===lead.id;
    strong.cpIndex=3;updatePainter(t,towerLiveStats(t));const held=t.paintedId===lead.id;
    lead.x=1000;t.priority='strong';updatePainter(t,towerLiveStats(t));return [t.priority,first,held,t.paintedId===strong.id];})()`),['strong',true,true,true]);
});

function readyRoom(run) {
  run(`$('lives-select').options=[];mp.active=true;lobbyPhase=true;mp.role='host';mp.sid='host';mp.started=false;mp.lobbyReadyPlayers={};mp.lobbySeen={};mp.lobbyRevision=0;mp.lobbyFingerprint='';mp.peers={};
    roster={south:[{kind:'human',sid:'host',raceId:'tech'}],north:[{kind:'human',sid:'guest',raceId:'ninja'}]};
    ensureRoster=()=>roster;mpModeNow=()=> 'classic';startingLives=()=>100;renderLobby=()=>{};closeLobby=()=>{};log=()=>{};
    let testStarts=0,testMessages=[];startBattle=()=>testStarts++;mpSend=m=>testMessages.push(m);lobbyResetIfChanged();`);
}

test('lobby requires explicit ready checks from host and guest before host start', () => {
  const {run,value}=boot();readyRoom(run);
  assert.deepEqual(value(`(() => {mpHostStart();const unready=testStarts;lobbyToggleReady();mpHostStart();const one=testStarts;
    lobbyProtocol({t:'lobby-ready',sid:'guest',value:true,revision:mp.lobbyRevision});mpHostStart();
    return [unready,one,testStarts,testMessages.some(m=>m.t==='go' && m.readyPlayers.host && m.readyPlayers.guest)];})()`),[0,0,1,true]);
});

test('unready, a changed race, stale readiness, and disconnect all block start', () => {
  const {run,value}=boot();readyRoom(run);
  assert.deepEqual(value(`(() => {const ready=()=>{mp.lobbyReadyPlayers={host:true,guest:true};mp.lobbySeen.guest=Date.now();};
    ready();lobbyProtocol({t:'lobby-ready',sid:'guest',value:false,revision:mp.lobbyRevision});const unready=!lobbyAllReady();
    ready();roster.north[0].raceId='stone';const rev=mp.lobbyRevision;mpHostStart();const changed=testStarts===0 && mp.lobbyRevision>rev;
    lobbyProtocol({t:'lobby-ready',sid:'guest',value:true,revision:rev});const stale=!mp.lobbyReadyPlayers.guest;
    ready();mp.lobbySeen.guest=Date.now()-31000;mpHostStart();return [unready,changed,stale,testStarts===0];})()`),[true,true,true,true]);
});

test('guest ignores a go packet without its own readiness or from another host', () => {
  const {run,value}=boot();readyRoom(run);
  assert.deepEqual(value(`(() => {mp.role='guest';mp.sid='guest';mp.hostSid='host';const go={t:'go',sid:'host',readyRevision:mp.lobbyRevision,readyPlayers:{host:true,guest:true},roster};
    mpOnMessage(go);const noConsent=testStarts===0;mp.lobbyReadyPlayers={host:true,guest:true};mpOnMessage({...go,sid:'intruder'});return [noConsent,testStarts===0];})()`),[true,true]);
});

test('formation links do not cross owner boundaries; damage/range options are exclusive', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {const a=makeTower(SOUTH_TOP+6,10,'crystal',0,'player'),b=makeTower(SOUTH_TOP+6,11,'crystal',0,'player'),foe=makeTower(SOUTH_TOP+6,12,'crystal',0,'ally');[a,b,foe].forEach(t=>{t.buildUntil=0;towers.set(t.key,t);});towersVersion++;
    batchAction([a],'crystal:damage');const d=towerLiveStats(a);batchAction([a],'crystal:range');const r=towerLiveStats(a),base=towerDef('crystal',0);
    return [crystalFormation(a).members.length,crystalFormation(foe).members.length,d.dmg===base.dmg*1.15,r.dmg===base.dmg,r.range===base.range+1,!Object.keys(CRYSTAL_BONUSES).includes('shred')];})()`),[2,1,true,true,true,true]);
});

test('Mace armor reduction refreshes without permanent accumulation and expires after 4s', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {const t=testTower('ninja','Mace Master'),c=testCreep(t.c+1,t.r+.5,{armor:10});
    for(let i=0;i<3;i++){fireNinjaPulse(t,towerLiveStats(t));updateProjectile(projectiles.pop(),.46);}
    return [c.armorShred,c.maceArmorShred,c.maceArmorShredUntil-simTime,c.armor];})()`),[0,3,4,10]);
});

test('veteran damage uses rank-three baseline and total-rank fifth milestones', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {const t=testTower('ninja','Initiate');t.level=3;t.rank=1;const one=towerLiveStats(t).dmg;t.rank=5;return [one,towerLiveStats(t).dmg];})()`),[10.608,11.96]);
});

test('rendered mixed send panel never restarts lower shrine tiers at the attacker section', () => {
  const {run,value,elements}=boot();
  run('player.shrine=5;renderSendPanel();');
  const markup=elements.get('send-list').innerHTML;
  const ids=[...markup.matchAll(/data-send="([^"]+)"/g)].map(m=>m[1]);
  const defs=new Map(value('SENDS').map(s=>[s.id,s]));
  assert.equal(ids.length,defs.size);
  for(let i=1;i<ids.length;i++) {
    const a=defs.get(ids[i-1]),b=defs.get(ids[i]);
    assert.ok(a.shrine<=b.shrine,`${a.name} (L${a.shrine}) before ${b.name} (L${b.shrine})`);
  }
  assert.deepEqual([...markup.matchAll(/data-send-shrine="(\d+)"/g)].map(m=>Number(m[1])),[1,2,3,4,5,6,7,8]);
  assert.equal(ids[0],'miner');
});

test('rendered Sends, Attackers and Flying tabs have matching ordered shrine dividers', () => {
  const {run,value,elements}=boot();
  const defs=new Map(value('SENDS').map(s=>[s.id,s]));
  for(const tab of ['sends','attackers','flying']) {
    run(`desktopSendTab='${tab}';tacticalDockKey='';renderTacticalDock();`);
    const markup=elements.get('desktop-send-list').innerHTML;
    const ids=[...markup.matchAll(/data-dock-send="([^"]+)"/g)].map(m=>m[1]);
    assert.ok(ids.length>0);
    const tiers=ids.map(id=>defs.get(id).shrine);
    assert.deepEqual(tiers,[...tiers].sort((a,b)=>a-b));
    assert.deepEqual([...markup.matchAll(/data-send-shrine="(\d+)"/g)].map(m=>Number(m[1])),[...new Set(tiers)]);
    assert.ok(markup.includes('PAYBACK'));
  }
});

test('numeric send shortcut selects the first displayed quick-send card', () => {
  const {run,elements,documentEvents}=boot();
  run(`player.shrine=1;player.gold=9999;player.lumber=10;quickSendKey='';renderQuickSend();
    globalThis.sentSelector='';document.querySelector=selector=>({click:()=>{sentSelector=selector;}});`);
  const first=/data-qsend="([^"]+)"/.exec(elements.get('quick-send').innerHTML)[1];
  assert.equal(first,'miner');
  for(const callback of documentEvents.get('keydown')||[])callback({key:'1',target:{tagName:'BODY'},preventDefault:()=>{},stopPropagation:()=>{}});
  assert.equal(run('sentSelector'),`[data-send="${first}"]`);
});

test('all send menus sort each Shrine by highest income return, including lumber ROI', () => {
  const {run,value,elements}=boot();
  const defs=new Map(value('SENDS').map(s=>[s.id,s]));
  const roi=s=>s.cost ? s.income/(s.cost+(s.lumber || 0)*500) : s.woodIncome/s.lumber;
  const verify=ids=>{
    for(let i=1;i<ids.length;i++){
      const a=defs.get(ids[i-1]),b=defs.get(ids[i]);
      assert.ok(a.shrine<b.shrine || a.shrine===b.shrine && roi(a)+1e-12>=roi(b),`${a.name} before ${b.name}`);
    }
  };
  run('player.shrine=5;renderSendPanel();renderQuickSend();');
  verify([...elements.get('send-list').innerHTML.matchAll(/data-send="([^"]+)"/g)].map(m=>m[1]));
  verify([...elements.get('quick-send').innerHTML.matchAll(/data-qsend="([^"]+)"/g)].map(m=>m[1]));
  verify([...run("railBody('send')").matchAll(/data-rail-send="([^"]+)"/g)].map(m=>m[1]));
  for(const tab of ['sends','attackers','flying']){
    run(`desktopSendTab='${tab}';tacticalDockKey='';renderTacticalDock();`);
    const markup=elements.get('desktop-send-list').innerHTML;
    verify([...markup.matchAll(/data-dock-send="([^"]+)"/g)].map(m=>m[1]));
    assert.match(markup,/ROI \d+\.\d+% \/ cycle/);
  }
  assert.equal(run("sendRoiLabel(SENDS.find(s=>s.id==='miner'))"),'25.00% / cycle');
  assert.equal(run("sendRoiLabel(SENDS.find(s=>s.id==='ruiner'))"),'3.20% / cycle');
});

test('Shrine headings collapse only their own tab and preserve send command buttons', () => {
  const {run,elements,documentEvents}=boot();
  run("desktopSendTab='sends';renderTacticalDock();");
  const click=key=>{
    const heading={dataset:{sendTierToggle:key}};
    const event={target:{closest:selector=>selector==='[data-send-tier-toggle]'?heading:null}};
    for(const callback of documentEvents.get('click')||[])callback(event);
  };
  click('sends:1');
  let markup=elements.get('desktop-send-list').innerHTML;
  assert.match(markup,/data-send-tier-toggle="sends:1" aria-expanded="false"/);
  assert.match(markup,/<button hidden class="dock-send-card/);
  assert.match(markup,/data-dock-send="miner"/);
  run("desktopSendTab='flying';tacticalDockKey='';renderTacticalDock();");
  assert.doesNotMatch(elements.get('desktop-send-list').innerHTML,/<button hidden/);
  run("desktopSendTab='sends';tacticalDockKey='';renderTacticalDock();");
  click('sends:1');
  markup=elements.get('desktop-send-list').innerHTML;
  assert.doesNotMatch(markup,/<button hidden/);
});

test('every Classic Wars computer sends from its own purse while wave remains zero', () => {
  const {run,value}=boot();
  assert.deepEqual(value(`(() => {
    roster=newRoster(3);resetMatchState();matchMode='classic';wave=0;simTime=30;battleRunning=true;
    const original=player.gold;
    const bots=[{ai:enemy,half:ENEMY_HALF},...allies.map(ai=>({ai,half:ai.half}))];
    return bots.map(({ai,half})=>{
      Object.assign(ai,{gold:500,buildClock:100,upgradeClock:100,sendClock:0});
      const before=creeps.length;updateComputer(ai,half,.01);
      const sent=creeps.slice(before),purchases=ai.sendStats.purchases;
      return [ai.income>0,ai.gold<500,sent.length===purchases*2,sent.every(c=>c.half!==half),player.gold===original];
    });
  })()`),Array.from({length:5},()=>[true,true,true,true,true]));
});

test('wave computers start sending at wave one and keep sending while saving for Shrine', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    const ai=makeAlly(PLAYER_HALF,1,'earth',2);matchMode='wars';simTime=120;wave=0;
    Object.assign(ai,{gold:500,buildClock:100,upgradeClock:100,sendClock:0});
    updateAlly(ai,.01);const before=creeps.length;
    wave=14;ai.sendClock=0;updateAlly(ai,.01);
    return [before===0,ai.shrine===1,ai.income>0,creeps.length>0,ai.gold>=0];
  })()`),[true,true,true,true,true]);
});

test('large purses send higher Shrine bodies, flying units, and real multi-body swarms', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    matchMode='classic';simTime=400;
    const ai=makeAlly(PLAYER_HALF,1,'tech',2);
    Object.assign(ai,{gold:50000,income:0,shrine:4,towersBuilt:20,buildClock:100,upgradeClock:100,sendClock:0});
    updateAlly(ai,.01);
    const high=creeps.some(c=>c.name==='Bastion');
    ai.gold+=20000;ai.sendClock=0;updateAlly(ai,.01);
    const air=creeps.some(c=>c.air),before=creeps.length;
    const swarm=makeAlly(PLAYER_HALF,1,'tech',2);
    Object.assign(swarm,{gold:4200,shrine:4,economyGold:4200,budgetGold:4200});
    aiBuySend(swarm,PLAYER_HALF,SENDS.find(s=>s.id==='hornetflight'),'economy');
    return [high,air,ai.sendStats.highestShrine===4,creeps.length-before===10,ai.gold<70000,ai.income>0];
  })()`),[true,true,true,true,true,true]);
});

test('AI attackers charge lumber and gold conversions, bank fractional wood income', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    const ai=makeAlly(PLAYER_HALF,1,'earth',2),s=SENDS.find(s=>s.id==='sapper');
    Object.assign(ai,{gold:4999,shrine:2,pressureGold:4999,budgetGold:4999});
    const poor=aiBuySend(ai,PLAYER_HALF,s,'pressure');
    ai.gold++;ai.pressureGold++;ai.budgetGold++;
    const bought=aiBuySend(ai,PLAYER_HALF,s,'pressure');
    const paid=[ai.gold,ai.lumber,ai.income,ai.woodIncome,ai.sendStats.gold,ai.sendStats.lumber];
    for(let i=0;i<5;i++)payWoodIncome(ai);
    return [poor,bought,paid,ai.lumber,ai.woodBank,creeps.length];
  })()`),[false,true,[0,0,0,.2,5000,10],1,0,2]);
});

test('computer upgrades cannot spend another seat gold or alter its towers', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    const ally=makeAlly(ENEMY_HALF,1,'tech',2);
    const t=makeTower(3,12,'tech',0,'enemy');t.buildUntil=0;t.allyHalf=ENEMY_HALF;t.allySeat=1;addTower(t);
    Object.assign(enemy,{gold:1000,raceId:'tech'});syncAiBudget(enemy);
    const own=aiUpgradeTower(enemy,ENEMY_HALF,5);
    Object.assign(ally,{gold:1000});syncAiBudget(ally);
    const theirs=aiUpgradeTower(ally,ENEMY_HALF,5);
    return [own,theirs,enemy.gold,t.tier,ally.gold<1000,t.blockMaxHp===towerMaxHp(towerDef(t.raceId,t.tier),t.tier,0)];
  })()`),[false,true,1000,1,true,true]);
});

test('Tech computers fit a weapon mix with one Painter, and Ninja can use all seven weapons', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    const make=(race)=>{
      towers.clear();const ai=makeAlly(PLAYER_HALF,1,race,2);
      Object.assign(ai,{gold:10000,towersBuilt:7});syncAiBudget(ai);
      for(let i=0;i<7;i++){
        const t=makeTower(SOUTH_TOP+6,10+i,race,0,'player');
        t.buildUntil=0;t.allyHalf=PLAYER_HALF;t.allySeat=1;t.aiBuildOrder=i;addTower(t);
      }
      return ai;
    };
    const tech=make('tech');for(let i=0;i<7;i++)aiUpgradeTower(tech,PLAYER_HALF,5);
    const techNames=[...towers.values()].map(t=>towerDef(t.raceId,t.tier).name);
    const gold=tech.gold;
    const ninja=make('ninja');for(let i=0;i<7;i++)aiUpgradeTower(ninja,PLAYER_HALF,5);
    return [techNames,gold,[...towers.values()].map(t=>t.tier)];
  })()`),[['Ballista','Multishot','Bola Rig','Siege Tank','Ballista','Multishot','Target Painter'],9265,[7,1,2,3,4,5,6]]);
});

test('computers rebuild destroyed spiral cells even after their placement queue is finished', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    matchMode='classic';simTime=30;
    const ai=makeAlly(PLAYER_HALF,1,'tech',2);
    Object.assign(ai,{gold:10000,buildClock:0,sendClock:1e9,upgradeClock:1e9});
    updateAlly(ai,.01);
    const key=[...towers.keys()][0],before=ai.gold;
    removeTower(key);ai.spotIndex=ai.spots.length;ai.buildClock=0;simTime+=2;
    updateAlly(ai,.01);
    return [towers.has(key),before-ai.gold,ai.repairs,ai.towersBuilt,routesAreOpen()];
  })()`),[true,15,1,1,true]);
});

test('rank controls show natural progress and use lumber after rank three on desktop and phone', () => {
  const {run,elements}=boot();
  run(`const t=testTower('ninja','Initiate');selectedTowerKey=t.key;selectedGroupKeys=[t.key];
    player.gold=100;player.lumber=10;grantTowerXp(t,4);renderTowerDetails();`);
  assert.match(elements.get('tower-details').innerHTML,/Finish rank 1 • 10g/);
  assert.match(run('renderWispInspect()'),/4 \/ 5 toward rank 1/);
  run('grantTowerXp(t,36);renderTowerDetails();');
  assert.match(elements.get('tower-details').innerHTML,/Finish rank 4 • 1🪵/);
  assert.match(run('renderWispInspect()'),/Finish rank 1🪵/);
  assert.doesNotMatch(run('batchPanelHtml([t])'),/unlock|buy 3 gold/i);
});

test('send hit points stay fixed with time; higher Shrines supply the stronger units', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    const s=SENDS.find(s=>s.id==='miner'),t=SENDS.find(s=>s.id==='titan');
    simTime=0;const early=sendCreepDef(s).hp;simTime=5000;
    return [sendCreepDef(s).hp===early,sendCreepDef(t).hp>early,sendGrowth()];
  })()`),[true,true,1]);
});

test('four actual failed Miners redirect gold, stop further Miner buys, and request an earlier Shrine', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    matchMode='classic';simTime=60;
    const ai=makeAlly(PLAYER_HALF,1,'tech',2),miner=SENDS.find(s=>s.id==='miner');
    Object.assign(ai,{gold:10000,economyGold:200,pressureGold:0,budgetGold:10000,towersBuilt:6});
    syncAiBudget(ai);
    aiBuySend(ai,PLAYER_HALF,miner,'economy');aiBuySend(ai,PLAYER_HALF,miner,'economy');
    const pending=aiAttackPlan(ai).blocked;
    for(const c of creeps){applyDamage(c,1e9,null,true);recordAiSendOutcome(c,'killed');}
    syncAiBudget(ai);const shifted=ai.pressureGold;
    aiSendEconomy(ai,PLAYER_HALF);
    const before=ai.gold;ai.pressureGold=500;aiAdvanceShrine(ai);
    return [pending,ai.attackResults.byId.miner.killed,aiFailedSend(ai,'miner'),
      ai.attackPlan.mode,ai.attackPlan.pressureShare,shifted,ai.sendStats.byId.miner,
      ai.shrine,before-ai.gold,ai.lumber];
  })()`),[false,4,true,'breakthrough',.60,120,2,2,500,0]);
});

test('strong air counters are saved for and released as a paid burst against ground-only defenses', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    matchMode='classic';simTime=100;
    const ai=makeAlly(PLAYER_HALF,1,'tech',2),miner=SENDS.find(s=>s.id==='miner');
    Object.assign(ai,{gold:3000,economyGold:0,pressureGold:1599,budgetGold:3000,towersBuilt:6,shrine:2});
    for(let i=0;i<4;i++)addAiSendResult(ai,miner,'killed');
    const t=makeTower(NORTH_TOP+6,12,'earth',4,'enemy');t.buildUntil=0;addTower(t);
    ai.attackPlan=aiAttackPlan(ai);aiSendPressure(ai,PLAYER_HALF);
    const saved=[creeps.length,ai.preparingAttack.id,ai.preparingAttack.packs,ai.preparingAttack.cost,ai.gold];
    ai.gold++;ai.pressureGold++;ai.budgetGold++;aiSendPressure(ai,PLAYER_HALF);
    return [saved,[creeps.length,creeps.every(c=>c.air&&c.name==='Elder Drake'),ai.gold,ai.pressureGold,ai.income]];
  })()`),[[0,'matureddragon',2,1600,3000],[4,true,1401,0,180]]);
});

test('armor counters replace failed Miners against a Tech defense', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    matchMode='classic';simTime=100;
    const ai=makeAlly(PLAYER_HALF,1,'tech',2),miner=SENDS.find(s=>s.id==='miner');
    Object.assign(ai,{gold:4000,economyGold:0,pressureGold:2900,budgetGold:4000,towersBuilt:6,shrine:2});
    for(let i=0;i<4;i++)addAiSendResult(ai,miner,'killed');
    const t=makeTower(NORTH_TOP+6,12,'tech',0,'enemy');t.buildUntil=0;addTower(t);
    ai.attackPlan=aiAttackPlan(ai);aiSendPressure(ai,PLAYER_HALF);
    return [creeps.length,creeps.every(c=>c.aClass==='fortified'&&c.name==='Ram Hulk'),ai.gold,ai.income,ai.sendStats.byId.miner || 0];
  })()`),[4,true,1100,330,0]);
});

test('a counter survives the damage that stopped a Miner and its leak reduces real enemy lives once', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    matchMode='classic';simTime=100;enemy.lives=100;
    const ai=makeAlly(PLAYER_HALF,1,'tech',2),miner=SENDS.find(s=>s.id==='miner');
    Object.assign(ai,{gold:5000,economyGold:100,pressureGold:2900,budgetGold:5000,towersBuilt:6,shrine:2});
    const t=makeTower(NORTH_TOP+6,12,'tech',0,'enemy');t.buildUntil=0;addTower(t);
    aiBuySend(ai,PLAYER_HALF,miner,'economy');aiBuySend(ai,PLAYER_HALF,miner,'economy');
    const damage=creeps[0].maxHp*2;
    creeps.slice().forEach(c=>applyDamage(c,damage,t));
    syncAiBudget(ai);aiSendPressure(ai,PLAYER_HALF);
    const counter=creeps.find(c=>c.hp>0),before=enemy.lives;
    applyDamage(counter,damage,t);const survived=counter.hp>0;
    resolveLeak(counter);resolveLeak(counter);
    return [ai.attackResults.byId.miner.killed,survived,before-enemy.lives,
      ai.attackResults.lives,ai.attackResults.byId.ramhulk.leaked,aiAttackPlan(ai).blocked];
  })()`),[4,true,1,1,1,false]);
});

test('living sends are not counted as failures, and successful pressure does not prematurely rush Shrine', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    matchMode='classic';simTime=60;enemy.lives=100;
    const ai=makeAlly(PLAYER_HALF,1,'tech',2),miner=SENDS.find(s=>s.id==='miner');
    Object.assign(ai,{gold:1000,economyGold:200,pressureGold:0,budgetGold:1000,towersBuilt:6});
    for(let n=0;n<4;n++)aiBuySend(ai,PLAYER_HALF,miner,'economy');
    simTime=100;const pending=aiAttackPlan(ai);
    resolveLeak(creeps[0]);const live=aiAttackPlan(ai);
    return [pending.blocked,pending.shrine,ai.attackResults.byId.miner.killed,
      live.mode,live.shrine,aiFailedSend(ai,'miner')];
  })()`),[false,1,0,'pressure',1,false]);
});

test('low opponent lives shift the computer toward a finishing burst', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    matchMode='classic';simTime=100;enemy.lives=100;
    const ai=makeAlly(PLAYER_HALF,1,'tech',2);
    Object.assign(ai,{gold:1000,economyGold:200,pressureGold:0,budgetGold:1000,towersBuilt:6});
    syncAiBudget(ai);enemy.lives=20;syncAiBudget(ai);
    return [ai.attackPlan.mode,ai.attackPlan.burst,ai.attackPlan.pressureShare,ai.attackPlan.economyShare,ai.pressureGold,ai.gold];
  })()`),['finish',3,.75,.05,150,1000]);
});

test('a long stalemate saves for an attainable counter instead of waiting forever for Shrine 5', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    matchMode='classic';simTime=1000;enemy.lives=100;
    const ai=makeAlly(PLAYER_HALF,1,'tech',2);
    Object.assign(ai,{gold:6000,income:400,shrine:5,economyGold:0,pressureGold:3000,budgetGold:6000,
      towersBuilt:6,firstAttackAt:0,sendStats:{purchases:10,gold:0,lumber:0,income:0,byId:{}}});
    ai.attackPlan=aiAttackPlan(ai);aiSendPressure(ai,PLAYER_HALF);
    const preparing=ai.preparingAttack.cost<5000 && creeps.length===0;
    allies=[ai];payIncome();syncAiBudget(ai);aiSendPressure(ai,PLAYER_HALF);
    return [ai.attackPlan.blocked,preparing,creeps.length>0,ai.sendStats.highestShrine>1,ai.gold<6000,
      creeps.every(c=>c.name!=='Miner' && c.name!=='Pathfinder')];
  })()`),[true,true,true,true,true,true]);
});

test('every computer, on both teams, reacts to its own failed sends', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    roster=newRoster(3);resetMatchState();matchMode='classic';simTime=100;battleRunning=true;
    return [enemy,...allies].map(ai=>{
      const half=ai===enemy?ENEMY_HALF:ai.half;
      Object.assign(ai,{gold:1000,economyGold:200,pressureGold:0,budgetGold:1000,towersBuilt:6});
      for(let n=0;n<2;n++)aiBuySend(ai,half,SENDS.find(s=>s.id==='miner'),'economy');
      creeps.filter(c=>c.hp>0).forEach(c=>applyDamage(c,1e9,null,true));
      syncAiBudget(ai);
      return [ai.attackPlan.blocked,ai.attackResults.byId.miner.killed,ai.attackPlan.pressureShare];
    });
  })()`),Array.from({length:5},()=>[true,4,.6]));
});

test('remote computer send results require the defending peer and reject duplicate outcomes', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    document.getElementById('lives-select').value='100';
    roster=newRoster(1);Object.assign(roster.north[0],{kind:'human',sid:'guest'});
    Object.assign(mp,{active:true,sid:'host',team:PLAYER_HALF,seat:0,peers:{},seatLives:{},seatLeaks:{},myLeaks:0});
    const messages=[];mpSend=msg=>messages.push(msg);
    const ai=makeAlly(PLAYER_HALF,1,'tech',2);
    Object.assign(ai,{gold:100,economyGold:100,budgetGold:100});
    aiBuySend(ai,PLAYER_HALF,SENDS.find(s=>s.id==='miner'),'economy');
    const attack=messages[0].aiAttack;
    const result={t:'ai-send-result',to:'host',attack,result:1,outcome:'killed'};
    mpOnMessage({...result,sid:'intruder'});const ignored=!ai.attackResults;
    mpOnMessage({...result,sid:'guest'});mpOnMessage({...result,sid:'guest'});
    mpOnMessage({...result,sid:'guest',result:2,outcome:'leaked'});
    return [ignored,ai.attackResults.byId.miner.killed,ai.attackResults.byId.miner.leaked,
      ai.attackResults.lives,aiRemoteAttacks.size,creeps.length,ai.gold];
  })()`),[true,1,1,1,0,0,80]);
});

test('the defending multiplayer client reports AI send kills and leaks back to their sender', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    document.getElementById('lives-select').value='100';
    roster=newRoster(2);Object.assign(roster.south[0],{kind:'human',sid:'host'});
    Object.assign(roster.north[0],{kind:'human',sid:'guest'});
    Object.assign(mp,{active:true,sid:'guest',hostSid:'host',role:'guest',team:ENEMY_HALF,seat:0,peers:{},seatLives:{},seatLeaks:{},myLeaks:0});
    const messages=[];mpSend=msg=>messages.push(msg);
    mpOnMessage({t:'send',sid:'host',id:'miner',target:'north:0',sourceSeat:'south:1',aiAttack:'host:1'});
    applyDamage(creeps[0],1e9,null,true);resolveLeak(creeps[1]);
    const results=messages.filter(m=>m.t==='ai-send-result');
    return [results.map(m=>m.outcome),results.every(m=>m.to==='host'&&m.attack==='host:1'),mp.myLeaks];
  })()`),[['killed','leaked'],true,1]);
});

test('controlled combat stops four Miners, then an adaptive counter burst wins real lives through movement and fire', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    matchMode='classic';simTime=60;enemy.lives=100;player.lives=100;refreshRouteDebug=()=>{};
    const ai=makeAlly(PLAYER_HALF,1,'tech',2);
    Object.assign(ai,{gold:5000,economyGold:200,pressureGold:3400,budgetGold:5000,towersBuilt:6});
    const wall=referenceSpiralWall(sharedFlagCell(ENEMY_HALF),ENEMY_HALF,seatZone(ENEMY_HALF,0,1)).cells;
    for(const p of wall.slice(0,6)){
      const t=makeTower(p.r,p.c,'tech',0,'enemy');t.buildUntil=0;addTower(t);
    }
    function fight(){
      let ticks=0;
      while(creeps.some(c=>c.hp>0) && ticks++<2000){
        simTime+=.25;
        creeps.filter(c=>c.hp>0).forEach(c=>updateCreep(c,.25));
        towers.forEach(t=>updateTower(t,.25));
        for(let i=projectiles.length-1;i>=0;i--)if(!updateProjectile(projectiles[i],.25))projectiles.splice(i,1);
      }
      return creeps.every(c=>c.hp<=0);
    }
    for(let n=0;n<2;n++)aiBuySend(ai,PLAYER_HALF,SENDS.find(s=>s.id==='miner'),'economy');
    const first=fight(),miners=ai.attackResults.byId.miner;
    syncAiBudget(ai);aiAdvanceShrine(ai);aiSendPressure(ai,PLAYER_HALF);
    const counter=creeps.filter(c=>c.hp>0),before=enemy.lives,second=fight();
    return [first,miners.killed,miners.leaked,ai.shrine,counter.length,counter.every(c=>c.name==='Ram Hulk'),
      second,before-enemy.lives>0,ai.attackResults.byId.ramhulk.leaked>0,ai.gold];
  })()`),[true,4,0,2,4,true,true,true,true,1560]);
});

test('lumber attackers that damage the maze are recorded as useful even when killed', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    const ai=makeAlly(PLAYER_HALF,1,'earth',2);
    Object.assign(ai,{gold:15000,pressureGold:10000,budgetGold:15000,shrine:2});
    const t=makeTower(NORTH_TOP+6,12,'tech',0,'enemy');t.buildUntil=0;t.blockHp=t.blockMaxHp=1e6;addTower(t);
    for(let n=0;n<2;n++)aiBuySend(ai,PLAYER_HALF,SENDS.find(s=>s.id==='sapper'),'pressure');
    for(const c of creeps){
      Object.assign(c,{x:t.c+.5,y:t.r+.5,state:'attack',blockTargetKey:t.key,attackClock:0});
      updateCreep(c,.01);applyDamage(c,1e9,null,true);
    }
    const result=ai.attackResults.byId.sapper;
    return [result.killed,result.leaked,result.towerDamage>0,aiFailedSend(ai,'sapper'),ai.gold];
  })()`),[4,0,true,false,5000]);
});

test('a fully defended Shrine-5 ladder still receives strong counter bursts instead of AI silence', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    matchMode='classic';simTime=1000;enemy.lives=100;
    const ai=makeAlly(PLAYER_HALF,1,'tech',2);
    Object.assign(ai,{gold:50000,economyGold:0,pressureGold:40000,budgetGold:50000,towersBuilt:6,shrine:5});
    for(const send of SENDS.filter(s=>!s.attacker))for(let n=0;n<4;n++)addAiSendResult(ai,send,'killed');
    syncAiBudget(ai);aiSendEconomy(ai,PLAYER_HALF);aiSendPressure(ai,PLAYER_HALF);
    return [ai.attackPlan.mode,creeps.length,creeps.every(c=>c.name==='World Titan'),
      ai.gold,ai.sendStats.highestShrine,ai.income];
  })()`),['breakthrough',4,true,20000,5,3200]);
});

test('full teams compound income, advance Shrines, and keep building through 20 minutes', t => {
  const {run,value}=boot();run("document.getElementById('ai-select').value='normal';");
  run(`roster=newRoster(3);roster.south[1].raceId='earth';roster.south[2].raceId='stone';
    roster.north[1].raceId='ninja';roster.north[2].raceId='tech';resetMatchState();
    matchMode='classic';wave=0;simTime=0;battleRunning=true;matchOver=false;refreshRouteDebug=()=>{};
    enemy.raceId='tech';enemy.spots=rivalSpots('tech','centre','centre');
    globalThis.auditBots=[enemy,...allies];
    auditBots.forEach(ai=>{ai.earnedGold=ai.gold;ai.sendClock=0;});`);
  let opening;
  for(let minute=0;minute<20;minute++){
    run(`for(let second=0;second<60;second++){
      simTime++;
      if(simTime%15===0){
        auditBots.forEach(ai=>{ai.earnedGold+=BASE_INCOME+incomePayout(ai.income);});payIncome();
      }
      updateEnemyAI(1);allies.forEach(ai=>updateAlly(ai,1));
      for(const ai of auditBots){
        if(ai.gold<0 || ai.economyGold+ai.pressureGold>ai.gold+1e-6)throw Error('AI budget overspent');
        if(Math.abs(ai.gold+(ai.goldSpent || 0)-ai.earnedGold)>1e-5)throw Error('AI gold accounting mismatch');
      }
      creeps.length=0;
    }`);
    if(minute===4)opening=value('auditBots.map(ai=>({towers:ai.towersBuilt,investment:[...towers.values()].filter(t=>aiOwnsTower(ai,ai===enemy?ENEMY_HALF:ai.half,t)).reduce((sum,t)=>sum+t.invested,0)}))');
  }
  const report=value(`auditBots.map(ai=>({seat:ai===enemy?'rival':ai.half+':'+ai.seat,
    towers:ai.towersBuilt,income:ai.income,gold:Math.round(ai.gold),shrine:ai.shrine,
    sendTier:ai.sendStats.highestShrine,sends:ai.sendStats.purchases,types:Object.keys(ai.sendStats.byId).length,
    investment:[...towers.values()].filter(t=>aiOwnsTower(ai,ai===enemy?ENEMY_HALF:ai.half,t)).reduce((sum,t)=>sum+t.invested,0)}))`);
  t.diagnostic(JSON.stringify(report));
  for(const [i,row] of report.entries()){
    assert.ok(row.towers>=22 && row.towers>=opening[i].towers,`${row.seat} failed to maintain its spiral`);
    assert.ok(row.towers>opening[i].towers || row.investment>opening[i].investment,`${row.seat} stopped building and upgrading`);
    assert.ok(row.income>500 && row.sends>30,`${row.seat} economy stalled`);
    assert.ok(row.shrine>=5,`${row.seat} Shrine stalled`);
    assert.ok(row.sendTier>=4 && row.types>=8,`${row.seat} send choices stalled`);
  }
  assert.equal(run('routesAreOpen()'),true);
  assert.equal(run('player.gold'),run('START_GOLD+BASE_INCOME*80'));
});

test('reference spiral traces the photographed square hook and mirrors between halves', () => {
  const {value}=boot();
  const offsets=value(`(() => {
    const mark=sharedFlagCell(PLAYER_HALF),zone=seatZone(PLAYER_HALF,0,1);
    return referenceSpiralWall(mark,PLAYER_HALF,zone).cells.slice(0,22).map(c=>[c.r-mark.r,c.c-mark.c]);
  })()`);
  assert.deepEqual(offsets,[[0,-1],[-1,-1],[-1,0],[-1,1],[0,1],[1,1],[2,1],
    [2,0],[2,-1],[2,-2],[2,-3],[1,-3],[0,-3],[-1,-3],[-2,-3],[-3,-3],
    [-3,-2],[-3,-1],[-3,0],[-3,1],[-3,2],[-3,3]]);
  assert.deepEqual(value('spiralMazeSpots(ENEMY_HALF)'),
    value('spiralMazeSpots(PLAYER_HALF).map(c=>({r:ROWS-1-c.r,c:c.c}))'));
});

test('every computer seat receives a complete spiral sequence inside its own zone', () => {
  const {run}=boot();
  assert.equal(run(`(() => {
    for(const n of [1,2,3]) {
      roster=newRoster(n);
      for(const half of [PLAYER_HALF,ENEMY_HALF]) {
        const occupied=new Set();
        for(let seat=0;seat<n;seat++) {
          const bot=makeAlly(half,seat,'tech',n),zone=bot.zone;
          const anchors=[sharedFlagCell(half),...laneFlagCells(half)].filter(c=>c.c>=zone.c0&&c.c<=zone.c1);
          const wall=referenceSpiralWall(anchors[0],half,zone).cells;
          if(wall.length<22 || JSON.stringify(bot.spots.slice(0,wall.length))!==JSON.stringify(wall)) return false;
          const seen=new Set();
          for(const c of bot.spots) {
            const key=idx(c.r,c.c);
            if(seen.has(key)||occupied.has(key)||c.c<zone.c0||c.c>zone.c1||!isBuildableCell(c.r,c.c,half)) return false;
            seen.add(key);occupied.add(key);
          }
        }
      }
      const rival=rivalSpots('tech','learned','sides');
      const equivalent=makeAlly(ENEMY_HALF,0,'tech',n);
      if(JSON.stringify(rival)!==JSON.stringify(equivalent.spots)) return false;
    }
    return true;
  })()`),true);
});

test('spiral purchases keep both paths open throughout solo and full computer teams', () => {
  const {run}=boot();
  assert.equal(run(`(() => {
    refreshRouteDebug=()=>{};
    for(const n of [1,3]) {
      roster=newRoster(n);resetMatchState();matchMode='classic';wave=0;simTime=10;
      battleRunning=true;matchOver=false;
      Object.assign(enemy,{gold:1e6,buildClock:0,sendClock:1e9,upgradeClock:1e9});
      allies.forEach(a=>Object.assign(a,{gold:1e6,buildClock:0,sendClock:1e9,upgradeClock:1e9}));
      const before=routeLength(ENEMY_HALF,'west')+routeLength(ENEMY_HALF,'east');
      for(let tick=0;tick<65;tick++) {
        enemy.buildClock=0;updateEnemyAI(.01);
        for(const a of allies) {a.buildClock=0;updateAlly(a,.01);}
        if(!routesAreOpen()) return false;
      }
      if(enemy.towersBuilt<22 || allies.some(a=>a.towersBuilt<22)) return false;
      const after=routeLength(ENEMY_HALF,'west')+routeLength(ENEMY_HALF,'east');
      if(after<=before+20) return false;
      for(const a of allies) {
        const mine=[...towers.values()].filter(t=>t.allyHalf===a.half&&t.allySeat===a.seat);
        if(mine.some(t=>t.c<a.zone.c0||t.c>a.zone.c1)) return false;
      }
    }
    return true;
  })()`),true);
});

test('new 2v2 room replaces stale roster and seats both humans together against two bots', async () => {
  const {run,value}=boot();
  run(`roster=newRoster(1);mp.team='north';mp.seat=2;mp.peers={old:{sid:'old'}};
    $('team-select').value='2';$('mp-name').value='Abdy';
    mpMakeMqttTransport=async()=>({send:()=>{},close:()=>{}});
    mpStatus=()=>{};mpStartHelloLoop=()=>{};mpMaybeStart=()=>{};renderLobby=()=>{};`);
  await run('mpOpenRoom(false)');
  run(`mpOnMessage({t:'hello',sid:'brother',name:'Gene',race:selectedRace.id,arena:ARENA_PROTOCOL})`);
  assert.deepEqual(value(`({sizes:[roster.south,roster.north].map(a=>a.filter(s=>s.kind!=='closed').length),
    humans:roster.south.filter(s=>s.kind==='human').map(s=>s.sid),bots:roster.north.filter(s=>s.kind==='ai').length,
    host:[mp.team,mp.seat],guest:[mp.peers.brother.team,mp.peers.brother.seat],old:!!mp.peers.old})`),
    {sizes:[2,2],humans:[run('mp.sid'),'brother'],bots:2,host:['south',0],guest:['south',1],old:false});
});

test('guest waits for its assigned roster even if config and ready arrive first', () => {
  const {run}=boot();
  run(`mp.role='guest';mp.active=false;mp.config={mode:'classic',lives:100};mp.ready=true;mp.oppReady=true;
    roster=null;mpMaybeStart();`);
  assert.equal(run('mp.active'),false);
  run(`globalThis.opens=0;openLobby=()=>{opens++;lobbyPhase=true};setupCanvasesOnce=()=>{};buildOverlay=()=>{};
    fitBoardToViewport=()=>{};resetMapZoom=()=>{};redrawBoard=()=>{};renderLobby=()=>{};$('lives-select').options=[];
    const wire=newRoster(2);wire.south[0].sid='host';wire.south[1].kind='human';wire.south[1].sid=mp.sid;
    mpOnMessage({t:'roster',sid:'host',host:'host',roster:wire});`);
  assert.equal(run('mp.active'),true);
  assert.equal(run('mp.seat'),1);
  assert.equal(run('opens'),1);
});

test('closed slots retain wire keys and north players keep lobby colors on their local board', () => {
  const {run,value}=boot();
  run(`roster=newRoster(3);mp.active=true;mp.role='guest';mp.team='north';mp.seat=2;
    roster.north[0].kind='human';roster.north[0].sid='mate';roster.north[1].kind='closed';
    roster.north[2].kind='human';roster.north[2].sid=mp.sid;
    roster.south[1].kind='closed';mp.seatLeaks={'north:0':3,'north:2':99};mp.myLeaks=4;`);
  assert.deepEqual(value('mpFoeSeats().map(s=>s.key)'),['south:0','south:2']);
  assert.deepEqual(value('mpBotSeatKeys()'),['south:2']);
  assert.equal(run("mpViewableSeats().find(s=>s.mine).lane.color"),run("seatLane('north',1,2).color"));
  assert.equal(run('humanSeatIndex()'),1);
  assert.equal(run('defendersPerHalf()'),2);
  assert.equal(run('mpTeamLeaks(mp.team)'),7);
  assert.equal(run("towerLaneColor({r:SOUTH_TOP+6,c:2})"),run("seatLane('north',1,2).color"));
});

test('watched towers, beams, creeps and shot effects preserve lobby west/east columns', () => {
  const {run,value}=boot();
  run(`mp.active=true;mp.team='south';roster=newRoster(2);mp.viewSeat='north:0';
    const t=testTower('tech',towerListFor('tech')[0].name);t.c=3;t.beamTo={x:4.5,y:t.r+1};t.beamAt=simTime;
    testCreep(5.5,t.r+2);mp.snap=mpSnapOf(()=>true,false);rebuildMirrorEntities();
    mpPlayMirrorFx([[FX_SHOT,3.5,10,5.5,12,0,5]]);`);
  assert.deepEqual(value('[mirrorTowers[0].c,mirrorTowers[0].beamTo.x,mirrorCreeps[0].x,mirrorFx[0].x1,mirrorFx[0].x2]'),[3,4.5,5.5,3.5,5.5]);
  assert.equal(run('towerLaneColor(mirrorTowers[0])'),run("seatLane('south',0,2).color"));
});


test('shared computer snapshots retain each tower owner color', () => {
  const {run,value}=boot();
  run(`mp.active=true;mp.team='south';roster=newRoster(2);mp.viewSeat='north:0';
    const a=testTower('tech',towerListFor('tech')[0].name);a.owner='enemy';a.r=NORTH_TOP+6;
    const b=makeTower(NORTH_TOP+7,4,'tech',0,'ally');b.allySeat=1;b.allyHalf=ENEMY_HALF;towers.set(b.key,b);
    mp.snap=mpSnapOf(()=>true,true);rebuildMirrorEntities();`);
  assert.deepEqual(value('mirrorTowers.map(towerLaneColor)'),value("[seatLane('north',0,2).color,seatLane('north',1,2).color]"));
});

test('two clients join, ready, start 2v2, and render their real teammate under YOUR TEAM', async () => {
  const host=boot(),guest=boot();
  for(const [client,name] of [[host,'Abdy'],[guest,'Gene Lang']]) {
    client.run(`$('team-select').value='2';$('mp-name').value=${JSON.stringify(name)};$('mp-code').value='ABCD';
      $('lives-select').options=[];battleRunning=false;lobbyPhase=false;roster=newRoster(1);
      globalThis.outbox=[];mpMakeMqttTransport=async()=>({send:m=>outbox.push(m),close:()=>{}});
      mpStartHelloLoop=()=>{};mpStatus=()=>{};setupCanvasesOnce=()=>{};buildOverlay=()=>{};
      fitBoardToViewport=()=>{};resetMapZoom=()=>{};redrawBoard=()=>{};
      openLobby=()=>{lobbyPhase=true;renderLobby(true)};
      startBattle=()=>{resetMatchState();battleRunning=true;mp.viewSeat=mpDefaultViewSeat();renderSquadIncome()};`);
  }
  await host.run('mpOpenRoom(false)');await guest.run('mpOpenRoom(true)');
  function flush() {
    for(let n=0;n<20;n++) {
      let count=0;
      for(const [from,to] of [[host,guest],[guest,host]]) for(const msg of from.value('outbox.splice(0)')) {
        count++;to.run('mpOnMessage('+JSON.stringify(msg)+')');
      }
      if(!count)return;
    }
    throw Error('Protocol failed to settle');
  }
  guest.run(`mpSend({t:'hello',name:'Gene Lang',race:selectedRace.id})`);flush();
  for(const c of [host,guest]) {
    assert.equal(c.run('mp.team'),'south');
    const lobby=c.run("$('lobby').innerHTML");
    assert.match(lobby,/Your team · south/);
    assert.match(lobby,/data-map-seat="south:1"/);
    assert.match(lobby,/Orange · east/);
  }
  host.run('lobbyToggleReady()');flush();guest.run('lobbyToggleReady()');flush();
  host.run('mpHostStart()');flush();
  for(const c of [host,guest]) {
    assert.equal(c.run('mp.started'),true);
    assert.equal(c.run('mpFoeSeats().every(s=>s.kind===\'ai\')'),true);
    assert.equal(c.run('mpFoeSeats().length'),2);
    assert.equal(c.run('rosterSeats(PLAYER_HALF).every(s=>s.kind===\'human\')'),true);
    assert.equal(c.run('mpViewableSeats().find(s=>s.key===mp.viewSeat).friendly'),true);
    const panel=c.run("$('squad-income').innerHTML"),[team,opponents]=panel.split('<div class="si-head">OPPONENTS</div>');
    assert.match(team,c===host?/Gene Lang/:/Abdy/);
    assert.doesNotMatch(opponents,c===host?/Gene Lang.*si-row/:/Abdy.*si-row/);
    assert.doesNotMatch(panel,/Use Boards|YOUR SLOT:/);
    assert.doesNotMatch(panel,/TOP:|BOTTOM:/);
    assert.match(opponents,/Computer 1/);assert.match(opponents,/Computer 2/);
  }
});

test('roster moves update team headings and lobby position colors from either player perspective', () => {
  const {run}=boot();
  run(`mp.active=true;mp.role='host';roster=newRoster(2);mpHostSeat(mp.sid,'south',0,'Abdy',selectedRace.id);
    mpHostSeat('gene','south',1,'Gene Lang','tech');resetMatchState();battleRunning=true;mp.oppName='Gene Lang';
    renderSquadIncome();`);
  assert.match(run("$('squad-income').innerHTML.split('OPPONENTS')[0]"),/Gene Lang/);
  run(`mpHostSeat('gene','north',1,'Gene Lang','tech');renderSquadIncome();`);
  assert.doesNotMatch(run("$('squad-income').innerHTML.split('OPPONENTS')[0]"),/Gene Lang/);
  assert.match(run("$('squad-income').innerHTML.split('OPPONENTS')[1]"),/Gene Lang/);
  run(`mp.team='north';mp.seat=1;mp.sid='gene';resetMatchState();renderSquadIncome();`);
  assert.equal(run('player.lane.color'),run("seatLane('north',1,2).color"));
  assert.match(run("lobbyBoardGuide('north')"),/Teal · east/);
});

test('host can repair an existing split lobby by teaming humans against computers with fresh ready checks', () => {
  const {run,value}=boot();
  run(`mp.active=true;mp.role='host';mp.started=false;roster=newRoster(2);renderLobby=()=>{};
    mpHostSeat(mp.sid,'south',0,'Abdy',selectedRace.id);mpHostSeat('gene','north',1,'Gene Lang','tech');
    mp.transport={send:()=>{}};lobbyResetIfChanged();mp.lobbyReadyPlayers={[mp.sid]:true,gene:true};
    mpTeamUpAgainstComputers();`);
  assert.deepEqual(value('roster.south.filter(s=>s.kind===\'human\').map(s=>s.name)'),['Abdy','Gene Lang']);
  assert.equal(run("roster.north.filter(s=>s.kind==='ai').length"),2);
  assert.equal(run("mp.peers.gene.team"),'south');
  assert.deepEqual(value('mp.lobbyReadyPlayers'),{});
  assert.equal(run('lobbyAllReady()'),false);
  run("mp.role='guest'");assert.equal(run('mpTeamUpAgainstComputers()'),false);
});

test('Ready controls survive repeated heartbeat, roster, and state packets without rebuilding', () => {
  const {run}=boot();
  run(`mp.active=true;mp.role='host';lobbyPhase=true;mp.started=false;roster=newRoster(2);
    mpHostSeat(mp.sid,'south',0,'Abdy',selectedRace.id);mpHostSeat('gene','south',1,'Gene','tech');
    mp.transport={send:()=>{}};lobbyResetIfChanged();renderLobby(true);
    globalThis.writes=0;let lobbyHtml=$('lobby').innerHTML;
    Object.defineProperty($('lobby'),'innerHTML',{get:()=>lobbyHtml,set:v=>{writes++;lobbyHtml=v},configurable:true});
    lobbyToggleReady();for(let i=0;i<20;i++){lobbyHeartbeat();lobbyProtocol({t:'lobby-ping',sid:'gene'});}
  `);
  assert.equal(run('writes'),0);
  assert.match(run("$('lb-consent').textContent"),/Ready — tap/);
  run(`const state=lobbyReadyState();mp.role='guest';mp.hostSid=mp.sid;mp.sid='gene';$('lives-select').options=[];
    lobbyProtocol({...state,sid:mp.hostSid});writes=0;
    for(let i=0;i<20;i++) {lobbyProtocol({...state,sid:mp.hostSid});mpOnMessage({t:'roster',sid:mp.hostSid,host:mp.hostSid,
      readyRevision:state.revision,readyPlayers:state.players,stateSeq:state.stateSeq,readyAcks:state.readyAcks,roster:state.roster});}`);
  assert.equal(run('writes'),0);
});

test('lost Ready requests retry until acknowledged and stale packets cannot undo newer consent', () => {
  const {run,value}=boot();
  run(`mp.active=true;mp.role='guest';mp.sid='gene';mp.hostSid='host';lobbyPhase=true;mp.started=false;
    roster=newRoster(2);roster.south[0].sid='host';roster.south[1].kind='human';roster.south[1].sid=mp.sid;
    mp.lobbyRevision=4;mp.lobbyStateSeq=10;mp.lobbyReadyPlayers={host:true,gene:false};mp.lobbyReadyAcks={};
    globalThis.sent=[];mp.transport={send:m=>sent.push(m)};renderLobby=()=>{};lobbyToggleReady();`);
  assert.equal(run('lobbyLocalReady()'),true);
  assert.match(run("$('lb-consent').textContent"),/syncing/);
  run('lobbyHeartbeat()');
  assert.equal(run("sent.filter(m=>m.t==='lobby-ready').length"),2);
  run(`lobbyProtocol({t:'lobby-state',sid:'host',revision:4,stateSeq:11,players:{host:true,gene:true},readyAcks:{gene:1}})`);
  assert.equal(run('mp.pendingReady'),null);
  assert.equal(run('lobbyLocalReady()'),true);
  run(`lobbyProtocol({t:'lobby-state',sid:'host',revision:4,stateSeq:10,players:{host:false,gene:false}})`);
  assert.equal(run('lobbyLocalReady()'),true);
  run('lobbyToggleReady()');
  assert.equal(run('lobbyLocalReady()'),false);
  run(`lobbyProtocol({t:'lobby-state',sid:'host',revision:4,stateSeq:11,players:{host:true,gene:true},readyAcks:{gene:1}})`);
  assert.equal(run('lobbyLocalReady()'),false);
  assert.deepEqual(value('mp.pendingReady'),{value:false,revision:4,seq:2});
  run(`lobbyProtocol({t:'lobby-state',sid:'host',revision:4,stateSeq:12,players:{host:true,gene:false},readyAcks:{gene:2}})`);
  assert.equal(run('mp.pendingReady'),null);
  assert.equal(run('lobbyLocalReady()'),false);
});

test('host applies sequenced Ready requests once and rejects old requests after a newer unready', () => {
  const {run,value}=boot();readyRoom(run);
  run(`lobbyProtocol({t:'lobby-ready',sid:'guest',revision:mp.lobbyRevision,value:true,seq:1});
    globalThis.seqOnce=mp.lobbyStateSeq;
    lobbyProtocol({t:'lobby-ready',sid:'guest',revision:mp.lobbyRevision,value:true,seq:1});`);
  assert.equal(run('mp.lobbyStateSeq'),run('seqOnce'));
  run(`lobbyProtocol({t:'lobby-ready',sid:'guest',revision:mp.lobbyRevision,value:false,seq:2});
    lobbyProtocol({t:'lobby-ready',sid:'guest',revision:mp.lobbyRevision,value:true,seq:1});`);
  assert.equal(run('mp.lobbyReadyPlayers.guest'),false);
  assert.equal(run('mp.lobbyReadyAcks.guest'),2);
  const before=value('mp.lobbyReadyPlayers');
  run(`lobbyProtocol({t:'lobby-ready',sid:'guest',revision:mp.lobbyRevision-1,value:true,seq:3})`);
  assert.deepEqual(value('mp.lobbyReadyPlayers'),before);
});

test('changed roster cancels pending consent, while already teamed humans cannot accidentally reset Ready', () => {
  const {run}=boot();
  run(`mp.active=true;mp.role='host';mp.started=false;roster=newRoster(2);renderLobby=()=>{};
    mpHostSeat(mp.sid,'south',0,'Abdy',selectedRace.id);mpHostSeat('gene','south',1,'Gene','tech');
    lobbyResetIfChanged();mp.lobbyReadyPlayers={[mp.sid]:true,gene:true};globalThis.revBefore=mp.lobbyRevision;`);
  assert.equal(run('mpTeamUpAgainstComputers()'),false);
  assert.equal(run('mp.lobbyRevision'),run('revBefore'));
  assert.equal(run('mp.lobbyReadyPlayers.gene'),true);
  run(`mp.role='guest';mp.sid='gene';mp.hostSid='host';lobbyPhase=true;mp.pendingReady={value:true,revision:mp.lobbyRevision,seq:1};
    lobbyAcceptState({revision:mp.lobbyRevision+1,stateSeq:10,players:{},readyAcks:{}});`);
  assert.equal(run('mp.pendingReady'),null);
  assert.equal(run('lobbyLocalReady()'),false);
});

test('host retries a lost start packet and guest accepts acknowledged Ready before its state update arrives', () => {
  const {run,value}=boot();readyRoom(run);
  run(`lobbyToggleReady();lobbyProtocol({t:'lobby-ready',sid:'guest',revision:mp.lobbyRevision,value:true,seq:1});
    mpHostStart();globalThis.firstGo=testMessages.find(m=>m.t==='go');lobbyHeartbeat();`);
  assert.equal(run("testMessages.filter(m=>m.t==='go').length"),2);
  run(`mpOnMessage({t:'start-ack',sid:'guest',seed:firstGo.seed});lobbyHeartbeat()`);
  assert.equal(run("testMessages.filter(m=>m.t==='go').length"),2);
  run(`mp.role='guest';mp.sid='guest';mp.hostSid='host';mp.started=false;mp.startSeed=null;
    mp.lobbyReadyPlayers={host:true,guest:false};mp.pendingReady={value:true,revision:mp.lobbyRevision,seq:1};
    mpOnMessage({...firstGo,sid:'host'});`);
  assert.equal(run('mp.started'),true);
  assert.equal(run('testStarts'),2);
  run(`mpOnMessage({...firstGo,sid:'host'})`);
  assert.equal(run('testStarts'),2);
  assert.equal(run("testMessages.filter(m=>m.t==='start-ack').length"),2);
});

async function runningMultiplayerRoom(teamSize=2,team='south',shared=false,opponents=false) {
  const host=boot(),guest=boot();
  for(const [client,name] of [[host,'Abdy'],[guest,'Gene']])client.run(`
    $('team-select').value='${teamSize}';$('mp-name').value=${JSON.stringify(name)};$('mp-code').value='ABCD';
    $('lives-select').value='100';$('lives-select').options=[{value:'100'}];$('mode-select').value='classic';
    battleRunning=false;lobbyPhase=false;roster=newRoster(1);globalThis.outbox=[];
    mpMakeMqttTransport=async()=>({send:m=>outbox.push(m),close:()=>{}});mpStartHelloLoop=()=>{};mpStatus=()=>{};
    setupCanvasesOnce=()=>{};fitBoardToViewport=()=>{};resetMapZoom=()=>{};redrawBoard=()=>{};frameHomeGround=()=>{};
    globalThis.gameLog=[];log=text=>gameLog.push(text);
  `);
  await host.run('mpOpenRoom(false)');await guest.run('mpOpenRoom(true)');
  if(!shared)for(const c of [host,guest])c.run('mp.sharedRequested=false;');
  function flush() {
    for(let n=0;n<30;n++) {
      let count=0;
      for(const [from,to] of [[host,guest],[guest,host]])for(const msg of from.value('outbox.splice(0)')){
        count++;to.run('mpOnMessage('+JSON.stringify(msg)+')');
      }
      if(!count)return;
    }
    throw Error('Messages did not settle');
  }
  guest.run(`mpSend({t:'hello',name:'Gene',race:selectedRace.id})`);flush();
  if(team==='north') {
    host.run(`mpHostSeat(mp.sid,'north',0,'Abdy',selectedRace.id);
      mpHostSeat(${JSON.stringify(guest.run('mp.sid'))},'north',1,'Gene',selectedRace.id);mpBroadcastRoster();`);flush();
  }
  if(opponents){host.run(`mpHostSeat(${JSON.stringify(guest.run('mp.sid'))},'north',1,'Gene',selectedRace.id);mpBroadcastRoster();`);flush();}
  host.run('lobbyToggleReady()');flush();guest.run('lobbyToggleReady()');flush();host.run('mpHostStart()');flush();
  return {host,guest,flush};
}

test('actual match start and purchases keep both humans allied and send only at computers', async () => {
  const {host,guest,flush}=await runningMultiplayerRoom();
  for(const c of [host,guest]) {
    assert.equal(c.run('battleRunning'),true);
    assert.equal(c.run('mp.team'),'south');
    assert.equal(c.run('Object.isFrozen(mp.matchRoster)'),true);
    c.run('player.gold=10000;buySend(\'miner\')');flush();
    assert.equal(guest.run("creeps.filter(c=>c.half===PLAYER_HALF&&c.sent).length"),0);
    assert.equal(host.run("creeps.filter(c=>c.half===PLAYER_HALF&&c.sent).length"),0);
  }
  assert.equal(host.run("creeps.filter(c=>c.half===ENEMY_HALF&&c.sent).length"),4);
  const seed=host.run('mp.matchId');assert.equal(seed,guest.run('mp.matchId'));
  host.run(`mpOnMessage({t:'sit',sid:${JSON.stringify(guest.run('mp.sid'))},half:'north',index:0,name:'Gene'});lobbySetSeat('south',1,'ai')`);
  assert.equal(host.run("mp.matchRoster.south[1].kind"),'human');
  assert.equal(host.run("roster.south[1].kind"),'human');
  assert.equal(host.run("mp.peers[roster.south[1].sid].team"),'south');
});

test('computer attacks relayed by a teammate identify the computer and friendly fire is refused', async () => {
  const {host,guest,flush}=await runningMultiplayerRoom();
  host.run(`enemy.targetTurn=1;aiDeliverSend(enemy,ENEMY_HALF,SENDS.find(s=>s.id==='miner'))`);flush();
  assert.equal(guest.run('creeps.length'),2);
  assert.match(guest.run("gameLog.at(-1)"),/^Computer 1 sent Miner/);
  assert.doesNotMatch(guest.run("gameLog.at(-1)"),/Abdy sent/);
  const hostSid=host.run('mp.sid');
  guest.run(`mpOnMessage({t:'send',sid:${JSON.stringify(hostSid)},id:'miner',sourceSeat:'south:0',target:'south:1',match:mp.matchId})`);
  assert.equal(guest.run('creeps.length'),2);
  guest.run(`mpOnMessage({t:'send',sid:${JSON.stringify(hostSid)},id:'miner',target:'south:1'})`);
  assert.equal(guest.run('creeps.length'),2);
});

test('computer leaks reduce the opposing pool and both teammates receive the same victory', async () => {
  const {host,guest,flush}=await runningMultiplayerRoom();
  guest.run(`player.gold=10000;buySend('miner')`);flush();
  host.run(`for(const c of creeps.filter(c=>c.half===ENEMY_HALF))resolveLeak(c);mpTick(.01)`);flush();
  for(const c of [host,guest]) {
    assert.equal(c.run('mpTeamLives(mp.team)'),100);
    assert.equal(c.run('mpTeamLives(mpFoeHalf())'),98);
    assert.equal(c.run('enemy.lives'),98);
  }
  host.run(`spawnSend(SENDS.find(s=>s.id==='miner'),ENEMY_HALF,'west',null,'north:0');
    const last=creeps.at(-1);last.livesCost=98;resolveLeak(last);`);flush();
  for(const c of [host,guest]) {
    assert.equal(c.run('matchOver'),true);
    assert.match(c.run("$('wave-banner').textContent"),/VICTORY/);
    assert.equal(c.run('enemy.lives'),0);
  }
});

test('a leak on one teammate board lowers both allies lives and both receive defeat', async () => {
  const {host,guest,flush}=await runningMultiplayerRoom();
  host.run(`enemy.targetTurn=1;aiDeliverSend(enemy,ENEMY_HALF,SENDS.find(s=>s.id==='miner'))`);flush();
  guest.run(`resolveLeak(creeps[0]);mpTick(.01)`);flush();
  assert.equal(guest.run('player.lives'),99);assert.equal(host.run('player.lives'),99);
  assert.equal(guest.run('enemy.lives'),100);assert.equal(host.run('enemy.lives'),100);
  guest.run(`creeps[1].livesCost=99;resolveLeak(creeps[1])`);flush();
  for(const c of [host,guest]) {
    assert.equal(c.run('matchOver'),true);
    assert.match(c.run("$('wave-banner').textContent"),/DEFEAT/);
    assert.equal(c.run('player.lives'),0);
  }
});

test('fixed map positions and colors are identical from both teammate perspectives', async () => {
  const {host,guest}=await runningMultiplayerRoom();
  const layout=c=>c.value(`mpMapSeatLayouts().map(s=>({key:s.key,half:s.half,c0:s.c0,c1:s.c1,color:s.lane.color}))`);
  assert.deepEqual(layout(host),layout(guest));
  assert.deepEqual(layout(host).map(s=>[s.key,s.half]),[
    ['north:0','north'],['north:1','north'],['south:0','south'],['south:1','south']]);
  for(const c of [host,guest]) {
    assert.equal(c.run(`mpMapSeatLayouts().filter(s=>s.friendly).every(s=>s.half==='south')`),true);
    assert.equal(c.run(`mpMapSeatLayouts().every(s=>s.lane.color===mpViewableSeats().find(v=>v.key===s.key).lane.color)`),true);
  }
});

test('six fixed lobby colors occupy exactly northwest through southeast without overlaps', () => {
  const {run,value}=boot();
  run(`mp.active=true;mp.team='south';mp.seat=0;roster=newRoster(3);roster.south[0].sid=mp.sid;`);
  assert.deepEqual(value(`mpMapSeatLayouts().map(s=>[s.half,s.zone.label,s.lane.name])`),[
    ['north','west','Red'],['north','centre','Blue'],['north','east','Teal'],
    ['south','west','Purple'],['south','centre','Yellow'],['south','east','Orange']]);
  assert.equal(run(`mpMapSeatLayouts().every((a,i,all)=>all.slice(i+1).every(b=>a.r1<b.r0||b.r1<a.r0||a.c1<b.c0||b.c1<a.c0))`),true);
});

test('north and south seat projections round trip and never depend on the viewer team', () => {
  const {run,value}=boot();
  run(`mp.active=true;mp.role='host';roster=newRoster(2);roster.south[0].sid=mp.sid;
    roster.north[0].kind='human';roster.north[0].sid='north-player';mp.team='south';mp.seat=0;`);
  const south=value(`mpMapProjectPoint('south:0',12.5,SOUTH_TOP+8.5)`);
  const north=value(`mpMapProjectPoint('north:0',12.5,SOUTH_TOP+8.5)`);
  assert.ok(north.y<south.y);
  for(const [key,p] of [['north:0',north],['south:0',south]]) {
    const xy=value(`mpMapUnprojectPoint('${key}',${p.x},${p.y})`);
    assert.ok(Math.abs(xy[0]-12.5)<1e-9);assert.equal(xy[1],run('SOUTH_TOP+8.5'));
  }
  run(`mp.team='north';mp.seat=0;`);
  assert.deepEqual(value(`mpMapProjectPoint('south:0',12.5,SOUTH_TOP+8.5)`),south);
  assert.deepEqual(value(`mpMapProjectPoint('north:0',12.5,SOUTH_TOP+8.5)`),north);
});

test('fixed map pointer mapping permits builds only inside the local assigned color', async () => {
  const {host,guest}=await runningMultiplayerRoom();
  for(const c of [host,guest]) {
    c.run(`const localRect=$('fx-canvas').getBoundingClientRect();
      globalThis.pointerAt=(key)=>{const p=mpMapProjectPoint(key,12.5,SOUTH_TOP+8.5);
        return {clientX:p.x/COLS*localRect.width,clientY:p.y/ROWS*localRect.height};};`);
    assert.deepEqual(c.value(`cellFromEvent(pointerAt(mpMySeatKey()))`),c.value(`({r:SOUTH_TOP+8,c:12})`));
    const other=c.run(`mpMapSeatLayouts().find(s=>s.key!==mpMySeatKey()).key`);
    c.run(`mpSetViewSeat(${JSON.stringify(other)})`);
    assert.equal(c.run(`cellFromEvent(pointerAt(${JSON.stringify(other)}))`),null);
  }
});

test('focusing any colored slot never relocates it or changes team attack targets', async () => {
  const {host,guest,flush}=await runningMultiplayerRoom();
  for(const c of [host,guest]) {
    const before=c.value(`mpMapSeatLayouts().map(s=>[s.key,s.half,s.c0,s.c1])`);
    for(const key of c.value(`mpMapSeatLayouts().map(s=>s.key)`)) {
      c.run(`mpSetViewSeat(${JSON.stringify(key)});player.gold=10000;buySend('miner');`);flush();
      assert.deepEqual(c.value(`mpMapSeatLayouts().map(s=>[s.key,s.half,s.c0,s.c1])`),before);
      assert.equal(c.run(`mpFoeSeats().every(s=>s.key.startsWith('north:'))`),true);
    }
  }
  assert.equal(host.run(`creeps.filter(c=>c.sent&&c.half===PLAYER_HALF).length`),0);
  assert.equal(guest.run(`creeps.filter(c=>c.sent&&c.half===PLAYER_HALF).length`),0);
});

test('computer buildings reach the guest and are drawn in both fixed opposing slots', async () => {
  const {host,guest,flush}=await runningMultiplayerRoom();
  host.run(`enemy.gold=1000;enemy.income=17;enemy.buildClock=0;updateEnemyAI(.1);
    for(const a of allies){a.gold=1000;a.income=29;a.buildClock=0;updateAlly(a,.1);}
    mp.snapClock=0;mpTick(.4);`);flush();
  for(const key of ['north:0','north:1']) {
    assert.ok(guest.run(`mp.seatSnaps['${key}'].towers.length`)>0);
    assert.ok(guest.run(`(()=>{const s=mpMapSeatLayouts().find(s=>s.key==='${key}');
      return mp.seatSnaps[s.key].towers.filter(t=>t[1]>=s.c0&&t[1]<=s.c1).length;})()`)>0);
  }
  assert.equal(guest.run(`mp.seatIncome['north:0']`),host.run('enemy.income'));
  assert.equal(guest.run(`mp.seatIncome['north:1']`),host.run('allies[0].income'));
  assert.equal(guest.run(`mp.seatRace['north:1']`),host.run('allies[0].raceId'));
  guest.run(`setupCanvases();globalThis.paintedSeats={};const realDrawTower=drawTower;
    drawTower=(ctx,t)=>{if(t.mapSeatKey)paintedSeats[t.mapSeatKey]=(paintedSeats[t.mapSeatKey]||0)+1;};
    renderFrame();drawTower=realDrawTower;`);
  assert.ok(guest.run(`paintedSeats['north:0']`)>0);
  assert.ok(guest.run(`paintedSeats['north:1']`)>0);
});


test('3v3 computers have one host simulation and publish separate boards for all four AI seats', async () => {
  const {host,guest,flush}=await runningMultiplayerRoom(3);
  assert.equal(guest.run('allies.length'),0,'the guest must not simulate another copy of the friendly computer');
  host.run(`enemy.gold=10000;enemy.buildClock=0;updateEnemyAI(.1);
    for(const a of allies){a.gold=10000;a.buildClock=0;updateAlly(a,.1);}
    mp.snapClock=0;mpTick(.4);`);flush();
  for(const key of ['south:2','north:0','north:1','north:2']) {
    const expected=host.value(`mpSnapshotForSeat('${key}').towers`);
    assert.ok(expected.length>0,key+' has no maze');
    assert.deepEqual(guest.value(`mp.seatSnaps['${key}'].towers`),expected);
    assert.deepEqual(host.value(`mp.seatSnaps['${key}'].towers`),expected);
    assert.equal(guest.run(`(()=>{const s=mpMapSeatLayouts().find(s=>s.key==='${key}');
      return mp.seatSnaps[s.key].towers.every(t=>t[1]>=s.c0&&t[1]<=s.c1);})()`),true);
  }
  assert.equal(guest.run(`mp.seatSnaps['south:0'].towers.length`),0,'a human board must not contain its AI teammate');
});

test('3v3 human boards exclude friendly AI towers, creeps, and projectiles', async () => {
  const {host,guest,flush}=await runningMultiplayerRoom(3);
  host.run(`const mine=testTower('tech','Bolt Platform'),bot=allies.find(a=>a.half===PLAYER_HALF);
    const bt=makeTower(SOUTH_TOP+17,bot.zone.c0+2,bot.raceId,0,'player');
    bt.allyHalf=PLAYER_HALF;bt.allySeat=bot.seat;bt.buildUntil=0;towers.set(bt.key,bt);
    spawnSend(SENDS[0],PLAYER_HALF,'west',null,mpMySeatKey());
    spawnSend(SENDS[0],PLAYER_HALF,'west',null,'south:2');
    projectiles.push({tower:mine},{tower:bt});
    globalThis.drawn={towers:[],creeps:[],shots:[]};
    drawTower=(ctx,t)=>drawn.towers.push(t.key);drawCreep=(ctx,c)=>drawn.creeps.push(c.defenderSeat);
    drawProjectile=(ctx,p)=>drawn.shots.push(p.tower.key);drawCreepReadPass=()=>{};
    setupCanvases();renderLocalFrame(mpMySeatKey());mp.snapClock=0;mpTick(.4);`);flush();
  assert.equal(host.run('drawn.towers.length'),1);assert.equal(host.run('drawn.shots.length'),1);
  assert.deepEqual(host.value('drawn.creeps'),['south:0']);
  assert.equal(guest.run(`mp.seatSnaps['south:0'].towers.length`),1);
  assert.equal(guest.run(`mp.seatSnaps['south:0'].creeps.length`),1);
  assert.equal(guest.run(`mp.seatSnaps['south:2'].towers.length`),1);
  assert.equal(guest.run(`mp.seatSnaps['south:2'].creeps.length`),1);
});

test('computer projectiles replay under the same seat as their maze on both clients', async () => {
  const {host,guest,flush}=await runningMultiplayerRoom(3);
  host.run(`for(const key of mpAllBotSeatKeys()){
      const {ai,half}=mpLocalBot(key),cell=ai.spots[0];
      const tower=makeTower(cell.r,cell.c,'tech',0,half===PLAYER_HALF?'player':'enemy');
      if(ai!==enemy){tower.allyHalf=half;tower.allySeat=ai.seat;}towers.set(tower.key,tower);
      const target=testCreep(tower.c+.5,tower.r+1.5,{half,defenderSeat:key});
      tower.buildUntil=0;tower.cooldown=0;updateTower(tower,.01);
    }
    mp.snapClock=0;mpTick(.4);`);flush();
  for(const key of ['south:2','north:0','north:1','north:2']) {
    const local=host.value(`mp.seatFx['${key}']`),remote=guest.value(`mp.seatFx['${key}']`);
    assert.equal(local.length,1,key);assert.equal(remote.length,1,key);
    assert.deepEqual(remote,local);
    assert.ok(remote[0].y1<host.run('HALF_ROWS'),'wire effects must use south-normalized board coordinates exactly once');
  }
  assert.equal(guest.run(`(mp.seatFx['south:0']||[]).length`),0);
});


test('north teammates see the same four computer mazes without a second reflection', async () => {
  const {host,guest,flush}=await runningMultiplayerRoom(3,'north');
  host.run(`enemy.gold=10000;enemy.buildClock=0;updateEnemyAI(.1);
    for(const a of allies){a.gold=10000;a.buildClock=0;updateAlly(a,.1);}
    mp.snapClock=0;mpTick(.4);`);flush();
  assert.equal(guest.run('allies.length'),0);
  for(const key of ['north:2','south:0','south:1','south:2']) {
    assert.ok(guest.run(`mp.seatSnaps['${key}'].towers.length`)>0,key);
    assert.deepEqual(guest.value(`mp.seatSnaps['${key}'].towers`),host.value(`mp.seatSnaps['${key}'].towers`));
    assert.equal(guest.run(`mp.seatSnaps['${key}'].towers.every(t=>t[0]>=SOUTH_TOP&&t[0]<=SOUTH_BOT)`),true);
    for(const c of [host,guest]) {
      c.run(`rebuildMirrorEntities(mp.seatSnaps['${key}'],'${key}','${key.split(':')[0]}')`);
      assert.equal(c.run(`mirrorTowers.every(t=>halfOfRow(t.r)==='${key.split(':')[0]}')`),true);
    }
  }
});

test('map slot painting restores its transform after a failed draw', () => {
  const {run}=boot();
  assert.equal(run(`(()=>{mp.active=true;roster=newRoster(3);let depth=0;
    const ctx={save:()=>depth++,restore:()=>depth--,beginPath:()=>{},rect:()=>{},clip:()=>{},translate:()=>{},scale:()=>{}};
    try{mpMapPaintSlot(ctx,mpMapSeatLayouts()[0],PLAYER_HALF,()=>{throw Error('bad sprite');});}catch{}
    return depth===0;})()`),true);
});


test('moving creeps remain visible when crossing the shared computer half', async () => {
  const {host,guest,flush}=await runningMultiplayerRoom(3);
  host.run(`spawnSend(SENDS[0],ENEMY_HALF,'west',null,'north:1');
    const c=creeps.at(-1);c.x=5.5;c.y=10.5;mp.snapClock=0;mpTick(.4);`);flush();
  assert.equal(guest.run(`mp.seatSnaps['north:0'].creeps.some(c=>c[0]===5.5)`),true,
    'a centre-targeted creep crossing the west lane must not disappear');
  assert.equal(guest.run(`mp.seatSnaps['south:0'].creeps.length`),0);
});


test('Crystal snapshot formations never read another client live tower cache', async () => {
  const {host,guest,flush}=await runningMultiplayerRoom();
  host.run(`const a=makeTower(8,5,'crystal',0,'enemy'),b=makeTower(8,6,'crystal',0,'enemy');
    for(const t of [a,b]){t.buildUntil=0;t.crystalBonus='range';t.formationRevision=1;towers.set(t.key,t);}towersVersion++;
    mp.snapClock=0;mpTick(.4);`);flush();
  for(const c of [host,guest]) {
    c.run(`rebuildMirrorEntities(mp.seatSnaps['north:0'],'north:0','north')`);
    assert.deepEqual(c.value(`mirrorTowers.map(t=>({keys:crystalFormation(t).members.map(m=>m.key),
      bonus:crystalFormation(t).bonus,range:towerLiveStats(t).range}))`),
      host.value(`mpSnapshotForSeat('north:0').towers.map(t=>({keys:t[15].slice(1),bonus:'range',range:towerDef('crystal',0).range+1}))`));
  }
});

test('Shrines 6 through 8 have five stronger sends each and the requested currencies',()=>{
  const {value}=boot();
  assert.deepEqual(value(`(() => {const tiers=[6,7,8].map(n=>SENDS.filter(s=>s.shrine===n));return [SHRINE_MAX,tiers.map(a=>a.length),tiers[0].every(s=>!s.lumber&&s.cost>0&&s.income>0&&s.hp>12000),tiers[1].map(s=>s.lumber),tiers[1].map(s=>s.woodIncome),tiers[2].every(s=>!s.cost&&!s.income&&s.lumber>0&&s.woodIncome>0&&!s.attacker)];})()`),[8,[5,5,5],true,[1,5,10,15,20],[.01,.05,.1,.25,.5],true]);
});

test('standard and splash promotion totals match the plan including the growing jumps',()=>{
  const {value}=boot();
  assert.deepEqual(value(`(()=>{const a=testTower('ninja','Initiate'),b=testTower('tech','Ballista');const req=t=>Array.from({length:10},(_,i)=>rankNeed(i,t));return [req(a),req(b),req(a).reduce((a,b)=>a+b),req(b).reduce((a,b)=>a+b),rankNeed(14,a)];})()`),[[5,10,25,50,75,100,125,150,200,250],[100,125,150,200,250,300,375,450,550,675],990,3175,675]);
});

test('rank ten damage and attack rate are fixed additive increases over rank three',()=>{
  const {run}=boot();
  assert.equal(run(`(()=>{const t=testTower('ninja','Initiate');t.level=3;const a=towerLiveStats(t);t.rank=7;const b=towerLiveStats(t);return Math.abs(b.dmg/a.dmg-1.24)<1e-9&&Math.abs(a.cd/b.cd-1.07)<1e-9&&a.range===b.range;})()`),true);
});

test('splash credits five victims once each while imbuement and DOT add no duplicate hits',()=>{
  const {value}=boot();
  assert.deepEqual(value(`(()=>{const t=testTower('tech','Ballista');t.bolt='fire';const cs=Array.from({length:5},(_,i)=>testCreep(t.c+1+i*.03,t.r+.5));testHit(t,cs[0]);const n=t.landedHits;cs.forEach(c=>applyDamage(c,1,t,true));return [n,t.landedHits,t.rankBank];})()`),[5,5,5]);
});

test('beam point rate counts attack cadence rather than simulation frame rate',()=>{
  function points(dt){const {run}=boot();return run(`(()=>{settleTowerRanks=()=>{};const t=testTower('beam',TOWERS.beam[0].name);testCreep(t.c+1,t.r+.5,{hp:1e12,maxHp:1e12});for(let i=0;i<Math.round(1/${dt});i++)updateTower(t,${dt});return t.landedHits;})()`);}
  assert.equal(points(.01),points(.05));assert.ok(points(.05)>1);
});

test('attackers spawn at listed durability and strike once per second',()=>{
  const {value}=boot();
  assert.deepEqual(value(`(()=>{const defs=SENDS.filter(s=>s.attacker);const stats=defs.map(s=>{spawnSend(s,PLAYER_HALF,'west');const c=creeps.pop();return [c.hp,c.armor];});const t=testTower('ice',TOWERS.ice[0].name);t.blockHp=t.blockMaxHp=1e6;const c=testCreep(t.c+.5,t.r+.5,{state:'attack',blockTargetKey:t.key,attacker:true,breakPower:1});updateCreep(c,.01);const hp=t.blockHp;updateCreep(c,.5);return [stats,hp===t.blockHp,c.attackClock>.4];})()`),[[[1400,8],[2800,13],[5200,18],[13500,24]],true,true]);
});

test('ordinary towers double health while Bulwark health and core caps stay intact',()=>{
  const {value}=boot();
  assert.deepEqual(value(`(()=>{const a=testTower('ice',TOWERS.ice[0].name),b=testTower('ice','Bulwark Stake');b.bulwarkCore=['health','armor','regen','thorns'];b.bulwarkRank=3;const hp=bulwarkMaxHp(b);b.bulwarkRank=10;return [a.blockMaxHp,towerMaxHp(towerDef(b.raceId,b.tier),b.tier,0),hp,bulwarkMaxHp(b),bulwarkRankValue(b,WARD.armor),bulwarkRankValue(b,WARD.thorns)];})()`),[96,1680,3024,3538,.3,.45]);
});

test('Bulwark expertise credits actual reflected HP loss without overkill',()=>{
  const {value}=boot();
  assert.deepEqual(value(`(()=>{const t=testTower('ice','Bulwark Stake');t.bulwarkCore=['health','armor','regen','thorns'];t.bulwarkRank=3;t.bulwarkDamageTaken=2520;t.blockHp=t.blockMaxHp=bulwarkMaxHp(t);const c=testCreep(t.c+.5,t.r+.5,{hp:1,maxHp:1,state:'attack',blockTargetKey:t.key,attacker:true,breakPower:8});updateCreep(c,.01);return [t.bulwarkDamageTaken,c.hp<=0];})()`),[2617,true]);
});

test('Send Training spends escalating lumber once and only affects future regular sends',()=>{
  const {value}=boot();
  assert.deepEqual(value(`(()=>{player.gold=1e6;player.lumber=300;player.income=100;const s=SENDS.find(s=>s.id==='titan');spawnSend(s,ENEMY_HALF,'west');const old=creeps[0].hp;buySendTraining();buySendTraining();const t=trainedSend(s);return [player.sendTraining,player.lumber,player.income,t.cost,t.income,Math.round(t.hp),t.armor,Number(t.spd.toFixed(3)),creeps[0].hp===old,s.cost,s.hp,trainedSend(SENDS.find(s=>s.id==='sapper')).hp,buySendTraining()];})()`),[2,0,100,18000,1632,13200,25,2.754,true,15000,12000,1400,false]);
});

test('mixed sends pay fractional lumber income without losing hundredths',()=>{
  const {value}=boot();
  assert.deepEqual(value(`(()=>{player.shrine=7;player.gold=30000;player.lumber=1;buySend('grovevanguard');for(let i=0;i<100;i++)payWoodIncome(player);return [player.gold,player.lumber,player.income,player.woodIncome,creeps.length];})()`),[0,1,3000,.01,2]);
});

test('Shrine 8 buys use lumber only and increase lumber economy only',()=>{
  const {value}=boot();
  assert.deepEqual(value(`(()=>{player.shrine=8;player.gold=123;player.lumber=25;const ok=buySend('heartwoodgiant');return [ok,player.gold,player.lumber,player.income,player.woodIncome,creeps.length];})()`),[true,123,0,0,.75,2]);
});

test('one glyph protects all owned towers, excludes allies, expires and rejects cooldown recasts',()=>{
  const {value}=boot();
  assert.deepEqual(value(`(()=>{const a=testTower('ice',TOWERS.ice[0].name),b=makeTower(a.r,a.c+2,'ice',1,'player'),ally=makeTower(a.r,a.c+4,'ice',0,'ally');b.buildUntil=ally.buildUntil=0;addTower(b);addTower(ally);player.gold=1000;player.lumber=2;buyGlyph();rng=()=>.99;const ok=castGlyph();const protectedNow=[towerInvulnerable(a),towerInvulnerable(b),towerInvulnerable(ally)];const c=testCreep(a.c+.5,a.r+.5,{state:'attack',blockTargetKey:a.key,attacker:true});const hp=a.blockHp;updateCreep(c,.01);player.glyphCharges=1;const recast=castGlyph();simTime+=5.01;return [ok,protectedNow,hp===a.blockHp,player.gold,player.lumber,recast,towerInvulnerable(a),player.glyphCharges];})()`),[true,[true,true,false],true,0,0,false,false,1]);
});

test('trained sends and glyph shield snapshots agree between host and guest',async()=>{
  const {host,guest,flush}=await runningMultiplayerRoom();
  guest.run(`player.shrine=8;player.gold=1e7;player.lumber=1000;buySendTraining();buySendTraining();buySend('dawnbehemoth');`);flush();
  assert.deepEqual(host.value(`creeps.filter(c=>c.name==='Dawn Behemoth').map(c=>[c.maxHp,c.armor,c.spd])`),guest.value(`(()=>{const s=trainedSend(SENDS.find(s=>s.id==='dawnbehemoth'));return [0,1].map(()=>[sendShownHp(s),s.armor+TRAIT.armorBonus,s.spd]);})()`));
  host.run(`mp.snapClock=0;mpTick(.4)`);flush();
  guest.run(`rebuildMirrorEntities(mp.seatSnaps['north:0'],'north:0',ENEMY_HALF)`);
  assert.deepEqual(guest.value(`mirrorCreeps.filter(c=>c.name==='Dawn Behemoth').map(c=>[c.armor,c.spd])`),[[29,2.55],[29,2.55]]);
  guest.run(`const t=testTower('ice','Bulwark Stake');t.bulwarkRank=10;t.bulwarkCore=['health','armor'];t.blockHp=t.blockMaxHp=bulwarkMaxHp(t);buyGlyph();castGlyph();mp.snapClock=0;mpTick(.4);`);flush();
  host.run(`rebuildMirrorEntities(mp.seatSnaps['south:1'],'south:1',ENEMY_HALF)`);
  assert.equal(host.run(`mirrorTowers.some(t=>t.bulwarkRank===10&&t.blockMaxHp===3538&&towerInvulnerable(t))`),true);
});

test('3v3 renders one full-width board per team with no horizontal compression',async()=>{
  const {host,guest}=await runningMultiplayerRoom(3);
  for(const client of [host,guest]) {
    assert.deepEqual(client.value(`mpMapVisibleBoards().map(b=>[b.half,b.c0,b.c1])`),client.value(`[['north',0,COLS-1],['south',0,COLS-1]]`));
    assert.equal(client.run(`mpMapVisibleBoards().find(b=>b.half===mp.team).key===mpMySeatKey()`),true);
    assert.deepEqual(client.value(`(()=>{const scales=[];const ctx={save(){},restore(){},beginPath(){},rect(){},clip(){},translate(){},scale(x,y){scales.push([x,y]);}};for(const b of mpMapVisibleBoards())mpMapPaintSlot(ctx,b,PLAYER_HALF,()=>{});return scales.map(s=>s[0]);})()`),[1,1]);
  }
});

test('watching a teammate is read-only and returning home restores native pointer mapping',async()=>{
  const {host}=await runningMultiplayerRoom(3);
  host.run(`setupCanvases();mpSetViewSeat('south:1');globalThis.p={clientX:12.5/COLS*1280,clientY:(SOUTH_TOP+8.5)/ROWS*900};`);
  assert.equal(host.run('cellFromEvent(p)'),null);
  assert.equal(host.run(`mpMapVisibleBoards().find(b=>b.half==='south').key`),'south:1');
  host.run('mpSetViewSeat(mpMySeatKey())');
  assert.deepEqual(host.value('cellFromEvent(p)'),host.value('({r:SOUTH_TOP+8,c:12})'));
});

test('the board selector is absent from the shipped interface',()=>{
  assert.doesNotMatch(html,/id="mp-board-switcher"|data-board-view=/);
});

test('shared computer terrain draws once and shared creeps draw once across three bot seats',async()=>{
  const {host,guest,flush}=await runningMultiplayerRoom(3);
  host.run(`for(const key of mpAllBotSeatKeys()){const {ai,half}=mpLocalBot(key);ai.gold=1e4;ai.buildClock=0;if(ai===enemy)updateEnemyAI(.1);else updateAlly(ai,.1);}spawnSend(SENDS[0],ENEMY_HALF,'west',null,'north:1');mp.snapClock=0;mpTick(.4);`);flush();
  guest.run(`setupCanvases();globalThis.terrainPaints=0,seenCreeps=[],seenBots=[];drawTerrain=()=>{};drawCreep=(ctx,c)=>{if(c.half==='north')seenCreeps.push(c.id);};drawTower=(ctx,t)=>{if(t.mapSeatKey?.startsWith('north:'))seenBots.push(t.mapSeatKey);};const oldImage=fxCtx.drawImage;fxCtx.drawImage=(canvas)=>{if(canvas===$('board-canvas'))terrainPaints++;};renderFrame();fxCtx.drawImage=oldImage;`);
  assert.equal(guest.run('terrainPaints'),1);
  assert.equal(guest.run('seenCreeps.length'),1);
  for(const key of ['north:0','north:1','north:2'])assert.equal(guest.run(`seenBots.includes('${key}')`),true);
});

async function fundedArena(team='south',opponents=false) {
  const room=await runningMultiplayerRoom(2,team,true,opponents);
  room.host.run(`for(const p of Object.values(mp.arenaPlayers)){p.gold=100000;p.lumber=100;}arenaBroadcast(true);`);room.flush();
  return room;
}
function arenaCells(client) {
  return client.value(`(()=>{const cells=[];for(let r=SOUTH_TOP+5;r<SOUTH_BOT;r++)for(let c=2;c<COLS-2;c++)if(terrainAt(r,c)===T.FLOOR&&!protectedCells.has(idx(r,c))){cells.push({r,c});if(cells.length===4)return cells;}})()`);
}

test('shared arena stores both humans in one tower map with independent purses',async()=>{
  const {host,guest,flush}=await fundedArena();const [a,b]=arenaCells(host);
  assert.equal(host.run('arenaActive()'),true);assert.equal(guest.run('arenaActive()'),true);
  host.run(`buildAt(${JSON.stringify(a)})`);flush();
  guest.run(`buildAt(${JSON.stringify(b)})`);flush();
  for(const client of [host,guest]) {
    assert.equal(client.run('towers.size'),2);
    assert.deepEqual(client.value(`[...towers.values()].map(t=>[t.r,t.c,t.mapSeatKey]).sort((a,b)=>a[1]-b[1])`),[[a.r,a.c,'south:0'],[b.r,b.c,'south:1']]);
    assert.equal(client.run('[...towers.values()].filter(isMine).length'),1);
    assert.equal(client.run('player.gold'),99990);
  }
});

test('teammate towers acquire and damage the same single creep',async()=>{
  const {host,guest,flush}=await fundedArena();const [a,b]=arenaCells(host);
  host.run(`buildAt(${JSON.stringify(a)})`);flush();guest.run(`buildAt(${JSON.stringify(b)})`);flush();
  host.run(`for(const t of towers.values()){t.buildUntil=0;t.cooldown=0;}const shared=testCreep(${a.c+.7},${a.r+1.5},{hp:1000,maxHp:1000});for(const t of towers.values())updateTower(t,.01);`);
  assert.equal(host.run('new Set(projectiles.map(p=>p.tower.mapSeatKey)).size'),2);
  assert.equal(host.run('projectiles.every(p=>p.target===shared)'),true);
  host.run(`for(let i=0;i<100;i++)for(let j=projectiles.length-1;j>=0;j--)if(!updateProjectile(projectiles[j],.02))projectiles.splice(j,1);arenaBroadcast(true);`);flush();
  assert.ok(host.run('shared.hp')<1000);
  assert.equal(guest.run('creeps.length'),1);
  assert.equal(guest.run('creeps[0].hp'),host.run('shared.hp'));
});

test('shared wave clock and simulation advance only on the host',async()=>{
  const {host,guest,flush}=await fundedArena();
  host.run(`matchMode='skirmish';waveClock=.01;simulate(.1);arenaBroadcast(true);`);flush();
  assert.equal(host.run('wave'),1);assert.equal(guest.run('wave'),1);
  const hostPending=host.run('pendingSpawns.length');assert.ok(hostPending>0);
  guest.run('simulate(20)');flush();
  assert.equal(guest.run('wave'),1);assert.equal(guest.run('pendingSpawns.length'),0);
  assert.equal(host.run('pendingSpawns.length'),hostPending);
  assert.equal(host.run(`new Set(pendingSpawns.map(s=>s.half)).size`),2);
});

test('guest sends appear once on the opposing shared half on both clients',async()=>{
  const {host,guest,flush}=await fundedArena();
  guest.run(`buySend('miner')`);flush();
  for(const client of [host,guest]) {
    assert.equal(client.run('creeps.filter(c=>c.sent).length'),2);
    assert.equal(client.run(`creeps.every(c=>c.half===ENEMY_HALF)`),true);
  }
  assert.equal(host.run(`mp.arenaPlayers['south:1'].income`),guest.run('player.income'));
});

test('reordered and duplicate guest commands charge resources exactly once',async()=>{
  const {host,guest,flush}=await fundedArena();
  guest.run('buyLumber();buyLumber();');const commands=guest.value('outbox.splice(0)');
  const before=host.run(`mp.arenaPlayers['south:1'].gold`);
  for(const command of [commands[1],commands[0],commands[0],commands[1]])host.run('mpOnMessage('+JSON.stringify(command)+')');
  flush();
  assert.equal(host.run(`mp.arenaPlayers['south:1'].gold`),before-1000);
  assert.equal(guest.run('player.lumber'),102);assert.equal(guest.run('mp.arenaOutbox.length'),0);
});

test('lost guest actions retry and a collision rejects the second build without charging',async()=>{
  const {host,guest,flush}=await fundedArena();const [a]=arenaCells(host);
  guest.run(`buildAt(${JSON.stringify(a)});outbox.length=0;arenaGuestTick(.4);`);flush();
  assert.equal(host.run('towers.size'),1);assert.equal(guest.run('player.gold'),99990);
  host.run(`buildAt(${JSON.stringify(a)})`);flush();
  assert.equal(host.run('towers.size'),1);assert.equal(host.run('player.gold'),100000);
});

test('shared ownership rejects selling or ranking another human tower',async()=>{
  const {host,guest,flush}=await fundedArena();const [a]=arenaCells(host);
  host.run(`buildAt(${JSON.stringify(a)})`);flush();
  guest.run(`selectedGroupKeys=[idx(${a.r},${a.c})];towerAction('sell');`);flush();
  assert.equal(host.run('towers.size'),1);assert.equal(guest.run('player.gold'),100000);
  guest.run(`mpSend({t:'arena-command',match:mp.matchId,seq:2,kind:'rank',args:{keys:[idx(${a.r},${a.c})]}})`);flush();
  assert.equal(host.run('[...towers.values()][0].level'),0);
});

test('north-host shared arena preserves canonical board orientation and own controls',async()=>{
  const {host,guest,flush}=await fundedArena('north');const [a,b]=arenaCells(host);
  host.run(`buildAt(${JSON.stringify(a)})`);flush();guest.run(`buildAt(${JSON.stringify(b)})`);flush();
  assert.equal(host.run('towers.size'),2);assert.equal(guest.run('towers.size'),2);
  assert.equal(host.run(`[...towers.values()].every(t=>halfOfRow(t.r)==='south')`),true);
  assert.deepEqual(host.value('[...towers.values()].map(t=>[t.r,t.c,t.mapSeatKey])'),guest.value('[...towers.values()].map(t=>[t.r,t.c,t.mapSeatKey])'));
});

test('a north human guest builds on the opposite half of the same host world',async()=>{
  const {host,guest,flush}=await fundedArena('south',true);const [a]=arenaCells(guest);
  guest.run(`buildAt(${JSON.stringify(a)})`);flush();
  assert.equal(guest.run('mp.team'),'north');
  assert.equal(host.run('towers.size'),1);
  assert.equal(host.run('[...towers.values()][0].r'),host.run('ROWS-1')-a.r);
  assert.equal(guest.run('[...towers.values()][0].r'),a.r);
  assert.equal(guest.run('[...towers.values()].filter(isMine).length'),1);
});

test('host state heals a missed tower delta and ignores stale snapshots',async()=>{
  const {host,guest,flush}=await fundedArena();const [a]=arenaCells(host);
  host.run('arenaBroadcast(true)');const stale=host.value('outbox.splice(0)');
  host.run(`buildAt(${JSON.stringify(a)});outbox.length=0;simTime+=2.1;arenaHostTick(.3);`);flush();
  assert.equal(guest.run('towers.size'),1);
  for(const packet of stale)guest.run('mpOnMessage('+JSON.stringify(packet)+')');
  assert.equal(guest.run('towers.size'),1);
});

test('shared leaks are applied once and guest legacy life messages cannot change them',async()=>{
  const {host,guest,flush}=await fundedArena();
  host.run(`const leaker=testCreep(1,1,{livesCost:1});resolveLeak(leaker);arenaBroadcast(true);`);flush();
  assert.equal(host.run('player.lives'),99);assert.equal(guest.run('player.lives'),99);
  guest.run(`mpSend({t:'leaks',seat:mpMySeatKey(),value:90,match:mp.matchId})`);flush();
  assert.equal(host.run('player.lives'),99);
});

test('shared glyph protection follows owner purse and includes later builds',async()=>{
  const {host,guest,flush}=await fundedArena();const [a,b,c]=arenaCells(host);
  host.run(`buildAt(${JSON.stringify(a)})`);flush();guest.run(`buildAt(${JSON.stringify(b)});buyGlyph();castGlyph();`);flush();
  assert.equal(host.run(`towerInvulnerable(towers.get(idx(${a.r},${a.c})))`),false);
  assert.equal(host.run(`towerInvulnerable(towers.get(idx(${b.r},${b.c})))`),true);
  guest.run(`buildAt(${JSON.stringify(c)})`);flush();
  assert.equal(host.run(`towerInvulnerable(towers.get(idx(${c.r},${c.c})))`),true);
});

test('AI sends addressed to either human enter the same shared world and keep outcome learning',async()=>{
  const {host,guest,flush}=await fundedArena();
  host.run(`enemy.targetTurn=1;aiDeliverSend(enemy,ENEMY_HALF,SENDS.find(s=>s.id==='miner'));arenaBroadcast(true);`);flush();
  assert.equal(host.run('creeps.length'),2);assert.equal(guest.run('creeps.length'),2);
  assert.equal(host.run('creeps.every(c=>c.aiAttack.ai===enemy)'),true);
  host.run(`for(const c of creeps)recordAiSendOutcome(c,'killed')`);
  assert.equal(host.run(`enemy.attackResults.byId.miner.killed`),2);
});

test('guest licensing updates its builder controls and restores the host builder controls',async()=>{
  const {host,guest,flush}=await fundedArena();host.run('renderTowerList()');
  guest.run(`licenseSecondElement('fire')`);flush();
  assert.equal(host.run('currentBuildRaceId()'),'ice');assert.equal(guest.run('currentBuildRaceId()'),'fire');
  assert.doesNotMatch(host.run("$('tower-list').innerHTML"),/Kindler/);
  assert.match(guest.run("$('tower-list').innerHTML"),/Kindler/);
});

test('shared bounty and kill credit pay the human who owns the damaging tower',async()=>{
  const {host,guest,flush}=await fundedArena();const [a]=arenaCells(host);
  guest.run(`buildAt(${JSON.stringify(a)})`);flush();
  const hostGold=host.run('player.gold'),guestGold=guest.run('player.gold');
  host.run(`const own=towers.get(idx(${a.r},${a.c}));const c=testCreep(own.c,own.r,{hp:100,maxHp:100,bounty:7});applyDamage(c,1,own);applyDamage(c,10000,null,true);arenaBroadcast(true);`);flush();
  assert.equal(host.run('player.gold'),hostGold);assert.equal(guest.run('player.gold'),guestGold+7);
  assert.equal(guest.run('player.kills'),1);
});

test('guest rank, style, sell and undo commands operate on the shared owner tower',async()=>{
  const {host,guest,flush}=await fundedArena();const [a]=arenaCells(host);
  guest.run(`buildAt(${JSON.stringify(a)})`);flush();
  host.run(`simTime=3;for(const t of towers.values())t.buildUntil=0;arenaBroadcast(true)`);flush();
  guest.run(`selectedGroupKeys=[idx(${a.r},${a.c})];towerAction('level')`);flush();
  assert.equal(host.run('[...towers.values()][0].level'),1);assert.equal(guest.run('[...towers.values()][0].level'),1);
  guest.run(`towerAction('sell')`);flush();assert.equal(host.run('towers.size'),0);
  guest.run('undoAction()');flush();assert.equal(host.run('towers.size'),1);assert.equal(guest.run('towers.size'),1);
});

test('shared final results agree for human teammates',async()=>{
  const {host,guest,flush}=await fundedArena();
  host.run(`mp.myLeaks=100;mpSyncTeamLives();endMatch('defeat')`);flush();
  for(const c of [host,guest]){assert.equal(c.run('matchOver'),true);assert.match(c.run("$('wave-banner').textContent"),/DEFEAT/);}
});

test('3v3 shared world publishes all four computer mazes alongside both humans',async()=>{
  const {host,guest,flush}=await runningMultiplayerRoom(3,'south',true);const [a,b]=arenaCells(host);
  host.run(`for(const p of Object.values(mp.arenaPlayers))p.gold=100000;arenaBroadcast(true)`);flush();
  host.run(`buildAt(${JSON.stringify(a)})`);flush();guest.run(`buildAt(${JSON.stringify(b)})`);flush();
  host.run(`for(const key of mpAllBotSeatKeys()){const {ai,half}=mpLocalBot(key);ai.gold=10000;ai.buildClock=0;if(ai===enemy)updateEnemyAI(.1);else updateAlly(ai,.1);}arenaBroadcast(true);`);flush();
  assert.equal(guest.run(`new Set([...towers.values()].map(t=>mpTowerSeatKey(t))).size`),6);
  assert.deepEqual(guest.value(`[...towers.values()].map(t=>[t.r,t.c,mpTowerSeatKey(t)]).sort()`),host.value(`[...towers.values()].map(t=>[t.r,t.c,mpTowerSeatKey(t)]).sort()`));
});

test('Earth choices synchronize through the shared action and tower state',async()=>{
  const {host,guest,flush}=await fundedArena();const [a]=arenaCells(host);
  host.run(`mp.arenaPlayers['south:1'].races=['earth'];arenaBroadcast(true)`);flush();
  guest.run(`buildAt(${JSON.stringify(a)})`);flush();
  host.run(`simTime=3;for(const t of towers.values())t.buildUntil=0;arenaBroadcast(true)`);flush();
  guest.run(`selectedGroupKeys=[idx(${a.r},${a.c})];towerAction('batch:earth:tremor')`);flush();
  assert.equal(host.run('[...towers.values()][0].earthStyle'),'tremor');
  assert.equal(guest.run('[...towers.values()][0].earthStyle'),'tremor');
});

test('opposing-client chain lightning effect endpoints flip with the battlefield',()=>{
  const {run,value}=boot();run(`mp.team='north';`);
  const encoded=value(`arenaEntity({kind:'bolt',x1:12,y1:20,x2:18,y2:25},true)`);
  assert.equal(encoded.y1,run('ROWS-20'));assert.equal(encoded.y2,run('ROWS-25'));
  assert.deepEqual(value(`arenaEntity(${JSON.stringify(encoded)},false)`),{kind:'bolt',x1:12,y1:20,x2:18,y2:25});
});

test('shared rooms refuse an older client before seating it',async()=>{
  const {run}=boot();run(`$('team-select').value='2';$('mp-name').value='Abdy';mpMakeMqttTransport=async()=>({send(){},close(){}});mpStartHelloLoop=()=>{};`);
  await run('mpOpenRoom(false)');run(`mpOnMessage({t:'hello',sid:'old-client',name:'Old',race:'ice'})`);
  assert.equal(run(`!!mp.peers['old-client']`),false);
});

test('duplicate tower keys cannot multiply shared sell refunds',async()=>{
  const {host,guest,flush}=await fundedArena();const [a]=arenaCells(host);
  guest.run(`buildAt(${JSON.stringify(a)})`);flush();const before=guest.run('player.gold');
  guest.run(`for(const seq of [2,3])mpSend({t:'arena-command',match:mp.matchId,seq,kind:'tower',args:{kind:'sell',keys:[idx(${a.r},${a.c}),idx(${a.r},${a.c})]}})`);flush();
  assert.equal(host.run('towers.size'),1);assert.equal(guest.run('player.gold'),before);
});

test('landscape board fitting reserves the measured header and navigation at short heights',()=>{
  const {run}=boot();run(`document.body.classList.add('arena');innerHeight=390;
    $('hud-bar').offsetHeight=120;$('status-line').offsetHeight=0;$('command-bar').offsetHeight=0;
    $('mobile-tactical-nav').offsetHeight=60;$('map-viewport').clientWidth=760;$('map-viewport').clientHeight=200;
    $('map-viewport').getBoundingClientRect=()=>({top:120,left:0,width:760,height:200});fitBoardToViewport();`);
  assert.equal(run("$('map-viewport').style.height"),'200px');
  assert.ok(run('frameBase.height')<=200);
});

test('computers buy attackers one body a lane and wait 45 seconds between attacker purchases', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => {
    matchMode='classic';simTime=300;enemy.lives=100;
    const ai=makeAlly(PLAYER_HALF,1,'tech',2);
    Object.assign(ai,{gold:20000,economyGold:0,pressureGold:16000,budgetGold:20000,towersBuilt:12,shrine:4,lumber:10,pressureTurn:5});
    ai.attackPlan=aiAttackPlan(ai);aiSendPressure(ai,PLAYER_HALF);
    const first=creeps.filter(c=>c.attacker).length, at=ai.lastAttackerAt;
    ai.pressureTurn=5;aiSendPressure(ai,PLAYER_HALF);
    const again=creeps.filter(c=>c.attacker).length;
    simTime=360;ai.pressureTurn=5;ai.pressureGold=16000;ai.gold=20000;ai.budgetGold=20000;aiSendPressure(ai,PLAYER_HALF);
    const later=creeps.filter(c=>c.attacker).length;
    return [first,at,again,later];
  })()`),[2,300,2,4]);
});

test('computer breadth ends at 24 towers and the fast Shrine ramp stops at Shrine 5', () => {
  const {value}=boot();
  assert.deepEqual(value(`(() => { matchMode='classic';
    const breadth=[0,600,2000].map(t=>{simTime=t;return aiBreadthTarget();});
    const shrine=[480,840,1000,1050,1470].map(t=>{simTime=t;return desiredAiShrine();});
    return [breadth,shrine]; })()`),[[12,24,24],[5,5,5,6,8]]);
});

test('a human can pick Random and gets a real element when the match starts', () => {
  const {run,value}=boot();
  assert.deepEqual(value(`(() => { lobbyPickRace('random'); const chip=randomRace===true && profile.randomRace===true;
    lobbyPickRace('fire'); const off=randomRace===false && selectedRace.id==='fire';
    lobbyPickRace('random'); startBattle(); const real=races.some(r=>r.id===player.races[0]) && selectedRace.id===player.races[0];
    return [chip,off,real,randomRace]; })()`),[true,true,true,true]);
});


test('finishing and timed-out computers spend affordable singles instead of waiting for bursts', () => {
  for (const finish of [true,false]) {
    const {value}=boot();
    const result=value(`(() => {
      matchMode='classic';simTime=100;
      const ai=makeAlly(PLAYER_HALF,1,'tech',2);
      Object.assign(ai,{gold:10,pressureGold:10,economyGold:0,budgetGold:10,income:0,shrine:1,pressureTurn:0,towersBuilt:12,
        preparingAttack:{id:'stalker'},preparingSince:0});
      ai.attackPlan={shrine:1,burst:3,finish:${finish},blocked:false,pressureShare:.75};
      aiSendPressure(ai,PLAYER_HALF);
      return [ai.sendStats?.purchases || 0,ai.gold,creeps.filter(c=>c.sent).length];
    })()`);
    assert.ok(result[0]>0,'affordable sends must be bought');
    assert.ok(result[1]<10);assert.ok(result[2]>0);
  }
});

test('remembered Random survives room creation, guest hello, and seat changes', async () => {
  const c=boot();c.run(`lobbyPickRace('random');$('mp-name').value='Abdy';$('mp-code').value='ABCD';$('team-select').value='2';
    battleRunning=false;globalThis.sent=[];globalThis.presences=[];
    mpMakeMqttTransport=async(code,receive,onOpen)=>{globalThis.connect=onOpen;return {send:m=>sent.push(m),presence:(k,m)=>presences.push(m),close:()=>{}};};
    mpStartHelloLoop=()=>{};mpStatus=()=>{};openLobby=()=>{};`);
  await c.run('mpOpenRoom(false)');
  assert.equal(c.run('roster.south[0].raceId'),'random');
  c.run("mp.active=true;mpSit('south',1)");
  assert.equal(c.run('roster.south[1].raceId'),'random');
  await c.run('mpOpenRoom(true)');c.run('connect()');
  assert.equal(c.value('presences.filter(m=>m?.t==="hello").map(m=>m.race)').at(-1),'random');
});
