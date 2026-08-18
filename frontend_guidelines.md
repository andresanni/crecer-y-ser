# Guidelines de Frontend: Sistema "Crecer y Ser"

## 1. Stack Tecnológico
*   **Framework:** React 18 / 19 + Vite.
*   **Lenguaje:** TypeScript (Tipado estricto obligatorio).
*   **UI Framework:** Ant Design (ANTD). Priorizar componentes nativos (Table, Form, Modal, Typography).
*   **State Management:** Zustand para estado global.
*   **Routing:** React Router v7.
*   **Backend / BaaS:** PocketBase SDK (`pocketbase` npm package).
    *   URL del servidor: `https://alumnos-api.duckdns.org`
    *   **Esquema de Base de Datos:** Archivo [`pb_schema.json`](file:///c:/Users/andyg/OneDrive/Documents/crecer-y-ser/pb_schema.json) en la raíz del proyecto. Este archivo es la **fuente de verdad** para conocer colecciones, campos, tipos, reglas de acceso (`listRule`, etc.) y relaciones `expand`.

## 2. Arquitectura y Patrones de Diseño
*   **Vertical Slicing:** El código se organiza por dominio/módulo (ej: `/modules/alumnos`, `/modules/inscripciones`), no por tipo de archivo. Cada módulo contiene sus componentes, servicios y modelos.
*   **Coherencia con `pb_schema.json` & Patrón Adaptador:**
    *   El modelo `*Record` refleja los campos exactos de PocketBase (`snake_case`, IDs de relaciones, `created`, `updated`).
    *   El modelo de dominio frontend (`camelCase`) se usa en componentes y estado de UI.
    *   Cada módulo debe implementar su adaptador (ej: `alumnoAdapter`) para transformar registros `*Record` a entidades de dominio.
*   **Conexión Directa:** No existe un servidor Node.js intermedio. Los servicios consumen directamente el cliente centralizado [`pocketbase.ts`](file:///c:/Users/andyg/OneDrive/Documents/crecer-y-ser/src/core/pocketbase.ts).

## 3. Mapa de Colecciones (PocketBase) - Fuente de Verdad: `pb_schema.json`

### 👤 Usuarios y Autenticación
*   **`users`**: Autenticación del sistema escolar.

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
    *   `inasistencias_justificadas` (*number*)
    *   `inasistencias_injustificadas` (*number*)
    *   `observaciones` (*text*)

## 4. Módulo Actual en Desarrollo
*   **Dominio:** `Alumnos`, `Inscripciones` y `Boletines`.
*   **Objetivo:** Gestión completa de estudiantes, configuración curricular de cursos/materias y carga/generación del Boletín Oficial de Calificaciones.
