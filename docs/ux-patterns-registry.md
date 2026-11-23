# Registro de Arquetipos UX y Gobernanza de Paridad

Actualizado: 23 de noviembre de 2026.

## 1. Propósito

A medida que Crecer y Ser incorpora dominios con dinámicas operativas hermanas —en particular **Boletines de Primaria** y los tres ciclos de **Informes de Maestras** (`CICLO_FINAL`, `PRIMER_CUATRIMESTRE`, `PRIMER_BIMESTRE`), además de **Asistencias**— el código fuente conserva separación por dominio (*Vertical Slicing*), pero **el usuario debe percibir un único sistema coherente**.

Este documento es la fuente de verdad compartida entre desarrolladores y agentes para:

1. **Declarar vínculos fuertes de UX** entre pantallas que no comparten código fuente pero sí comparten dinámica de usuario.
2. **Evitar la deriva visual ("efecto Frankenstein")** mediante un **Gate de Paridad** obligatorio antes de cerrar cambios en arquetipos compartidos.
3. **Guiar auditorías de arquitectura en ambos sentidos**: decidir con criterios objetivos cuándo **unificar/promover** una pieza hacia `src/shared/` y cuándo **ramificar/desacoplar** una variante porque los requerimientos del dominio cambiaron.

> Este registro complementa `docs/ux-modernization.md` (identidad visual, layouts, paleta y primitivas) y `frontend_guidelines.md` (convenciones técnicas y *Vertical Slicing*), sin duplicar sus reglas.

---

## 2. Modelo de Abstracción en 3 Niveles (Unificar ↔ Ramificar)

Cada dinámica compartida se clasifica en uno de tres niveles de abstracción. La evolución es **bidireccional**: un arquetipo puede subir de nivel cuando se consolida o bajar de nivel si los requerimientos de un dominio divergen lo suficiente.

| Nivel | Nombre | Cómo opera | Cuándo elegirlo |
| :--- | :--- | :--- | :--- |
| **Nivel 1** | **Paridad por Contrato** | Cada módulo conserva sus propios componentes, pero suscribe a las invariantes UX de este registro y pasa por el Gate de Paridad. | Dinámicas con lógica de dominio distinta o aún en maduración, donde una abstracción temprana generaría acoplamiento artificial. |
| **Nivel 2** | **Shell Visual Compartido (`src/shared/`)** | Se extrae únicamente la carcasa estructural/responsive con *slots* (`ReactNode` / props de presentación), sin importar modelos ni servicios de negocio. Ejemplos vigentes: `NavigationCard`, `FormModal`, `SectionLayout`. | Cuando una misma mejora visual/responsive ya se aplicó o tuvo que replicarse 2+ veces entre módulos hermanos y la estructura visual es estable. |
| **Nivel 3** | **Motor / Infraestructura Compartida** | Se comparten flujo, lógica técnica y componentes completos parametrizados por adaptador o fuente de datos. Ejemplo vigente: `src/shared/pdf/` (`SharedDownloadPdfButton`, `SharedBatchPdfModal`). | Cuando tanto la UX como la mecánica operativa/técnica son idénticas y sólo varían los endpoints o metadatos del dominio. |

### Criterios de Auditoría Bidireccional

#### Cuándo promover / unificar (Nivel 1 → Nivel 2 o 3)
- Se replica el mismo ajuste visual, de accesibilidad o responsive por **segunda vez** entre módulos suscriptos al mismo arquetipo.
- Dos módulos mantienen bloques CSS prácticamente espejados para resolver la misma zona (por ejemplo, encabezados públicos, barras sticky o docks flotantes).
- Se incorpora una nueva feature hermana (como `PRIMER_CUATRIMESTRE` o `PRIMER_BIMESTRE`) que multiplicaría el costo de replicación manual.
- La pieza puede expresarse como **componente contenedor con *slots*** sin importar tipos de PocketBase ni reglas pedagógicas.

#### Cuándo ramificar / desacoplar (Nivel 2/3 → Nivel 1, o excepción documentada)
- Un componente compartido empieza a acumular banderas condicionales por dominio (`if (mode === 'boletin') ... else if (mode === 'informe')`) que oscurecen el código o vuelven frágiles los cambios.
- Los requerimientos pedagógicos u operativos de un dominio cambian su modelo de interacción principal (por ejemplo, carga por matriz masiva vs. carga ficha por alumno) y forzar el mismo componente perjudica la tarea.
- Al ramificar un componente o una regla, **no se pierde el vínculo**: se actualiza su nivel en este registro, se documenta qué invariantes siguen compartiéndose (paleta, tipografía, estados, accesibilidad, jerarquía) y qué parte pasa a ser variante intencional de dominio.

