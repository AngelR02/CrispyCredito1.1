-- Ejecuta TODO con el rol postgres en SQL Editor antes de activar registro público.
-- Ejecutar una vez en SQL Editor. No modifica tablas de otras aplicaciones.
begin;
create schema if not exists crispy_private;
revoke all on schema crispy_private from public,anon;
grant usage on schema crispy_private to authenticated;
create table if not exists public.cc_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{"version":2,"clients":[],"loans":[],"payments":[]}'::jsonb,
  revision bigint not null default 0 check(revision>=0),
  updated_at timestamptz not null default now(),
  constraint cc_payload_size check(octet_length(payload::text)<=5000000)
);
-- El rol es un dato protegido del servidor. Los metadatos solo sugieren el nombre.
create table if not exists public.cc_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_name text not null default '' check(length(preferred_name)<=40),
  role text not null default 'client' check(role in ('admin','client'))
);
alter table public.cc_profiles enable row level security;
revoke all on public.cc_profiles from public,anon,authenticated;
grant select, update(preferred_name) on public.cc_profiles to authenticated;
drop policy if exists cc_profile_read on public.cc_profiles;
create policy cc_profile_read on public.cc_profiles for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists cc_profile_name on public.cc_profiles;
create policy cc_profile_name on public.cc_profiles for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

-- Conserva como administradores a quienes ya tenían cartera antes de esta actualización.
-- ON CONFLICT no altera nombres ni roles si el script se repite.
insert into public.cc_profiles(user_id,preferred_name,role)
select u.id,case when jsonb_typeof(u.raw_user_meta_data->'preferred_name')='string' then left(trim(u.raw_user_meta_data->>'preferred_name'),40) else '' end,
case when w.user_id is not null then 'admin' else 'client' end
from auth.users u left join public.cc_workspaces w on w.user_id=u.id
on conflict(user_id) do nothing;

create or replace function crispy_private.cc_is_admin() returns boolean
language sql stable security invoker set search_path='' as $$
  select exists(select 1 from public.cc_profiles where user_id=(select auth.uid()) and role='admin');
$$;
revoke all on function crispy_private.cc_is_admin() from public,anon,authenticated;
grant execute on function crispy_private.cc_is_admin() to authenticated;

-- Las altas nuevas, incluso manuales o invitadas, son de tipo cliente.
-- Elimina el alta antigua que daba cartera a cualquier usuario.
drop trigger if exists cc_create_user_workspace on auth.users;
create or replace function crispy_private.cc_create_user_profile() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.cc_profiles(user_id,preferred_name,role)
  values(new.id,case when jsonb_typeof(new.raw_user_meta_data->'preferred_name')='string' then left(trim(new.raw_user_meta_data->>'preferred_name'),40) else '' end,'client')
  on conflict(user_id) do nothing;
  return new;
end $$;
revoke all on function crispy_private.cc_create_user_profile() from public,anon,authenticated;
drop trigger if exists cc_create_user_profile on auth.users;
create trigger cc_create_user_profile after insert on auth.users for each row execute function crispy_private.cc_create_user_profile();

alter table public.cc_workspaces enable row level security;
revoke all on public.cc_workspaces from anon,authenticated;
grant select on public.cc_workspaces to authenticated;
drop policy if exists cc_owner_read on public.cc_workspaces;
create policy cc_owner_read on public.cc_workspaces for select to authenticated using ((select auth.uid())=user_id and (select crispy_private.cc_is_admin()));

create or replace function crispy_private.cc_valid_date(v text) returns boolean language plpgsql immutable security invoker set search_path='' as $$
begin
  return coalesce(v ~ '^\d{4}-\d{2}-\d{2}$' and v between '2000-01-01' and '2100-12-31' and to_char(v::date,'YYYY-MM-DD')=v,false);
exception when others then return false;
end $$;

create or replace function crispy_private.cc_validate_payload(d jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare c jsonb; l jsonb; p jsonb; x jsonb; k text; n numeric; id_count bigint; distinct_count bigint;
begin
  if jsonb_typeof(d) is distinct from 'object' or coalesce(d->>'version','') not in ('2','3') or octet_length(d::text)>5000000 then raise exception 'Formato inválido'; end if;
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
    if c ? 'kind' and ((d->>'version')<>'3' or (c->>'kind') is distinct from 'partner') then raise exception 'Tipo de ficha inválido'; end if;
    if not (c ? 'archivedAt') or (c->'archivedAt'<>'null'::jsonb and not crispy_private.cc_valid_date(c->>'archivedAt')) then raise exception 'Archivo inválido'; end if;
  end loop;
  for l in select value from jsonb_array_elements(d->'loans') loop
    if not exists(select 1 from jsonb_array_elements(d->'clients') as client_item(value) where client_item.value->>'id'=l->>'clientId') or not crispy_private.cc_valid_date(l->>'start') then raise exception 'Referencia de préstamo inválida'; end if;
    if l ? 'interestMode' and ((d->>'version')<>'3' or (l->>'interestMode') is distinct from 'flat' or (l->'lateRate') is distinct from '0'::jsonb) then raise exception 'Plan de interés inválido'; end if;
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

-- Solo esta función escribe. Toma la identidad del JWT, nunca de un parámetro del navegador.
-- Bloqueo y revisión evitan que dos equipos sobrescriban cambios del otro.
create or replace function crispy_private.cc_save_workspace_internal(p_payload jsonb,p_expected_revision bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); current_revision bigint; current_format text; updated public.cc_workspaces;
begin
  if owner_id is null then raise exception 'Acceso no autorizado' using errcode='42501'; end if;
  if not crispy_private.cc_is_admin() then raise exception 'Solo una cuenta administradora puede guardar una cartera' using errcode='42501'; end if;
  select revision,payload->>'version' into current_revision,current_format from public.cc_workspaces where user_id=owner_id for update;
  if not found then raise exception 'Usuario no habilitado' using errcode='42501'; end if;
  if p_expected_revision is null or current_revision<>p_expected_revision then raise exception 'Conflicto de versión' using errcode='40001'; end if;
  if current_format='3' and (p_payload->>'version') is distinct from '3' then
    raise exception 'Actualiza la app antes de guardar esta cartera' using errcode='22023';
  end if;
  perform crispy_private.cc_validate_payload(p_payload);
  update public.cc_workspaces set payload=p_payload,revision=current_revision+1,updated_at=now() where user_id=owner_id returning * into updated;
  return jsonb_build_object('payload',updated.payload,'revision',updated.revision,'updated_at',updated.updated_at);
end $$;
revoke all on function crispy_private.cc_valid_date(text) from public,anon,authenticated;
revoke all on function crispy_private.cc_validate_payload(jsonb) from public,anon,authenticated;
revoke all on function crispy_private.cc_save_workspace_internal(jsonb,bigint) from public,anon,authenticated;
grant execute on function crispy_private.cc_save_workspace_internal(jsonb,bigint) to authenticated;

-- Entrada REST sin privilegios elevados. La escritura privilegiada permanece en un esquema no expuesto.
create or replace function public.cc_save_workspace(p_payload jsonb,p_expected_revision bigint) returns jsonb language sql security invoker set search_path='' as $$
  select crispy_private.cc_save_workspace_internal(p_payload,p_expected_revision);
$$;
revoke all on function public.cc_save_workspace(jsonb,bigint) from public,anon,authenticated;
grant execute on function public.cc_save_workspace(jsonb,bigint) to authenticated;
commit;

select 'LISTO: app actualizada; las cuentas nuevas son cliente y la cartera existente se conserva.' as resultado;
