# Contexto actual de Crecer y Ser

Actualizado: 4 de octubre de 2026.

## Salvaguardas documentales y cursadas parciales publicadas

El plan vigente está en `docs/gradebook-pdf-emission.md`, sección Casos de borde. El usuario confirmó mantener NO por defecto en apoyos y que dirección defina los bimestres evaluables independientemente de las fechas administrativas. Las etapas 1A/1B están publicadas: guarda del servidor contra identidad/apoyos incompletos, preparación documental anticipada en revisión y accesos al formulario existente de ficha y al bimestre de apoyos, con retorno al alumno original. Realtime actualiza el diagnóstico sin reemplazar ediciones académicas locales. La corrección de un NO antiguo sin especificar conserva la retirada de visado del gateway. Las etapas 1A/1B no agregan migraciones. La etapa 2 está implementada en código y ensayada: rango evaluable inclusivo, baja con último boletín, cancelación sin cursada y confirmación obligatoria de cursadas pendientes antes de nuevas entregas. La migración 1790850000 se ensayó aisladamente y se aplicó a producción el 3 de octubre; 8090 permanece intacto por indicación del usuario. La etapa 3 también está implementada y validada: altas tardías con asteriscos en notas, guiones en PPI/asistencias y observación de legajo conforme a los ejemplos de dirección; apoyos editables en el primer bimestre evaluable. Confirmar ingreso tardío confirma la documentación anterior en legajo y el modal lo informa. El cuarto bimestre conserva el bloqueo de render por fuentes anuales pendientes. Backend, worker y frontend están publicados en producción; ver el hito de B1 en gradebook-pdf-emission.md.

El briefing de ingesta histórica de grades_bulk_import_analysis (832b924) se revisó el 2 de octubre y sus herramientas se integraron posteriormente mediante PR #14. El hito productivo del 3 de octubre conserva B1 completo (83 visados), B2 vacío, cuatro DNI pendientes de PDF y 81 cursadas por confirmar antes de nuevas entregas. La etiqueta hito-b1-completo-2026-10-03 y el respaldo /root/pb/milestones/20261003-b1-completo-b2-vacio identifican ese estado. La regresión sintética cubre matrículas restauradas después de una entrega y preservación de los visados anteriores. El usuario confirmó el vaciado intencional de las tablas operativas locales después de una prueba de ingesta dirigida por error a loopback. Por su indicación se conserva esa base intacta y detenida; las pruebas usan instancias temporales sintéticas. No se reemplazó con el snapshot anterior.

## Release de pulido de boletines PDF

Los cambios del 1 de octubre simplifican la revisión y descarga: listado alfabético sin buscador ni textos introductorios, progreso junto al listado, botón Visar / Quitar visado, descarga individual sin vista previa y obtención automática al abrir PDFs del curso. Dirección ve PDF listo o Falta visar; los fallos reales permanecen diferenciados. Las observaciones confirmadas vacías se imprimen como --- centrado.

El servidor mantiene un PDF vigente por matrícula y período, invalidación acumulativa, limpieza periódica y reutilización de emisiones. La regeneración se resuelve durante la siguiente obtención, sin decisiones técnicas para dirección. La release no agrega migraciones ni cambia el esquema: requiere actualizar pdfEmissions.js, el worker/plantilla y el frontend. El estado histórico de las etapas anteriores se conserva más abajo.

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
- Workflow de boletines con enlaces docentes descartables, guardado progresivo, envío completo y control institucional exclusivo.
- Landing institucional y tema claro como única presentación en toda la aplicación.

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
| `/app/boletines` | Accesos a Bimestres y Constructor |
| `/app/boletines/calificaciones` | Bimestres: selección, tablero de carga y revisión |
| `/app/boletines/constructor` | Constructor de la malla curricular |

## Arquitectura

- `src/core`: cliente PocketBase y servicios transversales.
- `src/store`: estado global de sesión y ciclo lectivo.
- `src/modules`: dominios funcionales con componentes, modelos y servicios propios.
- `src/shared`: composiciones, estilos y hooks reutilizables.
- `src/theme`: paleta, tokens y configuración central de Ant Design.
- `pb_migrations`: evolución desplegable del esquema y de las reglas de PocketBase.
- `pb_hooks`: gateway HTTP, autorización y transacciones del acceso docente.
- `pb_schema.json`: snapshot legible del backend y sus relaciones.
- `deploy`: unidad systemd, Caddyfile e instrucciones operativas del VPS.

