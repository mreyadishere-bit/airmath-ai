import {createTracker} from './tracker.js?v=10';
import {createFingerUI} from './finger-ui.js?v=10';

const $=id=>document.getElementById(id);
const stage=$('stage'),video=$('camera'),cursor=$('cursor');
const pen=cursor.getContext('2d',{alpha:true});
const shell=$('cameraShell');
const workspace=document.querySelector('.workspace');
const dock=document.querySelector('.control-dock');
const results=$('fingerResult');
let mirror=true;
let fitScheduled=false;
function fitViewport(){
  // Fit actual camera aspect ratio within the space remaining AFTER the
  // fixed control row and result dock. No document scroll is required.
  const cs=getComputedStyle(workspace);
  const ss=getComputedStyle(shell);
  const padV=parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom);
  const padH=parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight);
  const gap=parseFloat(ss.rowGap)||8;
  const availableHeight=workspace.clientHeight-padV;
  const availableWidth=workspace.clientWidth-padH;
  const nativeRatio=(video.videoWidth>0&&video.videoHeight>0)
    ? video.videoWidth/video.videoHeight : 16/9;
  const remaining=Math.max(70,availableHeight-dock.offsetHeight-results.offsetHeight-gap*2);
  const target=Math.max(110,Math.min(1380,availableWidth,remaining*nativeRatio));
  const rounded=Math.floor(target);
  if(Math.abs(shell.getBoundingClientRect().width-rounded)>.5){
    shell.style.width=rounded+'px';
  }
  resizeCanvas();
}
function requestFit(){
  if(fitScheduled)return;
  fitScheduled=true;
  requestAnimationFrame(()=>{fitScheduled=false;fitViewport();});
}
let trackerReady=false;

function setStatus(message,type='') {
  $('status').className='status '+type;
  $('statusText').textContent=message;
}
function resizeCanvas() {
  const {width,height}=stage.getBoundingClientRect();
  if(!width||!height)return;
  const ratio=Math.min(window.devicePixelRatio||1,1.5);
  const w=Math.round(width*ratio),h=Math.round(height*ratio);
  if(cursor.width!==w||cursor.height!==h) {
    cursor.width=w;
    cursor.height=h;
    fingerUI?.clearSkeleton();
  }
}
function syncCameraRatio() {
  if(video.videoWidth>0&&video.videoHeight>0) {
    shell.style.setProperty('--camera-ar',String(video.videoWidth/video.videoHeight));
    requestFit();
  }
}
function landmarkPosition(p) {
  // Match object-fit:contain exactly so landmarks align even when the
  // preview temporarily letterboxes during startup or a viewport resize.
  const sw=stage.clientWidth||1,sh=stage.clientHeight||1;
  const vw=video.videoWidth||640,vh=video.videoHeight||480;
  const fit=Math.min(sw/vw,sh/vh);
  const drawnWidth=vw*fit,drawnHeight=vh*fit;
  const left=(sw-drawnWidth)/2,top=(sh-drawnHeight)/2;
  return {
    x:Math.max(0,Math.min(1,(left+(mirror?1-p.x:p.x)*drawnWidth)/sw)),
    y:Math.max(0,Math.min(1,(top+p.y*drawnHeight)/sh))
  };
}
const fingerUI=createFingerUI({cursor,pen,mapPoint:landmarkPosition});
const tracker=createTracker(video,{
  onHands:(hands,now)=>fingerUI.onHands(hands,now),
  onCameraReady:()=>{
    $('beforeCamera').hidden=true;
    $('cameraHelp').hidden=true;
    $('trackingIssue').hidden=true;
    syncCameraRatio();
    video.addEventListener('loadedmetadata',syncCameraRatio,{once:true});
    refreshCameras();
    requestFit();
  },
  onTrackingReady:()=>{
    trackerReady=true;
    $('trackingIssue').hidden=true;
    setStatus('Tracking','live');
  },
  onTrackingError:message=>{
    trackerReady=false;
    $('trackingIssueText').textContent=message;
    $('trackingIssue').hidden=false;
    setStatus('Camera live','live');
  },
  onStatus:(message,type)=>{
    if(type==='error')setStatus('Camera error','error');
    else if(type==='live')setStatus(trackerReady?'Tracking':'Camera live','live');
    else setStatus('Connecting…');
  },
  onError:message=>{
    $('cameraHelp').textContent=message;
    $('cameraHelp').hidden=false;
    $('errorMessage').textContent=message;
    $('errorMessage').hidden=false;
    $('startBtn').textContent='Retry camera ↗';
  },
  onFPS:()=>{}
});
tracker.setMode('count');

