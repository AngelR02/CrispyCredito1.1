-- Cambia TU_CORREO por la cuenta que tú autorizas como administradora.
-- Ejecutar solo desde SQL Editor con el rol postgres; nunca desde el navegador.
-- Primero crea esa cuenta en Authentication > Users o mediante el registro.
-- No contiene contraseñas y no borra carteras existentes.
do $$
declare owner_id uuid;
begin
  select id into owner_id from auth.users where lower(email)=lower('TU_CORREO');
  if owner_id is null then raise exception 'Crea primero el usuario y reemplaza TU_CORREO por su correo exacto.'; end if;
  insert into public.cc_profiles(user_id,role) values(owner_id,'admin')
  on conflict(user_id) do update set role='admin';
  insert into public.cc_workspaces(user_id) values(owner_id) on conflict(user_id) do nothing;
end $$;
