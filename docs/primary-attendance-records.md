# Registros de Asistencia de Primaria

Actualizado: 8 de octubre de 2026.

## Propósito

Centralizar y automatizar la gestión mensual de los registros oficiales de asistencia y seguimiento pedagógico para los cursos de nivel primario, reemplazando la gestión manual previa en Google Sheets y permitiendo la emisión e impresión directa en formato A4 apaisado conforme a la normativa escolar.

## Formato y reglas del documento oficial

El registro mensual se emite por curso y mes (ej. Mayo, Julio, Octubre) en una sola carilla A4 apaisada (capacidad de hasta 24 alumnos). Contiene cinco bloques fundamentales:

1. **Encabezado y calendario escolar**:
   - `MES`, `GRADO`, `SECCIÓN`, `TURNO`, `AÑO`.
   - `TOTAL DÍAS HÁBILES`: Días hábiles de clase del mes. **Determinístico**: Calculado automáticamente como los días de lunes a viernes del mes menos los eventos no computables (feriados, jornadas EMI, receso, asuetos). No admite carga manual arbitraria para asegurar la integridad matemática de la Asistencia Media y el porcentaje de asistencia.
   - `TOTAL DÍAS HÁBILES ACUMULADOS`: Suma de días hábiles desde el inicio del ciclo lectivo (marzo) hasta el mes en curso. Calculado y actualizado en cascada automáticamente.

2. **Matriz de asistencia diaria (Días 1 al 31)**:
   - Días hábiles sin novedad: computan como `P` (Presente).
   - Inasistencias:
     - `A`: Ausente injustificado.
     - `J`: Ausente justificado.
     - `E`: Ausente por enfermedad (con certificado).
   - Llegadas tarde y retiros anticipados:
     - `IT`: Llegada tarde. Cuenta como presente en el total de asistencias y además incrementa su propio contador aislado de llegadas tarde.
     - `RA`: Retiro anticipado. Cuenta como presente en el total de asistencias.
   - Cursada parcial: Días previos a la fecha de ingreso o posteriores a la fecha de egreso del alumno se completan con guiones continuos (`---`) y no computan como hábiles ni inasistencias para ese estudiante.
   - Fines de semana y días inexistentes (ej. 31 en meses de 30 días): bloqueados sin carga.
   - Feriados, jornadas institucionales (EMI) y recesos: celdas abarcativas en vertical con el nombre del evento (ej. "DÍA DEL TRABAJADOR", "E M I", "RECESO ESCOLAR INVERNAL").
   - Fila inferior `PRESENTES`: Total de alumnos presentes por cada día hábil del mes.

3. **Seguimiento pedagógico y calificaciones**:
   - Se completan exclusivamente en los meses de cierre de bimestre correspondientes a entregas de boletines:
     - **Mayo**: 1.° Bimestre
     - **Julio**: 2.° Bimestre
     - **Octubre**: 3.° Bimestre
     - **Diciembre**: 4.° Bimestre
   - En los demás meses, estas columnas permanecen vacías.
   - Materias curriculares: Muestran la calificación general de la materia registrada en el boletín. Escala solo conceptual en 1.° ciclo (`AL`, `AV`, `DE`, `EP`, `NA`) y concepto + número en 2.° ciclo (`AL7`, `AV9`, `DE10`).
   - Trabajo en el aula y Convivencia: Al no poseer calificación general, informan los 5 criterios evaluativos detallados al pie.
   - Columna `OBSERV`: Resoluciones de apoyo pedagógico (ej. `Res. 311/16`) provenientes del legajo y/o novedades de alta/baja (ej. `ALTA 18/5`).

