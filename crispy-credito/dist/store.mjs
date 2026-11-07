import{calculateLoan,installment,validDate,today}from'./finance.mjs';
export const emptyWorkspace=()=>({version:2,clients:[],loans:[],payments:[]});
export function validateWorkspace(source,{allowLegacy=false}={}){
  let d=structuredClone(source);
  if(allowLegacy&&d?.version===1)d={version:2,clients:d.clients.map(c=>({...c,archivedAt:null})),loans:d.loans.map(l=>({...l,lateRate:0})),payments:d.payments.map(p=>({id:p.id,loanId:p.loanId,amount:p.capital+p.interest,date:p.date,method:p.method,note:p.note,createdAt:p.createdAt,reversed:!!p.reversed,legacySplit:{capital:p.capital,interest:p.interest}}))};
  if(![2,3].includes(d?.version)||!['clients','loans','payments'].every(k=>Array.isArray(d[k])&&d[k].length<=20000))throw Error('El archivo no es un respaldo compatible.');
  if(JSON.stringify(d).length>5000000)throw Error('El respaldo debe pesar menos de 5 MB.');
  const str=(v,n=1000)=>typeof v==='string'&&v.length<=n,amount=v=>Number.isSafeInteger(v)&&v>=0&&v<=1e12,ids=new Set();
  for(const v of[...d.clients,...d.loans,...d.payments]){if(!str(v.id,100)||!v.id||ids.has(v.id))throw Error('Hay identificadores vacíos o repetidos.');ids.add(v.id);}
  const people=new Map(d.clients.map(c=>[c.id,c]));
  for(const c of d.clients)if((Object.hasOwn(c,'kind')&&(d.version!==3||c.kind!=='partner'))||!str(c.name,100)||!c.name.trim()||!str(c.phone,30)||!str(c.note)||!validDate(c.createdAt)||!(c.archivedAt===null||validDate(c.archivedAt)))throw Error('Hay un cliente con datos inválidos.');
  for(const l of d.loans){if((Object.hasOwn(l,'interestMode')&&(d.version!==3||l.interestMode!=='flat'||l.lateRate!==0))||(people.get(l.clientId)?.kind==='partner'&&l.interestMode!=='flat'))throw Error('El plan del crédito o aporte no es válido.');if(l.createdAt!=null&&(!str(l.createdAt,100)||isNaN(Date.parse(l.createdAt))))throw Error('La fecha de registro del préstamo no es válida.');if(l.firstDueDate!=null&&(!validDate(l.firstDueDate)||l.firstDueDate<=l.start))throw Error('La primera cuota debe vencer después del desembolso.');if(!d.clients.some(c=>c.id===l.clientId)||!amount(l.principal)||!l.principal||!Number.isFinite(l.rate)||l.rate<0||l.rate>1000||!Number.isFinite(l.lateRate)||l.lateRate<0||l.lateRate>1000||!validDate(l.start)||!str(l.note))throw Error('Hay un préstamo con datos inválidos.');for(const r of[l.rate,l.lateRate])if(Math.abs(r*1000-Math.round(r*1000))>1e-6)throw Error('Las tasas admiten máximo tres decimales.');installment(l.principal,l.rate,l.months,l.interestMode);}
  for(const p of d.payments){const l=d.loans.find(l=>l.id===p.loanId);if(!l||!amount(p.amount)||!p.amount||!validDate(p.date)||p.date<l.start||p.date>today()||!str(p.method,100)||!str(p.note)||!str(p.createdAt,100)||isNaN(Date.parse(p.createdAt))||typeof p.reversed!=='boolean')throw Error('Hay un abono con datos inválidos.');if(p.legacySplit&&(!amount(p.legacySplit.capital)||!amount(p.legacySplit.interest)||p.legacySplit.capital+p.legacySplit.interest!==p.amount))throw Error('El desglose histórico no coincide.');}
  for(const l of d.loans)calculateLoan(l,d.payments);
  return{version:d.version,clients:d.clients.map(c=>({id:c.id,name:c.name.trim(),phone:c.phone,note:c.note,createdAt:c.createdAt,archivedAt:c.archivedAt,...(c.kind==='partner'?{kind:'partner'}:{})})),loans:d.loans.map(l=>({id:l.id,clientId:l.clientId,principal:l.principal,rate:l.rate,lateRate:l.lateRate,months:l.months,start:l.start,note:l.note,...(l.interestMode==='flat'?{interestMode:'flat'}:{}),...(l.firstDueDate?{firstDueDate:l.firstDueDate}:{}),...(l.createdAt?{createdAt:l.createdAt}:{})})),payments:d.payments.map(p=>({id:p.id,loanId:p.loanId,amount:p.amount,date:p.date,method:p.method,note:p.note,createdAt:p.createdAt,reversed:p.reversed,...(p.legacySplit?{legacySplit:p.legacySplit}:{})}))};
}
export function archiveClient(d,id,archived){const c=d.clients.find(c=>c.id===id);if(!c)throw Error('No encontramos ese cliente.');c.archivedAt=archived?today():null;}
export function deleteClient(d,id,confirmed=false){
  const c=d.clients.find(c=>c.id===id);
  if(!c)throw Error('No encontramos ese cliente.');
  if(confirmed!==true)throw Error('Confirma que deseas eliminar el cliente y todo su historial.');
  const ids=new Set(d.loans.filter(l=>l.clientId===id).map(l=>l.id));
  d.payments=d.payments.filter(p=>!ids.has(p.loanId));
  d.loans=d.loans.filter(l=>l.clientId!==id);d.clients=d.clients.filter(c=>c.id!==id);
}
export function recentLoans(loans){return loans.map((l,index)=>({l,index})).sort((a,b)=>Date.parse(b.l.createdAt||b.l.start+'T00:00:00Z')-Date.parse(a.l.createdAt||a.l.start+'T00:00:00Z')||b.index-a.index).map(x=>x.l);}

export function deleteLoan(d,id,confirmed=false){
  if(!d.loans.some(l=>l.id===id))throw Error('No encontramos ese crédito.');
  if(confirmed!==true)throw Error('Confirma que deseas eliminar este crédito y sus abonos.');
  d.payments=d.payments.filter(p=>p.loanId!==id);
  d.loans=d.loans.filter(l=>l.id!==id);
}
export function editLoan(d,id,changes){
  const next=structuredClone(d),l=next.loans.find(l=>l.id===id);
  if(!l)throw Error('No encontramos ese crédito.');
  for(const k of ['clientId','principal','rate','lateRate','months','start','note','interestMode'])if(Object.hasOwn(changes,k))l[k]=changes[k];
  if(Object.hasOwn(changes,'firstDueDate')){if(changes.firstDueDate==null||changes.firstDueDate==='')delete l.firstDueDate;else l.firstDueDate=changes.firstDueDate;}
  const validated=validateWorkspace(next);
  Object.assign(d,validated);
}
export function activeLoans(d,kind='client'){
  const ids=new Set(d.clients.filter(c=>!c.archivedAt&&(c.kind??'client')===kind).map(c=>c.id));
  return d.loans.filter(l=>ids.has(l.clientId));
}
export function loansAcceptingPayments(d,asOf=today(),kind='client'){
  return recentLoans(activeLoans(d,kind)).filter(l=>calculateLoan(l,d.payments,asOf).remainingTotal>0);
}
