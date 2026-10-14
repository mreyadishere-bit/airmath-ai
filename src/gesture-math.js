/**
 * AirMath Gesture Calculator
 * Pure functions, no DOM or MediaPipe dependency. Values are accumulated in
 * separate chunks (10 + 10 = 20), with two-hand gestures for Next and Equals.
 */
const distance = (a,b) => Math.hypot(a.x - b.x, a.y - b.y);

export function readHand(landmarks) {
  if (!Array.isArray(landmarks) || landmarks.length < 21) {
    return { fingers: [false,false,false,false,false], count: 0, gesture: 'unknown' };
  }
  const wrist = landmarks[0];
  const raised = (tip, pip) => distance(wrist, landmarks[tip]) > distance(wrist, landmarks[pip]) * 1.13;
  const thumb = distance(landmarks[4],landmarks[17]) > distance(landmarks[3],landmarks[17])*1.14 &&
                distance(landmarks[4],landmarks[5]) > distance(landmarks[3],landmarks[5])*1.10;
  const fingers = [thumb,raised(8,6),raised(12,10),raised(16,14),raised(20,18)];
  const count = fingers.filter(Boolean).length;
  const curled = fingers.slice(1).every(v=>!v);
  const thumbUp = curled && thumb &&
      landmarks[4].y < landmarks[3].y - .015 &&
      landmarks[4].y < landmarks[5].y - .02 &&
      landmarks[4].y < landmarks[2].y - .03;
  return { fingers, count, gesture: thumbUp ? 'thumb' : (count===0 ? 'fist' : 'number') };
}

export function fourOperations(a,b) {
  if (![a,b].every(n => Number.isSafeInteger(n) && n>=0)) throw Error('Invalid operands');
  return [
    {label:'Addition',symbol:'+',value:a+b},
    {label:'Subtraction',symbol:'−',value:a-b},
    {label:'Multiplication',symbol:'×',value:a*b},
    {label:'Division',symbol:'÷',value:b===0?'Undefined (÷ 0)':Number((a/b).toPrecision(10))}
  ];
}

export class GestureCalculator {
  constructor() { this.reset(); }
  reset() {
    this.a=0; this.b=0; this.active='A'; this.chunksA=[];this.chunksB=[];
    this.pending=null;this.stableCount=null;this.countSince=0;
    this.noHandsSince=null;this.command=null;this.commandSince=0;this.commandFired=false;
    this.result=null;this.message='Show 1–10 fingers and hold steady';this.visibleCount=null;
    this.action='reset';this.lastEvent='';this.progress=0;
    return this.snapshot();
  }
  get chunks() {return this.active==='A'?this.chunksA:this.chunksB;}
  get total() {return this.active==='A'?this.a:this.b;}
  snapshot() {
    return {
      a:this.chunksA.length?this.a:null,
      b:this.chunksB.length?this.b:null,
      active:this.active, chunksA:[...this.chunksA],chunksB:[...this.chunksB],
      pending:this.pending,visibleCount:this.visibleCount,
      result:this.result,progress:this.progress,message:this.message,lastEvent:this.lastEvent
    };
  }
  commit() {
    if(this.result) return false;
    const n=this.pending;
    if(n===null || !Number.isInteger(n) || n<0 || n>10) {this.message='Show a number and hold still to lock it first';return false;}
    if(this.total+n>1000000){this.message='Maximum value is 1,000,000';return false;}
    this.chunks.push(n);
    if(this.active==='A')this.a+=n;else this.b+=n;
    this.pending=null;this.stableCount=null;this.visibleCount=null;this.progress=0;
    this.lastEvent='Added '+n+' to number '+this.active;
    this.message=this.lastEvent+' · Show more fingers or continue';
    return true;
  }
  next() {
    if(this.result)return false;
    this.commit();
    if(this.active==='B') {this.message='Already entering B. Show two fists to calculate.';return false;}
    if(this.chunksA.length===0){this.message='Capture number A before moving to number B';return false;}
    this.active='B';this.lastEvent='Now entering number B';
    this.message='Show fingers for B · two fists = calculate';this.progress=0;return true;
  }
  equal() {
    if(this.result) return false;
    this.commit();
    if(this.active!=='B'||this.chunksB.length===0) {
      this.message='Enter A, show two thumbs up (Next), then enter B';
      return false;
    }
    this.result=fourOperations(this.a,this.b);
    this.lastEvent='Calculated '+this.a+' and '+this.b;
    this.message='Done! Results are displayed over your camera.';
    this.progress=0;return true;
  }
  undo() {
    if(this.result){this.result=null;this.message='Calculation unlocked';return true;}
    if(this.pending!==null){this.pending=null;this.stableCount=null;this.progress=0;return true;}
    if(this.chunks.length){const n=this.chunks.pop();if(this.active==='A')this.a-=n;else this.b-=n;this.message='Removed last chunk: '+n;return true;}
    if(this.active==='B'){this.active='A';this.message='Back to number A';return true;}
    return false;
  }
  process(hands,now) {
    const notes=(hands||[]).slice(0,2).map(readHand);
    if(this.result) return { ...this.snapshot(), notes };
    if(!notes.length) {
      this.visibleCount=null;
      this.command=null;this.commandSince=0;this.commandFired=false;
      if(this.noHandsSince===null)this.noHandsSince=now;
      if(this.pending!==null && now-this.noHandsSince>=450) {
        this.commit();
        this.message='Chunk captured. Show the next chunk, or two thumbs up for B.';
      }
      if(now-this.noHandsSince>450){this.stableCount=null;this.progress=0;}
      return {...this.snapshot(),notes};
    }
    this.noHandsSince=null;
    const bothThumbs=notes.length===2&&notes.every(n=>n.gesture==='thumb');
    const bothFists=notes.length===2&&notes.every(n=>n.gesture==='fist');
    const cmd=bothThumbs?'next':bothFists?'equal':null;
    if(cmd){
      this.visibleCount=null;
      if(this.command!==cmd){this.command=cmd;this.commandSince=now;this.commandFired=false;}
      this.progress=Math.min(1,(now-this.commandSince)/(cmd==='next'?950:1150));
      this.message=cmd==='next'?'👍 👍 Hold to switch from A to B':'✊ ✊ Hold to show the results';
      if(!this.commandFired&&this.progress>=1){
        this.commandFired=true;
        if(cmd==='next')this.next();else this.equal();
      }
      return {...this.snapshot(),notes};
    }
    this.command=null;this.commandSince=0;this.commandFired=false;
    const n=notes.reduce((sum,item)=>sum+item.count,0);
    this.visibleCount=n;
    if(n===0 && !(notes.length===1 && notes[0].gesture==='fist')) {
      this.progress=0;this.stableCount=null;this.message='Show fingers, or one closed fist to enter zero';
      return {...this.snapshot(),notes};
    }
    if(n!==this.stableCount){
      this.stableCount=n;this.countSince=now;
      // The old locked value must not be added after the user changes a pose.
      this.pending=null;
    }
    this.progress=Math.min(1,(now-this.countSince)/650);
    if(this.progress>=1){
      this.pending=n;
      this.message=n+' locked! Lower both hands to add it, or show two thumbs up for B.';
    }else{
      this.message='Hold '+n+' fingers steady to lock ('+Math.round(this.progress*100)+'%)';
    }
    return {...this.snapshot(),notes};
  }
}
