# Casos de borde de matrícula histórica

Actualizado: 4 de octubre de 2026.

## Estado vigente

El alcance evaluable está publicado. El hito hito-b1-completo-2026-10-03 conserva 83 boletines de B1 completos y visados y B2 sin boletines. Respaldo: /root/pb/milestones/20261003-b1-completo-b2-vacio. Las reglas funcionales y evidencia están en [Emisión de boletines](gradebook-pdf-emission.md).

| Caso confirmado por dirección | Resultado aplicado |
| --- | --- |
| Retiro sin cursada mínima | Inscripción conservada con alta y baja; SIN_CURSADA, sin boletines exigibles. |
| Retiro después de B1 | Rango B1–B1; notas, cierre, apoyos y visado de B1 recuperados desde el PDF. |
| Retiro después de B2 | Rango B1–B2; B1 recuperado y visado. B2 preparado pero no cargado por decisión del hito. B3/B4 fuera de alcance. |
| Cuatro DNI regulares faltantes | Permanecen vacíos; notas y visados preservados, PDFs bloqueados individualmente. |
| Tres altas tardías sin matrícula | Restauración pendiente de verificar identidad y confirmar rango. No se crean notas retroactivas. |

Las 81 matrículas restantes siguen con cursada PENDIENTE: dirección debe confirmar sus rangos antes de nuevas entregas. No se deben inferir de fechas, ausencias de notas ni estado administrativo.

## Resguardo de la preparación histórica

Los payloads nominales antiguos no deben ejecutarse: uno contiene un alumno_id inexistente y el caso de baja ya tiene matrícula regularizada. La copia original y la preparación verificada permanecen fuera de Git en C:/pocketbase/audits/regularizacion-20261003/. Consultar el informe privado y releer producción antes de cualquier restauración; no reutilizar IDs sin verificarlos ni duplicar matrículas existentes.

Este archivo conserva sólo el estado operativo sin DNIs ni payloads personales. El historial Git anterior no se reescribe en esta actualización.