4. **Resumen estadístico al pie**:
   - **Inscripción `(1 + 2 - 3 = 4)`**: Desglosado por Varones (`V`), Mujeres (`M`) y Total (`T`):
     - `(1) Inscriptos 1er día`: Alumnos activos al inicio del mes.
     - `(2) Entrados posteriormente`: discriminado por Otra Escuela, Otra Sección, Otro Turno, Otro Grado.
     - `(3) Salidos en el mes`: discriminado por las mismas causas.
     - `(4) Quedan último día`.
   - **Alumnos por edad**: Desglosado por `V`, `M`, `T`, considerando quienes quedan al último día del mes. Hasta junio inclusive se toma la edad al 30 de junio; a partir de julio inclusive se incrementa en 1 en el mes del cumpleaños de cada alumno.
   - **Nacionalidad**: Desglosado por `V`, `M`, `T` en dos grupos: Argentinos (`ARG`) y Extranjeros (`EXT`), considerando quienes quedan al último día del mes.
   - **Asistencia Media y Porcentajes**:
     - `TOT ASISTENCIA`: Suma de todas las presencias del mes del curso.
     - `TOT INASISTENCIA`: Suma de todas las ausencias (`A`, `J`, `E`).
     - `ASIST MEDIA`: `TOT ASISTENCIA / TOTAL DÍAS HÁBILES` (redondeado).
     - `% TOT ASISTENCIA`: `(TOT ASISTENCIA / (TOT ASISTENCIA + TOT INASISTENCIA)) * 100`.
     - `% TOT INASISTENCIA`: `(TOT INASISTENCIA / (TOT ASISTENCIA + TOT INASISTENCIA)) * 100`.

5. **Cierre y observaciones institucionales**:
   - Cuadro inferior de `OBSERVACIONES`: Construcción híbrida combinando eventos del calendario mensual + altas y bajas del curso + notas libres manuales.
   - Firmas: Firma del Maestro y V° B° Dirección.

## Modelo de datos (PocketBase)

### 1. `meses_calendario`
Apertura mensual del ciclo lectivo institucional.
- `ciclo_id`: Relación a `ciclos_lectivos`.
- `mes`: Número del 1 al 12.
- `ano`: Año lectivo.
- `total_dias_habiles`: Número de días hábiles.
- `dias_habiles_acumulados`: Total acumulado anual hasta ese mes.
- `periodo_boletin_id`: Campo legado opcional; el registro resuelve el período por ciclo y mes, sin usar esta relación.
- Índice único: `(ciclo_id, mes)`.

### 2. `eventos_calendario`
Eventos, feriados, asuetos y jornadas institucionales del mes.
- `mes_calendario_id`: Relación a `meses_calendario`.
- `fecha`: Fecha del evento.
- `dia`: Día del mes (1 al 31).
- `tipo`: `FERIADO`, `JORNADA_EMI`, `RECESO`, `ASUETO`.
- `texto_celda_vertical`: Texto vertical a renderizar en la columna del día.
- `descripcion_observaciones`: Texto para el cuadro de observaciones al pie.

### 3. `asistencias_diarias`
Novedades diarias de asistencia cargadas por excepción.
- `inscripcion_id`: Relación a `inscripciones`.
- `fecha`: Fecha de la novedad.
- `estado`: `A` (Ausente), `J` (Justificado), `E` (Enfermedad), `IT` (Llegada tarde), `RA` (Retiro anticipado).
- `observacion`: Texto complementario opcional.
- Índice único: `(inscripcion_id, fecha)`.

### 4. `registros_asistencia_curso`
Metadatos y observaciones del curso para un mes determinado.
- `curso_id`: Relación a `cursos`.
- `mes_calendario_id`: Relación a `meses_calendario`.
- `observaciones_adicionales`: Texto libre para incorporar al cuadro de observaciones del pie.
- Índice único: `(curso_id, mes_calendario_id)`.

### 5. Enriquecimiento de `inscripciones`
- `procedencia_ingreso`: Texto (`OTRA_ESCUELA`, `OTRA_SECCION`, `OTRO_TURNO`, `OTRO_GRADO`, `INICIO_CICLO`).
- `destino_egreso`: Texto (`OTRA_ESCUELA`, `OTRA_SECCION`, `OTRO_TURNO`, `OTRO_GRADO`).
- `resolucion_apoyo`: Texto (ej. `Res. 311/16`).

## Implementación entregada

