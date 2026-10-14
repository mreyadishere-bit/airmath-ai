import {strict as assert} from 'node:assert';
import {solveMath} from '../src/math.js';
for(const [input,expected] of [['12+8','20'],['10*5','50'],['(9+3)/2','6'],['2^3','8'],['√(81)','9'],['x+5=12','x = 7'],['x^2-9=0','x = 3 , -3'],['3(4+2)','18'],['10÷5','2']]){
 assert.equal(solveMath(input).value,expected,input);
}
assert.throws(()=>solveMath('1/0'),/zero/);
console.log('Math tests passed');
