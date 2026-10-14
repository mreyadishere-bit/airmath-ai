import {GestureCalculator} from './gesture-math.js';

/** View controller for on-camera gesture calculator and hand-keypoint overlays. */
export function createFingerUI({stage,video,cursor,pen,mapPoint}) {
  const $=id=>document.getElementById(id);
  const engine=new GestureCalculator();
  let visible=false;
  const links=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17],[17,5]];
  const fingerIndices=[[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]];
  const tipNames=['T','I','M','R','P'];
  const colors={on:'#4af7ae',off:'#fb7185',joint:'#b5d4ff',palm:'#77a7fb'};
  function clearSkeleton(){pen.clearRect(0,0,cursor.width,cursor.height);}
  function mapped(lm) {
    return lm.map(p=>{const norm=mapPoint(p);return{x:norm.x*cursor.width,y:norm.y*cursor.height};});
  }
  function skeleton(hands,notes) {
    clearSkeleton();
    if(!visible)return;
    hands.slice(0,2).forEach((lm,i)=>{
      const pts=mapped(lm),f=notes[i]?.fingers||[false,false,false,false,false];
      pen.lineWidth=Math.max(1.2,cursor.width/650*1.6);
      pen.lineJoin='round';pen.lineCap='round';
      // Every joint is directly grounded in MediaPipe's 21 landmark coordinates.
      for(const [a,b] of links){
        const finger=fingerIndices.findIndex(group=>group.includes(b));
        pen.strokeStyle=finger===-1?colors.palm:(f[finger]?colors.on:colors.off);
        pen.globalAlpha=.85;pen.beginPath();pen.moveTo(pts[a].x,pts[a].y);pen.lineTo(pts[b].x,pts[b].y);pen.stroke();
      }
      pen.globalAlpha=1;
      for(let index=0;index<pts.length;index++){
        const p=pts[index],tip=[4,8,12,16,20].indexOf(index);
        pen.beginPath();pen.arc(p.x,p.y,tip>=0?Math.max(3,cursor.width/260):Math.max(1.6,cursor.width/590),0,Math.PI*2);
        pen.fillStyle=tip>=0?(f[tip]?colors.on:colors.off):colors.joint;pen.fill();
        if(tip>=0){
          const sign=f[tip]?'UP':'DOWN',label=tipNames[tip]+' '+sign;
          pen.font='600 '+Math.max(10,Math.min(13,cursor.width/90))+'px system-ui';
          const tw=pen.measureText(label).width, lx=Math.max(2,Math.min(cursor.width-tw-12,p.x-tw/2));
          const ly=Math.max(16,Math.min(cursor.height-7,p.y-20));
          pen.fillStyle='rgba(6,17,30,.86)';pen.fillRect(lx-3,ly-12,tw+6,17);
          pen.fillStyle=f[tip]?colors.on:colors.off;pen.fillText(label,lx,ly);
        }
      }
      pen.font='700 13px system-ui';
      const label='HAND '+(i+1)+' · '+notes[i].count+' UP';
      const textWidth=pen.measureText(label).width;
      let x=pts[0].x-textWidth/2, y=pts[0].y+26;
      x=Math.max(5,Math.min(cursor.width-textWidth-5,x));y=Math.min(cursor.height-10,y);
      pen.fillStyle='#e4f2ff';pen.fillText(label,x,y);
    });
  }
  function render(s) {
    $('numberA').textContent=s.a??'—';
    $('numberB').textContent=s.b??'—';
    $('overlayA').textContent=s.a??'—';
    $('overlayB').textContent=s.b??'—';
    $('chunksA').textContent=s.chunksA.length?s.chunksA.join(' + '):'Waiting...';
    $('chunksB').textContent=s.chunksB.length?s.chunksB.join(' + '):'Waiting...';
    $('operandA').classList.toggle('selected',s.active==='A'&&!s.result);
    $('operandB').classList.toggle('selected',s.active==='B'&&!s.result);
    $('fingerStage').textContent=s.result?'RESULTS':('ENTER '+s.active);
    $('fingerCount').textContent=s.visibleCount??'—';
    $('fingerLiveValue').textContent=s.visibleCount??'—';
    $('fingerPreview').textContent=s.pending===null?'Hold your hands steady':('Locked: '+s.pending);
    $('fingerInstruction').textContent=s.message;
    $('commandProgress').style.width=Math.round(s.progress*100)+'%';
    const resultNode=$('fingerResult'),operations=$('cameraOperations'),sidebar=$('fourOps');
    if(s.result) {
      resultNode.hidden=false;sidebar.hidden=false;
      $('fingerLive').hidden=true;
      $('resultEquation').textContent=s.a+' & '+s.b;
      const signature=s.a+'|'+s.b;
      if(operations.dataset.signature!==signature){
        operations.replaceChildren();sidebar.replaceChildren();
        for(const op of s.result){
          for(const target of [operations,sidebar]){
            const tile=document.createElement('div');tile.className='finger-result-tile';
            const text=document.createElement('small');text.textContent=s.a+' '+op.symbol+' '+s.b;
            const answer=document.createElement('strong');answer.textContent=String(op.value);
            const name=document.createElement('span');name.textContent=op.label;
            tile.append(text,answer,name);target.append(tile);
          }
        }
        operations.dataset.signature=signature;
      }
    }else{
      resultNode.hidden=true;sidebar.hidden=true;$('fingerLive').hidden=false;
      operations.dataset.signature='';
    }
  }
  function onHands(hands,now) {
    if(!visible)return;
    const state=engine.process(hands,now);
    skeleton(hands,state.notes);
    render(state);
  }
  function setVisible(v){
    visible=v;
    $('fingerHUD').hidden=!v;
    stage.classList.toggle('count-mode',v);
    if(v){
      render(engine.snapshot());
    }else clearSkeleton();
  }
  $('captureA').addEventListener('click',()=>renderAfter(()=>engine.commit()));
  $('captureB').addEventListener('click',()=>renderAfter(()=>engine.next()));
  $('fingerSolve').addEventListener('click',()=>renderAfter(()=>engine.equal()));
  $('fingerUndo').addEventListener('click',()=>renderAfter(()=>engine.undo()));
  $('fingerReset').addEventListener('click',()=>{engine.reset();clearSkeleton();render(engine.snapshot());});
  function renderAfter(fn){fn();render(engine.snapshot());}
  render(engine.snapshot());
  return { onHands,setVisible,reset:()=>{engine.reset();render(engine.snapshot());},snapshot:()=>engine.snapshot()};
}
