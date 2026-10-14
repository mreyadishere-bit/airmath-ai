import {GestureCalculator} from './gesture-math.js?v=7';

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
    const scale=Math.max(.78,Math.min(1.55,cursor.width/810));
    for(const [handIndex,landmarks] of hands.slice(0,2).entries()) {
      if(!Array.isArray(landmarks)||landmarks.length<21)continue;
      const points=landmarks.map(point=>{
        const pos=mapPoint(point);
        return {x:pos.x*cursor.width,y:pos.y*cursor.height};
      });
      const other=handIndex===1?.86:1;
      pen.save();
      pen.globalAlpha=other;
      pen.lineCap='round';
      pen.lineJoin='round';

      // A softly lit palm plate with geometric connections and an inner mesh.
      const palm=[0,1,5,9,13,17];
      pen.beginPath();
      palm.forEach((index,i)=>{
        if(i===0)pen.moveTo(points[index].x,points[index].y);
        else pen.lineTo(points[index].x,points[index].y);
      });
      pen.closePath();
      pen.fillStyle='rgba(80,226,196,.075)';
      pen.fill();
      pen.lineWidth=1.2*scale;
      pen.strokeStyle='rgba(126,249,224,.27)';
      pen.stroke();

      const mesh=[[0,9],[0,13],[5,13],[5,17],[9,17],[1,9],[1,13]];
      pen.lineWidth=.9*scale;
      pen.strokeStyle='rgba(130,242,220,.19)';
      for(const [start,end] of mesh){
        pen.beginPath();
        pen.moveTo(points[start].x,points[start].y);
        pen.lineTo(points[end].x,points[end].y);
        pen.stroke();
      }

      // Dual-layer holographic bones: broad atmospheric glow and crisp core.
      // Avoid text tags and opaque blocks over a person's hand or face.
      for(const [start,end] of segments){
        const a=points[start],b=points[end];
        pen.beginPath();pen.moveTo(a.x,a.y);pen.lineTo(b.x,b.y);
        pen.lineWidth=7*scale;
        pen.strokeStyle='rgba(54,235,201,.18)';
        pen.shadowColor='rgba(82,245,218,.65)';
        pen.shadowBlur=9*scale;
        pen.stroke();
      }
      pen.shadowBlur=0;
      for(const [start,end] of segments){
        const a=points[start],b=points[end];
        pen.beginPath();pen.moveTo(a.x,a.y);pen.lineTo(b.x,b.y);
        pen.lineWidth=2.7*scale;
        pen.strokeStyle='rgba(159,255,234,.85)';
        pen.stroke();
        pen.beginPath();pen.moveTo(a.x,a.y);pen.lineTo(b.x,b.y);
        pen.lineWidth=.85*scale;
        pen.strokeStyle='rgba(245,255,250,.55)';
        pen.stroke();
      }

      // Discrete joint hubs and dual-ring highlighted fingertips.
      for(let i=0;i<points.length;i++){
        const p=points[i],tip=tips.indexOf(i);
        const raised=tip>=0&&notes[handIndex]?.fingers?.[tip];
        if(tip>=0){
          pen.beginPath();pen.arc(p.x,p.y,(raised?10:7)*scale,0,Math.PI*2);
          pen.lineWidth=1.4*scale;
          pen.strokeStyle=raised?'rgba(128,255,219,.62)':'rgba(175,220,224,.35)';
          pen.stroke();
          if(raised){
            pen.beginPath();pen.arc(p.x,p.y,5*scale,0,Math.PI*2);
            pen.fillStyle='rgba(103,255,213,.20)';pen.fill();
          }
        }
        pen.beginPath();
        pen.arc(p.x,p.y,(tip>=0?3.1:2.05)*scale,0,Math.PI*2);
        pen.fillStyle=raised?'#caffec':(tip>=0?'rgba(199,229,225,.8)':'rgba(222,255,247,.85)');
        pen.fill();
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