PocketBase dispone de dos entornos independientes sobre la versión `0.22.17`. Producción continúa en el VPS y desarrollo funciona localmente en Windows ARM64, aislado en `C:\pocketbase` y accesible sólo mediante `127.0.0.1:8090`. El frontend local usa `.env.development.local`; datos, credenciales, claves y backups sin cifrar permanecen fuera del repositorio y de OneDrive. Sólo el contenedor de recuperación cifrado puede almacenarse en OneDrive.

El frontend productivo está preparado como SPA de Vite para Vercel. La configuración versionada resuelve rutas profundas de React Router y exige una URL HTTPS explícita de PocketBase durante el build remoto. El cliente no conserva un fallback productivo, por lo que un entorno incompleto falla de forma visible en vez de conectarse a otra base. Mientras no exista un PocketBase de staging, los Preview Deployments no reciben acceso a ningún backend. El procedimiento canónico está en `docs/vercel-deployment.md`.

La renovación de la landing pública y del acceso institucional fue aprobada, fusionada y desplegada en producción. El formulario de consultas es funcional y entrega los mensajes mediante el gateway SMTP de PocketBase. `docs/landing-production-readiness.md` conserva el cierre y los criterios verificados de ese trabajo.

El repositorio usa `master` como rama productiva y `dev` como rama permanente de integración para desarrollo local. Las features parten de `dev`, las releases se promueven mediante pull request hacia `master` y los hotfixes productivos deben retornar después a `dev`. La estrategia completa está en `docs/branching-strategy.md`.

La instancia local se inicializó el 20 de septiembre de 2026 desde una copia consistente y anonimizada de producción. No conserva usuarios, administradores, enlaces docentes, logs ni backups productivos. También existe una reconstrucción desde cero mediante baseline, migraciones, credenciales locales generadas y seed sintético; el simulacro completo fue validado sobre un directorio vacío. `pb_migrations` y `pb_hooks` se cargan directamente desde el checkout, por lo que Git es el canal de promoción del backend. `pb_data` nunca viaja de desarrollo al VPS. El contrato canónico está en `docs/pocketbase-environments.md` y la explicación operativa para el propietario del proyecto en `docs/guia-operativa-pocketbase-dev-produccion.md`.

Los servicios transforman registros `snake_case` de PocketBase en modelos de dominio `camelCase`. El servicio Node/Chromium se limita a generar PDF; las operaciones públicas privilegiadas se implementan como hooks de PocketBase versionados con el proyecto. El formulario de contacto de la landing despacha consultas mediante el endpoint `/api/cys/contacto` (manejado por `pb_hooks/contacto.pb.js` y `pb_hooks/lib/contactService.js`), con protecciones honeypot, limitación de tasa por IP y envío SMTP institucional hacia `secretariacreceryser@gmail.com`.

La carga institucional y la carga por enlace comparten el editor de boletín y se diferencian mediante `GradebookAccessPolicy` y `GradebookDataSource`. PocketBase dispone desde el 14 de septiembre de 2026 de gateways separados que vuelven a validar autorización, alcance y estado dentro de cada transacción. `/carga` usa exclusivamente las rutas docentes y cada enlace abarca un curso y período completos; no se admiten accesos por materia.

`instancias_carga_boletin` representa una única máquina de estados por curso y período:

| Estado | Control de escritura | Salida válida |
| --- | --- | --- |
| `BORRADOR_DOCENTE` | Docente mediante enlace vigente | Envío completo a dirección |
| `CONTROL_DIRECTIVO` | Usuario institucional autenticado | Estado terminal con revisión y corrección |

La configuración de `curso_materias` pertenece ahora a un ciclo lectivo. Materias, orden y criterios se modifican mediante el gateway institucional y quedan cerrados para ese curso y ciclo desde la primera emisión de un enlace. La emisión exige escala con valores, materias y exactamente cinco criterios por materia. El constructor de un ciclo nuevo comienza con su propia malla; el catálogo de nombres de materias continúa compartido.

`visados_boletin` representa la revisión individual posterior a la entrega, con una fila por instancia y matrícula. La entrega crea las filas en `PENDIENTE_REVISION`; dirección puede pasar cada una a `VISADO` con una revisión esperada. Una corrección retira automáticamente el visado del alumno afectado e incrementa su revisión de contenido. La revisión del curso permanece bajo `CONTROL_DIRECTIVO`; `LISTO_PARA_PDF` es una proyección autoritativa del servidor cuando todos los boletines requeridos están visados. No hay generación de PDF implementada todavía.

