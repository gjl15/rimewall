/* measure.js : every generated creep frame at the 21 px board cell, same reduction as
   tools/harness/readability.js (mean colour of opaque pixels, 8x8 ink signature, confusable =
   colour within 8 % and shape within 12 %). Prints grey count, hue buckets, confusable pairs. */
const fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const names=fs.readFileSync(path.join(__dirname,'atlas-order.txt'),'utf8').split(/\s+/).filter(Boolean);
const imgs=names.map(n=>'data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'frames',n+'-96.png')).toString('base64'));
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||undefined,headless:true,args:['--no-sandbox']});
const p=await (await b.newContext()).newPage();
const r=await p.evaluate(async({imgs,names})=>{const load=s=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=s;});
 const S=21,G=8,cv=document.createElement('canvas');cv.width=cv.height=S;const cx=cv.getContext('2d',{willReadFrequently:true});
 const hsl=(r,g,b)=>{r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn;if(!d)return{h:0,s:0,l};const s=d/(1-Math.abs(2*l-1));let h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;return{h:(h*60+360)%360,s,l};};
 const rows=[];for(let k=0;k<imgs.length;k++){const im=await load(imgs[k]);cx.clearRect(0,0,S,S);cx.drawImage(im,0,0,S,S);const d=cx.getImageData(0,0,S,S).data;let r=0,g=0,bb=0,n=0;const sig=new Array(G*G).fill(0);
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){const i=(y*S+x)*4;if(d[i+3]<24)continue;r+=d[i];g+=d[i+1];bb+=d[i+2];n++;sig[((y*G/S)|0)*G+((x*G/S)|0)]++;}
  const mx=Math.max(...sig)||1;rows.push({name:names[k],r:r/n,g:g/n,b:bb/n,sig:sig.map(v=>v/mx),...hsl(r/n,g/n,bb/n)});}
 const conf=[];for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){const a=rows[i],c=rows[j];const col=Math.hypot(a.r-c.r,a.g-c.g,a.b-c.b)/(255*Math.sqrt(3));const sh=a.sig.reduce((t,v,k)=>t+Math.abs(v-c.sig[k]),0)/a.sig.length;if(col<.08&&sh<.12)conf.push(a.name+'~'+c.name);}
 const buckets={};rows.forEach(r=>{const k=r.s<.25?'grey':Math.floor(r.h/30)*30;buckets[k]=(buckets[k]||0)+1;});
 return {frames:rows.length,grey:rows.filter(r=>r.s<.25).map(r=>r.name),meanSat:+(rows.reduce((t,r)=>t+r.s,0)/rows.length).toFixed(2),buckets,confusable:conf};},{imgs,names});
console.log(JSON.stringify(r,null,1));await b.close();})();
