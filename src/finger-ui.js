import {GestureCalculator} from './gesture-math.js';

/**
 * Minimal hand visuals and data-only UI. Never places results or controls over
 * the camera video. The canvas is exclusively a subtle landmark overlay.
 */
export function createFingerUI({cursor,pen,mapPoint}) {
  const $=id=>document.getElementById(id);
  const engine=new GestureCalculator();
  const segments=[
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20]
  ];
  const tips=[4,8,12,16,20];
  let lastSignature='';
  let lastMessage='';
  let lastCount='';

  function clearSkeleton() {
    pen.clearRect(0,0,cursor.width,cursor.height);
  }

  function renderSkeleton(hands, notes) {
    clearSkeleton();
    if(!$('showSkeleton').checked || !cursor.width || !cursor.height) return;
    for(const [handIndex,landmarks] of hands.slice(0,2).entries()) {
      if(!Array.isArray(landmarks) || landmarks.length<21) continue;
      const points=landmarks.map(point=>{
        const pos=mapPoint(point);
        return {x:pos.x*cursor.width,y:pos.y*cursor.height};
      });
      pen.save();
      pen.lineWidth=Math.max(1,Math.min(2,cursor.width/850));
      pen.lineCap='round';
      pen.lineJoin='round';
      pen.strokeStyle='rgba(162,255,224,.52)';
      for(const [a,b] of segments){
        pen.beginPath();
        pen.moveTo(points[a].x,points[a].y);
        pen.lineTo(points[b].x,points[b].y);
        pen.stroke();
      }
      // No UP/DOWN labels, text boxes, thick triangles or opaque skeletons.
      for(let i=0;i<points.length;i++){
        const pos=points[i],tip=tips.indexOf(i);
        pen.beginPath();
        pen.arc(pos.x,pos.y,tip>=0?Math.max(2.3,Math.min(4.2,cursor.width/320)):1.4,0,Math.PI*2);
        pen.fillStyle=tip<0?'rgba(207,255,242,.62)':
          (notes[handIndex]?.fingers?.[tip]?'#a7ffdc':'rgba(221,238,239,.58)');
        pen.fill();
        if(tip>=0 && notes[handIndex]?.fingers?.[tip]){
          pen.strokeStyle='rgba(160,255,219,.4)';
          pen.lineWidth=1.2;
          pen.beginPath();pen.arc(pos.x,pos.y,Math.max(6,Math.min(9,cursor.width/140)),0,Math.PI*2);pen.stroke();
        }
      }
      pen.restore();
    }
  }

  function updateResults(state) {
    const panel=$('fingerResult');
    if(!state.result) {
      panel.hidden=true;
      lastSignature='';
      return;
    }
    panel.hidden=false;
    const signature=state.a+'|'+state.b;
    if(signature===lastSignature)return;
    lastSignature=signature;
    $('resultEquation').textContent=state.a+'  /  '+state.b;
    const root=$('cameraOperations');
    root.replaceChildren();
    for(const item of state.result) {
      const tile=document.createElement('div');tile.className='finger-result-tile';
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
    renderSkeleton(hands,state.notes);
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