El gateway institucional informa etapas de curso y conteos de visados; el tablero ya no deduce el workflow a partir de porcentajes. Los porcentajes siguen indicando progreso académico. Si ingresa un alumno después de la entrega, la revisión informa el desajuste y ofrece incorporarlo explícitamente sin alterar los boletines ya visados. Los alumnos dados de baja después de la entrega conservan su fila de revisión.

El guardado docente es progresivo, pero el envío es atómico y sólo ocurre cuando el servidor verifica la completitud de todo el curso. El traspaso elimina inmediatamente la llave docente y no puede revertirse. Dirección recibe una revisión de solo lectura y corrige de forma atómica por materia: sólo una puede editarse por vez y sus acciones de guardado o descarte permanecen en la tarjeta correspondiente. La interfaz nunca monta dos formularios editables a la vez y las colecciones de notas, criterios y cierres no admiten escrituras directas desde clientes.

Las correcciones directivas usan concurrencia optimista por curso y período. Un gateway de lectura devuelve la libreta completa y su revisión desde una misma transacción; cada guardado envía esa versión como precondición. PocketBase la compara dentro de la transacción y rechaza con `409` cualquier revisión vencida antes de escribir. Los cambios de instancia se distribuyen por Realtime; Zustand conserva versiones monotónicas e invalida tablero, resumen y detalle. Un cambio remoto nunca reemplaza un formulario con datos locales pendientes y un resultado de red incierto exige reconciliación antes de reintentar. `docs/concurrency-model.md` define este patrón para las próximas features multiusuario.

Las migraciones de workflow, los hooks y las reglas están versionados con el proyecto y desplegados en el VPS. `1789346400_simplified_unidirectional_gradebook_workflow.js` reduce la máquina a sus dos estados vigentes, `1789474000_added_recoverable_teacher_links.js` incorpora la recuperación cifrada y `1789477600_removed_teacher_link_state.js` elimina `activo` y garantiza una llave única por alcance. El contrato y los alcances se documentan en `docs/magic-link-gradebook.md`; la seguridad y las operaciones del VPS se describen en `docs/pocketbase-magic-link-hardening.md` y `deploy/README.md`.

Los enlaces no tienen vencimiento ni estado activo/inactivo. Existe como máximo una llave por curso y período: eliminarla corta el acceso y regenerarla reemplaza inmediatamente el secreto anterior sin afectar el borrador. La entrega atómica elimina la llave vigente.

Los secretos nuevos conservan SHA-256 para autenticación y una copia AES-256-GCM para recuperación institucional. El gestor puede copiar o compartir nuevamente la llave vigente sin rotarla; la clave de cifrado vive exclusivamente en el VPS. Los enlaces anteriores a esta arquitectura requieren una única regeneración.

## Arquitectura UX/UI

`MainLayout` contiene la navegación, barra superior, breadcrumbs y el `Outlet` de las rutas privadas. Cada pantalla operativa usa `SectionLayout`, que encapsula `PageHeader` y el ritmo vertical con el contenido.

La tipografía de títulos y navegación es Manrope; Inter se reserva para lectura y controles. Los colores, radios y familias tipográficas se centralizan en `src/theme` y las variables globales. Las reglas específicas viven en CSS Modules próximos al componente; `src/index.css` conserva estilos heredados que deben reducirse gradualmente, no ampliarse.

El producto es desktop first para equipos escolares, con validación prioritaria en 1366, 1440 y 1920 px. El soporte móvil sigue siendo obligatorio para navegación, modales y tareas compatibles.

La sección institucional `Bimestres` concentra la selección del período, el seguimiento y la operación por curso. La portada `Boletines` sólo ofrece accesos a `Bimestres` y `Constructor`, sin estadísticas ni consultas propias. La antigua ruta `/app/boletines/monitoreo` sólo conserva una redirección de compatibilidad y no debe volver a exponerse en la navegación.

El tablero distingue el avance académico del control operativo. Las etapas `PENDIENTE_CONFIGURACION`, `PENDIENTE_EMISION`, `CARGA_DOCENTE`, `CARGA_PAUSADA`, `REVISION_DIRECTIVA` y `LISTO_PARA_PDF` provienen del servidor. Eliminar un enlace conserva el borrador y generar uno nuevo lo reanuda.

La tabla de grados muestra por separado el progreso de llenado docente y el de revisión directiva. La revisión se presenta como no habilitada hasta que el curso se entrega; luego muestra el conteo de boletines visados sobre el total de la entrega. El estado indica sólo la instancia del workflow, sin repetir ese conteo. Los grados se identifican por su número y el tablero no filtra por condición de entrega.
Cada curso muestra una única acción según la etapa: acceso al gestor de enlaces antes de la entrega o apertura de la revisión después. La tabla distribuye sus columnas según el ancho disponible y conserva desplazamiento horizontal sólo para pantallas estrechas.

