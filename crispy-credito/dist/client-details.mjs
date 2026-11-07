import { today } from './finance.mjs';

export const CLIENT_DETAIL_FIELDS = {
  documentNumber: { label: 'N.º de cédula', max: 40 },
  maritalStatus: { label: 'Estado civil', max: 40 },
  disbursementAccount: { label: 'Cuenta a desembolsar', max: 120 },
  address: { label: 'Dirección de residencia', max: 180 },
  complexName: { label: 'Nombre del conjunto', max: 120 },
  unit: { label: 'Torre y apartamento', max: 80 },
  neighborhood: { label: 'Barrio', max: 100 },
  city: { label: 'Ciudad', max: 100 },
  occupation: { label: 'Trabajo', max: 120 }
};
export const EARLIEST_BIRTH_DATE = '1900-01-01';
export const MAX_MANUAL_AGE = 130;

export function ageAt(birthDate, asOf = today()) {
  if (typeof birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) ||
      birthDate < EARLIEST_BIRTH_DATE || birthDate > asOf) return null;
  const parsed = new Date(birthDate + 'T00:00:00Z');
  if (!Number.isFinite(+parsed) || parsed.toISOString().slice(0, 10) !== birthDate) return null;
  const years = Number(asOf.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return years - Number(asOf.slice(5) < birthDate.slice(5));
}

export function validateClientDetails(value) {
  const invalid = () => { throw Error('Revisa los datos adicionales del cliente.'); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  const details = {};
  for (const [key, field] of Object.entries(CLIENT_DETAIL_FIELDS)) {
    if (!Object.hasOwn(value, key)) continue;
    if (typeof value[key] !== 'string' || value[key].length > field.max) invalid();
    if ((key === 'complexName' || key === 'unit') && value.inComplex !== true) invalid();
    const text = value[key].trim();
    if (!text) continue;
    details[key] = text;
  }
  if (Object.hasOwn(value, 'inComplex')) {
    if (typeof value.inComplex !== 'boolean') invalid();
    if (value.inComplex) details.inComplex = true;
  }
  if (Object.hasOwn(value, 'birthDate')) {
    if (ageAt(value.birthDate) === null || Object.hasOwn(value, 'age')) invalid();
    details.birthDate = value.birthDate;
  }
  if (Object.hasOwn(value, 'age')) {
    if (!Number.isInteger(value.age) || value.age < 0 || value.age > MAX_MANUAL_AGE) invalid();
    details.age = value.age;
  }
  if (Object.keys(value).some(key => !Object.hasOwn(CLIENT_DETAIL_FIELDS, key) &&
      !['birthDate', 'age', 'inComplex'].includes(key))) invalid();
  return details;
}
