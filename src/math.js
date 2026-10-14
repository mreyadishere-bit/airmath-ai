// Local arithmetic and equation solver; no eval or network requests.
const fmt=n=>String(Number(n.toPrecision(10)));
function tokenize(s) {
 s=s.replace(/[−–]/g,'-').replace(/[×]/g,'*').replace(/[÷]/g,'/').replace(/√/g,'sqrt').replace(/\s/g,'');
 const t=s.match(/sqrt|\d*\.?\d+|x|[+*/()^=\-]/g)||[];
 if(t.join('')!==s||t.length>100)throw Error('Unsupported expression');
 const out=[];for(let i=0;i<t.length;i++){if(i>0&&(/^(x|\)|\d)/.test(t[i-1]))&&(/^(x|\(|sqrt)/.test(t[i])))out.push('*');out.push(t[i]);}return out;
}
function poly(a=0,b=0,c=0){return [a,b,c];}
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
function mul(a,b){const z=[0,0,0];for(let i=0;i<3;i++)for(let j=0;j<3;j++){if(i+j>2){if(a[i]*b[j])throw Error('Degree above 2 not supported');}else z[i+j]+=a[i]*b[j];}return z;}
function divide(a,b){if(b[1]||b[2])throw Error('Cannot divide by x');if(!b[0])throw Error('Division by zero');return a.map(v=>v/b[0]);}
function power(a,b){if(b[1]||b[2]||!Number.isInteger(b[0])||Math.abs(b[0])>10)throw Error('Unsupported power');if(b[0]<0){if(a[1]||a[2])throw Error('Unsupported negative power');return poly(a[0]**b[0]);}let z=poly(1);for(let i=0;i<b[0];i++)z=mul(z,a);return z;}
function evaluate(tokens){let i=0;const peek=()=>tokens[i],eat=x=>{if(peek()===x){i++;return true;}return false;};let depth=0;
 function atom(){if(++depth>80)throw Error('Expression too complex');let result;if(eat('(')){result=expr();if(!eat(')'))throw Error('Missing )');}else if(eat('sqrt')){const v=atom();if(v[1]||v[2]||v[0]<0)throw Error('Invalid root');result=poly(Math.sqrt(v[0]));}else if(peek()==='x'){i++;result=poly(0,1);}else if(peek()&&/^\d/.test(peek())){result=poly(Number(tokens[i++]));}else throw Error('Expected number');depth--;return result;}
 function unary(){if(eat('+'))return unary();if(eat('-'))return mul(poly(-1),unary());return atom();}
 function exponent(){let v=unary();if(eat('^'))v=power(v,exponent());return v;}
 function product(){let v=exponent();while(peek()==='*'||peek()==='/'){const op=tokens[i++],rhs=exponent();v=op==='*'?mul(v,rhs):divide(v,rhs);}return v;}
 function expr(){let v=product();while(peek()==='+'||peek()==='-'){const op=tokens[i++],rhs=product();v=op==='+'?add(v,rhs):sub(v,rhs);}return v;}
 const lhs=expr();let rhs=null;if(eat('='))rhs=expr();if(i!==tokens.length)throw Error('Unexpected token');return {lhs,rhs};
}
export function solveMath(input) {
 const s=String(input||'').trim().replace(/=\s*$/,'');if(!s)throw Error('Enter an expression');
 const {lhs,rhs}=evaluate(tokenize(s)),p=rhs?sub(lhs,rhs):lhs;
 if(!p[1]&&!p[2])return {value:rhs?(Math.abs(p[0])<1e-9?'TRUE':'FALSE'):fmt(lhs[0]),note:'Calculated on-device'};
 if(!rhs)return {value:p.map((v,i)=>v?fmt(v)+(i?'x'+(i===2?'²':''):''):'').filter(Boolean).join(' + '),note:'Simplified'};
 if(!p[2])return {value:p[1]?'x = '+fmt(-p[0]/p[1]):'No unique solution',note:'Linear equation'};
 const d=p[1]**2-4*p[2]*p[0];if(d<0)return {value:'No real roots',note:'Quadratic equation'};
 const x1=(-p[1]+Math.sqrt(d))/(2*p[2]),x2=(-p[1]-Math.sqrt(d))/(2*p[2]);
 return {value:Math.abs(x1-x2)<1e-9?'x = '+fmt(x1):'x = '+fmt(x1)+' , '+fmt(x2),note:'Quadratic equation'};
}
