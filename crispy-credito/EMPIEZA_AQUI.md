# Crispy Crédito: conectar en dos pasos

## 1. Supabase

Abre SQL Editor → New query. Copia TODO el contenido de `INICIAR_SUPABASE.sql` y pulsa Run. Al terminar debe aparecer **LISTO: ya puedes iniciar sesión con crspy@credito.com**.

Ese archivo crea la tabla que utiliza la aplicación, sus permisos y el acceso de la cuenta que ya creaste. No tienes que diseñar tablas manualmente. No borra la tabla `notes`, ni cambia tu contraseña, ni reemplaza una cartera ya existente. Si lo repites, conserva los registros.

## 2. GitHub y Vercel

Sube la carpeta `crispy-credito` de este paquete a la raíz de tu repositorio, reemplazando los archivos del mismo nombre. Conserva en Vercel **Root Directory: crispy-credito**, **Framework: Other**, **Output Directory: dist**. Build e Install Command quedan vacíos; el archivo vercel.json lo configura.

Espera el despliegue de Vercel y entra con **crspy@credito.com** y la contraseña que ya creaste en Supabase. Este paquete ya tiene la conexión pública del proyecto `supabase-cerulean-house`.

Si ya habías registrado clientes en la versión anterior, descarga su respaldo antes de reemplazar los archivos. Después de entrar en esta versión, podrás importar ese respaldo desde Mi espacio.

El código no contiene ni necesita tu contraseña. Solo tiene la URL y la clave pública publishable de Supabase. La base debe tener las políticas incluidas en el script para proteger los registros.

## Si el acceso no abre

- Si dice **Conexión pendiente**, Vercel conserva el código anterior: revisa el despliegue del nuevo commit.
- Si dice **Tu usuario aún no tiene acceso**, vuelve al paso 1 y ejecuta el script completo en el proyecto correcto.
- Si dice **Revisa tu correo y contraseña**, utiliza exactamente `crspy@credito.com` y la contraseña que configuraste. No necesitas el correo de tu cuenta de Vercel.

El script se entrega para que lo ejecutes tú. No se ha aplicado a tu base de datos durante esta entrega.
