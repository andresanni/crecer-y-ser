# Registro de Casos Borde de Matrícula Histórica (Ingresos Tardíos y Bajas)

Este documento registra los alumnos cuyas inscripciones fueron postergadas o retiradas temporalmente durante la ingesta masiva de calificaciones históricas del ciclo 2026, con el fin de evitar bloqueos de flujo en el control directivo (requisito de planilla completa) mientras se completa el desarrollo de la feature de alcance evaluable por período (*enrollment evaluable scope*).

> **Aviso de convivencia**: Las fichas de los alumnos y sus responsables permanecen íntegras en la base de datos (`alumnos`, `responsables`, `alumno_responable`). Únicamente se retiraron o postergaron los registros de `inscripciones` específicos para que la regularidad no afecte el visado de bimestres en los que el alumno no cursó.

---

## 1. Casos por Curso

### 2° Grado (Curso ID: `6qa5scfitpxf1h5`)

1. **Barrios Chancahuaña, Shantall Aitanna**
   - **ID Alumno**: `e8n864v6y2t8uau`
   - **DNI**: `56554558`
   - **ID Inscripción original**: `a16660ia8nixl8y`
   - **Ciclo Lectivo**: 2026 (`6ktldbc9b6zbn3r`)
   - **Fecha de Ingreso**: `2026-06-08` (2° Bimestre)
   - **Estado previo**: Regular
   - **Motivo de postergación**: Al ingresar en junio (2° Bimestre), no poseía calificaciones correspondientes al 1° Bimestre. Su presencia activa impedía que el 1° Bimestre alcanzara estado completo de llenado para el visado directivo.

2. **Tastaca, Fabricio Ezequiel**
   - **ID Alumno**: `a743w759t1y009q`
   - **ID Inscripción**: `l26p0d25u1d2zly`
   - **Ciclo Lectivo**: 2026 (`6ktldbc9b6zbn3r`)
   - **Fecha de Egreso / Baja**: `2026-08-20` (3° Bimestre)
   - **Estado previo**: Baja
   - **Motivo de postergación**: Su calificación fue omitida del CSV de ingesta para sincronizar su carga con las reglas de corte que establezca la nueva feature de bajas temporales.

---

### 4° Grado (Curso ID: `p7w6daavi2stdkr`)

3. **Vazquez, Amelia**
   - **ID Alumno**: `5greevqqtwydjna`
   - **DNI**: `56070578`
   - **ID Inscripción original**: `k8ac0xvbz2de9hb`
   - **Ciclo Lectivo**: 2026 (`6ktldbc9b6zbn3r`)
   - **Número de orden**: 16
   - **Número de inscripción**: 56
   - **Fecha de inscripción**: `2026-02-20 00:00:00.000Z`
   - **Fecha de ingreso**: `2026-02-25 00:00:00.000Z`
   - **Motivo de postergación**: Ingreso tardío sin notas evaluables en el dataset oficial del 1° Bimestre.

4. **Bompadre, Ambar Francesca**
   - **ID Alumno**: `wy5oi7is4uosben`
   - **DNI**: `56178896`
   - **ID Inscripción original**: `smdtnshxxre2068`
   - **Ciclo Lectivo**: 2026 (`6ktldbc9b6zbn3r`)
   - **Número de orden**: 19
   - **Fecha de inscripción**: `2026-05-15 00:00:00.000Z`
   - **Fecha de ingreso**: `2026-05-18 00:00:00.000Z` (2° Bimestre)
   - **Motivo de postergación**: Alumna incorporada a la institución a mediados de mayo de 2026. No registra actividad evaluativa durante el 1° Bimestre.

---

## 2. Payloads de Restauración

Cuando la feature de alcance evaluable esté lista en producción, las inscripciones pueden restaurarse mediante la API de PocketBase o consulta SQL directa:

```json
[
  {
    "id": "a16660ia8nixl8y",
    "alumno_id": "e8n864v6y2t8uau",
    "curso_id": "6qa5scfitpxf1h5",
    "ciclo_id": "6ktldbc9b6zbn3r",
    "estado": "Regular",
    "fecha_ingreso": "2026-06-08 00:00:00.000Z"
  },
  {
    "id": "k8ac0xvbz2de9hb",
    "alumno_id": "5greevqqtwydjna",
    "curso_id": "p7w6daavi2stdkr",
    "ciclo_id": "6ktldbc9b6zbn3r",
    "estado": "Regular",
    "numero_orden": 16,
    "numero_inscripcion": "56",
    "fecha_inscripcion": "2026-02-20 00:00:00.000Z",
    "fecha_ingreso": "2026-02-25 00:00:00.000Z"
  },
  {
    "id": "smdtnshxxre2068",
    "alumno_id": "wy5oi7is4uosben",
    "curso_id": "p7w6daavi2stdkr",
    "ciclo_id": "6ktldbc9b6zbn3r",
    "estado": "Regular",
    "numero_orden": 19,
    "fecha_inscripcion": "2026-05-15 00:00:00.000Z",
    "fecha_ingreso": "2026-05-18 00:00:00.000Z"
  }
]
```