---

## 3. Protocolo Operativo: Gate de Paridad para Agentes

Toda tarea que modifique archivos listados en la Sección 4 debe cumplir estas tres etapas:

1. **Verificación previa (antes de diseñar o editar)**:
   - Identificar si algún archivo objetivo pertenece a un arquetipo registrado.
   - Revisar sus **Invariantes UX** y sus **Variantes válidas** para no introducir divergencias accidentales ni sobreescribir diferencias intencionales.
2. **Chequeo de paridad al validar la feature piloto (antes del commit final, push o PR)**:
   - Una vez que el usuario valida la mejora en la feature piloto, el agente **debe preguntar explícitamente** si corresponde propagar el cambio, nombrando el arquetipo y los módulos hermanos afectados:
     > *«Chequeo de paridad UX — Arquetipo `[ID - Nombre]`: esta mejora impacta un patrón compartido con `[Módulo hermano (Archivo.tsx)]`. ¿Cómo preferís continuar?*
     > *1. Replicar la mejora en el módulo hermano dentro de esta misma rama/PR.*
     > *2. Promover la pieza visual a un shell compartido en `src/shared/`.*
     > *3. Mantenerla sólo acá y registrarla en la tabla de paridad pendiente (o como variante exclusiva de dominio).»*
3. **Actualización del registro en el mismo cambio**:
   - Si se replica, se promueve a `src/shared/`, se acuerda una variante exclusiva o se deja pendiente, se actualiza la tabla correspondiente en este documento en el mismo commit/PR.

---

## 4. Catálogo de Arquetipos Compartidos

### Arquetipos ya unificados (Referencia de Niveles 2 y 3)

| ID | Arquetipo | Nivel | Fuente canónica | Módulos consumidores |
| :--- | :--- | :--- | :--- | :--- |
| `UX-01` | Selección de período / instancia operativa | Nivel 2 | `src/shared/components/NavigationCard.tsx` | Boletines (`SeleccionBimestrePage.tsx`), Informes (`SeleccionTipoInformePage.tsx`), Asistencias (`AsistenciasPage.tsx`) |
| `UX-02` | Formularios en modal y flujos secuenciales | Nivel 2 | `src/shared/components/FormModal.tsx` | Alumnos, Inscripciones, Boletines, Informes, Asistencias |
| `UX-03` | Generación y descarga PDF individual y por lote | Nivel 3 | `src/shared/pdf/` (`SharedDownloadPdfButton.tsx`, `SharedBatchPdfModal.tsx`) | Boletines (`DownloadBulletinButton.tsx`, `BatchDocumentModal.tsx`), Informes (`DownloadInformeButton.tsx`, `BatchInformeModal.tsx`) |

---

### `UX-04` — Portal Público de Carga Docente (Magic Link)
- **Nivel actual**: Nivel 1 (Paridad por Contrato) — *Candidato prioritario a Nivel 2 (`PublicPortalHeader`)*.
- **Módulos suscriptos**:
  - **Boletines**: `src/modules/boletines/components/CargaDocentePublicaPage.tsx` (+ `.module.css`)
  - **Informes** (`CICLO_FINAL`, `PRIMER_CUATRIMESTRE`, `PRIMER_BIMESTRE`): `src/modules/informes/components/CargaInformePublicaPage.tsx` (+ `.module.css`)
- **Invariantes UX obligatorios**:
  - Encabezado institucional con identidad azul, escudo circular (`/escudo-circular.png`), identificación clara del docente y resumen visible del alcance (curso/turno/período o materia/ciclo).
  - Adaptación mobile obligatoria sin desbordes horizontales (`<= 767px` y `<= 480px`), preservando legibilidad y jerarquía del encabezado.
  - Estados claros y consistentes para enlace inválido/revocado, entrega ya realizada, carga inicial y errores de red sin exponer detalles técnicos internos.
  - Entrega atómica por curso/grado con confirmación explícita previa e invalidación inmediata del acceso correspondiente.
