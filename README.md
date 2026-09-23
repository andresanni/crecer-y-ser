# Crecer y Ser

Aplicación web de gestión escolar para alumnos, responsables, inscripciones, estructura curricular y boletines.

## Stack

- React 19 y TypeScript 6.
- Vite 8.
- Ant Design 6.
- React Router 7.
- Zustand 5.
- PocketBase SDK.

## Funcionalidad principal

- Directorio, alta, edición, ficha, baja y eliminación de alumnos.
- Inscripciones, responsables y datos de cursada.
- Constructor de materias, criterios y períodos.
- Carga y monitoreo de boletines con un editor compartido.
- Una llave docente descartable por curso y período, guardado progresivo y envío atómico a control directivo.
- Revisión y corrección institucional exclusiva después de la entrega docente.
- Autenticación, actualización en tiempo real y temas claro/oscuro.

## Desarrollo

Iniciar primero PocketBase local:

```powershell
.\deploy\start-pocketbase-dev.ps1
```

En un equipo nuevo o sin `pb_data`, reconstruir primero el entorno completo:

```powershell
.\deploy\setup-pocketbase-dev.ps1 -DownloadPocketBase
```

Crear `.env.development.local`, sin versionarlo:

```dotenv
VITE_POCKETBASE_URL=http://127.0.0.1:8090
```

Luego iniciar el frontend:

```powershell
npm install
npm run dev
```

Validación local:

```bash
npm run lint
npm run build
```

La conexión se configura mediante `VITE_POCKETBASE_URL`. Desarrollo debe apuntar a la instancia saneada de loopback; producción usa `https://alumnos-api.duckdns.org`. No versionar archivos `.env`, credenciales, claves, backups ni `pb_data`.

## Producción

El frontend se despliega como SPA de Vite en Vercel y PocketBase permanece en el VPS. En Vercel debe definirse para Production:

```dotenv
VITE_POCKETBASE_URL=https://alumnos-api.duckdns.org
```

La configuración versionada valida el entorno de build y resuelve las rutas profundas de React Router. El alta, la política de previews, la verificación y el rollback se detallan en `docs/vercel-deployment.md`.

## Documentación

- `AGENTS.md`: contrato compartido para herramientas de desarrollo asistido.
- `docs/project-context.md`: estado funcional y arquitectura vigente.
- `docs/guia-operativa-pocketbase-dev-produccion.md`: guía personal de migraciones, actualización y recuperación de los dos entornos.
- `frontend_guidelines.md`: convenciones de frontend y mapa del modelo de datos.
- `docs/ux-modernization.md`: sistema UX/UI aprobado.
- `docs/magic-link-gradebook.md`: arquitectura del workflow docente–directivo.
- `docs/pocketbase-api.md`: contrato de las rutas propias de PocketBase.
- `docs/pocketbase-magic-link-hardening.md`: modelo de seguridad y estado del despliegue.
- `docs/pocketbase-environments.md`: separación local/VPS y flujo de migraciones, datos, promoción y rollback.
- `docs/vercel-deployment.md`: publicación del frontend, variables, previews, verificación y rollback en Vercel.
- `docs/landing-production-readiness.md`: alcance, seguridad, aceptación y merge de la puesta a punto de la landing pública.
- `docs/gradebook-workflow-test-plan.md`: matriz y registro de aceptación del workflow.
- `deploy/README.md`: topología y operación reproducible del VPS.
- `deploy/start-pocketbase-dev.ps1`: inicio reproducible del backend local.
- `deploy/setup-pocketbase-dev.ps1`: reconstrucción desde cero con migraciones y seed sintético.
- `deploy/backup-pocketbase-dev.ps1` y `deploy/restore-pocketbase-dev.ps1`: recuperación cifrada del entorno local.
- `deploy/verify-pocketbase-dev.ps1`: validación reproducible del backend local.
- `pb_migrations/`: evolución ejecutable del esquema y las reglas.
- `pb_schema.json`: snapshot legible derivado del backend vigente.
