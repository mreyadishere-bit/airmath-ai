import {solveMath} from './math.js';
import {readDrawing} from './recognize.js';
import {createTracker} from './tracker.js';
import {createFingerUI} from './finger-ui.js';
const $=id=>document.getElementById(id);
const stage=$('stage'),video=$('camera'),ink=$('ink'),cursor=$('cursor');
const ctx=ink.getContext('2d'),pen=cursor.getContext('2d');
const s={mode:'draw',strokes:[],active:null,air:null,pointer:false,mirror:true,fist:0,fired:false,trackerReady:false};
const tracker=createTracker(video,{
 onHands:(hands,time)=>onHands(hands,time),
 onCameraReady:()=>{
  $('beforeCamera').hidden=true;
  $('cameraHelp').hidden=true;
  $('trackingIssue').hidden=true;
  stage.classList.remove('video-hidden');
  video.addEventListener('loadedmetadata',size,{once:true});
  cameras();
  size();
 },
 onTrackingReady:()=>{$('trackingIssue').hidden=true;$('handInfo').textContent='Tracking ready';},
 onTrackingError:message=>{
  $('trackingIssueText').textContent=message;
  $('trackingIssue').hidden=false;
  $('handInfo').textContent='Tracking unavailable';
 },
 onStatus:(message,type)=>{
  status(message,type);
  if(type==='live'&&video.srcObject){$('beforeCamera').hidden=true;stage.classList.remove('video-hidden');}
 },
 onFPS:(fps,num)=>{$('fps').textContent=fps+' tracking fps';$('handInfo').textContent=num+' hand(s)';},
 onError:message=>{
  $('cameraHelp').textContent=message;
  $('cameraHelp').hidden=false;
  $('errorMessage').hidden=false;
  $('errorMessage').textContent=message;
  $('startBtn').textContent='↻ Retry camera';
 }
});
function status(text,type=''){$('status').className='status '+type;$('statusText').textContent=text;}
function size(){const b=stage.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.5);if(!b.width)return;for(const c of [ink,cursor]){c.width=Math.round(b.width*d);c.height=Math.round(b.height*d);}render();}
new ResizeObserver(size).observe(stage);addEventListener('resize',size);
function paint(points,color='#55abff',c=ctx){if(!points?.length)return;const w=c.canvas.width,h=c.canvas.height;c.lineWidth=Math.max(2,4*w/1000);c.strokeStyle=color;c.fillStyle=color;c.lineCap=c.lineJoin='round';c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x*w,p.y*h):c.moveTo(p.x*w,p.y*h));if(points.length===1)c.lineTo(points[0].x*w+.2,points[0].y*h+.2);c.stroke();}
function render(){ctx.clearRect(0,0,ink.width,ink.height);s.strokes.forEach(v=>paint(v));if(s.active)paint(s.active,'#8cc6ff');pen.clearRect(0,0,cursor.width,cursor.height);}
function point(p){const r=stage.getBoundingClientRect();return{x:Math.min(1,Math.max(0,(p.clientX-r.left)/r.width)),y:Math.min(1,Math.max(0,(p.clientY-r.top)/r.height))};}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function addInk(p){if(!s.active){s.active=[p];paint(s.active);return;}const prev=s.active.at(-1),d=distance(prev,p);if(d<.003)return;if(d>.17){up();s.active=[p];return;}if(s.active.length<1400){s.active.push(p);paint([prev,p]);}}
function up(){if(s.active?.length){s.strokes.push(s.active);if(s.strokes.length>250)s.strokes.shift();}s.active=null;}
function dot(p,drawing){pen.clearRect(0,0,cursor.width,cursor.height);if(!p)return;const x=p.x*cursor.width,y=p.y*cursor.height;pen.strokeStyle=drawing?'#65f2c0':'#ffd185';pen.lineWidth=2.5;pen.beginPath();pen.arc(x,y,10,0,Math.PI*2);pen.stroke();}
function clear(){s.strokes=[];s.active=null;render();$('expression').value='';$('result').textContent='—';$('resultHint').textContent='Draw an expression and press Recognize & solve.';}
function undo(){if(s.active)s.active=null;else s.strokes.pop();render();}
$('clearBtn').onclick=clear;$('undoBtn').onclick=undo;
stage.addEventListener('pointerdown',e=>{if(s.mode!=='draw'||![stage,ink,cursor,video].includes(e.target))return;s.pointer=true;s.active=null;stage.setPointerCapture(e.pointerId);const p=point(e);addInk(p);dot(p,true);});
stage.addEventListener('pointermove',e=>{if(s.pointer&&s.mode==='draw'){const p=point(e);addInk(p);dot(p,true);}});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(ev,()=>{if(s.pointer){s.pointer=false;up();dot(null);}});
$('downloadBtn').onclick=()=>{up();const c=document.createElement('canvas');c.width=1200;c.height=720;const x=c.getContext('2d');x.fillStyle='#0d1828';x.fillRect(0,0,c.width,c.height);s.strokes.forEach(v=>paint(v,'#66b7ff',x));const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='airmath-drawing.png';a.click();};
function manual(){try{const r=solveMath($('expression').value);$('result').textContent=r.value;$('resultHint').textContent=r.note;}catch(e){$('result').textContent='Check expression';$('resultHint').textContent=e.message;}}
function solve(){up();if(!s.strokes.length){manual();return;}try{$('expression').value=readDrawing(s.strokes);manual();$('resultHint').textContent+=' · Recognition is approximate; edit if needed.';}catch(e){$('result').textContent='Not recognized';$('resultHint').textContent=e.message;}}
$('solveBtn').onclick=solve;$('computeBtn').onclick=manual;$('expression').onkeydown=e=>{if(e.key==='Enter')manual();};
window.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea')||e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key.toLowerCase();if(k==='s')solve();if(k==='c')clear();if(k==='u')undo();});
function setMode(m){up();s.mode=m;s.fist=0;s.fired=false;$('drawMode').classList.toggle('active',m==='draw');$('countMode').classList.toggle('active',m==='count');$('drawGuide').hidden=m!=='draw';$('countGuide').hidden=m!=='count';$('solveBtn').hidden=m!=='draw';$('trackingPill').hidden=true;$('gestureLabel').textContent=m==='draw'?'☝ Draw · ✌ Move · ✊ Solve':'Hand landmarks · multi-chunk numbers · gesture math';fingerUI.setVisible(m==='count');$('undoBtn').hidden=m==='count';$('clearBtn').hidden=m==='count';$('downloadBtn').hidden=m==='count';$('computeBtn').hidden=m==='count';tracker.setMode(m);dot(null);}
$('drawMode').onclick=()=>setMode('draw');$('countMode').onclick=()=>setMode('count');
function ext(l){const up=(tip,mid)=>distance(l[0],l[tip])>distance(l[0],l[mid])*1.12;return [distance(l[4],l[17])>distance(l[3],l[17])*1.17&&distance(l[4],l[5])>distance(l[3],l[5])*1.12,up(8,6),up(12,10),up(16,14),up(20,18)];}
function canvasFromLandmark(p){const w=stage.clientWidth,h=stage.clientHeight,vw=video.videoWidth||640,vh=video.videoHeight||480,k=Math.min(w/vw,h/vh);return {x:Math.max(0,Math.min(1,((w-vw*k)/2+(s.mirror?1-p.x:p.x)*vw*k)/w)),y:Math.max(0,Math.min(1,((h-vh*k)/2+p.y*vh*k)/h))};}
function label(t){$('gestureLabel').textContent=t;$('trackingText').textContent=t.toUpperCase().slice(0,18);}
function onHands(hands,now){if(s.mode==='count'){fingers(hands,now);return;}$('trackingPill').hidden=!hands.length;if(!hands.length){up();dot(null);s.air=null;s.fist=0;label('Show your index finger to draw');return;}
const lm=hands[0],f=ext(lm),drawing=$('easyDraw').checked?f[1]:f[1]&&!f[2]&&!f[3]&&!f[4];const fist=f.every(v=>!v),raw=canvasFromLandmark(lm[8]);const p=s.air?{x:s.air.x+(raw.x-s.air.x)*.6,y:s.air.y+(raw.y-s.air.y)*.6}:raw;s.air=p;dot(p,drawing&&!s.pointer);
if(fist){up();if(!s.fist)s.fist=now;if(now-s.fist>1100&&!s.fired){s.fired=true;solve();}label('Closed fist — hold to solve');return;}s.fist=0;s.fired=false;
if(s.pointer)return;if(drawing){addInk(p);label('DRAWING — index finger');}else{up();label(f[1]?'PEN UP — move':'Raise your index finger');}}
// Finger math is isolated from air-drawing so the gesture modes cannot interfere.
const fingerUI=createFingerUI({stage,video,cursor,pen,mapPoint:canvasFromLandmark});
function fingers(hands,now){fingerUI.onHands(hands,now);}
async function cameras(){try{const d=(await navigator.mediaDevices.enumerateDevices()).filter(x=>x.kind==='videoinput'),el=$('deviceSelect'),selected=el.value;el.replaceChildren(new Option('Default camera',''));d.forEach((v,i)=>el.add(new Option(v.label||'Camera '+(i+1),v.deviceId)));if([...el.options].some(o=>o.value===selected))el.value=selected;}catch{}}
async function start(){
 const btn=$('startBtn');
 btn.disabled=true;
 $('cameraHelp').hidden=true;
 $('trackingIssue').hidden=true;
 $('errorMessage').hidden=true;
 $('handInfo').textContent='Preparing…';
 try{
  await tracker.start($('deviceSelect').value);
 }catch(e){
  if(!video.srcObject){
   $('beforeCamera').hidden=false;
   $('handInfo').textContent='Camera unavailable';
  }
 }finally{btn.disabled=false;}
}
$('startBtn').onclick=start;
$('restartCamera').onclick=start;
$('retryTracking').onclick=async()=>{
 $('trackingIssue').hidden=true;
 try{await tracker.retryTracking();}catch(error){
  $('trackingIssueText').textContent=error.message;
  $('trackingIssue').hidden=false;
 }
};
$('deviceSelect').onchange=()=>{if(video.srcObject)start();};
$('mirror').onchange=e=>{s.mirror=e.target.checked;video.classList.toggle('unmirrored',!s.mirror);};
$('offlineBtn').onclick=()=>{$('beforeCamera').hidden=true;stage.classList.add('video-hidden');status('Mouse / touch mode','live');label('Draw with mouse or touch');size();};
addEventListener('pagehide',()=>tracker.stop());size();setMode('draw');
