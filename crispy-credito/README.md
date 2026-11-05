# Crispy Crédito · versión 2.1

App personal para clientes, préstamos y abonos. Diseño verde y blanco, con azul y pequeños acentos naranjas.

## Cambios

- Inicio de sesión por correo y contraseña usando Supabase Auth; cierre de sesión y recuperación de contraseña.
- Sin registros ficticios, rótulos de prueba ni entrada que evada el login.
- Registros en Supabase, compartidos entre dispositivos con el mismo usuario. La cartera no se almacena en localStorage.
- Clientes activos, archivados y restaurados. Archivar conserva saldos e historial. Solo una ficha sin préstamos se puede eliminar, confirmando su nombre.
- Abonos con un único valor recibido y fecha real del pago. La app distribuye automáticamente entre mora, interés y capital.
- Días de atraso por cuota, recargos diarios sobre capital vencido, pagos parciales, pagos con fecha anterior y anulación con recálculo cronológico.
- Respaldo JSON e importación de la versión anterior conservando sus desgloses históricos; exportación CSV.
- Guardado transaccional con control de versión para evitar que dos dispositivos sobrescriban cambios recientes.

## Conectar el acceso

Empieza por `EMPIEZA_AQUI.md` y sigue `CONECTAR_LOGIN.md`. Esta edición incluye formularios para invitaciones y recuperación, validación del enlace antes de cargar los datos privados y acceso directo para usuarios manuales con correo confirmado y contraseña asignada.

Esta copia conserva los parámetros públicos de tu proyecto de Supabase. La entrega no modifica tu base, GitHub, Vercel ni contraseñas.

## Antes de actualizar tu app existente

Si anotaste información en la versión anterior, abre esa app y descarga **Mi espacio → Descargar respaldo** antes de sustituir sus archivos. El contenido del navegador anterior no se migra automáticamente ni se incluye en este ZIP.

Después de configurar e iniciar sesión en la nueva versión, usa **Mi espacio → Importar respaldo**. La importación reemplaza la cartera completa con tu confirmación. Un respaldo de versión 1 conserva la distribución capital/interés de cada abono y asigna tasa de mora cero a esos préstamos, evitando recargos retroactivos inventados. Si un registro histórico es incompatible con su plan, se rechazará la importación sin modificar la cartera. Conserva el respaldo original.

## 1. Configurar Supabase

Para el proyecto existente sigue `CONECTAR_LOGIN.md`: URLs de regreso, plantillas y creación manual de usuarios. Para instalar en un proyecto nuevo ejecuta `INICIAR_SUPABASE.sql`, que incluye el alta automática de carteras y no depende de ningún correo o identificador fijo. Mantén desactivado el registro público; cada usuario que creas o invitas recibe su propia cartera.

`dist/config.js` contiene la URL pública del proyecto y la clave publishable. Si cambias de proyecto, reemplaza ambos valores. Nunca uses una clave secret o service_role en el navegador. Los registros se protegen con autenticación y RLS por propietario.

Los enlaces de invitación y recuperación se verifican antes de mostrar el formulario de contraseña. Se admiten las plantillas token_hash incluidas, retornos implícitos de Supabase y enlaces PKCE previos cuando conservan su verificador. Un enlace anterior que perdió el verificador requiere una nueva solicitud. El estado de formulario se conserva en la pestaña durante una hora; no guarda contraseñas ni tokens en ese marcador.

## 2. Actualizar GitHub y Vercel

El ZIP conserva la carpeta `crispy-credito`, igual que tu repositorio actual.

1. Extrae el ZIP. En GitHub, usa **Add file → Upload files** y carga la carpeta actualizada `crispy-credito` con todos sus archivos y subcarpetas para reemplazar los archivos del mismo nombre.
2. Guarda el commit. No subas el ZIP como si fuera el código: GitHub no lo extrae.
3. En Vercel conserva:

| Opción | Valor |
| --- | --- |
| Root Directory | `crispy-credito` si conservaste esa carpeta en el repositorio |
| Framework Preset | `Other` |
| Output Directory | `dist` |
| Build Command | Vacío |
| Install Command | Vacío |
| Environment Variables | No se necesitan: esta edición lee los parámetros públicos de `dist/config.js` |

Si subes el contenido directamente en la raíz del repositorio, Root Directory debe ser `./`. `vercel.json` debe quedar en esa raíz del proyecto, al lado de `dist` y `package.json`.

