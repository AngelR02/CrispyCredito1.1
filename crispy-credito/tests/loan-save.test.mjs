import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {schedule,calculateLoan} from '../dist/finance.mjs';
import {ageAt} from '../dist/client-details.mjs';
import {PGlite} from '@electric-sql/pglite';
import {emptyWorkspace,validateWorkspace,editLoan,deleteLoan,activeLoans,archiveClient,loansAcceptingPayments} from '../dist/store.mjs';
const db=new PGlite();
await db.exec(`create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}'::jsonb);create role anon;create role authenticated;grant usage on schema auth to anon,authenticated;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
await db.exec(await fs.readFile(new URL('../supabase/01_base_de_datos.sql',import.meta.url),'utf8'));
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
await db.query('insert into auth.users values($1,$2),($3,$4)',[a,'owner@example.test',b,'other@example.test']);
await db.query('insert into public.cc_workspaces(user_id) values($1),($2)',[a,b]);
await db.exec("update public.cc_profiles set role='admin'");
await db.exec(`set role authenticated;set request.jwt.claim.sub='${a}'`);
let revision=0;
async function save(d){const result=await db.query('select public.cc_save_workspace($1::jsonb,$2) as saved',[JSON.stringify(validateWorkspace(d)),revision]);revision=result.rows[0].saved.revision;return result.rows[0].saved;}
async function reject(d){await assert.rejects(()=>db.query('select public.cc_save_workspace($1::jsonb,$2)',[JSON.stringify(d),revision]));assert.equal((await db.query('select revision from public.cc_workspaces')).rows[0].revision,revision);}
let data=emptyWorkspace();
data.clients.push({id:'client-a',name:'Cliente de prueba',phone:'',note:'',createdAt:'2026-01-01',archivedAt:null});
await save(data);
// Same values as the reported failure: COP 1, one month, 1% ordinary/late rate.
data.loans.push({id:'loan-small',clientId:'client-a',principal:1,rate:1,lateRate:1,months:1,start:'2026-11-05',note:''});
assert.equal((await save(data)).payload.loans[0].principal,1);
// A second client is essential: a name collision resolved to a loop variable
// could otherwise incorrectly accept/reject a loan according to the last client.
data.clients.push({id:'client-b',name:'Segundo cliente',phone:'',note:'',createdAt:'2026-01-01',archivedAt:null});
data.loans.push({id:'loan-first-client',clientId:'client-a',principal:1000000,rate:2.5,lateRate:1.125,months:12,start:'2026-01-01',note:'Tasa decimal',firstDueDate:'2026-02-15',createdAt:'2026-01-01T12:00:00Z'});
data.loans.push({id:'loan-second-client',clientId:'client-b',principal:500000,rate:0,lateRate:0,months:6,start:'2026-01-31',note:''});
await save(data);
data.payments.push({id:'payment-a',loanId:'loan-first-client',amount:10000,date:'2026-02-01',method:'Transferencia',note:'',createdAt:'2026-02-01T12:00:00Z',reversed:false});
await save(data);
assert.deepEqual((await db.query('select payload from public.cc_workspaces')).rows[0].payload,data);
let bad=structuredClone(data);bad.loans[1].clientId='missing';await reject(bad);
bad=structuredClone(data);bad.loans[1].firstDueDate='2025-12-31';await reject(bad);
bad=structuredClone(data);bad.loans[1].principal=0;await reject(bad);
bad=structuredClone(data);bad.loans[1].months=0;await reject(bad);
bad=structuredClone(data);bad.loans[1].rate=1.2345;await reject(bad);
bad=structuredClone(data);bad.payments[0].loanId='missing';await reject(bad);
// Repeating the correction must preserve existing records, revision and grants.
const before=(await db.query('select payload,revision from public.cc_workspaces')).rows[0];
await db.exec('reset role');
const patchPath=new URL('../CORREGIR_GUARDADO_PRESTAMOS.sql',import.meta.url);
// Reproduce an upgrade from the exact buggy function, then apply the repair.
const base=await fs.readFile(new URL('../supabase/01_base_de_datos.sql',import.meta.url),'utf8');
const functionStart=base.indexOf('create or replace function crispy_private.cc_validate_payload(');
const functionEnd=base.indexOf('end $$;',functionStart)+'end $$;'.length;
const buggyFunction=base.slice(functionStart,functionEnd).replace("from jsonb_array_elements(d->'clients') as client_item(value) where client_item.value->>'id'=l->>'clientId'", "from jsonb_array_elements(d->'clients') c where c->>'id'=l->>'clientId'");
await db.exec(buggyFunction);
await assert.rejects(()=>db.query('select crispy_private.cc_validate_payload($1::jsonb)',[JSON.stringify(data)]),e=>e.code==='42702');
const patch=await fs.readFile(patchPath,'utf8');await db.exec(patch);await db.exec(patch);
await db.exec(`set role authenticated;set request.jwt.claim.sub='${a}'`);
assert.deepEqual((await db.query('select payload,revision from public.cc_workspaces')).rows[0],before);
await save(data);
const corrected=structuredClone(data);editLoan(corrected,'loan-first-client',{principal:1200000,months:8});
assert.equal((await save(corrected)).payload.loans.find(l=>l.id==='loan-first-client').principal,1200000);
deleteLoan(corrected,'loan-first-client',true);
const removed=await save(corrected);assert.equal(removed.payload.clients.length,data.clients.length);assert.equal(removed.payload.loans.length,data.loans.length-1);assert.equal(removed.payload.payments.length,0);
// Fixed-interest plans and partner records must round-trip through the same RPC.
const portfolio=structuredClone(corrected);
portfolio.version=3;
portfolio.clients.push({...portfolio.clients[0],id:'partner-a',kind:'partner'});
const clientPlan={...portfolio.loans[0],id:'flat-client',principal:500000,rate:2,lateRate:0,months:5,start:'2026-01-01',interestMode:'flat'};
const partnerPlan={...clientPlan,id:'partner-plan',clientId:'partner-a',principal:1000000,rate:1};
portfolio.loans.push(clientPlan,partnerPlan);
assert.deepEqual(schedule(clientPlan).map(row=>row.interest),[10000,10000,10000,10000,10000]);
assert.equal(schedule(clientPlan).at(-1).balance,0);
portfolio.payments.push({id:'partner-pay',loanId:partnerPlan.id,amount:210000,date:'2026-02-01',method:'Transferencia',note:'',createdAt:'2026-02-01T12:00:00Z',reversed:false});
const partnerState=calculateLoan(partnerPlan,portfolio.payments,'2026-03-02');
assert.equal(partnerState.paidInterest,10000);
assert.equal(partnerState.balance,800000);
assert.equal(partnerState.lateDue,0);
assert.deepEqual((await save(portfolio)).payload,portfolio);
await reject(corrected);
const invalid=structuredClone(portfolio);
delete invalid.loans.at(-1).interestMode;
await reject(invalid);
archiveClient(portfolio,'client-a',true);
assert.ok(!activeLoans(portfolio).some(l=>l.clientId==='client-a'));
assert.ok(!loansAcceptingPayments(portfolio).some(l=>l.clientId==='client-a'));
assert.equal(activeLoans(portfolio,'partner').length,1);
assert.ok(portfolio.loans.some(l=>l.id==='flat-client'));
archiveClient(portfolio,'client-a',false);
assert.ok(activeLoans(portfolio).some(l=>l.id==='flat-client'));
// The same payment targets must work for a client and a partner after a save.
portfolio.version=4;
const oldPayments=structuredClone(portfolio.payments);
for(const plan of [clientPlan,partnerPlan]){
  const before=calculateLoan(plan,portfolio.payments,'2026-03-02');
  const payment={id:`target-${plan.id}`,loanId:plan.id,amount:5000,date:'2026-03-02',method:'Efectivo',note:'',createdAt:'2026-03-02T12:00:00Z',reversed:false};
  const capital=calculateLoan(plan,[...portfolio.payments,{...payment,application:'capital'}],'2026-03-02');
  assert.equal(capital.balance,before.balance-5000);
  assert.equal(capital.paidInterest,before.paidInterest);
  const interest=calculateLoan(plan,[...portfolio.payments,{...payment,application:'interest'}],'2026-03-02');
  assert.equal(interest.balance,before.balance);
  assert.equal(interest.paidInterest,before.paidInterest+5000);
  assert.throws(()=>calculateLoan(plan,[...portfolio.payments,{...payment,application:'interest',amount:before.remainingTotal-before.balance+1}],'2026-03-02'),/intereses pendientes/);
  const full={...payment,application:'both',amount:before.remainingTotal};
  assert.equal(calculateLoan(plan,[...portfolio.payments,full],'2026-03-02').remainingTotal,0);
  portfolio.payments.push({...payment,application:plan===clientPlan?'capital':'interest'});
}
const stored=await save(portfolio);
assert.deepEqual(stored.payload,portfolio);
assert.deepEqual(stored.payload.payments.slice(0,oldPayments.length),oldPayments);
await reject({...portfolio,version:3});
const bogusTarget=structuredClone(portfolio);
bogusTarget.payments.at(-1).application='unknown';
await reject(bogusTarget);
assert.throws(()=>validateWorkspace(bogusTarget),/aplicación/i);
// Client details survive validation, saving and reloading without changing existing payments.
assert.equal(ageAt('1992-11-08','2026-11-07'),33);
assert.equal(ageAt('1992-11-08','2026-11-08'),34);
assert.equal(ageAt('1992-02-30','2026-11-07'),null);
const withDetails=structuredClone(portfolio);
withDetails.version=5;
withDetails.clients[0].details={
  documentNumber:'00123456',birthDate:'1992-11-08',maritalStatus:'Unión libre',
  disbursementAccount:'Banco de prueba 000123',address:'Calle de prueba',inComplex:true,
  complexName:'Conjunto de prueba',unit:'Torre 2 · Apartamento 301',neighborhood:'Barrio de prueba',
  city:'Villavicencio',occupation:'Diseño'
};
withDetails.clients[1].details={age:36};
assert.deepEqual(validateWorkspace(withDetails),withDetails);
assert.deepEqual((await save(withDetails)).payload,withDetails);
assert.deepEqual((await db.query('select payload from public.cc_workspaces')).rows[0].payload,withDetails);
await reject(portfolio);
for(const details of [
  {birthDate:'1992-02-30'},{birthDate:'2099-01-01'},{birthDate:'1992-11-08',age:33},
  {age:31.5},{documentNumber:123},{complexName:'Conjunto de prueba'}
]){
  const invalid=structuredClone(withDetails);
  invalid.clients[0].details=details;
  assert.throws(()=>validateWorkspace(invalid));
  await reject(invalid);
}
const invalidPartner=structuredClone(withDetails);
invalidPartner.clients.at(-1).details={city:'Villavicencio'};
assert.throws(()=>validateWorkspace(invalidPartner));
await reject(invalidPartner);
await db.exec(`set request.jwt.claim.sub='${b}'`);
assert.equal((await db.query('select payload from public.cc_workspaces')).rows[0].payload.loans.length,0);
await db.exec('set role anon');
await assert.rejects(()=>db.query('select * from public.cc_workspaces'),e=>e.code==='42501');
await assert.rejects(()=>db.query('select crispy_private.cc_validate_payload($1::jsonb)',[JSON.stringify(data)]),e=>e.code==='42501');
await assert.rejects(()=>db.query('select public.cc_save_workspace($1::jsonb,0)',[JSON.stringify(data)]),e=>e.code==='42501');
await db.close();
console.log('Loan saving checks passed: reported COP 1 case, multiple clients, decimal rates, zero interest, payment persistence, invalid references and values rejected, patch idempotence, data retained and RLS isolation.');
