# Contexto actual de Crecer y Ser

Actualizado: 15 de septiembre de 2026.

## Propósito

Crecer y Ser es una aplicación web de gestión escolar conectada directamente a PocketBase. Centraliza alumnos, responsables, inscripciones, estructura curricular, períodos y carga de boletines.

## Estado funcional

- Autenticación institucional y rutas protegidas.
- Directorio de alumnos con búsqueda, filtros, paginación, tabla y tarjetas.
- Alta, edición, ficha integral, baja y eliminación de alumnos.
- Gestión de inscripción, cursada, responsables vinculados y credenciales Acadeu.
- Portal de boletines con constructor curricular, materias, criterios y períodos.
- Carga de calificaciones, asistencias, observaciones y apoyos por alumno.
- Tablero unificado de carga, avance y revisión por curso.
- Workflow de boletines con enlaces docentes revocables, guardado progresivo, envío completo y control institucional exclusivo.
- Landing institucional y temas claro/oscuro.

## Stack vigente

- React 19 y React DOM 19.
- TypeScript 6 con configuración estricta.
- Vite 8.
- Ant Design 6 e iconos oficiales.
- React Router 7.
- Zustand 5.
- PocketBase SDK 0.27.
- Day.js.

## Rutas

| Ruta | Pantalla |
| --- | --- |
| `/` | Sitio institucional |
| `/login` | Acceso institucional |
| `/carga` | Carga pública mediante token docente |
| `/app/alumnos` | Directorio y gestión de alumnos |
| `/app/boletines` | Portal de boletines |
| `/app/boletines/calificaciones` | Tablero unificado de carga y revisión de notas |
| `/app/boletines/constructor` | Constructor curricular |

## Arquitectura

- `src/core`: cliente PocketBase y contexto transversal de tema.
- `src/store`: estado global de sesión y ciclo lectivo.
- `src/modules`: dominios funcionales con componentes, modelos y servicios propios.
- `src/shared`: composiciones, estilos y hooks reutilizables.
- `src/theme`: paleta, tokens y configuración central de Ant Design.
- `pb_migrations`: evolución desplegable del esquema y de las reglas de PocketBase.
- `pb_hooks`: gateway HTTP, autorización y transacciones del acceso docente.
- `pb_schema.json`: snapshot legible del backend y sus relaciones.
- `deploy`: unidad systemd, Caddyfile e instrucciones operativas del VPS.

Los servicios transforman registros `snake_case` de PocketBase en modelos de dominio `camelCase`. No existe un backend Node intermedio; las operaciones públicas privilegiadas se implementan como hooks de PocketBase versionados con el proyecto.

La carga institucional y la carga por enlace comparten el editor de boletín y se diferencian mediante `GradebookAccessPolicy` y `GradebookDataSource`. PocketBase dispone desde el 14 de septiembre de 2026 de gateways separados que vuelven a validar autorización, alcance y estado dentro de cada transacción. `/carga` usa exclusivamente las rutas docentes y cada enlace abarca un curso y período completos; no se admiten accesos por materia.

`instancias_carga_boletin` representa una única máquina de estados por curso y período:

| Estado | Control de escritura | Salida válida |
| --- | --- | --- |
| `BORRADOR_DOCENTE` | Docente mediante enlace vigente | Envío completo a dirección |
| `CONTROL_DIRECTIVO` | Usuario institucional autenticado | Estado terminal con revisión y corrección |

El guardado docente es progresivo, pero el envío es atómico y sólo ocurre cuando el servidor verifica la completitud de todo el curso. El traspaso revoca inmediatamente las credenciales docentes y no puede revertirse. Dirección recibe una revisión de solo lectura y corrige de forma atómica por materia: sólo una puede editarse por vez y sus acciones de guardado o descarte permanecen en la tarjeta correspondiente. La interfaz nunca monta dos formularios editables a la vez y las colecciones de notas, criterios y cierres no admiten escrituras directas desde clientes.

Las migraciones de workflow, los hooks y las reglas están versionados con el proyecto y desplegados en el VPS. `1789346400_simplified_unidirectional_gradebook_workflow.js` reduce la máquina a sus dos estados vigentes, migra cualquier registro histórico cerrado a control directivo y elimina los campos de cierre obsoletos. El contrato y los alcances se documentan en `docs/magic-link-gradebook.md`; la seguridad y las operaciones del VPS se describen en `docs/pocketbase-magic-link-hardening.md` y `deploy/README.md`.

Los enlaces no tienen vencimiento calendario. Permanecen activos durante el borrador hasta que dirección los desactiva o elimina, o hasta que la entrega atómica revoca todo acceso docente del curso y período.

## Arquitectura UX/UI

`MainLayout` contiene la navegación, barra superior, breadcrumbs y el `Outlet` de las rutas privadas. Cada pantalla operativa usa `SectionLayout`, que encapsula `PageHeader` y el ritmo vertical con el contenido.

La tipografía de títulos y navegación es Manrope; Inter se reserva para lectura y controles. Los colores, radios y familias tipográficas se centralizan en `src/theme` y las variables globales. Las reglas específicas viven en CSS Modules próximos al componente; `src/index.css` conserva estilos heredados que deben reducirse gradualmente, no ampliarse.

El producto es desktop first para equipos escolares, con validación prioritaria en 1366, 1440 y 1920 px. El soporte móvil sigue siendo obligatorio para navegación, modales y tareas compatibles.

La sección institucional `Carga de notas` concentra el seguimiento y la operación por curso. La antigua ruta `/app/boletines/monitoreo` sólo conserva una redirección de compatibilidad y no debe volver a exponerse en la navegación.

El tablero distingue el avance académico del control operativo. `Completado` exige una entrega en `CONTROL_DIRECTIVO`; `En progreso` indica un borrador con credencial activa y `Pausado` identifica respuestas parciales sin acceso docente vigente. Eliminar un enlace conserva el borrador y generar uno nuevo lo reanuda.

## Estado de calidad

- `npm run lint`: sin errores ni advertencias al finalizar la modernización.
- `npm run build`: correcto.
- Advertencia conocida: el bundle principal supera 500 kB minificado; requiere una estrategia posterior de partición de código.
- La modernización UX/UI fue aprobada y fusionada en `master`.
- El workflow unidireccional fue validado sobre una copia aislada y desplegado; el servicio, el esquema de dos estados y la ausencia de rutas de retorno fueron verificados en el VPS.

Las operaciones destructivas o de escritura sobre datos escolares deben probarse con datos descartables y confirmación explícita del alcance.