- [x] **Definición de requerimientos y reglas del documento**:
  - [x] Relevamiento de estructura A4 oficial (PDFs muestra 3° y 4° grado).
  - [x] Reglas de asistencia, inasistencias, tardanzas y retiros.
  - [x] Mapeo bimestral de calificaciones (Mayo, Julio, Octubre, Diciembre).
  - [x] Fórmulas de matrícula, edad, nacionalidad y asistencia media.
- [x] **Etapa 1: Modelo de datos en PocketBase**:
  - [x] Migración de campos en `inscripciones` (`1790900000_added_enrollment_attendance_fields.js`).
  - [x] Migración de colecciones de asistencia (`1790901000_created_attendance_management_collections.js`).
  - [x] Reconstrucción y verificación en una instancia temporal de PocketBase 0.22.17, con datos sintéticos.
  - [x] Actualización de snapshot `pb_schema.json`.
- [x] **Etapa 2: Capa de Dominio y Lógica de Negocio (TypeScript)**:
  - [x] Creación de tipos de dominio en `src/modules/asistencias/models/`.
  - [x] Servicios de lectura y persistencia en `src/modules/asistencias/services/`.
  - [x] Funciones puras de cálculo estadístico (matrícula, edades, asistencia media).
  - [x] Adaptador para incorporar calificaciones de boletines según el mes.
- [x] **Etapa 3: UX/UI Operativa de Carga**:
  - [x] Pantalla de apertura y calendario escolar mensual.
  - [x] Pantalla interactiva de carga tipo cuadrícula/planilla (Google Sheets style).
  - [x] Navegación por teclado y atajos rápidos de marcado (`A`, `J`, `E`, `IT`, `RA`).
- [x] **Etapa 4: Capa de Presentación e Impresión A4**:
  - [x] Plantilla A4 apaisada conforme al diseño oficial (`HojaRegistroA4Printable.tsx`, `RegistroEscolar.tsx` y `RegistroEscolar.module.css`).
  - [x] Distinción de ciclos pedagógicos (1.° ciclo con notas conceptuales y `Conocimiento del Mundo`; 2.° ciclo con notas alfanuméricas y `Ciencias Sociales`/`Naturales`).
  - [x] Texto vertical SVG para feriados y jornadas, con geometría dinámica según el mes.
  - [x] Generación en caliente y vista previa de impresión desde modal Ant Design (`AsistenciasPage.tsx` y `CargaAsistenciaMatrix.tsx`).
  - [x] Exportación a PDF / impresión directa (`window.print()` con reseteo de shell e impresión exacta en 1 carilla A4 horizontal).

## Plantilla SVG e integración de datos — 8 de octubre de 2026

`HojaRegistroA4Printable` delega en `RegistroEscolar` y `adaptarRegistroEscolar`. La geometría de referencia procede de una hoja Legal horizontal de 1008 × 612 puntos; la emisión vigente se adapta proporcionalmente a A4 horizontal, centrada en la página, sin deformar las proporciones originales.

La cuadrícula de asistencia se reconstruye para cada mes a partir de `weekends`, `blockedDays` y `events`. No se reutilizan las celdas combinadas de mayo, sus feriados ni sus guiones de altas. Los eventos ocupan verticalmente su propia columna y los días hábiles recuperan sus separadores de filas. Los encabezados y los valores nuevos se centran en sus celdas; los nombres y observaciones individuales ajustan su ancho cuando es necesario. El cuadro de observaciones institucionales distribuye el texto en líneas y adapta el tamaño dentro de su recuadro.

Las nueve posiciones curriculares de datos son estables. El adaptador asigna las materias por nombre normalizado y conserva cinco columnas para trabajo en el aula y cinco para convivencia. La presentación dibuja ocho materias en primer ciclo, con una columna angosta para Conocimiento del Mundo, y nueve en segundo ciclo, con Ciencias Sociales y Ciencias Naturales separadas. Las etiquetas del catálogo se presentan como conceptos en primer ciclo y concepto más número explícito sin guion en segundo ciclo (`AL7`, `AV9`, `DE10`); no se deducen números del peso de la escala. La leyenda cambia según el ciclo. Los anchos reservan más espacio a OBSERV, que admite varias líneas para resoluciones y novedades simultáneas.

