# Activar invitaciones, recuperación y usuarios manuales

Esta corrección necesita actualizar los archivos de la web. Un SQL por sí solo no crea las pantallas de contraseña.

## 1. Actualiza GitHub

Extrae el ZIP y reemplaza la carpeta `crispy-credito` del repositorio con esta carpeta completa. No cargues solamente el ZIP. Guarda el commit y espera a que Vercel finalice el despliegue de ese commit.

Conserva Root Directory `crispy-credito`, Framework `Other` y Output Directory `dist`. Build e Install Command vacíos, tal como define `vercel.json`.

## 2. Configura el regreso a tu web en Supabase

En **Authentication → URL Configuration**, coloca como **Site URL**, sin barra al final:

```text
https://crispycredito11-crispy-credito.vercel.app
```

En **Redirect URLs**, agrega estas direcciones y guarda:

```text
https://crispycredito11-crispy-credito.vercel.app/
https://crispycredito11-crispy-credito.vercel.app/?auth=recovery
https://crispycredito11-crispy-credito.vercel.app/?auth=invite
```

Si cambias el dominio estable de tu app, actualiza estas tres direcciones y Site URL. No uses el dominio de un despliegue temporal.

## 3. Configura los dos correos

En **Authentication → Emails**, abre las plantillas:

| Plantilla en Supabase | Copia todo el contenido de |
| --- | --- |
| Invite user | `supabase/email-invite.html` |
| Reset password | `supabase/email-recovery.html` |

Pega el HTML completo en el editor del cuerpo de cada correo y guarda. Los marcadores `{{ .SiteURL }}` y `{{ .TokenHash }}` se dejan tal cual: Supabase los completa. Las plantillas usan directamente el token verificado por la app, por lo que no dependen del navegador desde donde solicitaste el correo.

Solicita una invitación o recuperación **nueva** después de actualizar. Usa el correo más reciente: un enlace vencido o ya utilizado no se reactiva al actualizar el código. No compartas enlaces completos, contienen la verificación de acceso.

## 4. Elige cómo dar de alta a una persona

### Tú asignas correo y contraseña: entra de inmediato

1. Ve a **Authentication → Users → Add user → Create user**.
2. Escribe el correo y asigna una contraseña de al menos 12 caracteres.
3. Activa **Auto Confirm User** al crear esa cuenta manual.
4. Guarda y abre tu app. Ingresa con ese mismo correo y contraseña. No necesita abrir una invitación.

Si el usuario ya existe, no lo elimines para cambiarle el correo: edítalo desde su ficha. Eliminarlo puede borrar la cartera vinculada. Si la cuenta no está confirmada, completa su confirmación desde el panel o por correo antes de entrar.

### La persona elige su contraseña

Usa **Add user → Invite user**. Al abrir el nuevo correo verá **Crea tu contraseña** y **Repite la contraseña**. Al guardar, entrará a su espacio.

### Olvidó su contraseña

En la app pulsa **Olvidé mi contraseña**, escribe el correo de la cuenta y envía la solicitud. Al abrir el nuevo correo verá **Elige tu nueva contraseña**. Al guardarla, entrará directamente.

## 5. Acceso a los datos

El alta automática de carteras usa `AUTO_USUARIOS_SUPABASE.sql`, que ya configuraste. No necesitas repetir SQL para que aparezcan los formularios de contraseña. Si creas otro proyecto desde cero, usa `INICIAR_SUPABASE.sql` una vez.

Mantén desactivado el registro público de usuarios en la configuración de Auth: esta app personal está pensada para cuentas que tú creas o invitas desde Supabase. Cada cuenta tiene su propia cartera y no ve los registros de las demás.

## Si algo falla

- No aparece el nuevo formulario: verifica que Vercel desplegó el commit actualizado, no una versión anterior.
- Correo o contraseña no coinciden: usa el correo actual de Authentication → Users; una cuenta eliminada ya no puede ingresar.
- Correo sin confirmar: revisa la confirmación de esa cuenta; para las nuevas cuentas manuales activa Auto Confirm User al crearlas.
- Enlace vencido: pide uno nuevo. La app muestra una explicación y permite volver al acceso.
- No llega correo: revisa spam, los límites de envío y la configuración de correo del proyecto. El código no puede garantizar la entrega del proveedor.

Esta entrega no envía correos, no cambia contraseñas ni modifica tu configuración remota. Las pruebas usan un adaptador controlado y casos automatizados; el envío real se comprueba al aplicar los pasos anteriores en tu proyecto.
