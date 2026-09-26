# Despliegue del frontend en Vercel

Actualizado: 26 de septiembre de 2026.

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
