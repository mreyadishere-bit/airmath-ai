import {createTracker} from './tracker.js';
import {createFingerUI} from './finger-ui.js';

const $=id=>document.getElementById(id);
const stage=$('stage'),video=$('camera'),cursor=$('cursor');
const pen=cursor.getContext('2d',{alpha:true});
const shell=$('cameraShell');
let mirror=true;
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
    requestAnimationFrame(resizeCanvas);
  }
}
function landmarkPosition(p) {
  // Video and stage use the same aspect ratio after loadedmetadata.
  return {
    x:Math.max(0,Math.min(1,mirror?1-p.x:p.x)),
    y:Math.max(0,Math.min(1,p.y))
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
    resizeCanvas();
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

new ResizeObserver(resizeCanvas).observe(stage);
window.addEventListener('resize',resizeCanvas);
video.addEventListener('loadedmetadata',syncCameraRatio);
resizeCanvas();

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