El listado de revisión presenta alumnos en orden alfabético por apellido y nombre, sin buscador ni textos introductorios. Su barra superior contiene el botón de PDFs a la izquierda y el progreso de visados a la derecha, sin un contador adicional de estudiantes. En la libreta directiva, Anterior y Siguiente comparten ese orden y recorren únicamente los boletines incorporados a la revisión. La selección del alumno pertenece a la pantalla de revisión para mantener sincronizados la libreta, el estado de visado y la acción correspondiente; los extremos de la lista no permiten avanzar fuera del curso.
Después de una corrección confirmada, la libreta conserva su contenido y posición de scroll mientras consulta la nueva instantánea. Durante esa lectura los controles quedan temporalmente inactivos; una falla mantiene los datos anteriores visibles y ofrece reintentar, sin habilitar escrituras con una revisión vencida.

La cabecera de revisión destaca el curso, turno y bimestre sin repetir la entrega. En el detalle, la barra sticky del alumno muestra sólo VISADO o SIN VISAR y las acciones Visar / Quitar visado y Descargar PDF. El mismo botón cambia entre Visar y Quitar visado según el estado del alumno, con confirmación y control de concurrencia; una corrección sigue retirando automáticamente el visado. La descarga directa exige los visados acumulativos vigentes del corte y no abre una vista previa. El conteo se conserva en el listado del curso. El porcentaje de materias en esa barra se reserva para la carga docente; la revisión parte de boletines ya entregados. Los estilos de esta composición viven junto a los componentes y usan los tokens del tema.
La barra sticky se adhiere al borde superior del viewport al desplazarse; el encabezado del shell participa del flujo normal y no requiere reservar un espacio superior.
En las tarjetas de materias de la revisión directiva se omite el indicador de completitud, ya implícita en la entrega. El valor de PPI se muestra en el encabezado y su interruptor ocupa ese mismo lugar durante la edición, junto a las acciones de guardar o descartar. La carga docente conserva sus indicadores de completitud.
Los conceptos pedagógicos de cada materia usan una medida máxima de lectura y reservan una zona propia para la calificación. Cuando la tarjeta se estrecha, la calificación pasa debajo del texto para evitar superposiciones; esta composición se comparte entre revisión directiva y carga docente.

Apoyos e Integración Escolar se presenta como una tarjeta de evaluación con la misma estructura visual de las materias: franja de título, insignia y controles de edición locales. La etiqueta `Trayectoria anual` y las tarjetas internas de primer y cuarto bimestre conservan su alcance funcional.

## Preparación de la plantilla de boletines PDF

El trabajo comienza por una plantilla centralizada de 13 páginas, adaptada a A4 por decisión del usuario. Se completó el relevamiento inicial y se recuperaron cuatro recursos institucionales del editable, sin incorporar información personal al repositorio. La plantilla base React contiene una portada aprobada, la página institucional 2 con la excepción de escala para 7.º confirmada, la página 3 de integración y materias formativas, la página 4 de Lengua y Matemática aprobada y todas las materias académicas renderizadas hasta página 7 de primer ciclo y página 8 de segundo ciclo; los cuatro cierres bimestrales están renderizados con diseño aprobado y las dos hojas finales anuales están completas para revisión visual; el generador institucional todavía no está implementado. El avance, las decisiones y el próximo paso se registran en [gradebook-pdf-reference.md](gradebook-pdf-reference.md); las mediciones y los recursos están en [gradebook-pdf-template-spec.md](gradebook-pdf-template-spec.md). La vista previa local se abre en `/plantilla-boletin.html?grado=1` con Vite; admite grados 1–7. Usa una instantánea curricular de PocketBase local 2026 con materias y conceptos por grado; notas, datos personales y asistencias permanecen ficticios. No consulta la base en tiempo real. La portada delimita cinco celdas dinámicas y deja sección, turno y jornada como configuración estática del documento. El ciclo pedagógico se deriva del grado numérico (1–3 primer ciclo, 4–7 segundo) sin agregar un campo a la base. La vista previa permite resaltar campos y valores derivados sin imprimir las marcas. La página 2 es estática: sólo en 7.º agrupa En Proceso y No alcanzó los objetivos como Desaprobado. Las tablas formativas y académicas comparten presentación y celdas; la distribución por ciclo está implementada en todas las materias y los cuatro cierres reutilizan un componente compartido entre ciclos, con datos independientes y firmas estáticas para papel. No quedan páginas reservadas: síntesis/promoción y registro administrativo están implementados con valores futuros y firmas estáticas. El usuario aprobó el diseño v1 completo. Se revisan ahora siete variantes con conceptos reales de la malla local, sin duplicar estilos. Queda definir el origen de datos anuales antes de integrar la emisión. En segundo ciclo, Ciencias Sociales y Ciencias Naturales reemplazan Conocimiento del Mundo; la referencia corregida confirma 14 hojas para segundo ciclo, frente a 13 para primero. La vista previa ya bifurca todas las materias y el índice por grado, conservando estilos y tablas compartidos. El mapa de materias y el desplazamiento de los cierres están documentados en la referencia canónica. La prueba visual académica en A4 está realizada; la exportación real sigue pendiente.