El adaptador conserva todos los alumnos. La plantilla mantiene las 21 filas de referencia y ajusta la altura para cursos de 22 a 24 alumnos dentro del mismo espacio. Más de 24 alumnos produce un error explícito, sin descartar registros. El cálculo de dominio ya entrega todas las edades con cursantes; la presentación muestra cada edad con total positivo, ordenada, y adapta la altura del cuadro sin limitarlo a siete filas. Sus totales proceden del resumen de dominio. Las observaciones institucionales correspondientes a eventos se muestran con el día por delante, sin duplicarlo cuando ya viene escrito. La plantilla recibe la proyección del servicio de dominio; sus componentes no consultan PocketBase ni guardan datos.

El CSS de impresión se limita al modal que contiene esta hoja mediante `:has`. Incluye `.ant-modal-container` de Ant Design 6, además de las clases compatibles con versiones anteriores, para quitar el padding que desplazaba la hoja y generaba una segunda página vacía. La regla de tamaño `@page` se monta junto con el componente, después de los estilos de los boletines, y se retira al desmontarlo; así la orientación horizontal no depende del orden de carga de los CSS ni permanece activa al cerrar el modal. No aplica el ocultamiento del shell a otros documentos.

Validación reproducible: `npm run lint`, `npm run build` y `node deploy/test-attendance-presentation.mjs`. La prueba usa datos sintéticos en un modal Ant Design real, sin PocketBase, y carga también el CSS global de la app y el formato vertical de los boletines. Verifica calendario de septiembre, ocho/nueve materias, posiciones de criterios, etiquetas y referencias por ciclo, diez edades distintas con sus totales, prefijos de día sin duplicación, resolución con alta/baja simultáneas y 24 alumnos. Los cuatro PDFs deben tener exactamente una página A4 horizontal. Capturas y PDFs de prueba se escriben en `dist-render/attendance`, ignorado por Git.

## Lógica de dominio y persistencia

El servicio consulta calificaciones exclusivamente en mayo, julio, octubre y diciembre. El período se busca siempre por ciclo y número de bimestre, sin utilizar vínculos manuales legados. Si no existe todavía, las calificaciones quedan vacías. Si existe sin evaluaciones o con evaluaciones aún sin nota, los campos también quedan vacíos; al actualizar o abrir la impresión se consultan nuevamente y se incorporan las notas disponibles sin reconfigurar el mes. Los errores de conexión, permisos y servidor se propagan; únicamente un 404 representa la ausencia de un registro. La interfaz diferencia un mes sin abrir de una carga fallida y descarta respuestas de solicitudes anteriores al cambiar la selección.

Edades y nacionalidad usan las inscripciones que quedan al último día, por decisión confirmada del usuario: incluyen altas hasta ese día, excluyen ingresos futuros y bajas hasta ese día inclusive. La matrícula también excluye ingresos futuros. Las inscripciones confirmadas SIN_CURSADA quedan fuera de la nómina y de los cálculos. La fecha de egreso continúa siendo inclusiva para la asistencia del día; la baja se resta del resumen de matrícula al cierre.

La resolución se imprime únicamente cuando `resolucion_apoyo` contiene un dato; `posee_apoyos = SI` no inventa una resolución. El total mensual impreso de tardanzas suma las tardanzas individuales. Se comparte una sola función para presentar calificaciones compactas, incluidas etiquetas recibidas con guion. Los eventos institucionales ya reciben el día en la proyección de negocio, conservando textos que ya vienen numerados.

La grilla distingue modificaciones efectivas de cambios revertidos. Mientras existen cambios pendientes, curso, mes, calendario e impresión quedan bloqueados hasta Guardar o Descartar; durante un guardado no se aceptan modificaciones nuevas. La apertura de mes limita los eventos a días existentes; no requiere que exista el bimestre ni sus calificaciones. Los guardados de calendario y asistencia atraviesan gateways transaccionales, sin éxito parcial. Ante conflicto o resultado incierto se conserva el borrador y se bloquea un segundo guardado hasta cargar explícitamente la versión actual.

