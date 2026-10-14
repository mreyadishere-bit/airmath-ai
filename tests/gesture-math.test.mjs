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
  const fingers=[[8,6,.4],[12,10,.5],[16,14,.6],[20,18,.7]];
  let start=0;
  if(gesture==='thumb'||count>=5){p[4]=point(.18,.35);start=1;}
  let remaining=gesture==='thumb'?0:count-start;
  for(const [tip,pip,x] of fingers){
    p[pip]=point(x,.62);
    p[tip]=point(x,remaining>0?.32:.83);
    remaining--;
  }
  return p;
}
assert.equal(readHand(hand(0)).gesture,'fist');
assert.equal(readHand(hand(4)).count,4);
assert.equal(readHand(hand(5)).count,5);
assert.equal(readHand(hand(1,'thumb')).gesture,'thumb');
assert.equal(fourOperations(20,5)[0].value,'25');
assert.equal(fourOperations(20,5)[2].value,'100');
assert.equal(fourOperations(20,0)[3].value,'Undefined (÷ 0)');
assert.equal(fourOperations(2,3)[3].value,'0.6666666667');
assert.equal(fourOperations('12345678901234567890','10')[2].value,'123456789012345678900');

function pose(calc,hands,at,duration=850){
  calc.process(hands,at);
  return calc.process(hands,at+duration);
}
function disappear(calc,at){
  calc.process([],at);
  calc.process([],at+420);
}
const g=new GestureCalculator();
pose(g,[hand(5)],100);
assert.equal(g.a,'5','first 5 must auto-append');
pose(g,[hand(3)],1400);
assert.equal(g.a,'53','next 3 must be placed on right');
pose(g,[hand(5)],2700);
assert.equal(g.a,'535','5→3→5 must be 535, not 13');
assert.deepEqual(g.chunksA,[5,3,5]);
pose(g,[hand(5)],4000,4000);
assert.equal(g.a,'535','holding the same pose must not add another 5');
pose(g,[hand(1,'thumb'),hand(1,'thumb')],8500,1100);
assert.equal(g.active,'B','two thumbs-up separates operands');
pose(g,[hand(1)],10000);
pose(g,[hand(0)],11300);
assert.equal(g.b,'10','B built as digits 1 and 0');
pose(g,[hand(0),hand(0)],12600,1250);
assert.ok(g.result,'two fists calculate');
assert.deepEqual(g.result.map(r=>r.value),['545','525','5350','53.5']);

const repeated=new GestureCalculator();
pose(repeated,[hand(5)],100);
disappear(repeated,1100);
pose(repeated,[hand(5)],2000);
assert.equal(repeated.a,'55','brief hand removal must allow identical next digit');

const tens=new GestureCalculator();
pose(tens,[hand(5),hand(5)],100);
assert.equal(tens.a,'10','two open hands are the token 10');
pose(tens,[hand(3)],1300);
assert.equal(tens.a,'103','10 then 3 must concatenate as 103');

const zero=new GestureCalculator();
pose(zero,[hand(0)],100);
assert.equal(zero.a,'0','one fist enters zero');
pose(zero,[hand(5)],1100);
assert.equal(zero.a,'05','leading zero is preserved in the displayed number');
zero.next();
pose(zero,[hand(1)],2300);
zero.equal();
assert.equal(zero.result[0].value,'6','leading zeros should still calculate correctly');

const undone=new GestureCalculator();
pose(undone,[hand(2)],100);
pose(undone,[hand(4)],1100);
assert.equal(undone.a,'24');
undone.undo();
assert.equal(undone.a,'2','undo removes rightmost token');
undone.reset();
assert.equal(undone.a,'');
assert.equal(undone.result,null);
console.log('Positional gesture digit entry and BigInt arithmetic tests passed');
