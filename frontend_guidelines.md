# Guidelines de Frontend: Sistema "Crecer y Ser"

## 1. Stack Tecnológico
*   **Framework:** React 19 + Vite 8.
*   **Lenguaje:** TypeScript (Tipado estricto obligatorio).
*   **UI Framework:** Ant Design (ANTD). Priorizar componentes nativos (Table, Form, Modal, Typography).
*   **Layouts de la aplicación:** `MainLayout` es exclusivamente el shell global de `/app` (navegación, barra superior y área de rutas). Toda pantalla operativa renderizada dentro de ese shell debe usar `SectionLayout`, pasando `title`, `icon` y, cuando corresponda, `actions`; este componente centraliza el encabezado compacto y la separación con el contenido. Los encabezados de sección no llevan subtítulo descriptivo. No recrear esos márgenes ni renderizar `PageHeader` directamente desde cada módulo.
*   **Formularios modales:** Usar `FormModal` como marco visual y `FormModalSteps` cuando el flujo sea secuencial. Cada módulo conserva sus campos y grillas adaptativas, pero no redefine header, altura, scroll, footer ni estados visuales de las etapas.
*   **State Management:** Zustand para estado global.
*   **Carga de boletines:** La vista institucional y la ruta por enlace mágico comparten `VistaPorAlumno`. Las diferencias de alcance se expresan mediante `GradebookAccessPolicy` y `GradebookDataSource`; no duplicar el editor ni dispersar verificaciones de ruta o sesión dentro de sus controles. El origen institucional lee colecciones autenticadas y escribe únicamente mediante `/api/cys/directivo/*`; el origen docente usa únicamente `/api/cys/docente/*`. El editor institucional sólo se monta en `CONTROL_DIRECTIVO`.
*   **Routing:** React Router v7.
*   **Backend / BaaS:** PocketBase SDK (`pocketbase` npm package).
    *   URL del servidor: `https://alumnos-api.duckdns.org`
    *   **Esquema de Base de Datos:** `pb_migrations/` es la evolución ejecutable y versionada. `pb_schema.json` es el snapshot legible derivado para consultar colecciones, campos, reglas de acceso y relaciones `expand`; no se despliega editándolo manualmente.

## 2. Arquitectura y Patrones de Diseño
*   **Vertical Slicing:** El código se organiza por dominio/módulo (ej: `/modules/alumnos`, `/modules/inscripciones`), no por tipo de archivo. Cada módulo contiene sus componentes, servicios y modelos.
*   **Coherencia con `pb_schema.json` & Patrón Adaptador:**
    *   El modelo `*Record` refleja los campos exactos de PocketBase (`snake_case`, IDs de relaciones, `created`, `updated`).
    *   El modelo de dominio frontend (`camelCase`) se usa en componentes y estado de UI.
    *   Cada módulo debe implementar su adaptador (ej: `alumnoAdapter`) para transformar registros `*Record` a entidades de dominio.
*   **Conexión PocketBase:** No existe un servidor Node.js intermedio. Las pantallas institucionales consumen colecciones autenticadas mediante `src/core/pocketbase.ts`. La carga docente consume sólo el gateway versionado en `pb_hooks`; su contrato está en `docs/pocketbase-api.md`.
*   **Workflow de boletines:** Existe una sola instancia por curso y período. `BORRADOR_DOCENTE` habilita únicamente al enlace; `CONTROL_DIRECTIVO` habilita únicamente a la sesión institucional; `CERRADO` inmoviliza la carga. No montar el editor fuera del estado autorizado ni reintentar automáticamente una escritura rechazada con `401` o `403`.
*   **Completitud:** Una materia académica requiere calificación general y todos sus criterios. Una materia formativa identificada como conducta requiere todos sus criterios, pero no calificación general. El servidor es la autoridad final para aceptar el envío completo.
*   **Enlaces docentes:** Siempre abarcan el curso y período completos. Emisión, rotación y devolución deben mostrar el enlace una sola vez aunque falle el portapapeles; no registrar ni persistir el secreto completo en el frontend.
*   **Documentación del código:** No agregar comentarios en TypeScript, TSX, JavaScript, CSS, HTML o configuración. Usar nombres expresivos y registrar decisiones arquitectónicas duraderas en `docs/`.

