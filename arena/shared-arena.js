/* Shared multiplayer arena. Only the host advances combat. Clients submit
   ordered, acknowledged intents; personal purses and tower ownership stay
   separate while pathfinding, creeps, damage and team lives share one world. */
const ARENA_PROTOCOL = 'shared-arena-1';
function arenaActive() { return !!(mp.active && mp.started && mp.sharedArena); }
function arenaRemoteAction() { return arenaActive() && !!mp.arenaActor && mp.arenaActor!==mpMySeatKey(); }
function arenaActingHalf() {
  const seat=arenaActive() && mp.arenaActor && mpSeatByKey(mp.arenaActor);
  return seat && seat.half!==mp.team ? 'north' : 'south';
}
function arenaTowerPurse(tower) {
  if(!arenaActive() || !tower)return null;
  return arenaPurseForSeat(mpTowerSeatKey(tower));
}
function arenaPurseForSeat(key){return key&&(mp.arenaPlayers?.[key] || mpLocalBot(key)?.ai) || null;}
function arenaInit() {
  document.body.classList.toggle('shared-arena',arenaActive());
  if(!arenaActive())return;
  mp.arenaActor=null;mp.arenaExecuting=false;mp.arenaUI={};mp.arenaPlayers={};
  mp.arenaNotices={};mp.arenaAcks={};mp.arenaInbox={};mp.arenaOutbox=[];
  mp.arenaCommandSeq=0;mp.arenaStateSeq=0;mp.arenaReceivedSeq=0;
  mp.arenaClock=0;mp.arenaRetry=0;mp.arenaPing=0;mp.arenaFullAt=-99;
  mp.arenaTowerSigs={};mp.arenaResult=null;mp.arenaReady=mp.role==='host';
  for(const half of ['north','south'])for(const s of mpSeatsInPlay(half)) {
    if(s.kind!=='human')continue;
    const key=mpSeatKey(half,s.index),pos=mpSeatsInPlay(half).findIndex(v=>v.index===s.index);
    mp.arenaPlayers[key]=key===mpMySeatKey()?player:{
      gold:START_GOLD,income:0,lives:startingLives(),kills:0,lumber:0,woodIncome:0,woodBank:0,
      shrine:1,sendTraining:0,glyphCharges:0,glyphUntil:0,glyphReadyAt:0,
      races:[s.raceId || races[0].id],lumberSpent:0,startLives:startingLives(),
      seat:pos,lane:seatLane(half,pos,mpSeatsInPlay(half).length),zone:seatZone(half,pos,mpSeatsInPlay(half).length)
    };
  }
}
function arenaRoute(kind,args) {
  if(!arenaActive() || mp.arenaExecuting)return null;
  if(!battleRunning || matchOver)return {value:false};
  if(kind==='send'&&SENDS.some(s=>s.id===args.id))autoSend.last=args.id;
  if(mp.role==='host')return {value:arenaExecute(mpMySeatKey(),kind,args)};
  if(mp.arenaOutbox.length>=128){log('Waiting for the host to acknowledge your actions.');return {value:false};}
  const command={t:'arena-command',match:mp.matchId,seq:++mp.arenaCommandSeq,kind,args};
  mp.arenaOutbox.push(command);mpSend(command);return {value:true};
}
function arenaHostKey(key,half) {
  if(!Number.isSafeInteger(key)||key<0||key>=ROWS*COLS)return null;
  const r=Math.floor(key/COLS),c=key%COLS;
  if(r<SOUTH_TOP || r>SOUTH_BOT)return null;
  return idx(half==='south'?r:ROWS-1-r,c);
}
function arenaUIState() {
  return {selectedRace,buildRaceIdx,selectedTowerTier,selectedTowerKey,selectedGroupKeys,
    globalPriority,lastPlaced,lastSold,pendingSell,ghost,inspectEntity};
}
function arenaRestoreUI(s) {
  ({selectedRace,buildRaceIdx,selectedTowerTier,selectedTowerKey,selectedGroupKeys,
    globalPriority,lastPlaced,lastSold,pendingSell,ghost,inspectEntity}=s);
}
function arenaExecute(key,kind,args={}) {
  if(mp.role!=='host'||!battleRunning||matchOver)return false;
  const seat=mpSeatByKey(key),purse=mp.arenaPlayers[key];
  if(!seat||seat.kind!=='human'||!purse||!args||typeof args!=='object')return false;
  const saved=arenaUIState(),savedPlayer=player,remote=key!==mpMySeatKey();
  mp.arenaActor=key;mp.arenaExecuting=true;player=purse;
  if(remote)arenaRestoreUI(mp.arenaUI[key] || {...saved,selectedRace:races.find(r=>r.id===purse.races[0])||races[0],
    buildRaceIdx:0,selectedTowerTier:0,selectedTowerKey:null,selectedGroupKeys:[],globalPriority:'first',
    lastPlaced:null,lastSold:null,pendingSell:null,ghost:null,inspectEntity:null});
  let result=false;
  try {
    const half=arenaActingHalf();
    let keys=[];
    if(args.keys!==undefined) {
      if(!Array.isArray(args.keys)||args.keys.length>1024||new Set(args.keys).size!==args.keys.length)return false;
      keys=args.keys.map(k=>arenaHostKey(k,half));
      if(keys.some(k=>k===null||!isMine(towers.get(k))))return false;
      selectedGroupKeys=keys;selectedTowerKey=keys[0]??null;
    }
    if(kind==='build'||kind==='sell-at') {
      const cell=args.cell;
      if(!cell||!Number.isSafeInteger(cell.r)||!Number.isSafeInteger(cell.c)||cell.r<SOUTH_TOP||cell.r>SOUTH_BOT||cell.c<0||cell.c>=COLS)return false;
      const target={r:half==='south'?cell.r:ROWS-1-cell.r,c:cell.c};
      if(kind==='sell-at')result=sellTowerAt(target);
      else {
        if(!purse.races.includes(args.race)||!Number.isSafeInteger(args.tier)||args.tier<0||!towerListFor(args.race)[args.tier])return false;
        buildRaceIdx=purse.races.indexOf(args.race);selectedTowerTier=args.tier;
        const before=towers.size;buildAt(target);result=towers.size>before;
      }
    } else if(kind==='tower') {
      if(typeof args.kind!=='string'||args.kind.length>80||!keys.length)return false;
      towerAction(args.kind);result=true;
    } else if(kind==='batch') {
      if(typeof args.action!=='string'||args.action.length>80)return false;
      batchAction(keys.map(k=>towers.get(k)),args.action);result=true;
    } else if(kind==='rank')result=keys.every(k=>boostTowerRank(towers.get(k)));
    else if(kind==='bulwark')result=keys.every(k=>boostBulwark(towers.get(k)));
    else if(kind==='lumber')result=buyLumber();
    else if(kind==='shrine')result=upgradeShrine();
    else if(kind==='training')result=buySendTraining();
    else if(kind==='glyph-buy')result=buyGlyph();
    else if(kind==='glyph-cast')result=castGlyph();
    else if(kind==='license') {
      if(args.id && (!races.some(r=>r.id===args.id)||purse.races.includes(args.id)))return false;
      result=licenseSecondElement(args.id);
    } else if(kind==='priority') {
      if(!priorities.includes(args.next))return false;
      applyGlobalPriority(args.next);result=true;
    } else if(kind==='undo'){undoAction();result=true;}
    else if(kind==='undo-sell')result=undoSell();
    else if(kind==='send')result=arenaPurchaseSend(args.id,key);
    return result;
  } finally {
    mp.arenaUI[key]=arenaUIState();player=savedPlayer;
    if(remote)arenaRestoreUI(saved);
    mp.arenaActor=null;mp.arenaExecuting=false;
    arenaBroadcast(false);renderHud();
    if(remote){renderTowerList();renderTowerDetails();renderRing();}
  }
}
function arenaPurchaseSend(id,key) {
  const base=SENDS.find(s=>s.id===id);if(!base)return false;
  const send=trainedSend(base),source=mpSeatByKey(key),foe=source.half==='south'?'north':'south';
  const target=mpSeatsInPlay(foe)[0];if(!target)return false;
  if(player.shrine<send.shrine||player.gold<send.cost||player.lumber<(send.lumber||0))return false;
  player.gold-=send.cost;player.lumber-=send.lumber||0;player.lumberSpent+=send.lumber||0;
  player.income+=send.income||0;player.woodIncome+=send.woodIncome||0;
  const half=foe===mp.team?'south':'north',targetKey=mpSeatKey(foe,target.index);
  spawnSend(send,half,'west',null,targetKey);spawnSend(send,half,'east',null,targetKey);
  log(`${send.name} × 2 sent to the ${foe} team's shared maze.`);
  return true;
}
/* Wire coordinates are always canonical north/south, independent of which
   team hosts. Only rendering/control coordinates are local to a client. */
