import assert from 'node:assert/strict';
import {FINGER_BONES,PALM_BONES,VISUAL_COLORS,createVisualHandStates} from '../src/hand-visual.js';

assert.equal(FINGER_BONES.length,5,'Five separately colored finger chains');
assert.ok(FINGER_BONES.every(chain=>chain.length===3),'All finger phalanges included');
assert.deepEqual(FINGER_BONES[0].at(-1),[3,4]);
assert.deepEqual(FINGER_BONES[4].at(-1),[19,20]);
assert.ok(PALM_BONES.length>=5,'Palm geometry should remain available');
assert.notEqual(VISUAL_COLORS.raised.core,VISUAL_COLORS.folded.core);
assert.notEqual(VISUAL_COLORS.raised.halo,VISUAL_COLORS.folded.halo);
assert.ok(VISUAL_COLORS.raised.ring && VISUAL_COLORS.folded.ring);

const wrist=(x,y)=>[{x,y}];
const note=values=>({fingers:values});
const tracking=createVisualHandStates({holdMs:110,expireMs:600});
const up=[true,true,true,true,true];
const closed=[false,false,false,false,false];

assert.deepEqual(tracking.update([wrist(.15,.6)],[note(up)],0),[up]);
// Transient incorrect classifications must not cause color flashing.
assert.deepEqual(tracking.update([wrist(.15,.6)],[note(closed)],40),[up]);
assert.deepEqual(tracking.update([wrist(.15,.6)],[note(up)],80),[up]);
assert.deepEqual(tracking.update([wrist(.15,.6)],[note(closed)],120),[up]);
assert.deepEqual(tracking.update([wrist(.15,.6)],[note(closed)],235),[closed]);

// Reordering MediaPipe hands must preserve visual state via nearest wrist.
const swap=createVisualHandStates({holdMs:110});
assert.deepEqual(
  swap.update([wrist(.15,.6),wrist(.85,.6)],[note(up),note(closed)],0),
  [up,closed]
);
assert.deepEqual(
  swap.update([wrist(.84,.6),wrist(.16,.6)],[note(closed),note(up)],50),
  [closed,up]
);
assert.deepEqual(
  swap.update([wrist(.16,.6),wrist(.84,.6)],[note(closed),note(up)],120),
  [up,closed],
  'A single transient frame must not reverse the left hand color'
);

// A hand missing long enough should be treated as a new hand with no stale hue.
tracking.update([],[],600);
assert.deepEqual(tracking.update([wrist(.15,.6)],[note(up)],901),[up]);
tracking.reset();
assert.deepEqual(tracking.update([wrist(.15,.6)],[note(closed)],1000),[closed]);
console.log('Individual finger colors and temporal smoothing tests passed');
