// COP enteros. Cuotas de la más antigua a la más reciente: mora, interés, capital.
export const round = Math.round;
export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function validDate(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&v>='2000-01-01'&&v<='2100-12-31'&&!isNaN(Date.parse(v))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;}
export function daysBetween(a,b){if(!validDate(a)||!validDate(b))throw Error('Fecha inválida.');return Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000);}
export function addMonths(iso,n){if(!validDate(iso))throw Error('Fecha inválida.');const[y,m,d]=iso.split('-').map(Number),month=new Date(Date.UTC(y,m-1+n,1)),last=new Date(Date.UTC(y,m+n,0)).getUTCDate();return `${month.getUTCFullYear()}-${String(month.getUTCMonth()+1).padStart(2,'0')}-${String(Math.min(d,last)).padStart(2,'0')}`;}
export function installment(p,percent,n){if(!Number.isSafeInteger(p)||p<=0||p>1e12||!Number.isFinite(percent)||percent<0||percent>1000||!Number.isInteger(n)||n<1||n>120)throw Error('Revisa monto, interés y cuotas (1 a 120).');const r=percent/100,q=r===0?round(p/n):round(p*r/-Math.expm1(-n*Math.log1p(r)));if(q<=0)throw Error('El monto es demasiado pequeño para ese número de cuotas.');return q;}
export function schedule(l){const q=installment(l.principal,l.rate,l.months);let balance=l.principal;return Array.from({length:l.months},(_,i)=>{const interest=round(balance*l.rate/100),capital=i===l.months-1?balance:Math.min(balance,Math.max(0,q-interest));balance-=capital;return{number:i+1,date:addMonths(l.start,i+1),interest,capital,total:capital+interest,balance};});}
const DEN=3000000n; // Tasa mensual en milésimas de porcentaje / 100 / 30 días.
const fee=r=>Number((r.feeUnits+DEN/2n)/DEN);
const dueFee=r=>Math.max(0,fee(r)-r.latePaid);
const remaining=r=>r.capital-r.capitalPaid+r.interest-r.interestPaid+dueFee(r);
export function calculateLoan(l,payments,asOf=today()){
  if(!validDate(asOf))throw Error('Fecha de consulta inválida.');
  const rate=l.lateRate??0;if(!Number.isFinite(rate)||rate<0||rate>1000||Math.abs(rate*1000-Math.round(rate*1000))>1e-6)throw Error('La tasa de mora admite máximo tres decimales.');
  const ru=BigInt(Math.round(rate*1000)),rows=schedule(l).map(r=>({...r,capitalPaid:0,interestPaid:0,latePaid:0,feeUnits:0n,through:r.date})),receipts=[];
  const timeline=payments.filter(p=>p.loanId===l.id&&!p.reversed&&p.date<=asOf).slice().sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
  function accrue(date){for(const r of rows)if(date>r.through){r.feeUnits+=BigInt(r.capital-r.capitalPaid)*ru*BigInt(daysBetween(r.through,date));r.through=date;}}
  for(const p of timeline){
    if(!validDate(p.date)||p.date<l.start||!Number.isSafeInteger(p.amount)||p.amount<=0)throw Error('El préstamo contiene un abono inválido.');
    accrue(p.date);const rec={id:p.id,capital:0,interest:0,late:0,amount:p.amount,daysLate:0,allocations:[]};
    if(p.legacySplit){
      let c=p.legacySplit.capital,i=p.legacySplit.interest;
      for(const r of rows){const cap=Math.min(c,r.capital-r.capitalPaid),int=Math.min(i,r.interest-r.interestPaid);r.capitalPaid+=cap;r.interestPaid+=int;c-=cap;i-=int;if(cap+int){const days=Math.max(0,daysBetween(r.date,p.date));rec.allocations.push({number:r.number,date:r.date,capital:cap,interest:int,late:0,daysLate:days});rec.daysLate=Math.max(rec.daysLate,days);}}
      if(c||i)throw Error('Un abono histórico supera el capital o los intereses del plan. Revisa el registro antes de importar.');rec.capital=p.legacySplit.capital;rec.interest=p.legacySplit.interest;
    }else{
      let available=p.amount;
      for(const r of rows){if(!available)break;const late=Math.min(available,dueFee(r));available-=late;r.latePaid+=late;const interest=Math.min(available,r.interest-r.interestPaid);available-=interest;r.interestPaid+=interest;const capital=Math.min(available,r.capital-r.capitalPaid);available-=capital;r.capitalPaid+=capital;if(late+interest+capital){const days=Math.max(0,daysBetween(r.date,p.date));rec.allocations.push({number:r.number,date:r.date,capital,interest,late,daysLate:days});rec.daysLate=Math.max(rec.daysLate,days);rec.capital+=capital;rec.interest+=interest;rec.late+=late;}}
      if(available)throw Error('El abono supera el total pendiente del plan en esa fecha. Revisa el valor o los pagos posteriores.');
    }
    if(rec.capital+rec.interest+rec.late!==p.amount)throw Error('El desglose no coincide con el total.');receipts.push(rec);
  }
  accrue(asOf);
  const resultRows=rows.map(r=>({number:r.number,date:r.date,capital:r.capital,interest:r.interest,total:r.total,capitalPaid:r.capitalPaid,interestPaid:r.interestPaid,latePaid:r.latePaid,lateAccrued:fee(r),lateDue:dueFee(r),capitalDue:r.capital-r.capitalPaid,interestDue:r.interest-r.interestPaid,remaining:remaining(r),daysLate:remaining(r)>0?Math.max(0,daysBetween(r.date,asOf)):0}));
  const sum=k=>receipts.reduce((s,r)=>s+r[k],0),due=resultRows.filter(r=>r.date<=asOf);
  return{balance:l.principal-sum('capital'),paidPrincipal:sum('capital'),paidInterest:sum('interest'),paidLate:sum('late'),totalPaid:sum('amount'),overdueDays:Math.max(0,...resultRows.map(r=>r.daysLate)),overdueCapital:due.filter(r=>r.date<asOf).reduce((s,r)=>s+r.capitalDue,0),lateDue:resultRows.reduce((s,r)=>s+r.lateDue,0),amountDue:due.reduce((s,r)=>s+r.remaining,0),remainingTotal:resultRows.reduce((s,r)=>s+r.remaining,0),rows:resultRows,receipts,next:resultRows.find(r=>r.remaining>0)??null};
}
export const ledger=calculateLoan;
export const nextDue=(l,p,asOf=today())=>calculateLoan(l,p,asOf).next;
export function previewPayment(l,payments,p,asOf=today()){const result=calculateLoan(l,[...payments,p],asOf<p.date?p.date:asOf),rec=result.receipts.find(r=>r.id===p.id);if(!rec)throw Error('No se pudo calcular el abono.');return{...rec,balance:result.balance,result};}
