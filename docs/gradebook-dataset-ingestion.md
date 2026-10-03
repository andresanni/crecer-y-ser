# Guía canónica de ingesta de calificaciones y boletines históricos

Actualizado: 1 de octubre de 2026.

## 1. Propósito y alcance

Este documento establece el contrato, las reglas de sanitización de datos y el procedimiento operativo para la generación de plantillas y la ingesta masiva de calificaciones, evaluaciones de criterios, PPIs, asistencias y visados de los dos primeros bimestres en PocketBase mediante Google Sheets y CSVs.

Aplica para la carga histórica previa al debut operativo del sistema en el 3° Bimestre del ciclo lectivo 2026, garantizando la consistencia acumulativa y la elegibilidad para la emisión de boletines PDF.

---

## 2. Reglas de privacidad y seguridad

- **PII y confidencialidad:** Los archivos CSV exportados con datos de menores, DNIs y calificaciones reales **nunca deben commitearse en Git**, incluirse en PRs ni almacenarse en carpetas bajo control de versiones.
- **Entorno de pruebas:** Probar siempre la ingesta primero en el entorno local (`127.0.0.1:8090`). Solo promover y ejecutar en producción (`https://alumnos-api.duckdns.org`) tras verificar en seco con `--dry-run`.
- **Semilla de desarrollo (`deploy/pocketbase-dev-seed`):** Permanece 100% sintética según el contrato de `AGENTS.md`. No incorporar calificaciones derivadas de personas reales a los seeds.

---

## 3. Especificación de Columnas y Atajos

### 3.1. Dimensiones por Grado y Período

| Período | Ciclo | Cursos | Materias Formativas (5 Criterios) | Materias Concretas (PPI + 5 Criterios + Gral) | Cierre y Alumno | Apoyos Anuales | Total Columnas |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1° Bimestre** | 1° Ciclo | 1°, 2°, 3° | 2 materias (10 cols) | 8 materias (56 cols) | 5 cols (`alumno_nombre` + 4 cierre) | 2 cols (`posee_apoyos`, `cuales_apoyos`) | **73 columnas** |
| **1° Bimestre** | 2° Ciclo | 4°, 5°, 6°, 7° | 2 materias (10 cols) | 9 materias (63 cols) | 5 cols (`alumno_nombre` + 4 cierre) | 2 cols (`posee_apoyos`, `cuales_apoyos`) | **80 columnas** |
| **2° Bimestre** | 1° Ciclo | 1°, 2°, 3° | 2 materias (10 cols) | 8 materias (56 cols) | 5 cols (`alumno_nombre` + 4 cierre) | No aplica | **71 columnas** |
| **2° Bimestre** | 2° Ciclo | 4°, 5°, 6°, 7° | 2 materias (10 cols) | 9 materias (63 cols) | 5 cols (`alumno_nombre` + 4 cierre) | No aplica | **78 columnas** |

### 3.2. Reglas de Tipeo Rápido en Google Sheets

1. **Atajos para 1° Ciclo (1°, 2° y 3° grado):**
   - `D`: Destacado
   - `AV`: Avanzado
   - `AL` o `A`: Alcanzado
   - `EP` o `P`: En proceso
   - `NA`: No Alcanzó los objetivos
   - `NC` o `-`: No corresponde
2. **Atajos para 2° Ciclo (4°, 5°, 6° y 7° grado):**
   - Números del `1` al `10` (directo con teclado numérico). El script mapea automáticamente al concepto correspondiente (`Destacado 10`, `Avanzado 9`, `Alcanzado 7`, `En Proceso 4`, `No Alcanzó Los Objetivos 1`, etc.).
3. **PPI (`<materia>_ppi`):**
   - `SI` o `NO` (por defecto `NO`).
4. **Cierre de Asistencia (`asistencias`, `inasistencias`, `llegadas_tarde`, `observaciones`):**
   - Enteros $\ge 0$. `observaciones` es texto libre opcional.
5. **Apoyos Escolares (solo 1° Bimestre):**
   - `posee_apoyos`: `SI` o `NO`.
   - `cuales_apoyos`: Obligatorio si `posee_apoyos` es `SI`, en blanco si `NO`.

---

## 4. Herramientas CLI

### 4.1. Generador de Plantillas: `scripts/generate-grade-templates.mjs`

Genera los CSVs base con los alumnos inscriptos reales y las columnas exactas de cada grado:

```bash
# Para desarrollo local (ciclo 2026, 1° y 2° bimestre):
node scripts/generate-grade-templates.mjs --ciclo 2026 --periodo 1 --out-dir ./plantillas_notas
node scripts/generate-grade-templates.mjs --ciclo 2026 --periodo 2 --out-dir ./plantillas_notas

# Para producción (apuntando al VPS):
node scripts/generate-grade-templates.mjs \
  --url https://alumnos-api.duckdns.org \
  --email admin@creceryser.local \
  --password "SECRET_PASSWORD" \
  --ciclo 2026 \
  --periodo 1 \
  --out-dir ./plantillas_produccion
```

### 4.2. Ingestor Masivo de Notas: `scripts/ingest-grades.mjs`

Valida celda por celda y persiste en PocketBase consolidando workflow y visados:

```bash
# 1. Simulación y verificación en seco (Dry-run):
node scripts/ingest-grades.mjs --csv ./plantillas_notas/notas_b1_curso_1_.csv --curso "1°" --periodo 1 --dry-run

# 2. Ingesta definitiva local:
node scripts/ingest-grades.mjs --csv ./plantillas_notas/notas_b1_curso_1_.csv --curso "1°" --periodo 1 --execute

# 3. Ingesta definitiva en producción (VPS):
node scripts/ingest-grades.mjs \
  --url https://alumnos-api.duckdns.org \
  --email admin@creceryser.local \
  --password "SECRET_PASSWORD" \
  --csv /ruta/notas_b1_curso_1_.csv \
  --curso "1°" \
  --periodo 1 \
  --execute
```

---

## 5. Garantía de Integridad y Elegibilidad Acumulativa

Al finalizar cada grado en `--execute`, el script:
1. Crea o actualiza `evaluaciones_materia` con sus respectivos `ppi` y `calificacion_general_id`.
2. Persiste los 5 registros en `evaluaciones_criterios` por materia.
3. Persiste `cierres_periodo_alumno`.
4. Si es período 1, actualiza `posee_apoyos` y `cuales_apoyos` en `inscripciones`.
5. Coloca la instancia de `instancias_carga_boletin` en `estado = "CONTROL_DIRECTIVO"`.
6. Genera o actualiza los registros de `visados_boletin` para todos los alumnos regulares con:
   - `estado = "VISADO"`
   - `generacion_visado >= 1`
   - `revision_visada = revision_contenido`

Esto asegura que al llegar el 3° Bimestre, `evaluatePdfEligibility()` verifique que 1° y 2° Bimestre están visados y vigentes, permitiendo la generación inmediata de boletines acumulativos en PDF.