- **Variantes válidas por dominio**:
  - **Boletines**: alcance fijo `1 curso × 1 período`; sin selector de grados.
  - **Informes (`CICLO_FINAL` / `PRIMER_CUATRIMESTRE`)**: soporte para set multi-grado (`cursoIds`) en un mismo enlace, con selector de grado activo, indicador de progreso por grado y entrega independiente por grado.
  - **Informes (`PRIMER_BIMESTRE`)**: alcance de 1 curso de maestra de grado (`materia_id = null`), con la misma base del portal de informes.

---

### `UX-05` — Editor / Libreta por Alumno (Carga Docente y Revisión Directiva)
- **Nivel actual**: Nivel 1 (Paridad por Contrato) — *Candidato de mayor retorno para Nivel 2 (`StickyStudentBar` y `PendingChangesDock`)*.
- **Módulos suscriptos**:
  - **Boletines**: `src/modules/boletines/components/VistaPorAlumno.tsx` (+ `.module.css`)
  - **Informes** (`CICLO_FINAL`, `PRIMER_CUATRIMESTRE`, `PRIMER_BIMESTRE`): `src/modules/informes/components/VistaInformePorAlumno.tsx` (+ `.module.css`)
- **Invariantes UX obligatorios**:
  - **Editor único por dominio**: carga docente y revisión directiva comparten el mismo componente editor, diferenciados exclusivamente por `AccessPolicy` y `DataSource`.
  - **Barra sticky del alumno**: siempre visible al desplazarse; incluye navegación `Anterior` / `Siguiente` en orden alfabético español (sin salir del curso), selector/identidad del alumno con truncado limpio en mobile, y acciones contextuales según modo (progreso/guía/envío en docente; `VISADO` / `SIN VISAR`, botón `Visar / Quitar visado` y `Descargar PDF` en dirección).
  - **Revisión directiva segura**: vista de solo lectura por defecto; edición controlada con `Guardar` / `Descartar` locales; prohibido cambiar de alumno o recargar silenciosamente mientras haya modificaciones pendientes sin guardar.
  - **Experiencia mobile táctil**: en `<= 575px`, las filas de criterios/ítems se apilan verticalmente con controles táctiles amplios (`>= 38–44px`), el dock flotante inferior de cambios pendientes ocupa ancho completo y los drawers auxiliares se adaptan a `100vw`.
  - **Ayudas orientativas no bloqueantes**: en revisión directiva, las sugerencias usan un tono suave (índigo con `<BulbOutlined />`), nunca bloquean el visado ni la emisión PDF y permanecen ocultas en la vista docente.
- **Variantes válidas por dominio**:
  - **Boletines**: grilla de materias con 5 criterios cada una + Calificación General + `PPI` + historial compacto de bimestres anteriores + tarjeta de Asistencias/Observaciones + Apoyos e Integración + edición atómica por materia (una tarjeta a la vez).
  - **Informes (`CICLO_FINAL`)**: plantilla de ítems por materia especial (planos o en bloques) + leyenda de escala + semáforo orientativo y filtro `Ver solo ítems a observar` en revisión + `Desempeño General` obligatorio según ciclo + `observaciones` opcional.
  - **Informes (`PRIMER_CUATRIMESTRE` y `PRIMER_BIMESTRE`)**: 26 ítems fijos de conducta (`SIEMPRE | A VECES | NUNCA`) + `observaciones` en hoja 2, sin `Desempeño General`.

---

### `UX-06` — Tablero Directivo de Seguimiento por Grado (Progreso, Etapa y Realtime/SWR)
- **Nivel actual**: Nivel 1 (Paridad por Contrato) — *Candidato futuro a utilidad técnica compartida para SWR + Realtime debounced*.
- **Módulos suscriptos**:
  - **Boletines**: `src/modules/boletines/components/MonitoreoProgresoPage.tsx` (+ `.module.css`), `src/modules/boletines/store/gradebookDashboardStore.ts`, `src/modules/boletines/hooks/useGradebookRealtime.ts`
  - **Informes** (`CICLO_FINAL`, `PRIMER_CUATRIMESTRE`, `PRIMER_BIMESTRE`): `src/modules/informes/components/TableroInformesPage.tsx` (+ `.module.css`), `src/modules/informes/store/informesDashboardStore.ts`, `src/modules/informes/hooks/useInformesRealtime.ts`
