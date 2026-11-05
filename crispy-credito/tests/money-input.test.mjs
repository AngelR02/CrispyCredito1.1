import assert from 'node:assert/strict';
import {parseCOP,formatCOP,handleMoneyInput} from '../dist/money-input.mjs';
assert.equal(parseCOP('1.000.000'),1000000);assert.equal(parseCOP('1000000'),1000000);assert.equal(formatCOP('1000000'),'1.000.000');assert.equal(formatCOP(1000000000000),'1.000.000.000.000');
for(const v of ['1,5','1.5','1,000,000','1e6','-1','NaN','1.00.000','1000000000001'])assert.throws(()=>parseCOP(v));
function field(value){return{value,selectionStart:value.length,dataset:{},matches:()=>true,setCustomValidity(message){this.message=message;},setSelectionRange(a){this.selectionStart=a;}};}
const f=field('1000');handleMoneyInput({target:f,inputType:'insertText',data:'0'});assert.equal(f.value,'1.000');
f.value='1.0000';f.selectionStart=f.value.length;handleMoneyInput({target:f,inputType:'insertText',data:'0'});assert.equal(f.value,'10.000');assert.equal(f.selectionStart,6);
f.value='1.000.000';handleMoneyInput({target:f,inputType:'insertFromPaste'});assert.equal(f.value,'1.000.000');assert.equal(f.message,'');
f.value='1.5';handleMoneyInput({target:f,inputType:'insertFromPaste'});assert.ok(f.message);assert.equal(f.value,'1.5');
f.value='';handleMoneyInput({target:f,inputType:'deleteContentBackward'});assert.equal(f.message,'');
console.log('Money input checks passed: COP thousands, numeric persistence, limits, invalid decimal/paste rejection and typing/caret formatting.');
