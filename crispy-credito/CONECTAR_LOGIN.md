# Configurar el login y la creación de cuentas

## 1. Aplica la actualización de permisos

Para el proyecto existente ejecuta **ACTUALIZAR_APP.sql** completo con el rol **postgres** en SQL Editor y sube el código actualizado a GitHub. Haz esto antes de habilitar el registro público. Conserva las carteras y roles existentes cuando se repite. La cuenta que ya tenía una cartera conserva su rol administrador.

## 2. Dirección de regreso

En **Authentication → URL Configuration**, guarda como **Site URL**, sin barra final:

```text
https://crispycredito11-crispy-credito.vercel.app
```

En **Redirect URLs**, agrega:

```text
https://crispycredito11-crispy-credito.vercel.app/
https://crispycredito11-crispy-credito.vercel.app/?auth=recovery
https://crispycredito11-crispy-credito.vercel.app/?auth=invite
https://crispycredito11-crispy-credito.vercel.app/?auth=signup
```

Si cambias el dominio estable, reemplázalo en Site URL y en esos retornos. Evita dominios temporales de despliegue.

## 3. Plantillas de correo

En **Authentication → Emails**, pega el HTML completo del archivo indicado en el cuerpo de cada plantilla y guarda:

| Plantilla de Supabase | Archivo |
| --- | --- |
| Confirm signup | `supabase/email-signup.html` |
| Invite user | `supabase/email-invite.html` |
| Reset password | `supabase/email-recovery.html` |

No cambies los marcadores `{{ .SiteURL }}` ni `{{ .TokenHash }}`. Supabase los sustituye al enviar. Abre siempre el mensaje más reciente; los enlaces son personales, vencen y solo pueden usarse una vez.

## 4. Crear cuenta desde la app

Una vez actualizados el SQL y la web, habilita **Allow new users to sign up** en la configuración de Authentication. Mantén **Confirm email** activado. El usuario abre **Crear cuenta**, escribe su nombre preferido, correo y contraseña de al menos 12 caracteres, y confirma el correo que recibe.

Las cuentas nuevas se crean como **cliente**. El usuario no puede elegir ni cambiar su rol en la app. Tiene una pantalla propia y puede editar su nombre; la consulta del historial y la vinculación a una ficha de cliente quedan pendientes para una próxima etapa. La cartera del administrador permanece protegida aunque alguien se registre por su cuenta.

## 5. Crear un usuario manual

**Authentication → Users → Add user → Create user**: correo, contraseña y **Auto Confirm User** activado para esa cuenta manual. Puede entrar directamente con esas credenciales. Recibe rol cliente. Para darle permiso de administrador, ejecuta después `HABILITAR_ADMIN.sql` con su correo. Nunca pongas una contraseña ni claves secret/service_role en GitHub.

Si usas **Invite user**, el correo abre **Crea tu contraseña**. Esa cuenta también es cliente hasta que tú la autorices como administradora mediante SQL.

Para editar el correo de una cuenta existente, usa su ficha en Auth. No la borres para cambiarle el correo: la cartera se vincula al identificador de la cuenta y puede eliminarse al borrar ese usuario de Auth.

## 6. Recuperar contraseña

En la app pulsa **Olvidé mi contraseña**. Abre el correo nuevo, elige y repite la nueva contraseña y pulsa **Guardar contraseña y entrar**. La pantalla se abre después de validar el enlace; no necesitas SQL para cada recuperación.

## Si aparece email rate limit exceeded

Se alcanzó el límite temporal de correo de Supabase. Espera a que se restablezca o configura un proveedor SMTP propio si necesitas más envíos. Repetir la solicitud varias veces no soluciona el límite. La creación manual con contraseña y Auto Confirm User no requiere enviar una invitación. Consulta https://supabase.com/docs/guides/auth/auth-smtp.

## Datos y permisos

- **Authentication → Users**: cuentas, correos y acceso.
- **public.cc_profiles**: nombre preferido y rol protegido. Cada cuenta lee su perfil y solo puede cambiar su nombre.
- **public.cc_workspaces → payload**: clientes, préstamos y abonos del administrador. Cada administrador ve únicamente su propia cartera.
- Registrar un correo no vincula automáticamente a una ficha de cliente ni da acceso a préstamos. Ese vínculo se añadirá después mediante un proceso autorizado.

Esta entrega no envía correos ni cambia ajustes remotos. Las pruebas de formularios usan datos ficticios locales; el envío real depende de aplicar la configuración del proyecto.
