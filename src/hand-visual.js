/**
 * Presentation-only hand states. The gesture calculator continues receiving
 * unmodified MediaPipe landmark readings; only overlay colors are stabilized.
 */
export const FINGER_BONES=Object.freeze([
  [[1,2],[2,3],[3,4]],           // Thumb
  [[5,6],[6,7],[7,8]],           // Index
  [[9,10],[10,11],[11,12]],      // Middle
  [[13,14],[14,15],[15,16]],     // Ring
  [[17,18],[18,19],[19,20]]      // Pinky
]);
export const PALM_BONES=Object.freeze([
  [0,1],[0,5],[0,9],[0,13],[0,17],
  [1,5],[5,9],[9,13],[13,17]
]);
export const VISUAL_COLORS=Object.freeze({
  raised:Object.freeze({
    core:'rgba(125,255,211,.98)',
    light:'rgba(240,255,250,.91)',
    halo:'rgba(41,244,179,.20)',
    ring:'rgba(99,255,212,.72)',
    fill:'rgba(125,255,211,.24)'
  }),
  folded:Object.freeze({
    core:'rgba(255,164,176,.96)',
    light:'rgba(255,234,239,.76)',
    halo:'rgba(255,99,129,.20)',
    ring:'rgba(255,163,185,.65)',
    fill:'rgba(255,164,176,.19)'
  })
});

/** Match each hand to the nearest previous wrist to avoid colors swapping when
 * MediaPipe changes its left/right result order. One switch needs ~2 frames. */
export function createVisualHandStates({holdMs=115,expireMs=600}={}) {
  let tracks=[];
  function update(hands,notes,now) {
    if(!Number.isFinite(now))now=0;
    const used=new Set();
    const output=[];
    for(let i=0;i<Math.min(2,hands.length);i++) {
      const wrist=hands[i]?.[0];
      const observed=(notes[i]?.fingers||[]).map(Boolean);
      if(!wrist||observed.length!==5){output.push(observed);continue;}
      let best=-1,dist=.25;
      for(let k=0;k<tracks.length;k++) {
        const track=tracks[k];
        if(used.has(k)||now-track.lastSeen>expireMs)continue;
        const d=Math.hypot(track.x-wrist.x,track.y-wrist.y);
        if(d<dist){dist=d;best=k;}
      }
      let track;
      if(best>=0) {
        track=tracks[best];
        used.add(best);
      }else{
        track={x:wrist.x,y:wrist.y,lastSeen:now,
          stable:[...observed],pending:[...observed],since:observed.map(()=>now)};
        tracks.push(track);
        used.add(tracks.length-1);
      }
      track.x=wrist.x;track.y=wrist.y;track.lastSeen=now;
      for(let f=0;f<5;f++){
        const want=observed[f];
        if(want===track.stable[f]){
          track.pending[f]=want;track.since[f]=now;
        }else if(want!==track.pending[f]){
          track.pending[f]=want;track.since[f]=now;
        }else if(now-track.since[f]>=holdMs){
          track.stable[f]=want;
          track.since[f]=now;
        }
      }
      output.push([...track.stable]);
    }
    tracks=tracks.filter(t=>now-t.lastSeen<=expireMs);
    return output;
  }
  function reset(){tracks=[];}
  return {update,reset};
}