## Estado de calidad

La evolución de visado y malla anual está implementada y aplicada en PocketBase local y en el VPS. Se verificó en una base sintética aislada, sobre una copia de desarrollo local y sobre una copia consistente de la base del VPS. El despliegue remoto del 26 de septiembre de 2026 tiene el respaldo `/root/pb/deploy_backups/20260926-094932`. La generación dinámica del PDF sigue pendiente.

El 27 de septiembre de 2026, el pull request #6 integró en `master` el frontend compatible con el gateway curricular y el visado. Vercel publicó el nuevo bundle con los endpoints de etapas y revisión y la URL HTTPS del VPS; las rutas públicas y profundas respondieron correctamente. Antes de la fusión se confirmó que los seis hooks y las dos migraciones de esta evolución coincidían con el VPS, considerando los finales de línea de Windows, y que ambas migraciones constaban en su historial. No fue necesario reinstalar PocketBase ni reemplazar `pb_data`.

- `npm run lint`: sin errores ni advertencias al finalizar la modernización.
- `npm run build`: correcto.
- Advertencia conocida: el bundle principal supera 500 kB minificado; requiere una estrategia posterior de partición de código.
- La modernización UX/UI fue aprobada y fusionada en `master`.
- El workflow unidireccional fue validado sobre una copia aislada y desplegado; el servicio, el esquema de dos estados y la ausencia de rutas de retorno fueron verificados en el VPS.
- La recuperación cifrada y el modelo de llave única sin `activo` están desplegados; el índice de alcance y la retirada del endpoint de estado fueron verificados en el VPS.
- La protección optimista del gateway está desplegada en PocketBase con el respaldo `/root/pb/deploy_backups/20260916-085138`. La carrera aislada sobre una copia de `pb_data` confirmó un único guardado, rechazo `409` de la revisión vencida y recepción del evento Realtime. El frontend compatible está publicado en Vercel.
- El entorno PocketBase local está instalado, saneado y validado. Responde al health check, escucha sólo en loopback, autentica exclusivamente cuentas locales y carga los hooks y migraciones versionados del repositorio.
- La preparación del frontend para Vercel está versionada y validada: build productivo con URL explícita, rechazo de variable ausente o loopback, fallback SPA para rutas profundas y compatibilidad CORS confirmada contra el VPS.
- La cadena de migraciones incluye una baseline condicional anterior a la primera evolución incremental. Una base vacía puede reconstruirse con datos sintéticos mediante `deploy/setup-pocketbase-dev.ps1`; el backup local cifrado y la restauración autenticada también fueron probados de extremo a extremo.
- El primer contenedor real de recuperación local se creó en OneDrive y se verificó por SHA-256 el 20 de septiembre de 2026. La frase de recuperación no se guarda en el proyecto y queda bajo custodia personal.
- El formulario de contacto de la landing, el servicio SMTP de Gmail (puerto 587) y el endpoint seguro `/api/cys/contacto` fueron probados y configurados en desarrollo local y en el VPS de producción. Los scripts de despliegue `deploy/publish-pocketbase.ps1` y `deploy/apply-pocketbase-workflow.sh` incluyen la transferencia y verificación de los hooks de contacto.
- La landing institucional y la pantalla de acceso (`/login`) disponen de soporte responsive adaptado para pantallas móviles, con diseño renovado para los niveles educativos.
- La integración continua ejecuta instalación reproducible, auditoría de dependencias productivas, lint y build sobre `dev`, `master` y sus pull requests. Vercel construye y publica únicamente `master`; el build de Preview se omite para las demás ramas mientras no exista un backend de staging.
- La auditoría de dependencias no informa vulnerabilidades conocidas después de actualizar React Router a `7.18.4`, posterior a la corrección de seguridad `7.18.2`, y renovar las dependencias transitivas compatibles del lockfile.

