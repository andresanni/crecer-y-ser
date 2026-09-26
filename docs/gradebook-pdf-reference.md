# Referencia de diseño para el PDF del boletín

El ejemplo compartido el 25 de septiembre de 2026 es un PDF estático de 13 páginas, aproximadamente de 595 × 822 puntos por página. No contiene campos AcroForm. Se revisó como referencia visual, sin copiar el archivo ni datos personales al repositorio.

## Estructura observada

1. Portada con identificación escolar, del alumno, curso, turno, responsables y año.
2. Presentación institucional, objetivos y explicación de la escala de calificación.
3. Cuadros de integración escolar y materias con criterios, calificación general y columnas para los cuatro bimestres.
4. Hojas de asistencia y observaciones de cada bimestre, con espacios de firmas.
5. Síntesis conceptual, promoción y visado de dirección.
6. Registro administrativo de escuela, traslados y contacto.

El ejemplo de segundo bimestre muestra valores de los períodos ya cursados y espacios reservados para los siguientes. La generación dinámica deberá definir si cada emisión produce el cuadernillo anual actualizado o un documento exclusivo del bimestre; el ejemplo favorece el cuadernillo anual. La fuente de firmas, sellos y textos institucionales también deberá quedar definida antes de implementar esa fase.

## Contrato previsto

La generación de PDF sólo podrá partir de un boletín `VISADO` y de su revisión de contenido vigente. Se guardarán la versión del archivo, la revisión de contenido y la versión de diseño utilizada. Una corrección posterior marcará esa versión como desactualizada y exigirá nuevo visado antes de regenerar. El archivo de referencia no se usará como plantilla rellenable porque carece de campos; las páginas deberán componerse a partir de datos y recursos autorizados.
