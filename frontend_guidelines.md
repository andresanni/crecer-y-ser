# Guidelines de Frontend: Sistema "Crecer y Ser"

## 1. Stack Tecnológico
*   **Framework:** React 19 + Vite 8.
*   **Lenguaje:** TypeScript (Tipado estricto obligatorio).
*   **UI Framework:** Ant Design (ANTD). Priorizar componentes nativos (Table, Form, Modal, Typography).
*   **Layouts de la aplicación:** `MainLayout` es exclusivamente el shell global de `/app` (navegación, barra superior y área de rutas). Toda pantalla operativa renderizada dentro de ese shell debe usar `SectionLayout`, pasando `title`, `icon` y, cuando corresponda, `actions`; este componente centraliza el encabezado compacto y la separación con el contenido. Los encabezados de sección no llevan subtítulo descriptivo. No recrear esos márgenes ni renderizar `PageHeader` directamente desde cada módulo.
*   **Formularios modales:** Usar `FormModal` como marco visual y `FormModalSteps` cuando el flujo sea secuencial. Cada módulo conserva sus campos y grillas adaptativas, pero no redefine header, altura, scroll, footer ni estados visuales de las etapas.
*   **State Management:** Zustand para estado global.
*   **Carga de boletines:** La vista institucional y la ruta por enlace mágico comparten `VistaPorAlumno`. Las diferencias de alcance se expresan mediante `GradebookAccessPolicy` y `GradebookDataSource`; no duplicar el editor ni dispersar verificaciones de ruta o sesión dentro de sus controles. El origen institucional lee colecciones autenticadas y escribe únicamente mediante `/api/cys/directivo/*`; el origen docente usa únicamente `/api/cys/docente/*`. El editor institucional sólo se monta en `CONTROL_DIRECTIVO`. Los cursos de Nivel Inicial no participan de boletines.
*   **Entrada institucional de boletines:** `Boletines` es sólo un desplegable del menú; abrirlo o cerrarlo no navega ni cambia el área de trabajo. Las subsecciones `Bimestres` y `Constructor` son las entradas navegables. No recrear la portada de atajos; `/app/boletines` conserva una redirección a Bimestres. `Bimestres` reúne la selección del período y el único tablero de seguimiento y operación por curso. No recrear una sección separada de monitoreo; cada curso debe conducir al tratamiento que corresponda según su instancia.
*   **Revisión directiva:** En `CONTROL_DIRECTIVO`, las respuestas se presentan como texto informativo por defecto. Cada materia habilita sus propios controles mediante `Editar` y conserva `Guardar` y `Descartar` dentro de la misma tarjeta. Sólo una materia puede editarse por vez y no se puede cambiar de alumno dejando modificaciones pendientes.
*   **Routing:** React Router v7.
*   **Backend / BaaS:** PocketBase SDK (`pocketbase` npm package).
    *   Desarrollo: `http://127.0.0.1:8090`, definido mediante `.env.development.local` y nunca versionado.
    *   Producción: frontend estático en Vercel y PocketBase en `https://alumnos-api.duckdns.org`, definido mediante `VITE_POCKETBASE_URL` sólo para el entorno Production.
    *   El cliente no tiene fallback de URL. Los Preview Deployments permanecen sin acceso a PocketBase hasta disponer de un backend de staging con datos sintéticos.
    *   **Esquema de Base de Datos:** `pb_migrations/` es la evolución ejecutable y versionada. `pb_schema.json` es el snapshot legible derivado para consultar colecciones, campos, reglas de acceso y relaciones `expand`; no se despliega editándolo manualmente.

## 2. Arquitectura y Patrones de Diseño
*   **Vertical Slicing:** El código se organiza por dominio/módulo (ej: `/modules/alumnos`, `/modules/inscripciones`), no por tipo de archivo. Cada módulo contiene sus componentes, servicios y modelos.
*   **Coherencia con `pb_schema.json` & Patrón Adaptador:**
    *   El modelo `*Record` refleja los campos exactos de PocketBase (`snake_case`, IDs de relaciones, `created`, `updated`).
    *   El modelo de dominio frontend (`camelCase`) se usa en componentes y estado de UI.
    *   Cada módulo debe implementar su adaptador (ej: `alumnoAdapter`, `inscripcionAdapter`) para transformar registros `*Record` a entidades de dominio.