Las operaciones destructivas o de escritura sobre datos escolares deben probarse con datos descartables y confirmación explícita del alcance.

La plantilla documental usa conceptos y PPI a 10 pt. Las consignas que no caben pasan automáticamente a 9 pt con espaciado compacto; los siete grados están verificados sin desbordes. Los casos que no quepan a 9 pt quedan marcados para revisión antes de la futura emisión. El detalle está en `docs/gradebook-pdf-template-spec.md`.

La estrategia de negocio de emisión PDF está propuesta en `docs/gradebook-pdf-emission.md`: instantánea y archivo protegido, invalidación vinculada al visado, eliminación del archivo invalidado y generación individual/por grado. No está implementada; las propuestas de elegibilidad y dependencias acumulativas deben acordarse antes de incorporar la interfaz.

La emisión individual sin esperar al curso completo está confirmada. La garantía acumulativa propuesta usa dependencias de visado por período y revalidación de descarga en servidor; no es firma digital ni implementación existente. Los períodos previos requeridos con visado faltante no se omitirán silenciosamente.

Primera etapa PDF aplicada sólo a desarrollo local: migración `1790553600_versioned_approval_authorization.js`, generación monotónica de visados y elegibilidad acumulativa en la respuesta de revisión. La UI informa visados completos o motivos de bloqueo y reconsulta ante eventos del curso. Esquema y scripts de promoción actualizados; VPS sin cambios. Motor, archivos e instantánea documental aún pendientes. Evidencia y respaldo en `docs/gradebook-pdf-emission.md`.

La lectura de preparación documental ya está implementada en desarrollo: GET de instantánea acumulativa, protegido y transaccional, sin persistencia. El usuario confirmó un tutor único; la lectura bloquea cero o varios responsables distintos. Devuelve datos académicos hasta el corte y huella, con pendientes explícitos de fuentes anuales. El contrato, servicio y adaptador a la plantilla de primer ciclo están implementados y verificados con una lectura local. Segundo ciclo se bloquea hasta cargar y validar su catálogo de concepto y número; el peso de escala no se imprime como nota. Conexión de la vista previa operativa, fuentes anuales, motor y almacenamiento siguen pendientes; VPS sin cambios. Detalle y pruebas en `docs/gradebook-pdf-emission.md`.

La vista previa individual ya está conectada a la instantánea local desde la revisión directiva. Reutiliza la plantilla mediante carga diferida, consulta cada apertura, muestra bloqueos y pendientes y se desmonta al cambiar el alcance o la versión del workflow del curso. Verificada con 13 páginas de primer ciclo y manejo de error/reintento; segundo ciclo conserva su bloqueo por escala pendiente. La generación y el almacenamiento PDF siguen pendientes. Procedimiento y evidencia en `docs/gradebook-pdf-emission.md`.

Prueba local Chromium de PDF completada con muestras de ambos ciclos: 13/14 páginas A4; helper reproducible en `deploy/probe-document-pdf.cjs`, sin nuevas dependencias productivas. Aviso anual oculto durante bimestres 1–3. Archivos experimentales fuera del repositorio; aún no hay worker productivo, almacenamiento ni descarga vigente. Evidencia y límites en `docs/gradebook-pdf-emission.md`.

La vista previa local incorpora «Generar PDF de prueba»: el servidor de desarrollo obtiene una instantánea autenticada, renderiza la plantilla con Edge y revalida su huella y visados antes de descargar. No persiste archivos ni sustituye la emisión vigente pendiente. Sólo desarrollo; dependencias Playwright y pdf-lib de desarrollo. Contrato, pruebas y límites en `docs/gradebook-pdf-emission.md`.

Los tres campos de apoyos/integración de la página 3 ya tienen fuente en `inscripciones`: apoyos y detalle desde primer bimestre, promoción con acompañamiento sólo en cuarto. No deben confundirse con las fuentes pendientes de la hoja anual de síntesis/promoción. El adaptador conserva la semántica anual y omite el detalle no aplicable cuando apoyos es NO; los valores realmente no especificados permanecen sin dato.

Emisión individual persistida en desarrollo: `emisiones_boletin` almacena PDF protegido, instantánea y dependencias. El generador local publica con sesión institucional más secreto de worker; el gateway revalida antes de publicar y descargar. Retiro/corrección revoca emisiones acumulativas transaccionalmente y borra la instantánea; una tarea reintenta el borrado físico. Descargas repetidas reutilizan bytes. Migración local `1790625600_document_emissions.js`; VPS sin cambios. Worker desplegable, cola, lotes y pruebas de recuperación de almacenamiento siguen pendientes. Contrato operativo en `docs/gradebook-pdf-emission.md`.


