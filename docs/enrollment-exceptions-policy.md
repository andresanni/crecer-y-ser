# Política de Altas Tardías (A.T.) y Bajas Tempranas (B.T.)

Actualizado: 25 de noviembre de 2026.

## 1. Principio rector: Libertad guiada dentro de carriles

En Crecer y Ser, las fechas administrativas (`fecha_ingreso` y `fecha_egreso`) **nunca deciden automáticamente** en qué boletines o informes participa un alumno. Sin embargo, para preservar la integridad lógica de la aplicación y evitar exclusiones accidentales en alumnos regulares, el control manual se apoya en **dos únicas puertas explícitas** a nivel de inscripción (`inscripciones`), válidas tanto para **Nivel Primario** como para **Nivel Inicial**:

1. **Alta Tardía (`inscripciones.es_alta_tardia: boolean`)**: bandera explícita por ciclo lectivo (se reinicia naturalmente en la inscripción del año siguiente). Permite desacoplar casos finos de la fecha calendario:
   - Un alumno que ingresa 2 días después del inicio de clases puede quedar con `es_alta_tardia = false` y ser tratado como un alumno regular común.
   - Un alumno que viene con pase al comienzo del ciclo puede quedar con `es_alta_tardia = true` incluso si Dirección decide evaluarlo desde el `1.º bimestre` (`B1 = SÍ`), conservando su identificación visual (`A.T.`) y acceso al registro de pases.
2. **Baja / Baja Temprana (`inscripciones.estado = "Baja"` + `fecha_egreso`)**: no existe una B.T. sin Baja ni una bandera redundante separada. Registrar la Baja mediante el flujo dedicado (`DarDeBajaModal`) es la única puerta que habilita recortar instancias desde el final o marcar `Sin cursada`.

Toda inscripción nueva nace automáticamente en `cursada_estado = "CONFIRMADA"`, `bimestre_desde = 1`, `bimestre_hasta = 4` y `es_alta_tardia = false` mediante hook `onRecordBeforeCreateRequest` en PocketBase (`pb_hooks/teacher_access.pb.js`).

---

## 2. Matriz completa de combinaciones válidas

La tabla siguiente resume qué puede y qué no puede hacerse en cada una de las 4 combinaciones posibles de `(es_alta_tardia, estado = "Baja")`:

| Régimen | `es_alta_tardia` | `estado = "Baja"` | Boletines de Primaria (`B1..B4`) | Informes de Maestras (Primaria: 3 / Inicial: Ciclo Final) | Pases / Hoja 14 (Primaria) |
| :--- | :---: | :---: | :--- | :--- | :--- |
| **1. Ciclo completo (Regular común)** | `NO` | `NO` | Todos activos y **bloqueados en SÍ** (`B1..B4`). No se puede excluir ningún bimestre. | Todos activos y **bloqueados en SÍ**. No se puede excluir ningún informe. | Oculto (no aplica salvo datos heredados). |
| **2. Solo Alta Tardía (A.T.)** | `SÍ` | `NO` | Rango consecutivo `[desde..4]`. Puede apagar desde el principio (`B1`, `B1–B2`, `B1–B3`). **`B4` permanece bloqueado en SÍ** y no se permite `Sin cursada`. | Todos los informes editables (`SÍ / NO`), salvo los ya entregados. | Visible y editable en `4. Evaluaciones`. |
| **3. Solo Baja / Baja Temprana (B.T.)** | `NO` | `SÍ` | `Sin cursada` (si no tiene datos) **o** rango consecutivo `[1..hasta]`. Puede apagar desde el final (`B4`, `B3–B4`, `B2–B4`). **No puede apagar `B1` dejando `B2+` activos.** | Todos los informes editables (`SÍ / NO`), salvo los ya entregados. | Visible en `DarDeBajaModal` (opcional) y editable en `4. Evaluaciones`. |
| **4. Combinado (A.T. + B.T.)** | `SÍ` | `SÍ` | `Sin cursada` (si no tiene datos) **o** cualquier rango consecutivo `[desde..hasta]` dentro de `1..4`. Puede cortar por ambos extremos (ej.: solo `B2–B3`). | Todos los informes editables (`SÍ / NO`), salvo los ya entregados. | Visible y editable en `4. Evaluaciones` (permite pase de ingreso y pase de egreso). |

> **Regla para desactivar `Alta Tardía` (`SÍ -> NO`)**:
> Solo se permite quitar la marca `es_alta_tardia` cuando ya no quedan exclusiones que dependan de ella:
> - Si el alumno **no está de Baja**: todos los bimestres de Boletines (`B1..B4`) y todos los Informes deben estar nuevamente en `SÍ`.
> - Si el alumno **está de Baja**: puede quitar `es_alta_tardia` únicamente si `B1` está activo o si figura como `Sin cursada` (es decir, no tiene un recorte inicial `bimestre_desde > 1`).