*   **Conexión PocketBase:** Las operaciones académicas pertenecen a PocketBase. El generador PDF es un servicio Node/Chromium separado en el VPS, sin escrituras académicas y con publicación mediante el gateway protegido. Las pantallas institucionales consumen colecciones autenticadas mediante `src/core/pocketbase.ts`. La carga docente consume sólo el gateway versionado en `pb_hooks`; su contrato está en `docs/pocketbase-api.md`.
*   **Separación de entornos:** El desarrollo cotidiano usa exclusivamente la instancia local saneada. Esquema, reglas y lógica se promueven mediante `pb_migrations` y `pb_hooks`; nunca se copia `pb_data` local al VPS. El flujo completo está en `docs/pocketbase-environments.md`.
*   **Workflow de boletines:** Existe una sola instancia por curso y período. `BORRADOR_DOCENTE` habilita únicamente al enlace y `CONTROL_DIRECTIVO` es el estado terminal que habilita únicamente a la sesión institucional. El traspaso es unidireccional: nunca devolver una entrega a la docente ni emitir una nueva llave después del envío. No montar el editor fuera del estado autorizado ni reintentar automáticamente una escritura rechazada con `401` o `403`. Cursos sin escala de calificación quedan expresamente excluidos de este workflow.
*   **Configuración anual:** `curso_materias` pertenece a un ciclo lectivo. Materias, orden y criterios se escriben sólo mediante `/api/cys/directivo/configuracion/*` y quedan cerrados para el curso y ciclo al iniciar un bimestre. El gateway de emisión valida que cada materia tenga cinco criterios y que la escala del curso tenga valores.
*   **Visado individual:** `visados_boletin` conserva una fila por alumno entregado. Sólo dirección puede visar o retirar el visado mediante gateway, con la revisión del curso y la revisión de contenido del alumno como precondiciones. Una corrección directiva invalida automáticamente el visado de ese alumno. `LISTO_PARA_PDF` es una proyección del backend, no un tercer estado persistido de `instancias_carga_boletin`.
*   **Estado del tablero:** La etapa operativa proviene de `/api/cys/directivo/etapas/:periodoId`. Los porcentajes representan avance académico y no determinan permisos, entregas ni visados. Un borrador sin llave se presenta como carga pausada y puede reanudarse sin descartar el trabajo previo.
*   **Concurrencia institucional:** Toda corrección directiva obtiene datos editables y `revision` desde una misma instantánea autoritativa y envía esa versión como `expectedRevision`. PocketBase la compara dentro de la transacción y responde `409` sin escrituras cuando quedó vencida. Realtime sólo invalida vistas; Zustand conserva revisiones monotónicas e invalidaciones, no reemplaza la autoridad del servidor ni asigna una revisión nueva a datos anteriores. Los formularios con cambios pendientes nunca se refrescan silenciosamente ni reintentan un conflicto o un resultado de red incierto. El patrón reusable está en `docs/concurrency-model.md`.
*   **Completitud:** Una materia académica requiere calificación general y todos sus criterios. Una materia formativa identificada como conducta requiere todos sus criterios, pero no calificación general. El servidor es la autoridad final para aceptar el envío completo.
*   **Enlaces docentes:** Siempre abarcan el curso y período completos. No tienen estado activo/inactivo y sólo puede existir uno por curso y período. Los enlaces vigentes pueden recuperarse sólo mediante el gateway institucional autenticado; regenerar reemplaza el secreto anterior y eliminar conserva el borrador sin acceso docente. El frontend mantiene el secreto únicamente en memoria durante la acción de copiar o compartir y nunca lo persiste ni lo registra.
*   **Documentación del código:** No agregar comentarios en TypeScript, TSX, JavaScript, CSS, HTML o configuración. Usar nombres expresivos y registrar decisiones arquitectónicas duraderas en `docs/`.

## 3. Tipos y Convenciones de UI para Nivel Inicial y Primario

