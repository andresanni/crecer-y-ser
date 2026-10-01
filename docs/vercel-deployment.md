# Despliegue del frontend en Vercel

Actualizado: 1 de octubre de 2026.

## Topología

Crecer y Ser mantiene dos entornos completos y sin sincronización automática:

| Entorno | Frontend | PocketBase | Datos |
| --- | --- | --- | --- |
| Desarrollo | Vite local | `http://127.0.0.1:8090` | Saneados y sintéticos |
| Producción | Vercel | `https://alumnos-api.duckdns.org` | Escolares reales |

Vercel aloja únicamente los archivos estáticos del frontend. PocketBase, sus datos, hooks, migraciones y secretos permanecen en el VPS.

## Configuración versionada

`vercel.json` fija Vite como framework, `dist` como salida, ejecuta `npm run build:vercel` y reescribe todas las rutas de la SPA hacia `index.html`. Esto permite abrir directamente rutas como `/login`, `/carga` y `/app/boletines/calificaciones` sin recibir un error 404 de Vercel.

El build de Vercel exige `VITE_POCKETBASE_URL`, HTTPS y un host no local. El cliente también valida la variable al iniciar y ya no dispone de una URL productiva alternativa.

## Alta inicial del proyecto

1. Importar en Vercel el repositorio Git `andresanni/crecer-y-ser`.
2. Seleccionar `master` como Production Branch.
3. Mantener el directorio raíz del proyecto en la raíz del repositorio.
4. Permitir que `vercel.json` determine framework, build y directorio de salida.
5. Crear esta variable sólo para Production:

   ```dotenv
   VITE_POCKETBASE_URL=https://alumnos-api.duckdns.org
   ```

6. Ejecutar el primer deployment de producción.

`VITE_POCKETBASE_URL` es una configuración pública incorporada al bundle, no un secreto. No deben configurarse en Vercel credenciales de PocketBase, claves docentes, archivos de entorno del VPS ni contenido de `pb_data`.

## Política de Preview Deployments

`vercel.json` limita los deployments automáticos a `master` mediante `git.deploymentEnabled`. Además, `ignoreCommand` omite cualquier build cuyo `VERCEL_ENV` no sea `production`; Vercel interpreta la salida 0 como omisión y la salida 1 como continuación. Esta segunda regla cubre eventos de pull request que llegaron a iniciar un Preview pese a la configuración de ramas. Puede aparecer un deployment omitido en Vercel, pero no debe ejecutarse `npm run build:vercel` ni producir un check fallido por ausencia del backend.

No se configura `VITE_POCKETBASE_URL` para Preview mientras sólo existan los backends local y productivo. El PocketBase del VPS se reserva para Production.

Si en el futuro se crea un PocketBase de staging con datos sintéticos, se deberá habilitar nuevamente el patrón de ramas correspondiente y asignar su origen HTTPS a Preview. No debe usarse loopback ni la instancia productiva para ese propósito.

## Orden de publicación

Cuando una release modifica el contrato entre frontend y backend:

1. Ejecutar `npm run lint`, `npm run build` y las pruebas funcionales locales contra PocketBase local.
2. Ensayar las migraciones y hooks contra una copia reciente, aislada y saneada de producción.
3. Respaldar y desplegar primero PocketBase si el cambio es compatible con el frontend vigente.
4. Verificar health, autenticación, permisos y gateways en el VPS.
5. Publicar el frontend en Vercel desde el commit compatible.
6. Validar la aplicación desde el dominio definitivo de Vercel.

## Verificación posterior

Comprobar en una ventana privada:

- `/` carga la landing y sus recursos.
- `/login` abre directamente y autentica una cuenta institucional.
- `/app/alumnos` redirige a login sin sesión y carga con una sesión válida.
- `/app/boletines/calificaciones` puede abrirse directamente sin 404.
- `/carga` responde y rechaza una llave inválida sin exponer datos.
- Las solicitudes de red se dirigen únicamente a `https://alumnos-api.duckdns.org`.
- La recarga del navegador conserva cada ruta de React Router.
- El tema, iconos e imágenes funcionan en la URL productiva.