- **Invariantes UX obligatorios**:
  - **Etapas autoritativas del servidor**: el estado operativo (`PENDIENTE_CONFIGURACION`, `PENDIENTE_EMISION`, `CARGA_DOCENTE`, `CARGA_PAUSADA`, `REVISION_DIRECTIVA`, `LISTO_PARA_PDF`) proviene del backend y nunca se deduce de porcentajes.
  - **Separación de columnas y acción única**: progreso de llenado docente y progreso de revisión directiva (visados) presentados por separado; cada fila ofrece una única acción primaria acorde a la etapa (gestor de enlaces antes de la entrega; abrir revisión después).
  - **Tablero limpio**: reservado exclusivamente al seguimiento de llenado, etapas y visado; no sobrecargar con alertas pedagógicas o sugerencias académicas que pertenecen a la vista del curso.
  - **Caché SWR y revalidación sin parpadeo**: al volver desde la vista de un curso/informe se renderiza el último snapshot en 0 ms sin `<Spin>` bloqueante; el botón de actualización indica actividad y punto discreto (`pending`) ante eventos Realtime; las lecturas usan control secuencial monotónico (`latestRequestSeq`) y conservan el último resumen válido si una revalidación falla.
  - **Confirmación de cursadas pendientes**: acceso homogéneo a `CursadaModal` cuando existen matrículas pendientes de confirmación antes de nuevas entregas.
- **Variantes válidas por dominio**:
  - **Boletines**: carga desacoplada en 2 etapas (`/etapas/:periodoId` + `/progreso/:periodoId`) y 7 filas directas por bimestre.
  - **Informes (`CICLO_FINAL` / `PRIMER_CUATRIMESTRE`)**: selector superior por Materia Especial (conservado en store SWR por ciclo y tipo) y acción secundaria para editar `nombre` y `apellido` de la docente.
  - **Informes (`PRIMER_BIMESTRE`)**: 7 filas directas por grado sin selector de materia especial.

---

### `UX-07` — Vista General del Curso en Revisión Directiva
- **Nivel actual**: Nivel 1 (Paridad por Contrato) — *Candidato a Nivel 2 (`ReviewCourseToolbar` / fila base de alumno en revisión)*.
- **Módulos suscriptos**:
  - **Boletines**: `src/modules/boletines/components/RevisionCursoOverview.tsx` (+ `.module.css`) y `src/modules/boletines/components/PlanillaCalificacionesPage.tsx`
  - **Informes** (`CICLO_FINAL`, `PRIMER_CUATRIMESTRE`, `PRIMER_BIMESTRE`): `src/modules/informes/components/RevisionInformePage.tsx` (+ `.module.css`)
- **Invariantes UX obligatorios**:
  - **Orden y simplicidad del listado**: alumnos en orden alfabético español por apellido y nombre, conservando su número de orden; sin buscador de texto ni párrafos introductorios redundantes.
  - **Barra superior unificada**: botón de generación de PDFs del curso a la izquierda acompañado por filtro rápido `Segmented` (`Todos`, `Con sugerencias / atención`, `Pendientes de visado`), y etiqueta de progreso de visados a la derecha, con ajuste limpio en pantallas estrechas.
  - **Jerarquía de fila**: identidad del alumno + indicadores orientativos en la zona izquierda/central, y columna/zona derecha dedicada y visualmente independiente para el estado `Visado` / `Sin visar` y la flecha de apertura.
  - **Estado vacío por filtro**: cuando un filtro rápido no devuelve resultados, ofrecer botón directo para volver a `Todos`.
- **Variantes válidas por dominio**:
  - **Boletines**: advertencias documentales de legajo/apoyos (`Faltan datos para PDF`), sincronización de matrículas incorporadas tras la entrega, y sugerencias basadas en promedio de criterios y cambios de `PPI`.
  - **Informes**: Desempeño General abreviado (en `CICLO_FINAL`), semáforo compacto de ítems, sugerencias de disonancia y acceso rápido a editar datos de la docente responsable.

---

### `UX-08` — Gestor de Enlaces Mágicos Docentes
- **Nivel actual**: Nivel 1 (Paridad por Contrato) sobre shell Nivel 2 (`FormModal`).
- **Módulos suscriptos**:
  - **Boletines**: `src/modules/boletines/components/GestorEnlacesModal.tsx` (+ `.module.css`)
  - **Informes** (`CICLO_FINAL`, `PRIMER_CUATRIMESTRE`, `PRIMER_BIMESTRE`): `src/modules/informes/components/GestorEnlacesInformesModal.tsx` (+ `.module.css`)