## 3. Mapa de Colecciones (PocketBase) - Fuente de Verdad: `pb_schema.json`

### 👤 Usuarios y Autenticación
*   **`users`**: Autenticación del sistema escolar.
*   **`tokens_acceso_docente`**: Credenciales temporales para docentes sin cuenta (`token`, `token_hash`, `token_prefijo`, `curso_id`, `periodo_id`, `docente_nombre`, `activo`, `fecha_expiracion`). Cada enlace abarca un curso y período completos. `materia_id` permanece físicamente durante una transición de esquema, pero no forma parte del contrato y cualquier registro legado que lo informe es rechazado. Los enlaces nuevos conservan sólo el hash del secreto; `token` permanece durante la transición por compatibilidad de esquema y contiene también el hash en los registros nuevos.
*   **`instancias_carga_boletin`**: Workflow único por curso y período (`curso_id`, `periodo_id`, `estado`, `revision`, `enviado_at`, `enviado_por`, `cerrado_at`, `cerrado_por`). Sus estados son `BORRADOR_DOCENTE`, `CONTROL_DIRECTIVO` y `CERRADO`; el cliente sólo puede leerlo y las transiciones se ejecutan en el gateway.

### 🏛️ Estructura Institucional y Académica
*   **`ciclos_lectivos`**: Años lectivos (`ano`, `actual`).
*   **`niveles`**: Niveles escolares (`nombre`).
*   **`escalas_calificacion`**: Escalas de evaluación configuradas (`nombre`).
*   **`valores_escala`**: Ítems de cada escala (`escala_id`, `peso_numerico`, `etiqueta`, `orden_visual`).
*   **`cursos`**: Divisiones (`nombre`, `nivel_id`, `escala_id`, `turno`: *Mañana* | *Tarde* | *Jornada Completa*).
*   **`materias`**: Catálogo general de asignaturas (`nombre`).
*   **`periodos`**: Bimestres por ciclo lectivo (`ciclo_id`, `nombre`, `numero_periodo`).
*   **`curso_materias`**: Malla curricular asignada a cada curso (`curso_id`, `materia_id`, `orden_visual`).
*   **`criterios_evaluacion`**: Los 5 conceptos pedagógicos configurados por materia (`curso_materia_id`, `nombre`, `orden_visual`).

### 👨‍👩‍👧 Alumnos, Familias e Inscripciones
*   **`alumnos`**: Estudiantes (`numero_legajo`, `dni`, `apellidos`, `nombres`, `fecha_nacimiento`, `nacionalidad`, `sexo`, `telefono`, `domicilio`, `usuario_acadeu`, `clave_acadeu`).
*   **`responsables`**: Padres/tutores (`dni`, `apellidos`, `nombres`, `nacionalidad`, `profesion`, `telefono`, `email`).
*   **`alumno_responable`**: Vínculo M:N entre estudiante y tutor (`alumno_id`, `responsable_id`, `vinculo`).
*   **`inscripciones`**: Matrícula anual (`alumno_id`, `curso_id`, `ciclo_id`, `numero_orden`, `numero_inscripcion`, `fecha_inscripcion`, `fecha_ingreso`, `fecha_egreso`, `estado`: *Regular* | *Libre* | *Baja*, `promociono_con_acompanamiento`: *SI* | *NO* | *-*, `posee_apoyos`: *SI* | *NO* | *-*, `cuales_apoyos`: *text*).

### 📝 Evaluaciones y Cierres Bimestrales (Boletines)
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

## 4. Estado Actual
*   **Dominios activos:** `Alumnos`, `Responsables`, `Inscripciones`, `Boletines` y `Auth`.
*   **UX/UI:** Modernización aprobada y fusionada en `master`; conservar la arquitectura centralizada documentada en `docs/ux-modernization.md`.
*   **Calidad:** `npm run lint` y `npm run build` son obligatorios antes de integrar cambios.
