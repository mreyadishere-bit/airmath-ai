/**
 * AirMath — positional finger-number entry.
 * Hold 5, 3, 5 in sequence to enter "535" (NOT 5+3+5).
 * A different stable pose creates the next digit; to repeat the same
 * digit, briefly remove hands from view and present the pose again.
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


/** Decimal expansion rounded to 10 places, computed with BigInt. */
function decimalDivide(a,b) {
  if(b===0n) return 'Undefined (÷ 0)';
  const integer=a/b, remainder=a%b;
  if(remainder===0n) return integer.toString();
  const precision=10n,scale=10n**precision;
  const fraction=(remainder*scale + b/2n)/b;
  if(fraction>=scale) return (integer+1n).toString();
  const tail=fraction.toString().padStart(Number(precision),'0').replace(/0+$/,'');
  return tail ? integer.toString()+'.'+tail : integer.toString();
}
function parseOperand(input) {
  const value=String(input);
  if(!/^\d{1,100}$/.test(value)) throw Error('Invalid nonnegative integer (maximum 100 digits)');
  return BigInt(value);
}
export function fourOperations(a,b) {
  const x=parseOperand(a), y=parseOperand(b);
  return [
    {label:'Addition',symbol:'+',value:(x+y).toString()},
    {label:'Subtraction',symbol:'−',value:(x-y).toString()},
    {label:'Multiplication',symbol:'×',value:(x*y).toString()},
    {label:'Division',symbol:'÷',value:decimalDivide(x,y)}
  ];
}

/**
 * Each held number (0–9) appends exactly one decimal digit.
 * Ten raised fingers append "10" as an optional two-digit token.
 * The arming latch prevents duplicate entries from an unchanged hand pose.
 */
