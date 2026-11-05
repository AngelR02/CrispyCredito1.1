-- Ejecutar una vez en Supabase > SQL Editor > New query > Run.
-- Antes, desactiva "Allow new users to sign up" para mantener el alta solo manual.
begin;

create schema if not exists crispy_private;

-- Cada cuenta tendrá su propia cartera. No se reemplazan carteras existentes.
create or replace function crispy_private.cc_create_user_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.cc_workspaces (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function crispy_private.cc_create_user_workspace()
from public, anon, authenticated;

drop trigger if exists cc_create_user_workspace on auth.users;
create trigger cc_create_user_workspace
after insert on auth.users
for each row
execute function crispy_private.cc_create_user_workspace();

-- Habilita también las cuentas que ya creaste, incluida la nueva.
insert into public.cc_workspaces (user_id)
select id from auth.users
on conflict (user_id) do nothing;

commit;

-- Comprobación: debe aparecer acceso_habilitado = true.
select u.email, (w.user_id is not null) as acceso_habilitado
from auth.users u
left join public.cc_workspaces w on w.user_id = u.id
order by u.created_at desc;