## Emisión por curso y ZIP implementados en desarrollo

La revisión institucional incorpora «Generar PDFs / ZIP del curso». Consulta los visados actuales, prepara secuencialmente los PDFs individuales y expone las exclusiones por alumno; permite descargar juntos los preparados aunque el grado tenga revisiones pendientes. El ZIP se arma en memoria a partir de emisiones persistidas y protegidas, revalidando huella, curso y versión antes de entregar. Los nombres coincidentes reciben sufijos para no sobrescribirse al extraer. Cerrar interrumpe la preparación del cliente; reintentar reutiliza las emisiones vigentes. No hay cola durable de lotes.

El contrato completo y el procedimiento de prueba están en `gradebook-pdf-emission.md`. No se agregaron colecciones ni hooks y no se modificó producción. Generación individual y masiva siguen dependiendo del motor local Vite; el despliegue productivo, segundo ciclo real y fuentes de cierre anual continúan pendientes. Validación: lint, build, 13 pruebas automatizadas y descarga real de un ZIP de dos boletines de 13 páginas, con exclusiones explícitas de tres alumnos sin visado.


## Segundo ciclo documental habilitado

El adaptador admite las etiquetas de segundo ciclo con número explícito 1–10 y concepto, independientemente del peso de orden. La malla utiliza 11 materias y genera 14 páginas A4; conserva el diseño de número en línea separada. Los cuatro cursos 4.º–7.º quedaron vinculados a la escala nueva en desarrollo con autorización del usuario. Las notas previas no se convirtieron: el usuario las recargará para realizar la prueba operativa con visados reales. «No corresponde» sin número está soportado cuando se agregue al catálogo. Pasan 15 pruebas automatizadas, incluida generación Edge de segundo ciclo; continúan pendientes las fuentes anuales y el motor en producción. Detalles en `gradebook-pdf-emission.md`.


## Estado de publicacion PDF (29 de septiembre de 2026)

La elegibilidad acumulativa, instantaneas y almacenamiento protegido estan desplegados en PocketBase productivo. El generador Node/Chromium corre como servicio independiente `cys-pdf` en el VPS; Caddy publica las rutas PDF con sesion y origen permitido. Los botones individual y ZIP se habilitan tambien en el build productivo. Desarrollo y produccion comparten plantilla, adaptador y middleware. La migracion de catalogo de segundo ciclo se aplico en ambos entornos sin copiar datos operativos. Las fuentes anuales siguen pendientes. El procedimiento, respaldo y verificaciones quedan en `gradebook-pdf-emission.md`; la publicacion del frontend se realiza mediante PR dev -> master.

## Ingesta y consolidación del dataset de estudiantes (29 de septiembre de 2026)

Se adaptó el modelo de datos para centralizar el contacto familiar en `responsables` (desdoblando `dni_tipo` y `dni_numero`, eliminando `alumnos.telefono` e incorporando `alumnos.localidad`). El vínculo en `alumno_responable` prioriza 'Padre' como valor por defecto. La ingesta masiva desde Google Sheets consolida los registros históricos y mid-cycle de 2026 mediante un pipeline determinístico con modo dry-run y execute (`scripts/ingest-students.mjs`). El procedimiento operativo, reglas de sanitización y trazabilidad relacional están documentados canónicamente en `docs/student-dataset-ingestion.md`.

## Paginación y filtrado server-side en Directorio de Alumnos (30 de septiembre de 2026)

El Directorio de Alumnos (`/app/alumnos`) implementa paginación server-side de 50 registros por página, resolviendo la desconexión previa donde los filtros de grado y estado se aplicaban en memoria sobre el primer segmento devuelto:
- `alumnoService.getList` compone consultas de filtrado sobre PocketBase combinando búsqueda textual multi-término, relación inversa de curso (`inscripciones_via_alumno_id.curso_id.nombre ~ "${grade}°"`) y condición de cursada (`inscripciones_via_alumno_id.estado`).
- Las métricas de cabecera (`regulares`, `bajas`, `total`) se computan en paralelo en el servidor mediante `alumnoService.getCounts` con proyección mínima (`fields: 'id'`), reflejando la totalidad escolar o el subconjunto acotado por grado y búsqueda activa.
- La navegación por páginas se reinicia a 1 ante cualquier cambio en los filtros de búsqueda, grado o estado.
- La paginación y el resumen de registros totales aplican de forma consistente tanto en la vista de Tabla como en la vista de Tarjetas (Grid).