La comprobación de `/carga` debe usar una llave descartable de prueba creada de forma controlada. Nunca registrar ni pegar llaves reales en Vercel, Git o documentación.

## Rollback

Si el frontend falla pero el contrato del backend sigue siendo compatible, promover nuevamente en Vercel el deployment productivo anterior. Si la release incluyó backend, seguir además el procedimiento de rollback de `docs/pocketbase-environments.md` y restaurar siempre una combinación compatible de frontend, hooks y esquema.


## PDF institucional

Antes de publicar el frontend de boletines, desplegar PocketBase y `deploy/publish-pdf-worker.ps1` en el VPS. El frontend estatico consume `/api/cys/pdf/generar` y `/api/cys/pdf/lote` del mismo origen configurado para PocketBase. Vercel no ejecuta Chromium ni recibe la clave privada. El worker acepta `https://www.creceryser.edu.ar`, `https://creceryser.edu.ar` y `https://crecer-y-ser-ten.vercel.app`; agregar un nuevo dominio productivo a `CYS_PDF_ORIGINS` en el VPS y reiniciar el servicio antes de cambiar el dominio de la app. Los dominios de Preview no se autorizan automaticamente.


## Dominio institucional

Desde el 1 de octubre de 2026, el origen principal es https://www.creceryser.edu.ar. Vercel redirige creceryser.edu.ar hacia www mediante 308, conservando la ruta; crecer-y-ser-ten.vercel.app continúa operativo para enlaces anteriores. El backend conserva https://alumnos-api.duckdns.org y VITE_POCKETBASE_URL no cambia.

El generador PDF autoriza explícitamente los tres orígenes HTTPS. Para actualizar una instalación existente, ejecutar en el VPS como root: python3 configure-pdf-origins.py https://www.creceryser.edu.ar https://creceryser.edu.ar https://crecer-y-ser-ten.vercel.app. El script versionado en deploy/ respalda /etc/cys-pdf.env bajo /root/pb/deploy_backups, conserva la clave privada, reemplaza sólo CYS_PDF_ORIGINS, reinicia cys-pdf y comprueba health; ante un fallo restaura el archivo anterior. La instalación nueva incorpora los mismos orígenes sin sobrescribir configuraciones existentes. No se requieren cambios de esquema, migraciones, proxy ni datos académicos. Los previews y orígenes ajenos continúan rechazados por el worker.

El cambio se aplicó con respaldo /root/pb/deploy_backups/pdf-origins-20261001-123228-272107. Se comprobaron los preflights 204 de generar/lote para los tres orígenes, las respuestas 401 con CORS sin sesión y el rechazo 403 de un origen ajeno. En navegador sin sesión desde www se verificaron login, gateways docente y contacto, Realtime, rutas privadas y redirección desde el dominio raíz, sin errores JavaScript ni bloqueos CORS. Las pruebas sintéticas no enviaron correos ni alteraron boletines.

GestorEnlacesModal construye /carga#token con window.location.origin, por lo que copiar desde el nuevo dominio lo utiliza automáticamente. Los enlaces anteriores conservan su validez y no requieren rotación. PocketBase SDK almacena la sesión por origen: al entrar por primera vez en www se debe iniciar sesión nuevamente; no se trasladan credenciales entre dominios.

La auditoría encontró meta.appUrl con http://localhost:8090. Las plantillas actuales de verificación, recuperación y cambio de correo resuelven {APP_URL}/_/#/auth/... mediante el panel de PocketBase. Se corrigió meta.appUrl a https://alumnos-api.duckdns.org, cuyo /_/ sirve ese panel; no debe apuntarse al frontend mientras no implemente esos flujos. Se respaldó data.db con PocketBase detenido en /root/pb/deploy_backups/mail-url-20261001-123514 y se verificó que todas las demás tablas y propiedades de ajustes quedaron idénticas antes de reiniciar y comprobar health. SMTP, remitentes y claves permanecen intactos.
