# Actualización 2.3 de Crispy Crédito

## Si ya instalaste la versión 2.2

Solo reemplaza la carpeta `crispy-credito` en GitHub y espera el despliegue en Vercel. Esta versión no cambia la estructura SQL. Conserva tu configuración de acceso y los datos.

Incluye **Editar crédito**, **Eliminar crédito**, confirmaciones sin escribir nombres y montos con separadores como **1.000.000** en los formularios. Al editar un crédito se recalculan sus abonos; si las nuevas condiciones vuelven incompatible un pago existente, el cambio se rechaza completo.

Puedes abonar antes del vencimiento de la primera cuota. El selector muestra todos los créditos con saldo, incluso si un desembolso quedó con fecha futura: en ese caso muestra un aviso y un botón para corregirlo. La fecha de un abono real puede ser cualquier día desde el desembolso hasta hoy; no necesitas esperar al vencimiento. Los pagos anticipados se aplican a cuotas con su interés contractual según las reglas actuales.

Eliminar un crédito conserva al cliente y sus otros créditos, y borra solo ese crédito con sus abonos. Eliminar el cliente borra toda su ficha y créditos. En ambos casos aparece un aviso con casilla marcada por defecto y un botón final **Sí, eliminar definitivamente**; no se escribe ningún nombre. Puedes cancelar o desmarcar la casilla para impedir la confirmación.

## Si vienes de una versión anterior a 2.2

1. Descarga primero **Mi espacio → Descargar respaldo** en tu app actual.
2. Extrae este ZIP. Abre **ACTUALIZAR_APP.sql** con Bloc de notas, copia todo y ejecútalo en **Supabase → SQL Editor → New query → Run**, con el rol **postgres**. Conserva tus datos y autoriza como administrador a la cuenta que ya tenía cartera. No es necesario borrar ni volver a crear usuarios.
3. Reemplaza la carpeta completa `crispy-credito` en GitHub y guarda el commit. Espera a que Vercel termine el despliegue.
4. Inicia sesión con tu cuenta actual. En **Mi espacio**, guarda tu nombre en **¿Cómo quieres que te llame?**.
5. Para que funcione **Crear cuenta**, sigue `CONECTAR_LOGIN.md`: habilita el registro en Supabase **después de ejecutar el SQL**, conserva la confirmación de correo y coloca la nueva plantilla `email-signup.html`.

El login público dice **Hola, Crispy**. Cada persona verá su nombre elegido al ingresar.

## Qué incluye

- Eliminar cualquier cliente, incluso con historial. Muestra una advertencia y una casilla marcada por defecto; la eliminación se realiza al pulsar el botón de confirmación. Se eliminan esa ficha, sus préstamos y todos sus abonos. La cuenta de acceso no se elimina.
- Préstamos del más reciente al más antiguo, según registro. En préstamos anteriores sin fecha de registro se usa la fecha de desembolso.
- Fechas automáticas de cuotas y casilla **Personalizar la fecha de pago**. Eliges el primer vencimiento y los siguientes repiten ese día cada mes. Solo cambian las fechas, no el interés contractual. Los préstamos anteriores conservan sus fechas.
- Nombre preferido y registro con correo y contraseña.
- Separación real de permisos entre administrador y cliente. Las cuentas nuevas son clientes, sin cartera administrativa. El portal de consulta del historial y la vinculación de cuentas a fichas se implementarán después; esta versión no muestra datos financieros a las cuentas cliente.

## Administradores nuevos

Las cuentas que ya tenían cartera antes de esta actualización conservan acceso administrador. Una cuenta nueva, sea creada manualmente, por invitación o desde la app, recibe rol **cliente**. Para autorizar otro administrador, crea su cuenta y ejecuta `HABILITAR_ADMIN.sql` reemplazando `TU_CORREO` por su correo exacto. Tendrá su propia cartera, independiente de la tuya.

## Instalación desde cero

Ejecuta `INICIAR_SUPABASE.sql`, crea el usuario y ejecuta `HABILITAR_ADMIN.sql` con su correo. Configura los parámetros públicos de `dist/config.js` si usas otro proyecto.

Los archivos `AUTO_USUARIOS_SUPABASE.sql` y `supabase/02_habilitar_propietario.sql` se mantienen actualizados por compatibilidad; no uses copias de versiones anteriores, que habilitaban cartera para todos.

La entrega es código para que lo apliques tú. No modifica Supabase, GitHub, Vercel ni contraseñas desde aquí.
