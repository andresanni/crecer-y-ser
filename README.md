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
- Carga y monitoreo de boletines.
- Acceso temporal para carga docente.
- Autenticación, actualización en tiempo real y temas claro/oscuro.

## Desarrollo

```bash
npm install
npm run dev
```

Validación local:

```bash
npm run lint
npm run build
```

La conexión se configura mediante `VITE_POCKETBASE_URL`. Copiar `.env.example` a `.env` para el entorno local y no versionar credenciales.

## Documentación

- `AGENTS.md`: contrato compartido para herramientas de desarrollo asistido.
- `docs/project-context.md`: estado funcional y arquitectura vigente.
- `frontend_guidelines.md`: convenciones de frontend y mapa del modelo de datos.
- `docs/ux-modernization.md`: sistema UX/UI aprobado.
- `pb_schema.json`: esquema de PocketBase y fuente de verdad del backend.
