-- Primero crea tu usuario en Authentication > Users > Add user.
-- Sustituye TU_CORREO por el correo exacto de ese usuario y ejecuta este bloque.
-- No escribas aquí tu contraseña. Repetir el bloque no borra datos existentes.
do $$
declare owner_id uuid;
begin
  select id into owner_id from auth.users where lower(email)=lower('TU_CORREO');
  if owner_id is null then raise exception 'Primero crea el usuario en Authentication > Users y escribe su correo en este archivo.'; end if;
  insert into public.cc_workspaces(user_id) values(owner_id) on conflict(user_id) do nothing;
end $$;
