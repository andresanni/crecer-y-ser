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

## Documentación

- `AGENTS.md`: contrato compartido para herramientas de desarrollo asistido.
- `docs/project-context.md`: estado funcional y arquitectura vigente.
- `frontend_guidelines.md`: convenciones de frontend y mapa del modelo de datos.
- `docs/ux-modernization.md`: sistema UX/UI aprobado.
- `docs/magic-link-gradebook.md`: arquitectura del workflow docente–directivo.
- `docs/pocketbase-api.md`: contrato de las rutas propias de PocketBase.
- `docs/pocketbase-magic-link-hardening.md`: modelo de seguridad y estado del despliegue.
- `docs/pocketbase-environments.md`: separación local/VPS y flujo de migraciones, datos, promoción y rollback.
- `docs/gradebook-workflow-test-plan.md`: matriz y registro de aceptación del workflow.
- `deploy/README.md`: topología y operación reproducible del VPS.
- `deploy/start-pocketbase-dev.ps1`: inicio reproducible del backend local.
- `deploy/setup-pocketbase-dev.ps1`: reconstrucción desde cero con migraciones y seed sintético.
- `deploy/backup-pocketbase-dev.ps1` y `deploy/restore-pocketbase-dev.ps1`: recuperación cifrada del entorno local.
- `deploy/verify-pocketbase-dev.ps1`: validación reproducible del backend local.
- `pb_migrations/`: evolución ejecutable del esquema y las reglas.
- `pb_schema.json`: snapshot legible derivado del backend vigente.