---

## 3. Candados de integridad y respuestas del servidor (`pb_hooks`)

Todas las escrituras pasan transaccionalmente por `PUT /api/cys/directivo/inscripciones/:inscripcionId/evaluaciones` (`pb_hooks/lib/teacherAccess.js`). Las reglas de colección en `inscripciones` (`pb_migrations/1793100000_added_enrollment_late_entry_flag.js`) prohíben que el cliente modifique directamente `es_alta_tardia`, `cursada_estado`, `bimestre_desde`, `bimestre_hasta`, `revision_cursada` o el pasaje a/desde `Baja`.

| Invariante | Validación en servidor | Código HTTP |
| :--- | :--- | :---: |
| **Concurrencia optimista** | `expectedRevision` y `expectedUpdated` deben coincidir con la matrícula actual; ante conflicto se exige recargar antes de reintentar. | `409` |
| **Bimestres consecutivos** | Los bimestres activos de Boletines deben formar un intervalo continuo (`max - min + 1 === cantidad`). | `400` |
| **Bloqueo de ciclo completo** | Con `es_alta_tardia = false` y `estado != "Baja"`, no se acepta ningún bimestre ni informe en `NO`. | `400` |
| **Corte inicial exclusivo de A.T.** | No se acepta `bimestre_desde > 1` si `es_alta_tardia = false`. | `400` |
| **Corte final / Sin cursada exclusivo de Baja** | No se acepta `bimestre_hasta < 4` ni `SIN_CURSADA` si `estado != "Baja"` y no se envió `registrarBaja = true`. | `400` |
| **Inmutabilidad de boletines con datos** | Ningún bimestre que ya registre evaluaciones, cierres o visados (`bimestresConDatos`) puede quedar fuera del rango. | `409` |
| **Inmutabilidad de informes entregados** | Ningún informe con registros en `visados_informe` puede pasar a `evaluable = false`. La validación ocurre antes de persistir cambios en `inscripciones` para garantizar atomicidad completa. | `409` |
| **Preservación de informes al dar de Baja** | Al ejecutar `registrarBaja = true`, la matrícula se actualiza primero a `estado = "Baja"` y luego se aplican todos los tipos de informe del nivel en `nomina_informe_alumno`, de modo que los informes que Dirección decide conservar en `SÍ` queden persistidos explícitamente y no se pierdan al cambiar el valor por defecto de `Baja`. | `200` |

---

## 4. Flujos operativos en la interfaz (solo Dirección)

1. **Alta de alumno común (`AlumnoFormModal` — Paso 2)**:
   - El switch **¿Es Alta Tardía?** arranca en `NO`.
   - Al guardar, la inscripción nace `CONFIRMADA 1..4` con todos los boletines e informes activos.
2. **Alta de alumno con Alta Tardía (`AlumnoFormModal` — Paso 2)**:
   - Al pasar **¿Es Alta Tardía?** a `SÍ`, el formulario despliega la configuración inicial del ciclo:
     - **Primaria**: selector *Boletines evaluables desde* (`1.º` a `4.º`) + switches de los 3 Informes.
     - **Inicial**: switch de *Informe Ciclo Final*.
   - Al confirmar el alta, `alumnoService.createIntegral` crea el alumno/inscripción y aplica inmediatamente la configuración vía `PUT /api/cys/directivo/inscripciones/:id/evaluaciones` (con rollback automático si falla).
3. **Activar o ajustar A.T. después del alta (`AlumnoDetailModal` -> `4. Evaluaciones`)**:
   - Desde la ficha del alumno (o el botón de acceso rápido en el directorio), Dirección puede activar `Alta Tardía = SÍ`, ajustar los switches permitidos y cargar los datos administrativos/pases en el mismo guardado.
   - Los alumnos con `es_alta_tardia = true` muestran la insignia `A.T.` en el directorio y `Alta Tardía (A.T.)` en su ficha.
4. **Registrar Baja / Baja Temprana (`DarDeBajaModal`)**:
   - Reemplaza por completo al antiguo `CursadaModal` (eliminado para evitar duplicación de selectores).
   - Permite registrar en una sola operación atómica: fecha administrativa de baja, corte de boletines (`Sin cursada` o `Último bimestre evaluable`), corte de informes de maestras (bloqueando los ya entregados) y, de forma opcional en Primaria, el pase de salida para Hoja 14.
   - Una vez registrada la baja, la fecha de egreso, las instancias y los pases pueden revisarse o ajustarse posteriormente desde `4. Evaluaciones`.
