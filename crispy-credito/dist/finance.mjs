// Pure calculation helpers. Money is rounded to Colombian pesos at each ledger entry.
export const round = v => Math.round(v);
export function installment(principal, percent, months){
  if(!Number.isFinite(principal)||principal<=0||!Number.isFinite(percent)||percent<0||!Number.isInteger(months)||months<1||months>120) throw Error('Revisa el monto, el interés y el número de cuotas (1 a 120).');
  const rate=percent/100;
  return rate===0?round(principal/months):round(principal*rate/(1-Math.pow(1+rate,-months)));
}
export function addMonths(iso,n){const [y,m,d]=iso.split('-').map(Number);const last=new Date(Date.UTC(y,m-1+n+1,0)).getUTCDate();return `${new Date(Date.UTC(y,m-1+n,1)).getUTCFullYear()}-${String(new Date(Date.UTC(y,m-1+n,1)).getUTCMonth()+1).padStart(2,'0')}-${String(Math.min(d,last)).padStart(2,'0')}`;}
export function ledger(loan,payments){
  let principal=loan.principal, paidInterest=0,paidPrincipal=0;
  const rows=payments.filter(p=>p.loanId===loan.id&&!p.reversed).sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt.localeCompare(b.createdAt));
  for(const p of rows){principal-=p.capital;paidPrincipal+=p.capital;paidInterest+=p.interest;}
  return {balance:Math.max(0,round(principal)),paidPrincipal,paidInterest,totalPaid:paidPrincipal+paidInterest,payments:rows};
}
export function schedule(loan){
  const quota=installment(loan.principal,loan.rate,loan.months);let balance=loan.principal;
  return Array.from({length:loan.months},(_,i)=>{const interest=round(balance*loan.rate/100);const capital=i===loan.months-1?balance:Math.min(balance,Math.max(0,quota-interest));balance-=capital;return {number:i+1,date:addMonths(loan.start,i+1),interest,capital,total:capital+interest,balance};});
}
export function nextDue(loan,payments){
  const l=ledger(loan,payments);if(l.balance===0)return null;
  const plan=schedule(loan);let cumulative=0;
  return plan.find(row=>{cumulative+=row.total;return cumulative>l.totalPaid;})??plan.at(-1);
}
