/** Camera is rendered directly by the browser. Hand inference is throttled and separate. */
export function createTracker(video,events){
 const work=document.createElement('canvas'),g=work.getContext('2d');
 let camera=null,model=null,active=false,setting=false,previous=-1,last=0,frames=0,lastFPS=0,session=0,mode='draw',starting=false;
 const $=id=>document.getElementById(id);
 function stop(){session++;active=false;setting=false;if(camera){camera.getTracks().forEach(t=>t.stop());camera=null;}video.srcObject=null;if(model){try{model.close();}catch{}}model=null;}
 async function setMode(m){mode=m;if(model&&!setting){setting=true;try{await model.setOptions({numHands:mode==='count'?2:1});}catch(e){console.warn('Hand options',e);}finally{setting=false;}}}
 async function start(deviceId=''){if(starting)return;starting=true;stop();const sid=session;try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Use HTTPS or localhost and grant camera permission.');
  events.onStatus('Opening camera…');
  const c={audio:false,video:{...(deviceId?{deviceId:{exact:deviceId}}:{facingMode:'user'}),width:{ideal:640},height:{ideal:480},frameRate:{ideal:30,max:30}}};
  camera=await navigator.mediaDevices.getUserMedia(c);if(session!==sid){camera.getTracks().forEach(t=>t.stop());return;}
  video.srcObject=camera;await video.play();events.onStatus('Camera live · loading hand detection','live');
  const LIB='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0';
  const {HandLandmarker,FilesetResolver}=await import(LIB+'/vision_bundle.mjs');
  const vision=await FilesetResolver.forVisionTasks(LIB+'/wasm');
  const modelUrl='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
  const options={baseOptions:{modelAssetPath:modelUrl,delegate:'GPU'},runningMode:'VIDEO',numHands:mode==='count'?2:1,minHandDetectionConfidence:.52,minTrackingConfidence:.5,minHandPresenceConfidence:.5};
  try{model=await HandLandmarker.createFromOptions(vision,options);}catch(e){console.warn('GPU unavailable, using CPU');options.baseOptions.delegate='CPU';model=await HandLandmarker.createFromOptions(vision,options);}
  if(session!==sid){model?.close();model=null;return;}
  active=true;lastFPS=performance.now();last=0;frames=0;events.onStatus('Hand tracking ready','live');requestAnimationFrame(frame);
 }catch(e){events.onError('Camera/tracker: '+e.message+'. Mouse and touch drawing still work.');events.onStatus('Camera/tracking issue','error');throw e;}finally{starting=false;}}
 function frame(now){if(!active)return;requestAnimationFrame(frame);if(setting||video.readyState<2||!model)return;
  const gap={fast:95,balanced:60,high:43}[$('quality').value]||95;if(now-last<gap||video.currentTime===previous)return;
  previous=video.currentTime;last=now;
  try{
   const w=256,h=Math.max(144,Math.round(w*video.videoHeight/video.videoWidth));if(work.width!==w||work.height!==h){work.width=w;work.height=h;}
   g.drawImage(video,0,0,w,h);const result=model.detectForVideo(work,now);
   events.onHands(result.landmarks||[],now);frames++;
   if(now-lastFPS>1000){events.onFPS(Math.round(frames*1000/(now-lastFPS)),result.landmarks?.length||0);lastFPS=now;frames=0;}
  }catch(e){console.error('Hand tracking issue',e);active=false;events.onError('Hand detection failed: '+e.message+'. Try Fast mode, another camera, or mouse.');events.onStatus('Tracker issue','error');}
 }
 return {start,stop,setMode};
}
