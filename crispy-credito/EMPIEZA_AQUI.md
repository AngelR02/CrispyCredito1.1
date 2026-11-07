# Actualización 2.5 de Crispy Crédito

1. En la app actual, descarga un respaldo desde **Mi espacio → Descargar respaldo**.
2. En Supabase, abre **SQL Editor → New query** y ejecuta completo **ACTUALIZAR_APP.sql**, el archivo de este ZIP. El SQL habilita el guardado del nuevo formato de cartera y conserva tus registros.
3. Reemplaza la carpeta **crispy-credito** en GitHub. Guarda los cambios, espera el despliegue de Vercel y vuelve a abrir la app.

## Cómo aplicar un pago

En el formulario de abono del cliente o pago al socio, elige **Capital**, **Intereses** o **Pago completo (capital + intereses)**. Las dos primeras opciones aplican el valor solo al saldo elegido. **Pago completo** permite ingresar un valor para ambos conceptos. Para liquidar todo el capital y el interés pendiente a la fecha del pago, pulsa **Usar saldo de capital e intereses**.

Cada pago conserva su selección. Los pagos registrados antes de esta actualización mantienen su forma de aplicación. En los créditos anteriores que contemplan cargos, **Distribución anterior con cargos históricos** permite incluirlos cuando corresponda.

## Préstamos y socios

Los créditos y aportes nuevos tienen interés mensual fijo sobre el capital inicial. Por ejemplo, un préstamo de $500.000 al 2 % mensual durante cinco meses tiene $100.000 de capital y $10.000 de interés en cada cuota. La última cuota puede ajustar el redondeo de capital.

En **Socios → Nuevo socio**, crea la ficha. Dentro de la ficha, elige **Nuevo aporte** para indicar capital, interés mensual, cuotas y fecha inicial. **Ver cuotas** muestra el calendario y **Registrar pago al socio** guarda lo pagado y separa capital e intereses.

**Intereses de Crispy** resta los intereses pagados a socios activos de los intereses recibidos de clientes activos. **Capital total de socios** suma sus aportes originales, incluso si ya devolviste parte del capital. La ficha del socio muestra lo que queda por devolver.

Los créditos anteriores conservan el cálculo con el que fueron registrados. Si quieres cambiar uno, abre **Editar crédito** y marca **Convertir a interés fijo sobre el capital inicial**. La simulación muestra las nuevas cuotas y, al guardar, se vuelve a distribuir lo pagado. Si los datos registrados no son compatibles con el nuevo plan, el cambio se rechaza.

## Archivar o eliminar

**Archivar** pausa el registro de pagos. La ficha y su calendario siguen disponibles en **Archivados**, con todos sus movimientos. Restaurar la ficha la devuelve a los totales generales y habilita los pagos.

**Eliminar crédito** borra ese crédito y sus abonos. La ficha sigue disponible. **Eliminar cliente** borra su ficha y el historial asociado después de confirmar.

## Administradores nuevos

Las cuentas que ya tenían cartera antes de esta actualización conservan acceso administrador. Una cuenta nueva, sea creada manualmente, por invitación o desde la app, recibe rol **cliente**. Para autorizar otro administrador, crea su cuenta y ejecuta `HABILITAR_ADMIN.sql` reemplazando `TU_CORREO` por su correo exacto. Tendrá su propia cartera, independiente de la tuya.

## Instalación desde cero

Ejecuta `INICIAR_SUPABASE.sql`, crea el usuario y ejecuta `HABILITAR_ADMIN.sql` con su correo. Configura los parámetros públicos de `dist/config.js` si usas otro proyecto.

Los archivos `AUTO_USUARIOS_SUPABASE.sql` y `supabase/02_habilitar_propietario.sql` se mantienen actualizados por compatibilidad; no uses copias de versiones anteriores, que habilitaban cartera para todos.

La entrega es código para que lo apliques tú. No modifica Supabase, GitHub, Vercel ni contraseñas desde aquí.
