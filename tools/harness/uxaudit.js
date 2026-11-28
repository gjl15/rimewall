/* uxaudit.js <index.html> <outprefix> : screenshots of home, lobby, arena, build, tower card, creep card, menu and end screen at
   390x844, with counts of tap targets under 40 px and text under 9 px on each. */
const fs=require('fs');const {chromium}=require('playwright');const HTML=fs.readFileSync(process.argv[2],'utf8');const OUT=process.argv[3];
(async()=>{const b=await chromium.launch({headless:true});const p=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true})).newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
await p.route('https://rimewall.local/**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:HTML}));
const measure=async(name)=>{await p.screenshot({path:`${OUT}-${name}.png`});return p.evaluate((name)=>{const vis=e=>{const r=e.getBoundingClientRect();if(r.width<2||r.height<2||r.bottom<0||r.top>innerHeight)return false;const cs=getComputedStyle(e);return cs.visibility!=='hidden'&&cs.display!=='none'&&+cs.opacity>0.05;};
 const btns=[...document.querySelectorAll('button,select,[role=button],a')].filter(vis);const small=btns.filter(e=>{const r=e.getBoundingClientRect();return r.height<40||r.width<32;}).map(e=>(e.id||e.className||e.tagName).toString().slice(0,30)+' '+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height));
 const texts=[...document.querySelectorAll('body *')].filter(e=>e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>1)&&vis(e));const tiny=texts.filter(e=>parseFloat(getComputedStyle(e).fontSize)<9).map(e=>parseFloat(getComputedStyle(e).fontSize)+'px:'+e.textContent.trim().slice(0,24));
 return {name,buttons:btns.length,smallTargets:small.length,smallEx:[...new Set(small)].slice(0,8),tinyText:tiny.length,tinyEx:[...new Set(tiny)].slice(0,8)};},name);};
const res=[];
await p.goto('https://rimewall.local/index.html');await p.waitForTimeout(900);res.push(await measure('home'));
await p.click('#start-button');await p.waitForTimeout(500);res.push(await measure('lobby'));
await p.evaluate(()=>{soloRules=false;document.getElementById('mode-select').value='skirmish';pendingSeed=5;});await p.click('#lb-ready').catch(()=>{});await p.waitForTimeout(1500);
await p.evaluate(()=>{document.querySelectorAll('.coach-card').forEach(c=>c.remove());});await p.waitForTimeout(3500);res.push(await measure('arena'));
await p.click('[data-mobile-panel="build"]');await p.waitForTimeout(400);res.push(await measure('build'));await p.click('[data-mobile-panel="build"]');
await p.evaluate(()=>{battlePaused=true;player.gold=5000;const c=mazeOrderSouth().filter(c=>isBuildableCell(c.r,c.c,PLAYER_HALF))[8];const t=makeTower(c.r,c.c,player.races[0],1,'player');addTower(t);t.buildUntil=-1;towersVersion++;selectedTowerKey=t.key;selectedGroupKeys=[t.key];phoneInspect('tower');renderTowerDetails();});await p.waitForTimeout(400);res.push(await measure('tower'));
await p.evaluate(()=>{setMobileTacticalPanel('map',true);spawnSend(SENDS[4],PLAYER_HALF,'west');const c=creeps[creeps.length-1];inspectEntity={kind:'creep',ref:c};phoneInspect('enemy');renderSelectedEnemyPanel();});await p.waitForTimeout(400);res.push(await measure('creep'));
await p.evaluate(()=>{setMobileTacticalPanel('map',true);openSettings();});await p.waitForTimeout(300);res.push(await measure('menu'));
await p.evaluate(()=>{closeSettings();battlePaused=false;player.lives=0;endMatch('defeat');});await p.waitForTimeout(800);res.push(await measure('end'));
for(const r of res)console.log(JSON.stringify(r));console.log(errs);await b.close();})();
