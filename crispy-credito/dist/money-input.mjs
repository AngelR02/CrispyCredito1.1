// Colombian pesos: display thousands with dots; persist whole numeric pesos.
export function parseCOP(value){
  const s=String(value??'').trim();
  if(!/^\d+$/.test(s)&&!/^\d{1,3}(?:\.\d{3})+$/.test(s))throw Error('Escribe el valor en pesos enteros, por ejemplo 1.000.000.');
  const amount=Number(s.replaceAll('.',''));
  if(!Number.isSafeInteger(amount)||amount<0||amount>1e12)throw Error('El valor debe estar entre 0 y 1.000.000.000.000 pesos.');
  return amount;
}
export const formatCOP=value=>new Intl.NumberFormat('es-CO',{maximumFractionDigits:0}).format(parseCOP(value));
export function handleMoneyInput(event){
  const el=event.target;if(!el.matches('[data-money]'))return;
  const value=el.value;if(!value){el.setCustomValidity('');delete el.dataset.moneyInvalid;return;}
  const before=el.selectionStart??value.length,digitsBefore=value.slice(0,before).replace(/\D/g,'').length;
  const strict=el.dataset.moneyInvalid==='true'||event.inputType==='insertFromPaste'||(event.data!=null&&!/^\d+$/.test(event.data));
  try{
    const candidate=strict?value:/^[\d.]+$/.test(value)?value.replaceAll('.',''):value;
    const formatted=formatCOP(candidate);el.value=formatted;el.setCustomValidity('');delete el.dataset.moneyInvalid;
    let caret=0,digits=0;for(;caret<formatted.length&&digits<digitsBefore;caret++)if(/\d/.test(formatted[caret]))digits++;
    el.setSelectionRange(caret,caret);
  }catch(error){el.setCustomValidity(error.message);el.dataset.moneyInvalid='true';}
}
