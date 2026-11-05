# Crispy Crédito

Aplicación web personal para probar el registro de clientes, préstamos y abonos. Incluye el código editable completo, diseño adaptable a celular y computador, colores de la marca, imagen original y pruebas de cálculo. No necesita instalar dependencias ni pagar por una API de IA.

## 1. Subir a GitHub desde el navegador

1. Extrae el ZIP. Entra en la carpeta `crispy-credito`.
2. En tu cuenta personal de GitHub crea un repositorio llamado `crispy-credito`. Puedes hacerlo privado. Inicialízalo con un README para facilitar la carga desde el navegador.
3. En el repositorio selecciona **Add file → Upload files**.
4. Arrastra el CONTENIDO de la carpeta extraída: `dist`, `tests`, `README.md`, `vercel.json` y `.gitignore`. Conserva las carpetas y sus archivos internos. Si no ves `.gitignore`, puedes agregarlo después desde GitHub; no impide publicar esta demo.
5. Guarda los cambios con **Commit changes** o el flujo de propuesta de cambios que muestre GitHub.
6. Comprueba que `vercel.json` y `README.md` estén en la raíz del repositorio y que exista `dist/index.html`. No subas solo el ZIP: GitHub no lo extrae automáticamente.

## 2. Conectar con Vercel

1. En Vercel entra en **Add New → Project** y conecta tu cuenta de GitHub.
2. Importa el repositorio `crispy-credito`. Si es privado, concede acceso a ese repositorio cuando Vercel lo solicite.
3. Revisa estos valores:

| Opción | Valor |
| --- | --- |
| Framework Preset | Other |
| Root Directory | `./` (raíz del repositorio) |
| Output Directory | `dist` |
| Build Command | Vacío / desactivado |
| Install Command | Vacío / desactivado |
| Environment Variables | Ninguna para esta demo |

4. El archivo `vercel.json` incluido configura el directorio de salida y omite instalación y construcción. Si hay una configuración previa en tu cuenta, revisa que no la contradiga.
5. Pulsa **Deploy**. Al finalizar, Vercel te entregará una dirección de la app.
6. Prueba agregar un cliente, registrar un préstamo y anotar un abono ficticio.

No se ha publicado ni probado esta exportación en tu cuenta de Vercel. La publicación depende de tu cuenta, sus permisos y las condiciones del plan. El plan Hobby se limita a uso personal no comercial; consulta sus condiciones si cambia el uso del proyecto.

## Lo que ya funciona

- Fichas individuales de clientes con varios préstamos.
- Búsqueda de clientes y movimientos.
- Simulación de cuotas mensuales fijas con interés sobre saldo.
- Registro separado de capital e intereses, con actualización de saldo de capital.
- Anulación de abonos conservando el registro.
- Descarga e importación validada de respaldos JSON.
- Exportación de movimientos a CSV.
- Adaptación visual a celular y computador.

## Datos y acceso de esta versión

Los datos iniciales son ficticios. Tus cambios se guardan en `localStorage`, únicamente en ese navegador y en el dominio donde abres la app. Cambiar de dominio, dispositivo, perfil o navegador no traslada los registros. Borrar datos del navegador puede borrarlos. Descargar el código no descarga los datos que hayas escrito en la demo anterior: usa **Mi espacio → Descargar respaldo** y luego importa ese respaldo desde la otra copia de la app.

Esta exportación no incluye el acceso privado mediante ChatGPT del enlace anterior, ni login de Supabase. El botón de acceso es una vista conceptual y no solicita contraseñas. Un repositorio privado en GitHub no convierte automáticamente en privada la web publicada. Usa datos ficticios hasta conectar autenticación, permisos y base de datos.

No hay claves, contraseñas, datos de tus clientes reales ni credenciales de servicios en el paquete. No subas respaldos de clientes ni claves privadas al repositorio.

## Cálculos

El método implementado para la simulación es cuota mensual fija con interés sobre el capital pendiente. La primera cuota vence un mes después del desembolso y la última se ajusta por redondeo a pesos colombianos. Los abonos se distribuyen manualmente entre capital e intereses según el acuerdo: solo la parte de capital reduce el capital pendiente.

El calendario es el plan inicial, no se recalcula por abonos extraordinarios. Próximas cuotas es una referencia orientativa, no una liquidación ni un cálculo de mora. Falta acordar tu método de intereses, frecuencia de pago y tratamiento de anticipos antes de usarlo con préstamos reales. No se generan cobros o transferencias bancarias.

## Cómo modificarla

Edita los archivos, súbelos al mismo repositorio y guarda un commit. Con la integración de Git configurada, Vercel puede publicar esos cambios automáticamente.

| Archivo | Contenido |
| --- | --- |
| `dist/index.html` | Estructura de la página |
| `dist/styles.css` | Colores, tipografía y diseño adaptable |
| `dist/app.js` | Pantallas, clientes, préstamos, abonos y respaldos |
| `dist/finance.mjs` | Cálculos y calendario |
| `dist/assets/marca.png` | Referencia original de la marca |
| `vercel.json` | Configuración para Vercel |
| `tests/finance.test.mjs` | Pruebas de cálculos |

## Probar localmente

No abras `index.html` con doble clic: los módulos JavaScript requieren un servidor HTTP. Con Python instalado, desde la carpeta del proyecto ejecuta:

```sh
python -m http.server 8000 --directory dist
```

Entra en `http://localhost:8000`. Con Node instalado puedes comprobar los cálculos:

```sh
node tests/finance.test.mjs
```

## Siguiente fase: Supabase

Conectar Supabase Auth y Postgres para correo y contraseña reales y datos compartidos entre dispositivos. Antes de cargar registros reales: restringir acceso al propietario, cerrar el registro público, activar políticas RLS, validar en servidor y usar transacciones para evitar abonos duplicados o saldos inconsistentes. Las claves privadas deben permanecer fuera del navegador. La app actual todavía no realiza esa conexión.

## Documentación oficial

- GitHub: https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
- Vercel y GitHub: https://vercel.com/docs/git/vercel-for-github
- Configuración: https://vercel.com/docs/project-configuration/vercel-json
- Plan Hobby: https://vercel.com/docs/plans/hobby
