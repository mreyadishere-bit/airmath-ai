import assert from 'node:assert/strict';
import {GestureCalculator,readHand,fourOperations} from '../src/gesture-math.js';
const point=(x,y)=>({x,y,z:0});
function hand(count=0,gesture='number') {
  const p=Array.from({length:21},()=>point(.5,.75));
  p[0]=point(.5,.9);
  p[17]=point(.72,.67);
  p[5]=point(.4,.58);
  p[3]=point(.41,.66);
  p[2]=point(.44,.74);
  p[4]=point(.42,.82);
  const fingers=[ [8,6,.4],[12,10,.5],[16,14,.6],[20,18,.7] ];
  let start=0;
  if(gesture==='thumb' || count>=5){
    p[4]=point(.18,.35);start=1;
  }
  let remaining=gesture==='thumb'?0:count-start;
  for(const [tip,pip,x] of fingers){
    p[pip]=point(x,.62);
    p[tip]=point(x,remaining>0?.32:.83);
    remaining--;
  }
  return p;
}
assert.equal(readHand(hand(4)).count,4);
assert.equal(readHand(hand(5)).count,5);
assert.equal(readHand(hand(0)).gesture,'fist');
assert.equal(readHand(hand(1,'thumb')).gesture,'thumb');
assert.equal(fourOperations(20,5)[2].value,100);
assert.equal(fourOperations(20,0)[3].value,'Undefined (÷ 0)');
const g=new GestureCalculator();
function hold(hands,start,duration=750){
  g.process(hands,start);
  return g.process(hands,start+duration);
}
function release(start) {g.process([],start);g.process([],start+510);}
hold([hand(5),hand(5)],1000);
assert.equal(g.pending,10,'ten fingers should stabilize');
release(2000);
assert.equal(g.a,10);
hold([hand(5),hand(5)],3000);
release(4000);
assert.equal(g.a,20,'two ten-finger chunks should accumulate to 20');
hold([hand(1,'thumb'),hand(1,'thumb')],5000,1100);
assert.equal(g.active,'B','two thumbs should separate A and B');
hold([hand(3)],6500);
release(7600);
assert.equal(g.b,3);
hold([hand(0),hand(0)],8700,1250);
assert.equal(g.result[0].value,23);
assert.equal(g.result[1].value,17);
assert.equal(g.result[2].value,60);
assert.ok(Math.abs(g.result[3].value-6.666666667)<1e-7);
const g2=new GestureCalculator();
g2.process([hand(4)],100);
g2.process([hand(4)],900);
g2.next();
assert.equal(g2.a,4,'separator should capture an unreleased pending candidate');
assert.equal(g2.active,'B');
g2.process([hand(5)],1100);g2.process([hand(5)],1900);
g2.equal();assert.equal(g2.result[0].value,9);
g2.reset();assert.equal(g2.a,0);assert.equal(g2.result,null);
const z=new GestureCalculator();
z.process([hand(0)],100);z.process([hand(0)],820);
assert.equal(z.pending,0,'a single fist should allow inputting zero');
z.process([],1000);z.process([],1600);
assert.deepEqual(z.chunksA,[0]);
console.log('Gesture calculator tests passed');