### Tipos de Nivel y Cursos (`src/modules/alumnos/utils/gradeColors.ts`)
*   **`SchoolLevelFilter`**: `'all' | 'inicial' | 'primario'`. Define el filtro de nivel escolar en la cabecera del Directorio de Alumnos.
*   **`GradeNumber`**: `1 | 2 | 3 | 4 | 5 | 6 | 7`. Grados de Nivel Primario.
*   **`KindergartenRoomKey`**: `'sala_2_3' | 'sala_4_5'`. Claves de las dos salas multiedad de Nivel Inicial.
*   **`CourseFilterKey`**: `GradeNumber | KindergartenRoomKey`. Unión unificada para seleccionar y filtrar cursos y salas.
*   **`ModalidadJornada`**: `'Mañana' | 'Tarde' | 'Jornada Completa'` (`src/modules/inscripciones/models/inscripcion.model.ts`). Modela el régimen de jornada de la matrícula escolar.

### Convenciones de UI para Selección e Insignias
*   **Selector de Nivel (`AlumnoFilters.tsx`)**: Se implementa mediante el componente `Segmented` de Ant Design (`Todos`, `Inicial`, `Primario`), ubicado antes de la búsqueda textual.
    *   Al conmutar a `Inicial`, el selector de cursos se ajusta a `Todas las salas`, `Sala de 2 y 3 años` y `Sala de 4 y 5 años`.
    *   Al conmutar a `Primario`, el selector ofrece `Todos los grados` y las opciones de `1° Grado` a `7° Grado`.
    *   Al conmutar a `Todos`, ofrece la lista combinada ordenada pedagógicamente (Salas primero, Grados después).
*   **Insignias de Salas de Nivel Inicial (`KINDERGARTEN_PALETTE`)**:
    *   `sala_2_3` (*Sala de 2 y 3 años*): Texto `#c2410c`, fondo `rgba(194, 65, 12, 0.12)`, borde `rgba(194, 65, 12, 0.38)`, preset `orange`. Etiqueta compacta: *2 y 3*.
    *   `sala_4_5` (*Sala de 4 y 5 años*): Texto `#0f766e`, fondo `rgba(15, 118, 110, 0.12)`, borde `rgba(15, 118, 110, 0.38)`, preset `cyan`. Etiqueta compacta: *4 y 5*.
*   **Ordenamiento visual (`compareGrados`)**: Salas de jardín tienen pesos 0 (`sala_2_3`) y 1 (`sala_4_5`), seguidas de los grados primarios (peso `grado + 1`), garantizando consistencia en tablas, tarjetas y selectores.
*   **Doble tutor familiar**: Tanto el modal de formulario (`AlumnoFormModal`) como el de detalle (`AlumnoDetailModal`) soportan dos responsables por estudiante con validación de identidad no coincidente.

## 4. Mapa de Colecciones (PocketBase) - Fuente de Verdad: `pb_schema.json`

### 👤 Usuarios y Autenticación
*   **`users`**: Autenticación del sistema escolar.
*   **`tokens_acceso_docente`**: Llaves descartables para docentes sin cuenta (`token`, `token_hash`, `token_prefijo`, `token_cifrado`, `curso_id`, `periodo_id`, `docente_nombre`). Cada enlace abarca un curso y período completos; un índice único impide más de una llave por alcance.
*   **`instancias_carga_boletin`**: Workflow único por curso y período (`curso_id`, `periodo_id`, `estado`, `revision`, `enviado_at`, `enviado_por`). Sus estados son `BORRADOR_DOCENTE` y `CONTROL_DIRECTIVO`. Aplica únicamente a cursos con escala configurada.

### 🏛️ Estructura Institucional y Académica
*   **`ciclos_lectivos`**: Años lectivos (`ano`, `actual`).
*   **`niveles`**: Niveles escolares (`nombre`: *Inicial* | *Primario*).
*   **`escalas_calificacion`**: Escalas de evaluación configuradas (`nombre`).
*   **`valores_escala`**: Ítems de cada escala (`escala_id`, `peso_numerico`, `etiqueta`, `orden_visual`).
*   **`cursos`**: Divisiones y salas (`nombre`, `nivel_id`, `escala_id`, `turno`: *Mañana* | *Tarde* | *Jornada Completa*, `orden`: *number*).
    *   Salas de Inicial: `Sala de 2 y 3 años` (`orden: 2`) y `Sala de 4 y 5 años` (`orden: 4`), ambas con `escala_id` vacío.
    *   Grados de Primaria: `1°` a `7°` (`orden: 11` a `17`), asociados a escala institucional.
