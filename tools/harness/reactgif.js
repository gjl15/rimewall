/* reactgif.js <index.html> <outdir> [reaction,...] : record every elemental reaction in live play.
   For each reaction: a fresh Survival board, the primer element's and the trigger element's top damage
   towers either side of the west band, a pack of slowed creeps walked past them, and the game's own
   board + effects canvases read back every other 1/30 s step and cropped around the action. Frames
   land in <outdir>/<id>/NNN.png; a log line per reaction counts how often it actually fired.
   Assemble with ImageMagick:  convert -delay 7 -loop 0 <outdir>/<id>/*.png <id>.gif            */
const fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const HTML=fs.readFileSync(process.argv[2],'utf8');const DIR=path.dirname(process.argv[2]);const OUT=process.argv[3]||'out-gifs';
const ONLY=(process.argv[4]||'').split(',').filter(Boolean);
const TOP={ice:5,fire:5,earth:4,tech:4,crystal:5,poison:5,stone:4,electricity:5,gravity:5,beam:5,ninja:4,wind:4};
(async()=>{const b=await chromium.launch({headless:true,args:['--no-sandbox']});
const ids=await (async()=>{const p=await (await b.newContext()).newPage();await p.route('https://rimewall.local/**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:HTML}));await p.goto('https://rimewall.local/index.html');await p.waitForTimeout(600);const v=await p.evaluate(()=>REACTIONS.map(r=>r.id));await p.close();return v;})();
for(const id of ids){ if(ONLY.length&&!ONLY.includes(id))continue;
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
  await p.route('https://rimewall.local/**',r=>{const f=new URL(r.request().url()).pathname.slice(1);if(f&&f!=='index.html'&&fs.existsSync(path.join(DIR,f)))return r.fulfill({status:200,body:fs.readFileSync(path.join(DIR,f))});r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:HTML});});
  await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.goto('https://rimewall.local/index.html');await p.waitForTimeout(700);await p.click('#start-button');await p.waitForTimeout(300);
  await p.evaluate(()=>{soloRules=false;document.getElementById('mode-select').value='survival';pendingSeed=9;});await p.click('#lb-ready').catch(()=>{});await p.waitForTimeout(1500);
  const setup=await p.evaluate(({id,TOP})=>{document.querySelectorAll('.coach-card').forEach(c=>c.remove());battlePaused=true;SFX.play=()=>{};
    waveClock=1e9;pendingSeed=0;pendingSpawns.length=0;creeps.length=0;player.lives=1e6;
    const rx=REACTIONS.find(r=>r.id===id);const R=S_MID_R,C0=7;
    const place=(race,pref)=>{for(const [dr,dc] of pref){const r=R+dr,c=C0+dc;if(isBuildableCell(r,c,PLAYER_HALF)){const t=makeTower(r,c,race,Math.min(TOP[race],TOWERS[race].length-1),'player');addTower(t);t.buildUntil=-1;t.level=t.maxLevel||t.level;return t;}}return null;};
    const t1=place(rx.primer[0],[[-1,4],[-1,3],[-2,4],[-1,5]]);const t2=place(rx.trigger,[[1,6],[1,7],[2,6],[1,5]]);
    towersVersion++;redrawBoard&&redrawBoard();
    // a pack of creeps walking east along the band toward the middle flag
    for(let i=0;i<4;i++){spawnSend({...SENDS[3],hp:rx.id==='execute'?2600:60000,aClass:'medium'},PLAYER_HALF,'west');}
    const pack=creeps.slice();pack.forEach((c,i)=>{c.x=C0+.5-i*.95;c.y=R+.5;c.cpIndex=2;c.path=null;c.spd=.75;c.shield=0;c.shieldMax=0;c.state='walk';});
    if(rx.id==='execute')pack.forEach(c=>{c.hp=c.maxHp*.35;});
    const bc=document.getElementById('board-canvas'),fc=document.getElementById('fx-canvas');
    return {name:rx.name,primer:rx.primer[0],trigger:rx.trigger,t1:!!t1,t2:!!t2,bw:bc.width,fw:fc.width,BOARD_W,CELL,R,C0};},{id,TOP});
  fs.mkdirSync(path.join(OUT,id),{recursive:true});
  let fired=0,n=0;const hitFrames=[];
  for(let step=0;step<150;step++){
    const r=await p.evaluate(({step})=>{const before=effects.length;simulate(1/30);
      window.__px=(window.__px||[]);if(step%30===0)window.__px.push(creeps.map(c=>c.x.toFixed(1)).join('/'));const hitL=effects.slice(before).filter(e=>e.kind==='num'&&e.big&&REACTIONS.some(x=>x.name===e.text)).map(e=>e.text);const hits=hitL.length;
      if(step%2)return {hits,hitL};
      renderFrame();
      const bc=document.getElementById('board-canvas'),fc=document.getElementById('fx-canvas');
      const k=fc.width/BOARD_W, kb=bc.width/BOARD_W;
      const c0=(S_MID_R-4)*CELL, x0=3*CELL, w=13*CELL, h=8*CELL;
      const out=document.createElement('canvas');const S=2;out.width=w*S/ (k>=2?1:1);out.height=h*S;
      const g=out.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
      g.drawImage(bc,x0*kb,c0*kb,w*kb,h*kb,0,0,out.width,out.height);g.drawImage(fc,x0*k,c0*k,w*k,h*k,0,0,out.width,out.height);
      return {hits,hitL,png:out.toDataURL('image/png')};},{step});
    fired+=r.hits;if(r.hits)hitFrames.push(Math.floor(step/2)+':'+r.hitL.join('+'));
    if(r.png){fs.writeFileSync(path.join(OUT,id,String(n++).padStart(3,'0')+'.png'),Buffer.from(r.png.split(',')[1],'base64'));}
  }
  const px=await p.evaluate(()=>window.__px);console.log(JSON.stringify({id,...setup,fired,frames:n,hitFrames,errs}));
  await ctx.close();
}
await b.close();})();