La UX de PDFs muestra la disponibilidad para descargar: el modal del curso inicia la obtención automáticamente al abrirse y permite Actualizar PDFs, informa PDF listo o Falta visar, sin columna Detalle ni distinción entre archivos nuevos y reutilizados. El resumen cuenta los PDFs listos; Descargar PDFs tiene actividad independiente y entrega un archivo ZIP. La descarga individual informa sólo el inicio de descarga. El worker obtiene el resultado real del publicador y lo transmite en X-CYS-PDF-Result, sin inferencias por duración. Los endpoints y controles de vigencia permanecen iguales.


## Dominio institucional vigente

El frontend principal es https://www.creceryser.edu.ar; el dominio raíz redirige mediante 308 y el alias anterior de Vercel continúa accesible. PocketBase conserva su origen alumnos-api.duckdns.org. El worker PDF autoriza ambos dominios institucionales y el alias de Vercel; deploy/configure-pdf-origins.py permite actualizar la lista con respaldo y rollback sin modificar claves ni datos académicos. Los enlaces docentes se construyen con el origen actual y las sesiones institucionales son independientes por dominio. El procedimiento y la auditoría de correo se documentan en docs/vercel-deployment.md.

## Continuación operativa del 4 de octubre

La inscripción de alta tardía de segundo grado ya está confirmada B2–B4 y la nómina de B2 tiene diez alumnos; B1 conserva diez visados y B2 sigue sin evaluaciones. El fallo de preservación de datos en el formulario segmentado de alumnos (`AlumnoFormModal.tsx` y `AlumnoList.tsx`) fue resuelto: montaje garantizado con `forceRender: true` en todas las pestañas, fusión completa de campos y salvaguarda estricta de preservación de valores preexistentes ante campos omitidos. Se expuso el estado de cursada evaluable en el modelo `Alumno` y se incorporaron insignias de estado en el listado y fichas de estudiantes. Todas las suites automatizadas de pruebas (`test-evaluable-scope-http.cjs`, `test-document-adapter.cjs`, `test-batch-modal.cjs`, `test-school-calendar-dates.cjs`) fueron verificadas con éxito. Detalle canónico en `docs/salvaguardas-continuacion.md`.

## Registro administrativo y cambios de escuela (Página 14 del boletín) — 6 de octubre de 2026

Se implementó el soporte completo de registro administrativo y cambios de escuela en la cursada del alumno:
- Migración `pb_migrations/1790860000_school_transfer_and_administrative_records.js` añade en `inscripciones` los campos: `escuela_inicial` (text), `fecha_ingreso_inicial` (date), `fecha_egreso_inicial` (date), `cambios_escuela` (json) y `cambio_domicilio` (text). El esquema canónico `pb_schema.json` fue actualizado.
- El gateway de PocketBase (`pb_hooks/lib/teacherAccess.js`) gestiona la serialización y persistencia de pases (`transferRecords`), incluye los campos en la instantánea documental y en la consulta de cursada, e invalida la caché de PDFs emitidos al modificarse los datos de cursada.
- Guarda de integridad para PDF (`documentDataIssues`): los alumnos con cursadas parciales (`desde > 1` o `hasta < 4`) exigen escuela de origen y registro de pase válido antes de permitir la emisión del boletín, previniendo documentos impresos incompletos.
- Adaptador y render de plantilla (`documentSnapshot.adapter.ts`, `TermClosingPage.tsx`, `AnnualPages.tsx`):
  - Observaciones bimestrales: unifica el renderizado de `---` de forma centrada (horizontal y verticalmente) tanto para bimestres futuros por plantilla como para cierres confirmados con observaciones vacías.
  - Síntesis Conceptual: centra `---` vertical y horizontalmente cuando el campo no posee texto confirmado.
  - Registro administrativo (Página 14): rellena sistemáticamente con `---` todos los campos no informados (escuela inicial, fechas, pases, domicilio, teléfono) para resguardar la integridad del documento oficial e impedir agregados manuales en papel.
- Experiencia directiva: `CursadaModal` incorpora campos administrativos y lista dinámica de pases (hasta 4) con panel desplegable reactivo. `DocumentReadinessAlert` provee el botón de acceso directo "Completar cursada y pases" para editar y resolver faltantes sin salir de la revisión del boletín. `AlumnoDetailModal` visualiza el resumen de pases y escuela de origen en la pestaña de cursada.