export class GestureCalculator {
  constructor() {this.reset();}
  reset() {
    this.a='';this.b='';this.active='A';this.chunksA=[];this.chunksB=[];
    this.pending=null;this.stableCount=null;this.countSince=0;
    this.noHandsSince=null;this.command=null;this.commandSince=0;this.commandFired=false;
    this.latched=false;this.result=null;this.visibleCount=null;this.progress=0;
    this.message='Show a digit with your fingers; hold it steady to append';
    this.lastEvent='';return this.snapshot();
  }
  get chunks() {return this.active==='A'?this.chunksA:this.chunksB;}
  get total() {return this.active==='A'?this.a:this.b;}
  snapshot() {
    return {
      a:this.chunksA.length?this.a:null,b:this.chunksB.length?this.b:null,
      active:this.active,chunksA:[...this.chunksA],chunksB:[...this.chunksB],
      pending:this.pending,visibleCount:this.visibleCount,latched:this.latched,
      result:this.result,progress:this.progress,message:this.message,lastEvent:this.lastEvent
    };
  }
  /** Add one token; tokens are concatenated, never numerically added. */
  commit(value=this.pending??this.visibleCount) {
    if(this.result) return false;
    if(this.latched) {
      this.message='This pose has already been entered. Change pose to append another digit.';
      return false;
    }
    const n=value;
    if(n===null || !Number.isInteger(n) || n<0 || n>10) {
      this.message='Show a valid number (0–10) and hold it steady';
      return false;
    }
    const token=String(n);
    if(this.total.length+token.length>100) {
      this.message='Maximum 100 digits per number';
      return false;
    }
    this.chunks.push(n);
    if(this.active==='A')this.a+=token;else this.b+=token;
    this.pending=null;this.progress=0;this.latched=true;
    this.lastEvent='Appended '+token+' to the RIGHT of '+this.active+' → '+this.total;
    this.message=this.lastEvent;
    return true;
  }
  next() {
    if(this.result)return false;
    // If a pose has been held but not committed, append it first.
    if(this.pending!==null && !this.latched)this.commit();
    if(this.active==='B'){this.message='Already entering B. Two fists = calculate.';return false;}
    if(!this.chunksA.length){this.message='Enter at least one digit for A first';return false;}
    this.active='B';this.stableCount=null;this.pending=null;this.latched=false;
    this.lastEvent='Number A saved. Now enter number B';
    this.message=this.lastEvent;this.progress=0;return true;
  }
  equal() {
    if(this.result)return false;
    if(this.pending!==null && !this.latched)this.commit();
    if(this.active!=='B'||!this.chunksB.length) {
      this.message='Enter A, use 👍👍 for Next, enter B, then ✊✊ for Equal';
      return false;
    }
    try {
      this.result=fourOperations(this.a,this.b);
    }catch(error) {this.message=error.message;return false;}
    this.lastEvent='Calculated '+this.a+' and '+this.b;
    this.message='Done! All four results are shown over the camera.';
    this.progress=0;return true;
  }
  undo() {
    if(this.result){this.result=null;this.message='Result cleared · edit your digits';return true;}
    if(this.pending!==null){this.pending=null;this.progress=0;return true;}
    if(this.chunks.length){
      const n=this.chunks.pop();
      if(this.active==='A')this.a=this.chunksA.join('');
      else this.b=this.chunksB.join('');
      this.message='Removed last digit/token: '+n;
      // Remain latched until the physical pose changes.
      this.latched=true;
      return true;
    }
    if(this.active==='B'){this.active='A';this.message='Back to number A';return true;}
    return false;
  }
  process(hands,now) {
    const notes=(hands||[]).slice(0,2).map(readHand);
    if(this.result)return {...this.snapshot(),notes};
    if(!notes.length){
      this.visibleCount=null;this.command=null;this.commandSince=0;this.commandFired=false;
      if(this.noHandsSince===null)this.noHandsSince=now;
      if(now-this.noHandsSince>=350){
        this.stableCount=null;this.pending=null;this.latched=false;this.progress=0;
        this.message='Ready for the next digit. Show your fingers.';
      }
      return {...this.snapshot(),notes};
    }
    this.noHandsSince=null;
    const bothThumbs=notes.length===2&&notes.every(n=>n.gesture==='thumb');
    const bothFists=notes.length===2&&notes.every(n=>n.gesture==='fist');
    const cmd=bothThumbs?'next':bothFists?'equal':null;
    if(cmd){
      this.visibleCount=null;this.stableCount=null;this.pending=null;this.latched=false;
      if(this.command!==cmd){this.command=cmd;this.commandSince=now;this.commandFired=false;}
      this.progress=Math.min(1,(now-this.commandSince)/(cmd==='next'?950:1150));
      this.message=cmd==='next'?'👍 👍 Hold to save A and enter B':'✊ ✊ Hold to calculate';
      if(!this.commandFired&&this.progress>=1){
        this.commandFired=true;
        if(cmd==='next')this.next();else this.equal();
      }
      return {...this.snapshot(),notes};
    }
    this.command=null;this.commandSince=0;this.commandFired=false;
    const n=notes.reduce((sum,item)=>sum+item.count,0);
    this.visibleCount=n;
    if(n===0 && !(notes.length===1&&notes[0].gesture==='fist')){
      this.progress=0;this.pending=null;
      this.message='One fist = digit zero; two fists = Equal';
      return {...this.snapshot(),notes};
    }
    if(n!==this.stableCount){
      this.stableCount=n;this.countSince=now;this.pending=null;this.latched=false;
    }
    if(this.latched){
      this.progress=0;
      this.message='Digit '+n+' added ✓ · change pose or lower hands for the next';
    }else{
      this.progress=Math.min(1,(now-this.countSince)/800);
      this.message='Hold '+n+' steady to append ('+Math.round(this.progress*100)+'%)';
      if(this.progress>=1){
        this.pending=n;
        this.commit();
      }
    }
    return {...this.snapshot(),notes};
  }
}
