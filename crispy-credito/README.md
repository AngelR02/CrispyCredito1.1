# Crispy Crédito · versión 2.2

App personal para clientes, préstamos y abonos, con acceso separado para administradores y clientes. Colores verde y blanco, azul y pequeños acentos naranjas.

Empieza por **EMPIEZA_AQUI.md**. Para tu proyecto existente, aplica **ACTUALIZAR_APP.sql**, sube el código actualizado a GitHub y sigue **CONECTAR_LOGIN.md** para habilitar registro y correo. Esta entrega no modifica servicios remotos.

## Cambios de esta versión

- Eliminación de clientes con cualquier historial: nombre exacto y casilla de aceptación. Elimina también préstamos y abonos vinculados; los datos de otras personas se conservan. Archivar sigue disponible.
- Préstamos del más reciente al más antiguo. Los préstamos nuevos guardan su fecha de creación; los anteriores usan la de desembolso como referencia. La numeración de cada préstamo conserva su posición histórica.
- Fecha automática de cuotas y primer vencimiento opcional personalizado, compatible con respaldos anteriores. La mora usa los vencimientos reales del plan elegido.
- Nombre preferido en Mi espacio, saludo y perfil. El login público dice Hola, Crispy.
- Registro por correo y contraseña, confirmación de correo, invitaciones y recuperación.
- Roles protegidos en base de datos. Las altas nuevas son cliente y no reciben cartera de administración. Los propietarios de carteras existentes conservan rol administrador al actualizar. El cliente tiene acceso a su cuenta y nombre; el historial y la vinculación de fichas son una etapa futura, aún no implementada.
- Los instaladores y la actualización incluyen la corrección SQL del guardado de préstamos (conflicto de alias c). Se mantienen el aislamiento RLS, el control de revisión y la validación de documentos.

## Antes de actualizar tu app existente

Si anotaste información en la versión anterior, abre esa app y descarga **Mi espacio → Descargar respaldo** antes de sustituir sus archivos. El contenido del navegador anterior no se migra automáticamente ni se incluye en este ZIP.

Después de configurar e iniciar sesión en la nueva versión, usa **Mi espacio → Importar respaldo**. La importación reemplaza la cartera completa con tu confirmación. Un respaldo de versión 1 conserva la distribución capital/interés de cada abono y asigna tasa de mora cero a esos préstamos, evitando recargos retroactivos inventados. Si un registro histórico es incompatible con su plan, se rechazará la importación sin modificar la cartera. Conserva el respaldo original.

## Publicar en GitHub y Vercel

Extrae el ZIP y reemplaza la carpeta completa `crispy-credito` del repositorio. No subas solo el ZIP: GitHub no lo extrae. Vercel conserva Root Directory `crispy-credito`, Framework `Other` y Output Directory `dist`. Build e Install Command vacíos; `vercel.json` los configura. La app estática ya incluye Supabase en `dist/vendor` y no necesita instalar paquetes para desplegarse. `package.json` y sus dependencias sirven para pruebas de desarrollo.

La conexión pública del proyecto está en `dist/config.js`. Si cambias de proyecto, reemplaza la URL y clave publishable. Nunca uses una clave secret ni service_role en el navegador.

## Reglas de cálculo

### Plan ordinario

Cuotas mensuales fijas con interés sobre saldo. Por defecto, la primera vence un mes después del desembolso. Puedes personalizar el primer vencimiento: las siguientes cuotas repiten ese día en los meses siguientes. En meses más cortos se usa el último día y luego se recupera el día elegido. El cambio de vencimientos no modifica ni prorratea por días el interés mensual contractual. Se conserva el día del mes cuando existe; un desembolso del día 31 vence el último día de febrero y vuelve al 31 en marzo. Los importes se redondean a pesos colombianos y la última cuota ajusta la diferencia de redondeo.

### Pago automático

Se atienden las cuotas de la más antigua a la más reciente. En cada una se cubre:

1. El recargo de mora ya causado y pendiente.
2. El interés corriente pendiente de esa cuota.
3. El capital pendiente de esa cuota.