*   **`materias`**: Catálogo general de asignaturas (`nombre`).
*   **`periodos`**: Bimestres por ciclo lectivo (`ciclo_id`, `nombre`, `numero_periodo`).
*   **`curso_materias`**: Malla curricular asignada a cada curso (`curso_id`, `materia_id`, `orden_visual`).
*   **`criterios_evaluacion`**: Los 5 conceptos pedagógicos configurados por materia (`curso_materia_id`, `nombre`, `orden_visual`).

### 👨‍👩‍👧 Alumnos, Familias e Inscripciones
*   **`alumnos`**: Estudiantes (`numero_legajo`, `dni`, `apellidos`, `nombres`, `fecha_nacimiento`, `nacionalidad`, `sexo`, `domicilio`, `localidad`, `usuario_acadeu`, `clave_acadeu`). `dni` y `numero_legajo` son opcionales para admitir inscripciones de Inicial en trámite.
*   **`responsables`**: Padres/tutores (`dni_tipo`, `dni_numero`, `apellidos`, `nombres`, `nacionalidad`, `profesion`, `telefono`, `email`).
*   **`alumno_responable`**: Vínculo M:N entre estudiante y tutor (`alumno_id`, `responsable_id`, `vinculo`). Admite asociar hasta dos tutores activos por estudiante ('Padre', 'Madre', 'Tutor', etc.).
*   **`inscripciones`**: Matrícula anual (`alumno_id`, `curso_id`, `ciclo_id`, `numero_orden`, `numero_inscripcion`, `fecha_inscripcion`, `fecha_ingreso`, `fecha_egreso`, `estado`: *Regular* | *Libre* | *Baja*, `modalidad_jornada`: *Mañana* | *Tarde* | *Jornada Completa*, `promociono_con_acompanamiento`: *SI* | *NO* | *-*, `posee_apoyos`: *SI* | *NO* | *-*, `cuales_apoyos`: *text*).

### 📝 Evaluaciones y Cierres Bimestrales (Boletines de Primaria)
*   **`evaluaciones_materia`**: Cierre de materia por bimestre para un alumno:
    *   `inscripcion_id` $\rightarrow$ `inscripciones`
    *   `curso_materia_id` $\rightarrow$ `curso_materias`
    *   `periodo_id` $\rightarrow$ `periodos`
    *   `ppi` (*bool*: true/false)
    *   `calificacion_general_id` $\rightarrow$ `valores_escala`
*   **`evaluaciones_criterios`**: Evaluación de cada uno de los conceptos de la materia:
    *   `evaluacion_materia_id` $\rightarrow$ `evaluaciones_materia`
    *   `criterio_id` $\rightarrow$ `criterios_evaluacion`
    *   `valor_escala_id` $\rightarrow$ `valores_escala`
*   **`cierres_periodo_alumno`**: Asistencias y observaciones globales del bimestre:
    *   `inscripcion_id` $\rightarrow$ `inscripciones`
    *   `periodo_id` $\rightarrow$ `periodos`
    *   `asistencias` (*number*)
    *   `inasistencias` (*number*)
    *   `llegadas_tarde` (*number*)
    *   `observaciones` (*text*)

## 5. Estado Actual
*   **Dominios activos:** `Alumnos`, `Responsables`, `Inscripciones`, `Boletines`, `Informes` y `Auth`.
*   **Niveles soportados:** `Nivel Inicial` (salas multiedad) y `Nivel Primario` (1.° a 7.° grado).
*   **UX/UI:** Modernización aprobada y fusionada en `master`; conservar la arquitectura centralizada documentada en `docs/ux-modernization.md`.
*   **Calidad:** `npm run lint` y `npm run build` son obligatorios antes de integrar cambios.
