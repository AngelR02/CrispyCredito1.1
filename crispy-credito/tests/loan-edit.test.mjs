import assert from 'node:assert/strict';
import {editLoan,deleteLoan,deleteClient,loansAcceptingPayments,validateWorkspace} from '../dist/store.mjs';
import {calculateLoan,schedule} from '../dist/finance.mjs';
const client={id:'c',name:'Cliente',phone:'',note:'',createdAt:'2026-01-01',archivedAt:null};
const loan={id:'l',clientId:'c',principal:300000,rate:0,lateRate:3,months:3,start:'2026-01-01',note:'',createdAt:'2026-01-01T12:00:00Z'};
const payment={id:'p',loanId:'l',amount:100000,date:'2026-01-10',method:'Efectivo',note:'Anticipado',createdAt:'2026-01-10T12:00:00Z',reversed:false};
const make=()=>({version:2,clients:[client,{...client,id:'other',name:'Otro'}],loans:[loan,{...loan,id:'other-loan',clientId:'other'}],payments:[payment,{...payment,id:'other-payment',loanId:'other-loan'},{...payment,id:'reversed',loanId:'l',reversed:true}]});
// No installment is due, but the loan has an outstanding contractual balance.
const d=make();assert.equal(calculateLoan(loan,[],'2026-01-01').amountDue,0);
assert.ok(loansAcceptingPayments({...d,payments:[]},'2026-01-01').some(l=>l.id==='l'));
assert.equal(calculateLoan(loan,[payment],'2026-01-10').receipts[0].late,0);
assert.equal(calculateLoan(loan,[payment],'2026-01-10').receipts[0].daysLate,0);
assert.equal(calculateLoan(loan,[payment],'2026-01-10').balance,200000);
// Even future-disbursement loans remain selectable, so the UI can explain the date.
assert.equal(loansAcceptingPayments({loans:[{...loan,start:'2026-12-01'}],payments:[]},'2026-01-01').length,1);
const paid={...payment,amount:300000};assert.equal(loansAcceptingPayments({loans:[loan],payments:[paid]},'2026-01-10').length,0);
const sameDay={...payment,date:'2026-01-01'};assert.equal(calculateLoan(loan,[sameDay],'2026-01-01').balance,200000);
// Edits retain identity and all receipts, and recalculate without a partial mutation.
editLoan(d,'l',{principal:600000,months:6,firstDueDate:'2026-02-15',note:'Corregido'});
assert.equal(d.loans[0].id,loan.id);assert.equal(d.loans[0].createdAt,loan.createdAt);
assert.equal(d.payments.length,3);assert.equal(calculateLoan(d.loans[0],d.payments,'2026-01-10').balance,500000);
assert.equal(schedule(d.loans[0])[0].date,'2026-02-15');validateWorkspace(d);
const before=structuredClone(d);assert.throws(()=>editLoan(d,'l',{principal:50000}),/supera/);assert.deepEqual(d,before);
assert.throws(()=>editLoan(d,'l',{start:'2026-01-11'}),/abono/);assert.deepEqual(d,before);
assert.throws(()=>editLoan(d,'l',{clientId:'missing'}));assert.deepEqual(d,before);
editLoan(d,'l',{firstDueDate:null});assert.equal(d.loans[0].firstDueDate,undefined);assert.equal(schedule(d.loans[0])[0].date,'2026-02-01');
const copy=make();assert.throws(()=>deleteLoan(copy,'l',false),/Confirma/);assert.deepEqual(copy,make());
deleteLoan(copy,'l',true);assert.equal(copy.clients.length,2);assert.deepEqual(copy.loans,[make().loans[1]]);assert.deepEqual(copy.payments,[make().payments[1]]);validateWorkspace(copy);
const whole=make();assert.throws(()=>deleteClient(whole,'c',false),/Confirma/);deleteClient(whole,'c',true);assert.equal(whole.clients.length,1);assert.equal(whole.loans.length,1);assert.equal(whole.payments.length,1);
console.log('Loan edit checks passed: advance/same-day payments, eligible future loans, settled loans excluded, validated edits with no partial mutation, preserved IDs/receipts and isolated deletion with confirmation.');
