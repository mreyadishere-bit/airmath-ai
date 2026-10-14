import {GestureCalculator} from './gesture-math.js?v=8';
import {FINGER_BONES,PALM_BONES,VISUAL_COLORS,createVisualHandStates} from './hand-visual.js?v=9';

/**
 * Minimal hand visuals and data-only UI. Never places results or controls over
 * the camera video. The canvas is exclusively a subtle landmark overlay.
 */
export function createFingerUI({cursor,pen,mapPoint}) {
  const $=id=>document.getElementById(id);
  const engine=new GestureCalculator();
  const visualStates=createVisualHandStates();
  const palmOutline=[0,1,5,9,13,17];
  const innerMesh=[[0,9],[0,13],[5,13],[5,17],[9,17],[1,9],[1,13]];
  const tips=[4,8,12,16,20];

  let lastSignature='';
  let lastMessage='';
  let lastCount='';

  function clearSkeleton() {
    pen.clearRect(0,0,cursor.width,cursor.height);
  }

  function renderSkeleton(hands, fingerStates) {
    clearSkeleton();
    if(!$('showSkeleton').checked || !cursor.width || !cursor.height)return;
    const scale=Math.max(.82,Math.min(1.48,cursor.width/820));
    const segment=(a,b)=>{
      pen.beginPath();pen.moveTo(a.x,a.y);pen.lineTo(b.x,b.y);pen.stroke();
    };
    for(const [handIndex,landmarks] of hands.slice(0,2).entries()){
      if(!Array.isArray(landmarks)||landmarks.length<21)continue;
      const points=landmarks.map(lm=>{
        const p=mapPoint(lm);return{x:p.x*cursor.width,y:p.y*cursor.height};
      });
      const states=fingerStates[handIndex]||[false,false,false,false,false];
      pen.save();
      pen.globalAlpha=handIndex===1?.94:1;
      pen.lineCap='round';pen.lineJoin='round';

      // Calm, neutral palm — the colored finger chains remain unmistakable.
      pen.beginPath();
      palmOutline.forEach((index,i)=>{
        const p=points[index];
        if(i===0)pen.moveTo(p.x,p.y);else pen.lineTo(p.x,p.y);
      });
      pen.closePath();
      pen.fillStyle='rgba(76,182,191,.065)';
      pen.fill();
      pen.strokeStyle='rgba(134,215,215,.30)';
      pen.lineWidth=1.25*scale;pen.stroke();

      // Subtle glass-like technical mesh with connected knuckles.
      const mesh=innerMesh;
      pen.strokeStyle='rgba(130,228,235,.24)';
      pen.lineWidth=1.05*scale;
      for(const [start,end] of [...PALM_BONES,...mesh])segment(points[start],points[end]);

      // Each bone takes the color of its own finger, not its neighbor.
      // Three light passes mimic an expensive holographic display without
      // using an expensive full-frame video filter or per-frame gradients.
      for(let f=0;f<5;f++){
        const palette=states[f]?VISUAL_COLORS.raised:VISUAL_COLORS.folded;
        const bones=FINGER_BONES[f];
        pen.shadowBlur=0;
        pen.strokeStyle=palette.halo;pen.lineWidth=8.1*scale;
        for(const [start,end] of bones)segment(points[start],points[end]);
        pen.strokeStyle=palette.core;pen.lineWidth=3.65*scale;
        for(const [start,end] of bones)segment(points[start],points[end]);
        pen.strokeStyle=palette.light;pen.lineWidth=.9*scale;
        for(const [start,end] of bones)segment(points[start],points[end]);

        // Color each of the four knuckles/tip joints consistently.
        const indices=[bones[0][0],bones[0][1],bones[1][1],bones[2][1]];
        for(const index of indices){
          const p=points[index];
          pen.beginPath();pen.arc(p.x,p.y,2.45*scale,0,Math.PI*2);
          pen.fillStyle=palette.core;pen.fill();
        }
        const tip=points[tips[f]],open=!!states[f];
        // Dual halo ring is stronger on raised fingers and subdued on folded.
        pen.beginPath();pen.arc(tip.x,tip.y,(open?8.3:6.8)*scale,0,Math.PI*2);
        pen.strokeStyle=palette.ring;pen.lineWidth=(open?1.65:1.3)*scale;
        pen.shadowColor=palette.core;pen.shadowBlur=(open?8:4)*scale;pen.stroke();
        pen.shadowBlur=0;
        pen.beginPath();pen.arc(tip.x,tip.y,(open?4.5:3.5)*scale,0,Math.PI*2);
        pen.fillStyle=palette.fill;pen.fill();
        pen.beginPath();pen.arc(tip.x,tip.y,2.45*scale,0,Math.PI*2);
        pen.fillStyle=palette.light;pen.fill();
      }
      // Small neutral wrist and palm anchor nodes.
      for(const index of [0,5,9,13,17]){
        const p=points[index];pen.beginPath();
        pen.arc(p.x,p.y,1.9*scale,0,Math.PI*2);
        pen.fillStyle='rgba(212,255,249,.85)';pen.fill();
      }
      pen.restore();
    }
  }

  function updateResults(state) {
    const panel=$('fingerResult');
    // Reserve the result dock from first paint; only its content changes.
    // This prevents the camera from jumping or pushing results below the fold.
    panel.hidden=false;
    const signature=state.result ? state.a+'|'+state.b : 'empty';
    if(signature===lastSignature)return;
    lastSignature=signature;
    panel.classList.toggle('has-result',!!state.result);
    $('resultEquation').textContent=state.result ? state.a+'  /  '+state.b : '';
    const root=$('cameraOperations');
    root.replaceChildren();
    const items=state.result||[
      {symbol:'+',value:'—',label:'Addition'},
      {symbol:'−',value:'—',label:'Subtraction'},
      {symbol:'×',value:'—',label:'Multiplication'},
      {symbol:'÷',value:'—',label:'Division'}
    ];
    for(const item of items) {
      const tile=document.createElement('div');
      tile.className='finger-result-tile';
      const symbol=document.createElement('small');symbol.textContent=item.symbol;
      const value=document.createElement('strong');value.textContent=String(item.value);
      const label=document.createElement('span');label.textContent=item.label;
      tile.append(symbol,value,label);
      root.append(tile);
    }
  }

  function update(state) {
    $('overlayA').textContent=state.a??'—';
    $('overlayB').textContent=state.b??'—';
    $('operandA').classList.toggle('selected',state.active==='A'&&!state.result);
    $('operandB').classList.toggle('selected',state.active==='B'&&!state.result);
    const count=state.visibleCount===null?'—':String(state.visibleCount);
    if(count!==lastCount){$('fingerLiveValue').textContent=count;lastCount=count;}
    // Only a tiny status, rather than long instructional text covering the user.
    let message;
    if(state.result)message='Calculated';
    else if(state.latched)message='Digit saved · '+state.active;
    else if(state.progress>0)message='Hold · '+Math.round(state.progress*100)+'%';
    else if(state.active==='B')message='Entering B';
    else message='Entering A';
    if(message!==lastMessage){$('fingerInstruction').textContent=message;lastMessage=message;}
    $('commandProgress').style.width=Math.round(state.progress*100)+'%';
    updateResults(state);
  }

  function onHands(hands,now) {
    const state=engine.process(hands,now);
    renderSkeleton(hands,visualStates.update(hands,state.notes,now));
    update(state);
  }
  function run(method) {
    engine[method]();
    update(engine.snapshot());
  }

  $('captureA').addEventListener('click',()=>run('commit'));
  $('captureB').addEventListener('click',()=>run('next'));
  $('fingerSolve').addEventListener('click',()=>run('equal'));
  $('fingerUndo').addEventListener('click',()=>run('undo'));
  $('fingerReset').addEventListener('click',()=>{clearSkeleton();run('reset');});
  $('showSkeleton').addEventListener('change',()=>{if(!$('showSkeleton').checked)clearSkeleton();});
  update(engine.snapshot());
  return {onHands,refresh:()=>update(engine.snapshot()),snapshot:()=>engine.snapshot(),clearSkeleton};
}