Pruebas adicionales: `node --test deploy/test-attendance-calculations.cjs` ejecuta las funciones y servicios TypeScript reales mediante un cargador de pruebas, sin reimplementar las fórmulas. `node --test deploy/test-attendance-http.cjs` reconstruye una instancia temporal de PocketBase 0.22.17, aplica todas las migraciones y comprueba lectura, escritura, eliminación de novedades, calificaciones, movimientos y rechazo de escritura anónima con datos sintéticos. El proceso y los datos temporales se eliminan al terminar; no se toca la base local habitual ni producción. La prueba de presentación también verifica edición, reversión, descarte y bloqueo de impresión con cambios pendientes.

La nómina conserva las bajas durante todo el ciclo, en su posición de número de orden. La impresión dibuja una línea continua desde el día posterior al egreso hasta el fin de la cuadrícula; en meses posteriores cubre toda la fila de asistencia. Se imprime el número de orden de la inscripción, sin renumerar alumnos ni ordenarlos por apellido. En el mes de baja cuentan asistencias e inasistencias hasta el egreso inclusive, por confirmación del usuario. En meses posteriores la fila tiene totales cero, no participa en edades/nacionalidad/matrícula y no vuelve a sumarse en Salidos en el mes. Las calificaciones respetan el rango evaluable confirmado de cada inscripción, independiente de las fechas administrativas.

La migración `1791470000_attendance_transactional_writes.js` agrega revisión de curso/mes y de calendario del ciclo, y bloquea la escritura directa en las cuatro colecciones. Las lecturas editables proceden de instantáneas transaccionales. El lote de novedades y las observaciones se guardan juntos; calendario, eventos y acumulados también. Las huellas de fuentes detectan cambios de nómina o calendario entre lectura y guardado. El servidor valida alcance, fechas, días con clase y rango de cursada; calcula días hábiles y acumulados sin aceptar totales del navegador. Pruebas HTTP verifican carreras con resultados 200/409, rollback y rechazo de escrituras directas. `pb_schema.json` se deriva del esquema reconstruido en esa prueba. Los scripts de publicación incluyen los hooks y las migraciones nuevos, sin haberse ejecutado contra producción.

La apertura de vista previa relee el registro y existe actualización manual. Todavía no se incorporó una suscripción Realtime al módulo. Se retiraron métodos de escritura secuencial sustituidos por los gateways y se limpiaron nombres y observaciones personales del JSON de geometría de referencia.

## Integración, operación y límites

El usuario autorizó el 8 de octubre de 2026 la integración en `dev`, su sincronización con `origin/dev` y la retirada del worktree temporal. La integración incluye frontend, hooks, migraciones, esquema, documentación y pruebas reproducibles. No publica `master`, no despliega en el VPS ni modifica la base habitual. Antes de usar el frontend contra el backend habitual deben aplicarse las migraciones y cargarse los hooks compatibles mediante el procedimiento local documentado en `deploy/README.md` y `docs/pocketbase-environments.md`.

La emisión de este registro usa la impresión del navegador, no el worker de PDFs de boletines. Existe una sola plantilla SVG y su adaptador; se retiró el render anterior y no se versionan PDFs de prueba, capturas ni datos de los documentos originales. La geometría conserva únicamente etiquetas y estructura, con nombres y observaciones personales eliminados. Las pruebas visuales producen sus artefactos en `dist-render/attendance`, ignorado por Git.

Los límites pendientes son: máximo de 24 alumnos por hoja, actualización manual sin suscripción Realtime, política todavía no definida para sexo/nacionalidad/nacimiento incompletos y posterior revisión de la UX de procedencia, destino y resolución. No bloquean esta integración autorizada ni se resuelven mediante valores inventados. El acumulado puede ser provisorio cuando faltan calendarios anteriores. El warning de tamaño del bundle es deuda previa del proyecto.


## Navegación por mes