function arenaFlipRow(r) { return ROWS-1-r; }
function arenaEntity(entity,toWire) {
  const out={};
  for(const [k,v] of Object.entries(entity)) {
    if(k.startsWith('_')||['path','target','tower','stats','rankVictims','beamTo','dots','cooldown'].includes(k))continue;
    if(v===null||typeof v==='string'||typeof v==='boolean'||(typeof v==='number'&&Number.isFinite(v)))out[k]=v;
    else if(Array.isArray(v)&&v.every(x=>['string','number','boolean'].includes(typeof x)))out[k]=v.slice();
  }
  const flip=mp.team==='north';
  if(flip){if(Number.isFinite(out.r))out.r=arenaFlipRow(out.r);if(Number.isFinite(out.y))out.y=ROWS-out.y;
    for(const p of ['sy','ty','y1','y2'])if(Number.isFinite(out[p]))out[p]=ROWS-out[p];
    if(out.half)out.half=out.half==='south'?'north':'south';
    if(out.allyHalf)out.allyHalf=out.allyHalf==='south'?'north':'south';}
  if(entity.beamTo)out.beamTo={x:entity.beamTo.x,y:flip?ROWS-entity.beamTo.y:entity.beamTo.y};
  if(entity.dots)out.dots=entity.dots.length?[{}]:[];
  if(Number.isInteger(out.r)&&Number.isInteger(out.c))out.key=idx(out.r,out.c);
  if(!toWire&&out.mapSeatKey) {
    const own=out.mapSeatKey===mpMySeatKey(),seat=mpSeatByKey(out.mapSeatKey);
    out.owner=seat?.half===mp.team?'player':'enemy';
    if(own){delete out.allySeat;delete out.allyHalf;}
    else if(seat){out.allyHalf=seat.half===mp.team?'south':'north';out.allySeat=mpSeatsInPlay(seat.half).findIndex(s=>s.index===seat.index);}
  }
  return out;
}
function arenaPack(rows) {
  const fields=[...new Set(rows.flatMap(row=>Object.keys(row)))];
  return {f:fields,r:rows.map(row=>{const values=fields.map(k=>row[k]??null);while(values.at(-1)===null)values.pop();return values;})};
}
function arenaUnpack(data,limit) {
  if(Array.isArray(data))return data.length<=limit?data:null;
  if(!data||!Array.isArray(data.f)||!Array.isArray(data.r)||data.r.length>limit||data.f.length>180||data.f.some(k=>typeof k!=='string'||['__proto__','constructor','prototype'].includes(k)))return null;
  if(data.r.some(row=>!Array.isArray(row)||row.length>data.f.length))return null;
  return data.r.map(values=>Object.fromEntries(values.flatMap((v,i)=>v===null?[]:[[data.f[i],v]])));
}
function arenaBroadcast(forceFull=false) {
  if(!arenaActive()||mp.role!=='host'||!mp.arenaPlayers)return;
  const full=forceFull||simTime-mp.arenaFullAt>2;
  if(full)mp.arenaFullAt=simTime;
  const next={},changed=[];
  for(const t of towers.values()) {
    const row=arenaEntity({...t,mapSeatKey:mpTowerSeatKey(t)},true),signature=JSON.stringify(row);
    next[row.key]=signature;if(full||mp.arenaTowerSigs[row.key]!==signature)changed.push(row);
  }
  const removed=Object.keys(mp.arenaTowerSigs).filter(k=>!(k in next)).map(Number);
  mp.arenaTowerSigs=next;
  const incomes={},builders={};
  for(const key of mpAllBotSeatKeys()){const local=mpLocalBot(key);if(local){incomes[key]=local.ai.income;builders[key]=local.ai.raceId;}}
  for(const [key,p] of Object.entries(mp.arenaPlayers)){incomes[key]=p.income;p.lives=mpTeamLives(mpSeatByKey(key).half);}
  mp.seatIncome={...mp.seatIncome,...incomes};mp.seatRace={...mp.seatRace,...builders};
  const state={t:'arena-state',match:mp.matchId,seq:++mp.arenaStateSeq,full,towers:changed,removed,
    creeps:creeps.filter(c=>c.hp>0).map(c=>arenaEntity(c,true)),
    shots:projectiles.slice(-120).map(p=>({...arenaEntity(p,true),towerKey:arenaEntity(p.tower,true).key,targetId:p.target?.id,stats:p.stats})),
    effects:effects.slice(-100).map(e=>arenaEntity(e,true)),players:mp.arenaPlayers,acks:mp.arenaAcks,notices:mp.arenaNotices,
    incomes,builders,leaks:{...mp.seatLeaks,[mpMySeatKey()]:mp.myLeaks},time:simTime,wave,waveClock,incomeClock,
    over:matchOver,result:mp.arenaResult,hostTeam:mp.team};
  for(const field of ['towers','creeps','shots','effects'])state[field]=arenaPack(state[field]);
  mpSend(state);
}
function arenaApplyState(msg) {
  if(mp.role!=='guest'||(msg.__from||msg.sid)!==mp.hostSid||msg.match!==mp.matchId||!Number.isSafeInteger(msg.seq)||msg.seq<=mp.arenaReceivedSeq)return;
  const decoded={...msg};
  for(const [field,limit] of [['towers',ROWS*COLS],['creeps',400],['shots',120],['effects',100]]){decoded[field]=arenaUnpack(msg[field]||[],limit);if(!decoded[field])return;}
  msg=decoded;
  if(!Number.isFinite(msg.time)||!msg.players?.[mpMySeatKey()])return;
  if(mp.arenaReceivedSeq&&msg.seq!==mp.arenaReceivedSeq+1&&!msg.full&&msg.time-(mp.arenaResyncAt??-99)>.75){mp.arenaResyncAt=msg.time;mpSend({t:'arena-resync',match:mp.matchId});}
  mp.lastRecv=performance.now();if(mp.dropped){mp.dropped=false;showToast('<b>Shared match reconnected</b>');}
  mp.arenaReceivedSeq=msg.seq;mp.arenaReady=true;
  const oldCreeps=new Map(creeps.map(c=>[c.id,c]));
  const elapsed=Math.max(.05,msg.time-(mp.arenaSnapshotTime??msg.time-.2));mp.arenaSnapshotTime=msg.time;
  const previousWave=wave;
  simTime=msg.time;wave=msg.wave;waveClock=msg.waveClock;incomeClock=msg.incomeClock;
  if(msg.full)towers.clear();
  for(const k of msg.removed||[]){const r=Math.floor(k/COLS),c=k%COLS;towers.delete(idx(mp.team==='north'?arenaFlipRow(r):r,c));}
  for(const row of msg.towers){const t=arenaEntity(row,false);if(inBounds(t.r,t.c)&&mpSeatByKey(t.mapSeatKey))towers.set(t.key,t);}
  if(msg.full||msg.towers.length||(msg.removed||[]).length){towersVersion++;crystalCacheVersion=-1;refreshRouteDebug();}
  creeps.length=0;
  for(const row of msg.creeps){const c=arenaEntity(row,false),old=oldCreeps.get(c.id);
    c._baseX=c.x;c._baseY=c.y;c._viewAge=0;c._vx=old?(c.x-old._baseX)/elapsed:0;c._vy=old?(c.y-old._baseY)/elapsed:0;creeps.push(c);}
  projectiles.length=0;
  for(const row of msg.shots||[]){const p=arenaEntity(row,false),wireR=Math.floor(row.towerKey/COLS),wireC=row.towerKey%COLS;
    p.tower=towers.get(idx(mp.team==='north'?arenaFlipRow(wireR):wireR,wireC));p.target=creeps.find(c=>c.id===row.targetId)||null;p.stats=row.stats;
    if(p.tower&&p.stats)projectiles.push(p);}
  effects.length=0;for(const e of msg.effects||[])effects.push(arenaEntity(e,false));
  const oldRaces=player.races.join(','),oldPurseUI=[player.shrine,player.lumber,player.glyphCharges,player.sendTraining].join(':');
  mp.arenaPlayers=msg.players;Object.assign(player,msg.players[mpMySeatKey()]);mp.arenaPlayers[mpMySeatKey()]=player;
  if(oldRaces!==player.races.join(',')){buildRaceIdx=player.races.length-1;selectedTowerTier=0;}
  mp.seatIncome={...mp.seatIncome,...msg.incomes};mp.seatRace={...mp.seatRace,...msg.builders};
  mp.seatLeaks={...msg.leaks};mp.myLeaks=msg.leaks?.[mpMySeatKey()]||0;mpSyncTeamLives();
  const ack=msg.acks?.[mpMySeatKey()]||0;mp.arenaOutbox=mp.arenaOutbox.filter(c=>c.seq>ack);
  const notice=msg.notices?.[mpMySeatKey()];if(notice&&notice!==mp.arenaLastNotice){mp.arenaLastNotice=notice;log(notice);}
  selectedGroupKeys=selectedGroupKeys.filter(k=>isMine(towers.get(k)));if(!towers.has(selectedTowerKey))selectedTowerKey=null;
  if(inspectEntity){const ref=inspectEntity.ref;const live=inspectEntity.kind==='creep'?creeps.find(c=>c.id===ref?.id):towers.get(ref?.key);inspectEntity=live?{...inspectEntity,ref:live}:null;}
  renderHud();
  if(oldRaces!==player.races.join(',')||oldPurseUI!==[player.shrine,player.lumber,player.glyphCharges,player.sendTraining].join(':'))renderTowerList();
  if(wave>previousWave&&autoSend.on&&autoSend.last&&!msg.over)buySend(autoSend.last);
  if(msg.over&&!matchOver)endMatch(msg.hostTeam===mp.team?msg.result:(msg.result==='victory'?'defeat':'victory'),false);
}
function arenaReceive(msg) {
  if(!arenaActive())return false;
  if(msg.t==='arena-state'){arenaApplyState(msg);return true;}
  if(msg.t==='arena-command') {
    if(mp.role!=='host'||msg.match!==mp.matchId)return true;
    const seat=mpSeatForSid(msg.__from||msg.sid),seq=msg.seq;
    if(!seat||!Number.isSafeInteger(seq)||seq<1||typeof msg.kind!=='string'||msg.kind.length>32)return true;
    const key=seat.key,last=mp.arenaAcks[key]||0;
    if(seq<=last){arenaBroadcast(false);return true;}
    if(seq>last+128)return true;
    const inbox=mp.arenaInbox[key] ||= {};inbox[seq]=msg;
    let next=(mp.arenaAcks[key]||0)+1;
    while(inbox[next]) {
      const command=inbox[next];delete inbox[next];
      try{arenaExecute(key,command.kind,command.args);}catch(error){mp.arenaNotices[key]='That action could not be applied. Your shared board has been refreshed.';}
      mp.arenaAcks[key]=next++;
    }
    arenaBroadcast(false);return true;
  }
  if(msg.t==='arena-resync'||msg.t==='arena-ping') {
    if(mp.role==='host'&&msg.match===mp.matchId&&mpSeatForSid(msg.__from||msg.sid)){mp.lastRecv=performance.now();if(msg.t==='arena-resync')arenaBroadcast(true);}
    return true;
  }
  if(msg.t==='send') {
    if(mp.role==='host') {
      const seats=mpAttackSeats(msg),base=SENDS.find(s=>s.id===msg.id);
      if(seats?.source.kind==='ai'&&base){const half=seats.target.half===mp.team?'south':'north';
        const attack=msg.aiAttack?{id:msg.aiAttack,replyTo:mp.sid}:null;
        spawnSend(base,half,'west',attack,seats.target.key);spawnSend(base,half,'east',attack,seats.target.key);}
    }
    return true;
  }
  // The host state owns these values. Legacy seat snapshots must not mutate it.
  if(['snap','income','leaks','lives','over','wager','wager-verdict'].includes(msg.t))return true;
  return false;
}
function arenaHostTick(dt) {
  mp.arenaClock-=dt;if(mp.arenaClock<=0){mp.arenaClock=.2;mpSyncTeamLives();arenaBroadcast(false);}
  mp.fxOut=[];mp.fxSeatOut={};
}
function arenaGuestTick(dt) {
  if(mp.lastRecv&&performance.now()-mp.lastRecv>9000&&!mp.dropped){mp.dropped=true;showToast('<b>Host connection lost</b><span>Your actions will wait for reconnection.</span>');}
  mp.arenaRetry-=dt;mp.arenaPing-=dt;
  if(mp.arenaRetry<=0){mp.arenaRetry=.35;for(const c of mp.arenaOutbox.slice(0,8))mpSend(c);}
  if(mp.arenaPing<=0){mp.arenaPing=2;mpSend({t:mp.arenaReady?'arena-ping':'arena-resync',match:mp.matchId});}
  simTime=Math.min((mp.arenaSnapshotTime||0)+.25,simTime+dt);
  for(const c of creeps){c._viewAge=Math.min(.15,(c._viewAge||0)+dt);
    c.x=c._baseX+Math.max(-1,Math.min(1,c._vx*c._viewAge));c.y=c._baseY+Math.max(-1,Math.min(1,c._vy*c._viewAge));}
}
function arenaRender() {
  if(!mpMapSourceCanvas)mpMapSourceCanvas=document.createElement('canvas');
  const w=Math.round(BOARD_W*dpr),h=Math.round(BOARD_H*dpr);
  if(mpMapSourceCanvas.width!==w||mpMapSourceCanvas.height!==h){mpMapSourceCanvas.width=w;mpMapSourceCanvas.height=h;}
  const display=fxCtx,source=mpMapSourceCanvas.getContext('2d');source.setTransform(dpr,0,0,dpr,0,0);
  try{mpDrawingMapSource=true;fxCtx=source;renderLocalFrame();}finally{mpDrawingMapSource=false;fxCtx=display;}
  display.setTransform(dpr,0,0,dpr,0,0);display.clearRect(0,0,BOARD_W,BOARD_H);display.save();
  try{if(mp.team==='north'){display.translate(0,BOARD_H);display.scale(1,-1);}display.drawImage($('board-canvas'),0,0,BOARD_W,BOARD_H);display.drawImage(mpMapSourceCanvas,0,0,BOARD_W,BOARD_H);}finally{display.restore();}
}
function arenaInspect(point) {
  const xy=mpMapUnprojectPoint(mpMySeatKey(),point.mapX,point.mapY),tower=towers.get(idx(Math.floor(xy[1]),Math.floor(xy[0])));
  const creep=creeps.find(c=>Math.hypot(c.x-xy[0],c.y-xy[1])<.8);
  inspectEntity=tower?{kind:'enemy',ref:tower}:creep?{kind:'creep',ref:creep}:null;
  if(touchUI()&&inspectEntity){wispTab='inspect';renderWispPanel('inspect');}
  if(tower)log(`${mpSeatDisplayName(mpSeatByKey(mpTowerSeatKey(tower)))} built ${towerLiveStats(tower).name}.`);
}