- **Invariantes UX obligatorios**:
  - Construido sobre `FormModal` con reinicio de sesión vía `useModalSessionKey` y foco de validación vía `focusFirstFormError`.
  - Operaciones consistentes para enlaces vigentes: emitir, recuperar/copiar enlace sin rotarlo, compartir, regenerar (reemplazando secreto previo con confirmación) y eliminar (conservando borrador sin acceso docente).
  - El secreto en claro permanece exclusivamente en memoria durante la acción de copiar/compartir; nunca se persiste ni se muestra en logs.
  - Bloqueo claro de emisión para cursos ya entregados (`CONTROL_DIRECTIVO` / `REVISION_DIRECTIVA` / `LISTO_PARA_PDF`).
- **Variantes válidas por dominio**:
  - **Boletines**: selección de 1 curso + 1 período y campo único `docenteNombre`.
  - **Informes**: selección múltiple de grados (`cursoIds`) con atajos (`Todos`, `1.er Ciclo`, `2.° Ciclo`), materia especial (en `CICLO_FINAL` y `PRIMER_CUATRIMESTRE`), y captura obligatoria separada de `docenteNombre` y `docenteApellido` para el pie del PDF.

---

## 5. Auditoría Inicial de Divergencias y Deuda de Paridad

Estado relevado el 23 de noviembre de 2026 como línea base para futuras iteraciones y auditorías:

| Arquetipo | Divergencia observada hoy | Tipo | Acción recomendada al volver a tocar el área |
| :--- | :--- | :--- | :--- |
| `UX-05` | **Barra sticky de alumno**: Boletines usa `.studentBanner` con chip numérico + dropdown propio (`top: 0`); Informes usa `<Card>` `.studentToolbar` con `<Select>` nativo (`top: 10px`). | Deuda visual / mobile | Promover a `StickyStudentBar` en `src/shared/components/` con slots (`selector`, `badges`, `actions`) la próxima vez que se mejore la navegación de alumnos o la vista mobile en cualquiera de los dos módulos. |
| `UX-05` | **Dock flotante de cambios pendientes**: Boletines todavía estiliza `:global(.cys-floating-action-bar)` desde `src/index.css`; Informes define `.floatingActionBar` local en CSS Module. | Deuda visual / CSS heredado | Extraer `PendingChangesDock` en `src/shared/components/` y retirar `.cys-floating-action-bar` de `src/index.css`. |
| `UX-04` | **Encabezado público `/carga` vs `/carga-informe`**: clases `.publicHeaderCard`, `.teacherContainer`, `.schoolLogo`, `.teacherTitle` y media queries mobile duplicadas entre módulos. | Duplicación directa | Extraer `PublicPortalHeader` en `src/shared/components/` cuando se ajuste el layout o la identidad visual de cualquiera de los portales docentes. |
| `UX-06` | **Constantes de debounce Realtime y throttle de foco**: Boletines usa `1200 / 4000 / 1500 ms`; Informes usa `400 / 1500 / 5000 ms`. | Ajuste técnico menor | Evaluar unificación de umbrales o helper compartido de suscripción Realtime/SWR al implementar Fase 2 de Informes. |
| `UX-07` | **Contenedor de revisión del curso**: en Boletines la vista general está separada en `RevisionCursoOverview.tsx`; en Informes convive dentro de `RevisionInformePage.tsx`. | Diferencia estructural | Mantener desacoplado mientras no haya fricción; si se extrae `ReviewCourseToolbar` o la fila base de alumno, ambos pueden consumirlo sin unificar los contenedores completos. |

---

## 6. Checklist para Auditorías Periódicas de Arquitectura

Ejecutar esta revisión breve antes de iniciar una nueva fase mayor (por ejemplo, Fases 2 y 3 de Informes o un nuevo módulo operativo) o cuando se acumulen 3+ entradas en la tabla de divergencias:

1. **Detección de unificaciones**: ¿Qué arquetipos de Nivel 1 recibieron cambios duplicados en las últimas iteraciones y ya tienen una forma estable lista para pasar a Nivel 2 (`src/shared/`)?
2. **Detección de ramificaciones**: ¿Algún componente en `src/shared/` acumuló demasiadas ramas condicionales por dominio y conviene bajarlo a Nivel 1 o dividirlo en primitivas más pequeñas?
3. **Limpieza de deuda**: ¿Qué ítems de la Sección 5 ya se resolvieron o pasaron a ser variantes intencionales de dominio?
4. **Cobertura de nuevos módulos**: ¿Cada nueva pantalla operativa creada en el período quedó asociada a un arquetipo existente o dio origen a uno nuevo?