La entrada a `/app/asistencias` presenta marzo a diciembre del ciclo seleccionado. Los meses con calendario guardado aparecen como **Abierto**, con color y marca de verificación; los restantes como **Sin abrir**. La navegación continúa al listado de todos los cursos de primaria, ordenados por grado y turno, y luego al registro. El mes sin abrir muestra los cursos y ofrece **Abrir mes**, pero bloquea su carga hasta guardar el calendario.

La URL conserva la selección con `?mes=5` y `?mes=5&curso=<id>`, permitiendo recarga, acceso directo y navegación del navegador. Los botones **Cursos** y **Meses** permiten volver al nivel anterior. **Calendario** está disponible en el mes y el registro. Los cambios pendientes bloquean los botones de navegación; si la URL cambia mediante el historial, se conserva la edición hasta confirmar su descarte. Los errores de carga del calendario se muestran con reintento, sin marcar meses como cerrados por un fallo de conexión.

El listado de cursos limita su ancho a 560 px para acercar cada acción a su grado. La grilla distribuye el espacio restante entre los días, con columnas fijas de identificación y totales, y permite envolver nombres y observaciones. Conserva desplazamiento horizontal con barra fina únicamente cuando el ancho disponible no alcanza el mínimo de lectura (28 px por día). El selector de marcas mantiene un único menú abierto y se cierra al elegir una opción, incluso al repetir la marca actual; la celda conserva el foco para continuar con los atajos.

El modal de calendario recibe el mes obligatorio desde el contexto de navegación. El mes aparece en el título y no se puede cambiar dentro del formulario; para configurar otro mes se vuelve al listado de meses. La lectura, los límites de días y el guardado utilizan ese mismo mes contextual.

El modal de calendario no contiene selector de período ni consulta boletines. El gateway de calendario recibe únicamente las precondiciones y eventos, y limpia el vínculo legado del mes al guardar. La regla fija es mayo → bimestre 1, julio → 2, octubre → 3 y diciembre → 4. Las fallas de red o permisos continúan mostrándose como errores; no se ocultan como notas pendientes. Se verificó con PocketBase aislado que se puede abrir y cargar asistencia antes de crear el período, recibir evaluaciones sin nota e incorporar luego las calificaciones al releer, preservando asistencia y calendario.

Los días hábiles del calendario aparecen como indicadores informativos, no como entradas deshabilitadas. Se cuentan lunes a viernes y se excluyen las fechas configuradas sin clase (FERIADO, JORNADA_EMI, RECESO y ASUETO); un día de fin de semana o una exclusión repetida no se resta dos veces. El acumulado suma los meses configurados desde marzo anteriores al actual, más el cálculo del mes actual inclusive. Si faltan meses anteriores, el modal marca **Provisorio** y enumera los meses pendientes, por decisión del usuario. No estima feriados ni días de meses sin configurar. Al abrir o corregir un mes previo, el gateway recalcula los acumulados de todos los meses abiertos posteriores. La vista previa del modal utiliza la lista de meses de su instantánea, sin mezclar una segunda lectura de otra versión.

## Verificación y mantenimiento

Desde el checkout de `dev`, con dependencias instaladas y `.env.development.local` apuntando al PocketBase local:

```powershell
npm run lint
npm run build
node --test deploy/test-attendance-calculations.cjs deploy/test-attendance-http.cjs
node deploy/test-attendance-navigation.mjs
node deploy/test-attendance-presentation.mjs
```

Las 19 pruebas de dominio y HTTP cubren reglas de asistencia, matrícula, bajas, notas pendientes, días hábiles, años bisiestos, acumulados inclusivos, recalculado de meses posteriores, autorización, concurrencia y rollback. Las pruebas de navegador usan Edge headless y datos sintéticos: navegación, calendario contextual sin selectores residuales, acumulado provisorio, protección de borradores, cierre del menú de marcas, foco, grilla de 31 días, ambas plantillas y cuatro PDFs de una página A4 horizontal. La prueba HTTP requiere `C:\pocketbase\pocketbase.exe` 0.22.17; crea y elimina su propia instancia temporal, sin tocar `127.0.0.1:8090`. Las pruebas visuales tienen cachés Vite separadas dentro de los artefactos ignorados.
