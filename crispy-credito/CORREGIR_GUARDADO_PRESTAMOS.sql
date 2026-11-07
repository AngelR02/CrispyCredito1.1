-- Crispy Crédito: corregir el guardado de préstamos.
-- Supabase > SQL Editor > New query > pegar TODO > Run con el rol postgres.
-- No borra clientes ni carteras. No cambia usuarios, contraseñas, tasas ni saldos.
-- Sustituye solamente la función de validación, conservando su firma y permisos.
begin;

do $check$
begin
  if to_regprocedure('crispy_private.cc_validate_payload(jsonb)') is null then
    raise exception 'Primero instala la base con INICIAR_SUPABASE.sql.';
  end if;
end $check$;

create or replace function crispy_private.cc_validate_payload(d jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare details jsonb; field_limit record; c jsonb; l jsonb; p jsonb; x jsonb; k text; n numeric; id_count bigint; distinct_count bigint;
begin
  if jsonb_typeof(d) is distinct from 'object' or coalesce(d->>'version','') not in ('2','3','4','5') or octet_length(d::text)>5000000 then raise exception 'Formato inválido'; end if;
  foreach k in array array['clients','loans','payments'] loop
    if jsonb_typeof(d->k) is distinct from 'array' or jsonb_array_length(d->k)>20000 then raise exception 'Colección inválida'; end if;
  end loop;
  select count(*),count(distinct v->>'id') into id_count,distinct_count from jsonb_array_elements((d->'clients')||(d->'loans')||(d->'payments')) v;
  if id_count<>distinct_count then raise exception 'Identificadores repetidos'; end if;
  for x in select value from jsonb_array_elements((d->'clients')||(d->'loans')||(d->'payments')) loop
    if jsonb_typeof(x->'id') is distinct from 'string' or length(x->>'id') not between 1 and 100 or jsonb_typeof(x->'note') is distinct from 'string' or length(x->>'note')>1000 then raise exception 'Registro inválido'; end if;
  end loop;
  for c in select value from jsonb_array_elements(d->'clients') loop
    if jsonb_typeof(c->'name') is distinct from 'string' or length(trim(c->>'name')) not between 1 and 100 or jsonb_typeof(c->'phone') is distinct from 'string' or length(c->>'phone')>30 or not crispy_private.cc_valid_date(c->>'createdAt') then raise exception 'Cliente inválido'; end if;
    if c ? 'kind' and ((d->>'version') not in ('3','4','5') or (c->>'kind') is distinct from 'partner') then raise exception 'Tipo de ficha inválido'; end if;
    if c ? 'details' then
      details := c->'details';
      if d->>'version' <> '5' or c ? 'kind' or jsonb_typeof(details) is distinct from 'object' then
        raise exception 'Datos adicionales de cliente inválidos';
      end if;
      if details - array['documentNumber','maritalStatus','disbursementAccount','address','complexName','unit',
                         'neighborhood','city','occupation','inComplex','birthDate','age'] <> '{}'::jsonb then
        raise exception 'Campo adicional de cliente inválido';
      end if;
      for field_limit in select * from (values
        ('documentNumber',40),('maritalStatus',40),('disbursementAccount',120),('address',180),
        ('complexName',120),('unit',80),('neighborhood',100),('city',100),('occupation',120)
      ) as limits(key,max_length) loop
        if details ? field_limit.key and (
          jsonb_typeof(details->field_limit.key) is distinct from 'string' or
          length(details->>field_limit.key)>field_limit.max_length
        ) then raise exception 'Texto de ficha inválido'; end if;
      end loop;
      if (details ? 'inComplex' and jsonb_typeof(details->'inComplex') is distinct from 'boolean')
        or ((details ? 'complexName' or details ? 'unit') and details->'inComplex' is distinct from 'true'::jsonb) then
        raise exception 'Datos del conjunto inválidos';
      end if;
      if details ? 'birthDate' then
        if jsonb_typeof(details->'birthDate') is distinct from 'string' or
          (details->>'birthDate') !~ '^\d{4}-\d{2}-\d{2}$' or
          (details->>'birthDate') < '1900-01-01' or details ? 'age' then
          raise exception 'Fecha de nacimiento inválida';
        end if;
        if (details->>'birthDate')::date > (now() at time zone 'America/Bogota')::date then
          raise exception 'Fecha de nacimiento inválida';
        end if;
      end if;
      if details ? 'age' and (
        jsonb_typeof(details->'age') is distinct from 'number' or (details->>'age') !~ '^(0|[1-9][0-9]?|1[0-2][0-9]|130)$'
      ) then raise exception 'Edad inválida'; end if;
    end if;
    if not (c ? 'archivedAt') or (c->'archivedAt'<>'null'::jsonb and not crispy_private.cc_valid_date(c->>'archivedAt')) then raise exception 'Archivo inválido'; end if;
  end loop;
  for l in select value from jsonb_array_elements(d->'loans') loop
    if not exists(select 1 from jsonb_array_elements(d->'clients') as client_item(value) where client_item.value->>'id'=l->>'clientId') or not crispy_private.cc_valid_date(l->>'start') then raise exception 'Referencia de préstamo inválida'; end if;
    if l ? 'interestMode' and ((d->>'version') not in ('3','4','5') or (l->>'interestMode') is distinct from 'flat' or (l->'lateRate') is distinct from '0'::jsonb) then raise exception 'Plan de interés inválido'; end if;
    if (l->>'interestMode') is distinct from 'flat' and exists(
      select 1 from jsonb_array_elements(d->'clients') as person(value)
      where person.value->>'id'=l->>'clientId' and person.value->>'kind'='partner'
    ) then raise exception 'Un aporte requiere interés fijo'; end if;
    if l ? 'firstDueDate' and (jsonb_typeof(l->'firstDueDate') is distinct from 'string' or not crispy_private.cc_valid_date(l->>'firstDueDate') or (l->>'firstDueDate')<=(l->>'start')) then raise exception 'Primera fecha de pago inválida'; end if;
    if l ? 'createdAt' then
      if jsonb_typeof(l->'createdAt') is distinct from 'string' or length(l->>'createdAt')>100 then raise exception 'Fecha de registro inválida'; end if;
      perform (l->>'createdAt')::timestamptz;
    end if;
    foreach k in array array['principal','months','rate','lateRate'] loop
      if jsonb_typeof(l->k) is distinct from 'number' then raise exception 'Número inválido'; end if;
      n:=(l->>k)::numeric;
      if (k='principal' and (n<>trunc(n) or n<=0 or n>1000000000000)) or (k='months' and (n<>trunc(n) or n<1 or n>120)) or (k in ('rate','lateRate') and (n<0 or n>1000 or n<>round(n,3))) then raise exception 'Condición de préstamo inválida'; end if;
    end loop;
  end loop;
  for p in select value from jsonb_array_elements(d->'payments') loop
    select value into l from jsonb_array_elements(d->'loans') where value->>'id'=p->>'loanId';
    if l is null or not crispy_private.cc_valid_date(p->>'date') or (p->>'date')<(l->>'start') or (p->>'date')>(now() at time zone 'America/Bogota')::date::text or jsonb_typeof(p->'amount') is distinct from 'number' or jsonb_typeof(p->'reversed') is distinct from 'boolean' or jsonb_typeof(p->'method') is distinct from 'string' or length(p->>'method')>100 or jsonb_typeof(p->'createdAt') is distinct from 'string' or length(p->>'createdAt')>100 then raise exception 'Abono inválido'; end if;
    perform (p->>'createdAt')::timestamptz;
    n:=(p->>'amount')::numeric;
    if n<=0 or n>1000000000000 or n<>trunc(n) then raise exception 'Valor de abono inválido'; end if;
    if p ? 'application' and (
      (d->>'version') not in ('4','5') or
      coalesce(p->>'application','') not in ('capital','interest','both') or
      p ? 'legacySplit'
    ) then
      raise exception 'Aplicación del abono inválida';
    end if;
    if p ? 'legacySplit' then
      foreach k in array array['capital','interest'] loop
        if jsonb_typeof(p->'legacySplit'->k) is distinct from 'number' then raise exception 'Desglose inválido'; end if;
        n:=(p->'legacySplit'->>k)::numeric;
        if n<0 or n<>trunc(n) or n>1000000000000 then raise exception 'Desglose inválido'; end if;
      end loop;
      if (p->'legacySplit'->>'capital')::numeric+(p->'legacySplit'->>'interest')::numeric<>(p->>'amount')::numeric then raise exception 'El desglose no coincide'; end if;
    end if;
  end loop;
end $$;

-- Conserva la validación privada: solo se usa mediante la función de guardado.
revoke all on function crispy_private.cc_validate_payload(jsonb)
from public, anon, authenticated;

-- Comprueba el caso reportado sin insertar ni modificar registros.
do $test$
begin
  perform crispy_private.cc_validate_payload(
    '{"version":2,"clients":[{"id":"test-client","name":"Prueba de validación","phone":"","note":"","createdAt":"2026-01-01","archivedAt":null}],"loans":[{"id":"test-loan","clientId":"test-client","principal":1,"rate":1,"lateRate":1,"months":1,"start":"2026-11-05","note":""}],"payments":[]}'::jsonb
  );
end $test$;

commit;
select 'LISTO: validación de préstamos corregida. Recarga la app y guarda el préstamo.' as resultado;
