# Actualizar Crispy Crédito

1. Extrae este ZIP y sube la carpeta completa `crispy-credito` a tu repositorio, reemplazando los archivos anteriores. Guarda el commit y espera el despliegue en Vercel.
2. Abre `CONECTAR_LOGIN.md`: contiene las direcciones exactas que debes guardar en Supabase y las dos plantillas de correo incluidas.
3. Para entrar con una cuenta creada manualmente, usa **Create user**, correo, contraseña y **Auto Confirm User**. Para que la persona elija su contraseña, usa **Invite user**.

Esta actualización incorpora los formularios de crear contraseña y recuperarla. No necesitas otro SQL para mostrar esas pantallas. La conexión pública de tu proyecto ya está en `dist/config.js`; no pongas contraseñas ni claves privadas en GitHub.

Si tienes información guardada, descarga un respaldo desde Mi espacio antes de actualizar. Cada cuenta conserva su propia cartera: crear otra cuenta no transfiere los datos de la anterior.

Solo para una instalación nueva: ejecuta `INICIAR_SUPABASE.sql` en SQL Editor. Crea la estructura, los permisos y el alta automática de carteras; conserva los registros si se repite. Mantén desactivado el registro público.