El sobrante continúa a la siguiente cuota. Se admiten pagos parciales y varias cuotas en un pago. Si supera el total contractual pendiente en esa fecha, se rechaza para no descartar dinero. Los pagos anticipados de cuotas conservan su interés contractual: esta edición no implementa liquidación anticipada ni abonos extraordinarios exclusivamente a capital.

### Mora

Tasa mensual configurable en cada préstamo; el formulario no inventa un valor. Escribir cero desactiva el recargo. La tasa admite hasta tres decimales.

```
recargo = capital vencido pendiente × tasa mensual / 100 × días / 30
```

El vencimiento tiene cero días de atraso; el día siguiente tiene uno. Se usan días calendario completos y fechas sin hora. No se aplica mora sobre intereses, recargos ni capital de cuotas aún no vencidas. El capital se reduce al aplicar cada abono en su fecha real; los días siguientes usan esa nueva base. Los recargos fraccionarios se acumulan de forma exacta con enteros BigInt y se redondean a pesos al contabilizar; no se capitalizan.

Un pago con fecha anterior o una anulación vuelve a procesar todos los pagos en orden de fecha, hora de registro e identificador. La distribución de pagos posteriores puede cambiar. Si genera un sobrepago o incompatibilidad, se rechaza todo el cambio. Los registros anulados se conservan en el historial.

## Datos y permisos

`public.cc_profiles` guarda el nombre preferido y el rol admin/client. RLS permite leer solo el perfil propio. Se concede UPDATE únicamente a la columna preferred_name; no se permite al usuario insertar, borrar ni modificar roles. El trigger de Auth crea únicamente perfiles cliente e ignora cualquier rol enviado en user_metadata. Los administradores se autorizan explícitamente desde SQL Editor con HABILITAR_ADMIN.sql.

`public.cc_workspaces` conserva el documento JSON versión 2 de cada administrador. RLS exige tanto propiedad como rol admin. La función pública cc_save_workspace, de tipo security invoker, delega en una función privada que comprueba rol e identidad, bloquea la fila, valida el documento y controla la revisión. Un cliente no puede leer ni guardar una cartera, aunque intentase llamar directamente a la API o quedase una fila antigua vinculada a su cuenta. Cada administrador tiene su propia cartera; no se comparten automáticamente los datos entre administradores.

La app de producción no almacena una copia de la cartera en localStorage. Usa actualizar para traer cambios de otro dispositivo. Un conflicto exige recargar antes de repetir el cambio. Si una solicitud falla sin confirmar el guardado, revisa el historial antes de reintentar. Guarda respaldos para recuperar datos borrados o sustituidos por importación.

## Archivos principales

| Archivo | Función |
| --- | --- |
| ACTUALIZAR_APP.sql | Actualización completa para una instalación existente, sin borrar datos |
| INICIAR_SUPABASE.sql | Instalación completa desde cero |
| HABILITAR_ADMIN.sql | Autoriza expresamente una cuenta administradora por su correo |
| dist/app.js | Pantallas y formularios |
| dist/backend.mjs | Acceso, registro, perfiles y guardado Supabase |
| dist/auth-flow.mjs | Verificación de enlaces de acceso |
| dist/finance.mjs | Calendario, cuotas, mora y aplicación cronológica de abonos |
| dist/store.mjs | Validación, respaldos, orden y eliminación |
| supabase/email-*.html | Plantillas para confirmar, invitar y recuperar |
| tests/ | Pruebas financieras, de acceso, fechas, eliminación, SQL y permisos |

## Probar el código

```sh
npm ci
npm test
```

Las pruebas SQL usan PostgreSQL en memoria con PGlite y no cambian el proyecto real. Comprueban migración de propietarios, conservación de datos, aislamiento entre roles y cuentas, bloqueo de autoasignación de rol, edición restringida del nombre, guardado de préstamos/abonos y actualización repetible. Las pruebas financieras verifican calendario automático y personalizado, fin de mes, mora diaria, pagos parciales/retroactivos, anulaciones, redondeos y respaldos anteriores.

Para una revisión manual local, sirve `dist` mediante HTTP (no abras el HTML con doble clic). Para probar correos reales en un proyecto de desarrollo, configura su dirección local entre los retornos de Auth.

## Referencias oficiales

- https://supabase.com/docs/guides/auth/managing-user-data
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/auth-smtp
- https://vercel.com/docs/project-configuration/vercel-json