const layoutObserver=new ResizeObserver(requestFit);
layoutObserver.observe(workspace);
layoutObserver.observe(dock);
layoutObserver.observe(results);
window.addEventListener('resize',requestFit);
window.visualViewport?.addEventListener('resize',requestFit);
video.addEventListener('loadedmetadata',syncCameraRatio);
requestFit();

async function refreshCameras() {
  if(!navigator.mediaDevices?.enumerateDevices)return;
  try {
    const devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');
    const select=$('deviceSelect'),oldValue=select.value;
    select.replaceChildren(new Option('Default camera',''));
    devices.forEach((camera,i)=>select.add(new Option(camera.label||'Camera '+(i+1),camera.deviceId)));
    if([...select.options].some(o=>o.value===oldValue))select.value=oldValue;
  }catch(error){console.debug('Camera enumeration unavailable',error);}
}

async function startCamera() {
  const button=$('startBtn');
  button.disabled=true;
  trackerReady=false;
  $('cameraHelp').hidden=true;
  $('errorMessage').hidden=true;
  $('trackingIssue').hidden=true;
  try {
    await tracker.start($('deviceSelect').value);
  }catch(error){
    if(!video.srcObject){
      $('beforeCamera').hidden=false;
      setStatus('Camera error','error');
    }
  }finally{
    button.disabled=false;
  }
}
$('startBtn').addEventListener('click',startCamera);
$('restartCamera').addEventListener('click',startCamera);
$('deviceSelect').addEventListener('change',()=>{if(video.srcObject)startCamera();});
$('retryTracking').addEventListener('click',async()=>{
  $('trackingIssue').hidden=true;
  try{await tracker.retryTracking();}
  catch(error){
    $('trackingIssue').hidden=false;
    $('trackingIssueText').textContent=error.message;
  }
});
$('mirror').addEventListener('change',event=>{
  mirror=event.target.checked;
  video.classList.toggle('unmirrored',!mirror);
  fingerUI.clearSkeleton();
});

function toggleSettings(open) {
  $('settingsDrawer').hidden=!open;
  $('settingsBackdrop').hidden=!open;
  $('settingsToggle').setAttribute('aria-expanded',String(open));
  document.body.style.overflow=open?'hidden':'';
  if(open)$('closeSettings').focus();
  else $('settingsToggle').focus();
}
$('settingsToggle').addEventListener('click',()=>toggleSettings($('settingsDrawer').hidden));
$('closeSettings').addEventListener('click',()=>toggleSettings(false));
$('settingsBackdrop').addEventListener('click',()=>toggleSettings(false));
window.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!$('settingsDrawer').hidden)toggleSettings(false);
  if(event.target.matches('input,select,textarea')||event.ctrlKey||event.metaKey||event.altKey)return;
  if($('settingsDrawer').hidden) {
    const key=event.key.toLowerCase();
    if(key==='r')$('fingerReset').click();
    else if(key==='u')$('fingerUndo').click();
    else if(key==='n')$('captureB').click();
    else if(key==='enter')$('fingerSolve').click();
  }
});
window.addEventListener('pagehide',()=>tracker.stop());
