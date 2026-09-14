# Acceso docente por enlace mágico

## Decisión arquitectónica

La carga institucional y la carga docente comparten un único editor de boletín, `VistaPorAlumno`. No deben existir dos copias del formulario porque criterios, escalas, cálculo de avance y persistencia académica representan el mismo dominio y deben evolucionar juntos.

La bifurcación se resuelve en los bordes:

- La ruta institucional aporta selección de curso y período, navegación privada, monitoreo y una política de acceso completa.
- La ruta pública valida el enlace, construye el contexto permitido y aporta una política de acceso docente.
- `GradebookAccessPolicy` declara capacidades; el editor no infiere permisos a partir de la URL ni de la presencia de una sesión.
- `accesoDocenteService` es el único responsable frontend de crear, listar, activar, revocar, eliminar y validar enlaces.

## Alcances

| Acceso | Materias | Apoyos del alumno | Cierre y asistencia |
| --- | --- | --- | --- |
| Equipo directivo | Todas las del curso | Sí | Sí |
| Enlace de curso | Todas las del curso | Sí | Sí |
| Enlace de materia | Sólo la materia indicada | No | No |

El guardado persiste únicamente los bloques modificados. Esto evita que dos personas trabajando sobre áreas distintas sobrescriban datos que no tocaron.

Antes de guardar desde una sesión docente se vuelve a validar el enlace. Si fue desactivado, eliminado o expiró, el frontend descarta la operación y muestra el estado de acceso vencido.

## Frontera de seguridad

El gateway docente valida vigencia, revocación y alcance en cada lectura y escritura. La ruta `/carga` está implementada para consumir únicamente ese gateway mediante `GradebookDataSource`; nunca consulta colecciones académicas directamente. La migración final cierra las reglas anónimas generales y convierte los secretos legados a hash.

El código completo fue validado contra PocketBase 0.22.17 en una copia local y `1789338120_close_public_gradebook_rules.js` fue aplicado en el VPS el 14 de septiembre de 2026. Las pruebas remotas confirmaron que el enlace legado continúa operativo y que las colecciones ya no exponen registros anónimos.

La estrategia de migración y las operaciones manuales del VPS se detallan en `docs/pocketbase-magic-link-hardening.md`.

## Contrato para próximas mejoras

- Mantener un solo editor y extraer piezas internas reutilizables cuando la densidad visual lo requiera.
- Mantener shells separados para el equipo directivo y las docentes.
- No incorporar condiciones visuales dispersas del tipo `esPublico`; toda diferencia funcional debe provenir de la política de acceso.
- No confiar en filtros de interfaz para autorizar escrituras.
- La revocación debe impedir el siguiente guardado aun cuando la página ya estuviera abierta.
- Un enlace de materia nunca debe modificar asistencia, observaciones generales ni apoyos.