La librería de Supabase ya está incluida en `dist/vendor/`; la app estática no necesita instalar paquetes ni ejecutar una construcción. `package.json` y sus dependencias son para pruebas de desarrollo. El archivo `vercel.json` omite instalación y construcción.

4. Con la integración de Git activa, Vercel despliega el commit; si no se inicia, usa Redeploy. Abre el nuevo despliegue y prueba acceder, crear un cliente y guardar un abono ficticio.

## Reglas de cálculo

### Plan ordinario

Cuotas mensuales fijas con interés sobre saldo. La primera vence un mes después del desembolso. Se conserva el día del mes cuando existe; un desembolso del día 31 vence el último día de febrero y vuelve al 31 en marzo. Los importes se redondean a pesos colombianos y la última cuota ajusta la diferencia de redondeo.

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

La cartera es un documento JSON versionado por propietario en `public.cc_workspaces`, adecuado para este uso personal de registros de texto. Solo el usuario de esa fila puede leerla mediante RLS. Visitantes sin sesión no pueden leer ni escribir. Los usuarios autenticados no pueden modificar la tabla directamente: llaman a `cc_save_workspace`, una entrada pública sin privilegios elevados. Esta delega en una función del esquema no expuesto `crispy_private`, que obtiene la identidad de la sesión, comprueba que esté habilitada, valida la estructura y referencias de los registros, bloquea la fila y verifica su revisión antes de actualizarla.

Los cálculos de distribución se derivan de los importes y fechas en el cliente; no se almacenan desgloses automáticos editables. La función SQL valida estructura, tipos, límites y referencias del documento, no repite el motor financiero completo en SQL. Esta aplicación es una herramienta personal de registro, no un sistema de cobros bancarios ni una plataforma multiusuario de préstamos.

No hay base offline de la cartera ni sincronización automática en segundo plano. Usa ↻ para traer los cambios de otro equipo. Un conflicto obliga a recargar antes de repetir el cambio. Si el guardado no se confirma por un corte de red, recarga y revisa el historial antes de reintentar. Descargar respaldos sigue siendo recomendable para recuperar registros borrados o reemplazados por importación.

## Archivos principales

| Archivo | Función |
| --- | --- |
| `dist/config.js` | URL y clave pública de tu proyecto |
| `dist/auth-flow.mjs` | Verificación de enlaces y estado del formulario de contraseña |
| `dist/backend.mjs` | Sesión, acceso y guardado Supabase |
| `dist/app.js` | Pantallas, fichas, préstamos y formularios |
| `dist/finance.mjs` | Cuotas, mora y distribución cronológica |
| `dist/store.mjs` | Validación, migración, archivo y eliminación |
| `dist/styles.css` | Diseño y adaptación a pantallas |
| `supabase/01_base_de_datos.sql` | Tabla, permisos y función transaccional |
| `AUTO_USUARIOS_SUPABASE.sql` | Alta automática de carteras para cuentas creadas en Auth |
| `supabase/email-invite.html` y `email-recovery.html` | Plantillas de correo para elegir contraseña |
| `tests/` | Pruebas financieras y de permisos SQL |

## Probar el código

Para ver el login con un servidor estático:

```sh
python -m http.server 8000 --directory dist
```

Abre `http://localhost:8000`. No abras el HTML con doble clic. Antes de conectar Supabase mostrará conexión pendiente. Para la recuperación local de contraseña debes añadir el retorno local en URL Configuration del proyecto de pruebas.

Pruebas sin conexión a un proyecto real:

```sh
npm ci
npm test
```

Las pruebas SQL usan PostgreSQL local en memoria mediante PGlite; no modifican tu proyecto de Supabase. Verifican aislamiento entre usuarios, acceso anónimo bloqueado, escrituras directas bloqueadas, rechazo de revisiones obsoletas, validación de documentos y habilitación de propietario. Las pruebas de acceso cubren invitaciones, recuperación, enlaces vencidos, recarga de formulario y cuentas manuales con adaptadores controlados. Las pruebas financieras cubren mora diaria, pagos parciales, fechas anteriores, anulación, redondeos, fin de mes, tasa cero y migración de respaldos.

## Referencias oficiales

- Acceso: https://supabase.com/docs/reference/javascript/auth-signinwithpassword
- RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Claves: https://supabase.com/docs/guides/getting-started/api-keys
- Funciones: https://supabase.com/docs/guides/database/functions
- Vercel: https://vercel.com/docs/project-configuration/vercel-json