5. **Integración con revisión directiva y portales docentes**:
   - Al guardar cambios, el servidor incrementa la `revision` de las instancias de Boletines e Informes del curso/ciclo.
   - Los tableros de progreso (`CourseRosterExpandPanel`) y vistas de revisión (`alumnosExcluidos`) reflejan la nómina actualizada, y los portales docentes (`/carga` y `/carga-informe`) sincronizan la lista sin expulsar a la docente ante `403`/`422`.

---

## 5. Boletines PDF — Reglas de Alta Tardía (A.T.)

Para todo alumno de Nivel Primario marcado con `es_alta_tardia = true` (o con `bimestre_desde > 1`), rigen las siguientes reglas de renderizado y validación documental:

### Renderizado automático de bimestres previos (`n < bimestre_desde`)
- **Criterios y Calificación General**: imprimen `*` automáticamente (`CalificacionCelda`).
- **PPI, Asistencias, Inasistencias y Llegadas tarde**: imprimen `---` automáticamente (`ValorCelda`).
- **Observaciones del bimestre anterior**: se completan automáticamente sobre rieles (sin campo editable) con la leyenda oficial centrada:
  `(*) Primer bimestre, información perteneciente a colegio anterior, consta en legajo de alumno.` (adaptando `Primer` / `Segundo` / `Tercer`).
- **Apoyos e Integración Escolar (Página 3)**: `firstEvaluableTerm` traslada automáticamente el registro de `¿Posee apoyos / acompañamiento?` al primer bimestre evaluable del alumno (con `NO` por defecto).
- **Celdas vacías en Página 14**: las filas no utilizadas de *Cambios de Escuela* y los campos administrativos sin dato conservan `---` para evitar manipulación en papel.

### Riel de integridad documental en Página 14 (6 campos obligatorios para emitir PDF)
La carga de los datos de Página 14 se mantiene **desacoplada del formulario de alta** (para no sobrecargar la carga inicial cuando la documentación del pase aún no llegó) y se centraliza en **`4. Evaluaciones`** (`ParticipacionEvaluativaPanel.tsx`), donde el bloque se auto-expande si faltan datos y pre-sugiere `Colegio Crecer y Ser` y la `fecha_ingreso` de la inscripción al agregar el primer pase.

Al consultar `preparacionDocumental` o generar la instantánea PDF (`buildDocumentSnapshot`), el servidor (`documentDataIssues` en `pb_hooks/lib/teacherAccess.js`) exige los **6 campos** para todo alumno con `es_alta_tardia = true || bimestre_desde > 1`:
1. `escuela_inicial` — **Escuela en la que inició el año** (colegio anterior).
2. `fecha_ingreso_inicial` — **Fecha de ingreso** en esa escuela anterior.
3. `fecha_egreso_inicial` — **Fecha de egreso** de esa escuela anterior.
4. `cambios_escuela` — al menos un pase completo con:
   - `fecha` (**Fecha** del pase),
   - `causa` (**Causa** del traspaso), y
   - `escuelaDestino` (**Pasa a la Escuela**, ej. `Colegio Crecer y Ser`).

Estos faltantes **no bloquean** la carga docente ni el visado académico; bloquean únicamente la emisión del PDF individual del alumno (con acceso directo `Completar evaluaciones y pases` desde `DocumentReadinessAlert`).

---

## 6. Pendiente por definir — Bajas Tempranas (B.T.) en Boletines PDF

Queda **explícitamente pendiente de definición** el tratamiento documental específico del boletín PDF cuando un alumno se retira en medio del ciclo (emisión del boletín para entregar a la escuela de destino), hasta contar con ejemplos institucionales reales de casos anteriores:
- **Qué falta definir a futuro**: qué campos de Página 14 deberían ser obligatorios para una B.T. (si corresponde exigir fecha/causa/escuela destino del pase de salida, escuela inicial o alguna leyenda específica en observaciones/cierre).
- **Estado operativo seguro mientras tanto (sin bloqueos)**:
  - Registrar la baja (`DarDeBajaModal`), cortar bimestres/informes y emitir los boletines PDF de los bimestres evaluables hasta `bimestre_hasta` funciona de punta a punta **sin exigir datos de pase de salida**.
  - En `documentDataIssues` (`pb_hooks/lib/teacherAccess.js`) se retiró el bloqueo de `cambios_escuela` por `bimestre_hasta < 4` para que ningún alumno de baja quede trabado al emitir su PDF por una regla aún no definida.
  - Los campos de pase de salida en `DarDeBajaModal` y `4. Evaluaciones` siguen disponibles **de forma opcional**: si Dirección los completa, se imprimen normalmente en la Página 14; si se dejan vacíos, la Página 14 conserva `---` y el PDF se emite sin impedimentos.
  - Si un alumno combina **A.T. + B.T.**, únicamente se exigen los 6 campos de ingreso de A.T. (Sección 5).
