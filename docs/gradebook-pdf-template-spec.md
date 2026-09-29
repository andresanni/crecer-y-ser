# Especificación de la plantilla de boletines

Estado: relevamiento inicial del 27 de septiembre de 2026. Complementa el [roadmap canónico](gradebook-pdf-reference.md), sin sustituir sus decisiones de workflow. Existe una plantilla con portada aprobada, página 2 con regla por grado confirmada, página 3 en revisión y 10 páginas pendientes.

## Formato acordado

- 13 páginas, orientación vertical, A4: 210 × 297 mm.
- Libreta anual con cuatro columnas bimestrales; la emisión establece hasta qué período se muestran datos.
- Referencia visual: PDF de segundo bimestre. Fuente de recursos: PPTX de primer bimestre.
- Los originales permanecen fuera del repositorio. No incorporar nombres, DNI, notas ni otros datos personales del ejemplo a pruebas o assets.
- El ejemplo es de primer grado. El primer prototipo reproduce su estructura; los demás grados requieren validar materias y distribución.

## Mediciones de partida

Mediciones de la página 4 del PDF, expresadas en milímetros desde el borde superior izquierdo. Son referencias de composición, no posiciones definitivas del A4. El PDF original mide aproximadamente 209,9 × 290 mm.

| Elemento | Posición y tamaño aproximados en el original |
| --- | --- |
| Encabezado | x 4,70; y 1,17; ancho 201,05; extremo inferior 12,52 |
| Tabla de Lengua | x 4,70; y 18,16; ancho 201,05; extremo inferior 104,18 |
| Tabla de Matemática | x 4,70; y 113,55; ancho 201,05; extremo inferior 235,36 |
| Columna descriptiva | 118,46 mm, aproximadamente 59 % de la tabla |
| Cada columna bimestral | Aproximadamente 20,65 mm, 10,25 % de la tabla |
| Pie institucional | x 1,78; y 271,16; ancho 206,44; alto 18,84 |
| Escudo del colegio en pie | Aproximadamente 12,62 × 16,14 mm |
| Logo en pie | Aproximadamente 52,71 × 16,14 mm |
| Escudo nacional en pie | Aproximadamente 7,67 × 11,64 mm |

Las coordenadas del PPTX exportado no se usarán como autoridad de layout: algunas tablas declaran 83,33 mm de ancho de forma mientras la suma de sus columnas supera 200 mm. El PDF permite resolver esa inconsistencia.

Para A4, punto de partida del prototipo: márgenes laterales cercanos a 5 mm, tablas de aproximadamente 200 mm, encabezado y pie con zonas reservadas y alturas naturales del contenido. Los 7 mm extra se distribuirán sin escalar toda la página. Comprobar el margen imprimible de una impresora real antes de aceptar la composición final.

## Identidad visual medida

Colores observados en objetos del PDF de la página académica:

| Uso | Valor de referencia |
| --- | --- |
| Texto y bordes azules | `#003399` |
| Cabeceras celestes | `#BBE0E3` |
| Celdas descriptivas grises | `#EEEEEE` |
| Calificación general amarilla | `#FFF2CC` |
| Bandas grises suaves | `#F3F3F3` |

Centralizar estos valores en el futuro estilo documental. No cambiar el tema global de la app para reproducir el boletín.

Fuentes declaradas por el PDF: Merriweather, Arial y Proxima Nova, con distintos pesos. La medición de tamaños exige considerar transformaciones del PDF y contrastar el resultado impreso; no copiar valores extraídos sin prueba. Merriweather normal e italic se incorporaron localmente durante la primera revisión de portada, con su licencia OFL. Proxima Nova continúa pendiente para las páginas interiores.

## Inventario y selección de recursos

Los cuatro archivos recuperados son copias binarias exactas del contenido del PPTX. Su integridad se registra en [gradebook-pdf-assets.json](gradebook-pdf-assets.json). No se han redibujado ni aumentado artificialmente de resolución.

| Recurso disponible | Dimensiones | Uso y decisión inicial |
| --- | --- | --- |
| `public/boletines/logo-historico.png` | 581 × 179 px | Logo de la referencia; candidato para portada y pie. Se conserva como variante histórica: el logo global tiene otras proporciones y menor resolución |
| `public/boletines/isotipo-historico.png` | 70 × 71 px | Isotipo del encabezado; conserva el dibujo plano original. El isotipo global tiene otra presentación |
| `public/boletines/escudo-argentina.png` | 39 × 59 px | Escudo nacional; calidad limitada, pendiente de evaluación impresa o de original de mayor resolución |
| `public/boletines/escudo-ciudad.png` | 97 × 118 px | Escudo de la portada institucional; calidad limitada, pendiente de evaluación |
| `public/escudo-placa.png` | 594 × 760 px | Reutilizar el recurso existente del colegio; mayor resolución que las variantes de 119 × 154 y 91 × 118 px del PPTX |
| `public/logo.png` | 400 × 103 px | Logo existente de la app; conservar su uso actual |
| `public/isotipo.png` | 512 × 512 px | Isotipo existente de la app; visualmente distinto del histórico, no sustituir automáticamente |

A los tamaños del pie original, el escudo nacional alcanza aproximadamente 129 píxeles por pulgada y el logo histórico unos 280. La portada usa el logo a mayor tamaño y requiere otra revisión. Estos datos sirven para identificar qué original mejoraría la impresión, sin prometer calidad vectorial.

No se incorporaron las franjas compuestas `image7`, `image8`, `image10`, `image11` e `image12`: mezclan gráficos y textos, algunos con grado o año fijos. Se reconstruirán en HTML. Tampoco se duplicaron las placas escolares pequeñas `image5` e `image9`.

## Clasificación del contenido

| Bloque | Elementos fijos o de configuración | Datos variables | Elementos manuales o pendientes |
| --- | --- | --- | --- |
| Portada | Denominación, CUE, distrito, logos, rótulos, sección A, turno Mañana y jornada Simple | Alumno, DNI, grado y responsable; año y ciclo como contexto documental | Regla de responsable; firma |
| Institucional | Objetivos y lema | Descripción de escala según configuración | Validación de textos vigentes |
| Integración | Rótulos y estructura | Apoyos y acompañamiento | Tratamiento de historia anual |
| Materias | Estructura común de tabla | Materia, criterios, PPI, notas, ciclo pedagógico y bimestres | Variantes por grado |
| Cierres bimestrales | Rótulos y espacios de firma | Asistencias, inasistencias, tardanzas y observaciones | Firmas en blanco inicialmente |
| Cierre anual | Estructura de síntesis y promoción | Síntesis, permanencia y destino de promoción | Fuente de datos y sello |
| Administrativo | Rótulos | Escuela, fechas, traslados, contacto y cambios de domicilio | Fuentes e historial faltantes |

## Contrato mínimo para el primer prototipo

El primer componente académico recibirá datos de presentación explícitos: grado, ciclo pedagógico, año, materias ordenadas y sus criterios, PPI y calificación general para cuatro bimestres. No recibirá registros de PocketBase ni funciones de consulta.

Cada celda distinguirá valor confirmado, período futuro, dato faltante y no aplicable. Un cero confirmado se imprime como cero. La decisión de elegibilidad de un dato se resolverá antes del componente; la plantilla sólo lo representa.

Los encabezados, pies y tablas serán compartidos. Los controles de la app no se imprimirán. La vista previa y la exportación usarán la misma composición.

## Próxima unidad de trabajo: una página académica A4

1. Definir tipos de presentación y muestras sintéticas con dos materias.
2. Implementar marco de página, encabezado, pie y tabla reutilizable con cuatro bimestres.
3. Incluir criterios extensos y una calificación extensa equivalente en longitud a la referencia, sin copiar datos del alumno.
4. Probar el motor de impresión local y verificar que el PDF tiene una sola página A4.
5. Inspeccionar recursos, desbordes, bordes, saltos de línea y texto seleccionable.
6. Presentar el resultado visual al usuario y registrar correcciones antes de extenderlo al resto de las páginas.

No se cierra este prototipo sólo porque compile. La salida requiere un PDF inspeccionado y una lista explícita de diferencias pendientes, en particular fuentes y nitidez de los escudos oficiales.


## Plantilla base disponible para revisión

El usuario solicitó comenzar a construir el documento página por página. Se prioriza la portada antes de la prueba académica prevista; esta última continúa como requisito técnico pendiente.

- Entrada de vista previa: `plantilla-boletin.html`, disponible sólo mediante el servidor de desarrollo; no forma parte del build productivo actual.
- Composición única: `src/modules/boletines/documentos/BoletinDocument.tsx`.
- Estilos de impresión y documento: `src/modules/boletines/documentos/BoletinDocument.module.css`.
- Contrato inicial de portada y lista de páginas: `src/modules/boletines/documentos/boletinDocument.model.ts`.
- Datos ficticios y controles de revisión: `src/modules/boletines/documentos/preview.tsx` y `preview.css`.

Para retomar: ejecutar `npm run dev` y abrir `/plantilla-boletin.html` en el puerto indicado por Vite. La barra permite navegar a cada página e imprimir la muestra; los controles no se imprimen. No abrir el HTML directamente desde el disco porque requiere el servidor Vite.

Estado: página 1 aprobada; página 2 estática con agrupación de escala por grado confirmada; página 3 compuesta en revisión; páginas 4 a 13 reservadas. Los encabezados y pies interiores son compartidos. El contrato se ampliará al construir cada sección. La portada usa Merriweather local; el bloque de Gobierno conserva Georgia/Times, aprobado por el usuario. Las páginas interiores mantienen su tipografía provisional y no incorporan Proxima Nova.

Verificación: lint y build correctos, con el warning conocido de bundle; revisión visual en Edge automatizado con Playwright; 13 secciones, sin desborde vertical de las hojas ni imágenes rotas con la muestra actual. Todavía no se verificó una exportación PDF ni impresión física. La verificación de tamaño y paginación del PDF sigue pendiente antes de aceptar el diseño.

Siguiente paso con el usuario: revisar la página 2; la composición visual de la portada está aprobada.


## Revisión de portada 1 — 27 de septiembre de 2026

Solicitudes del usuario aplicadas:

- Conservar escudo e inscripción del Gobierno de la Ciudad, aprobados.
- Título Educación Primaria: Merriweather, peso 700, 37 pt.
- Subtítulo, CUE y ciclo pedagógico: Merriweather; el CUE conserva cursiva.
- Cuadros de identificación, curso y responsable: Merriweather y borde centralizado de 0,6 mm (antes 0,3 mm).
- Escudo junto a la firma: nueva imagen suministrada por el usuario, copiada sin modificación a `public/boletines/escudo-colegio.png`. El logo horizontal sigue siendo el recurso histórico; la imagen recibida corresponde al escudo vertical.

Merriweather normal e italic se alojan en `public/boletines/fonts/`, con licencia `OFL.txt`, desde el [repositorio Google Fonts](https://github.com/google/fonts/tree/main/ofl/merriweather). Son fuentes variables completas, sin dependencia de peticiones externas al visualizar. La compresión a formato web queda como optimización pendiente antes de producción; no se añaden dependencias para este prototipo.

Verificación: navegador Edge con fuentes cargadas; el motor identifica el título como Merriweather Bold, tamaño CSS equivalente a 37 pt. La muestra conserva 13 hojas sin desbordamiento vertical. Pendiente: aceptación visual de esta revisión y exportación PDF.


## Portada aprobada: contrato de datos

| Celda | Contrato | Presentación |
| --- | --- | --- |
| Alumno/a | `alumno.apellidos`, `alumno.nombres` | Una celda: apellidos, coma y nombres |
| DNI | `alumno.dni` | Texto, conservando ceros y formato suministrado |
| Grado | `curso.grado` | Una celda |
| Apellido del responsable | `responsable.apellidos` | Celda izquierda |
| Nombre del responsable | `responsable.nombres` | Celda derecha |

Los tres valores A / Mañana / Simple se centralizan en `portadaEstatica`, dentro de `boletinInstitutionalContent.ts`. No vienen de la lógica académica. El espacio de firma no contiene datos ni controles. El año permanece como contexto documental. El ciclo pedagógico se deriva del grado: 1 a 3 → 1er Ciclo; 4 a 7 → 2do Ciclo. No se almacena ni se recibe como campo independiente.

El control Resaltar campos dinámicos se activa sólo en la vista previa y resalta las cinco celdas con fondo amarillo y contorno discontinuo; cada celda lleva una descripción al pasar el puntero. La regla sólo se aplica a medios de pantalla, sin alterar dimensiones ni exportarse al papel.

## Página 2: primera composición

`InstitutionalPage.tsx` compone el contenido; `boletinInstitutionalContent.ts` centraliza los objetivos y las cinco descripciones de escala transcritas de la referencia. Cita y objetivos son contenido documental, no instrucciones de ejecución ni validación normativa. La página no muestra información personal del alumno.

Se mantienen Arial para lectura y tabla, Merriweather para títulos y lema, escudo de la Ciudad superior y pie institucional compartido con el escudo actualizado. Las agrupaciones Aprobado/Desaprobado reproducen el ejemplo y requieren revisión institucional antes de habilitar otras escalas.

Verificación local: 13 secciones, cinco celdas dinámicas, cero desbordes verticales con la muestra, captura visual completa de página 2 y resaltado ausente bajo medios de impresión. La exportación PDF y la impresión física continúan pendientes. Próxima revisión: página 2; no continuar a página 3 hasta recibir la devolución de diseño.


## Revisión de portada 2 y página institucional 2

Ajustes solicitados y aplicados:

- Portada: margen superior del bloque firma/escudo de 8 a 16 mm. La línea baja 8 mm y deja mayor espacio para la firma manuscrita, conservando el año al pie.
- El contrato documental recibe `curso.grado` como número de 1 a 7. `cicloPedagogicoDelGrado` centraliza la derivación: 1, 2 y 3 son primer ciclo; 4, 5, 6 y 7 son segundo ciclo. Se elimina `curso.cicloPedagogico` del contrato para evitar inconsistencias. No hay cambios de BBDD. La futura integración debe entregar un grado normalizado; un grado inválido se rechaza, nunca se asigna por defecto al segundo ciclo.
- La vista previa marca el ciclo derivado en azul con borde punteado al activar Resaltar campos dinámicos. Las cinco celdas originales siguen en amarillo. Ambas marcas desaparecen al imprimir.
- Página 2: cita bajo el escudo de 9 a 10 pt; borde de tabla aumentado exactamente 1 px CSS respecto de 0,4 mm, centralizado como `--documento-borde-escala`.
- Pie compartido: borde inferior aumentado 1 px CSS respecto de 0,3 mm; República Argentina de 9 a 10 pt y escudo nacional de 7 × 11 a 8 × 12,5 mm; año en Merriweather negrita de 14 pt (antes serif de 12 pt).
- Se confirmó el uso de `escudo-colegio.png`, la imagen nueva de portada, también en el pie. No se reutiliza la placa anterior.

Verificación: los siete grados producen su ciclo correcto y 0, 8, fracciones y NaN son rechazados. Lint y build correctos con la advertencia conocida de bundle. Capturas de portada y página 2 revisadas, sin imágenes rotas ni desbordes verticales con los datos de muestra. El resaltado del ciclo no aparece bajo medios de impresión. La aceptación de estos ajustes queda pendiente del usuario; todavía no se verificó PDF ni impresión física.


## Página 2: ajuste de lectura y posición del pie

- Descripciones de las cinco calificaciones: de 9 a 10 pt, conservando los tamaños de etiquetas y resultados.
- Desaprobado: rojo suavizado `#B34B4B`, centralizado en `--documento-rojo`.
- Fondo del pie compartido: de `#F3F3F3` a `#EAEAEA`.
- Pie interior: alineación en cuatro columnas estables y padding de 2 mm vertical / 3 mm horizontal. Se conserva el margen lateral de 5 mm y se reduce el margen inferior de 7 a 5 mm para asentar la franja sin tocar el borde de hoja. La portada mantiene su composición aprobada.

Verificación visual en Edge: página 2 completa, ninguna hoja desborda horizontal o verticalmente, pie sin desborde propio y separación medida de aproximadamente 5 mm a los bordes inferior y lateral. Lint y build correctos con la advertencia conocida del bundle. El margen de 5 mm deberá comprobarse en la impresora utilizada durante la aceptación física; todavía no se ha validado en papel. Próximo paso: devolución del usuario sobre esta revisión de página 2.


## Página 2: contenido estático y excepción confirmada de 7.º

El usuario confirmó que el contenido institucional es estático. Tras aclarar que No alcanzó los objetivos ya era Desaprobado, confirmó incluir también En Proceso como Desaprobado sólo en séptimo grado.

- Grados 1 a 6: Aprobado abarca las cuatro primeras filas; Desaprobado sólo No alcanzó los objetivos.
- Grado 7: Aprobado abarca las tres primeras filas; Desaprobado abarca En Proceso y No alcanzó los objetivos mediante una celda combinada de dos filas.
- La regla modifica la leyenda del documento, no calcula ni escribe notas, promoción ni estados del workflow.
- El selector Grado de muestra de la vista previa permite revisar ambos ciclos y esta variación sin modificar datos reales. Los criterios de página 3 siguen siendo una muestra de referencia; las calificaciones de muestra cambian entre texto (1–3) y texto con número (4–7), sin simular mallas reales de todos los grados.

## Página 3: primera composición para revisión

Componente `FormativePage.tsx`, alimentado por el contrato documental. Encabezado compartido con el mismo gris `#EAEAEA` del pie, isotipo y lema a la izquierda, grado y nivel a la derecha. Se conservan márgenes laterales de 5 mm.

Contenido: cuadro de apoyos e integración, tabla Trabajo en el aula, tabla Convivencia, franja explicativa de escala y pie institucional. Cada materia formativa usa una única tabla reutilizada con cinco criterios de muestra y cuatro columnas bimestrales. No contiene PPI ni calificación general, conforme al modelo de esta página.

Los criterios del ejemplo se conservan como referencia curricular en `boletinDocument.fixture.ts`; las notas son sintéticas. Las materias y criterios llegan por propiedades y no están fijados dentro del componente. Los valores diferencian dato confirmado, período futuro y dato faltante; el futuro se muestra como `---` y el faltante como `Pendiente`, para no fingir completitud.

El contrato incorpora `integracion` y `materiasFormativas`. La muestra muestra apoyos NO y deja promoción con acompañamiento como dato de período futuro. Las celdas de apoyos y notas se identifican con las marcas dinámicas de revisión. El backend y la emisión institucional siguen fuera del alcance de este prototipo.

Verificación: tres tablas en página 3 (apoyos y dos materias), sin desbordes horizontales/verticales ni imágenes rotas en las 13 hojas. Página 2 verificada con grados 1, 6 y 7: combinaciones Aprobado/Desaprobado de 4/1, 4/1 y 3/2 filas, respectivamente. Captura de página 3 inspeccionada visualmente. Lint y build correctos con la advertencia conocida de bundle. Exportación PDF e impresión física aún pendientes. Siguiente trabajo: devolución del usuario sobre página 3 antes de continuar a página 4.


## Página 3: tipografía, bordes y variantes de calificación

- Encabezado evaluativo: margen superior de 5 mm (antes 7), Merriweather 700 a 14 pt, coherente con el año del pie. Se conserva el gris compartido. No se modifican los márgenes de portada y página 2.
- Tablas evaluativas y acompañamiento: fuente centralizada Proxima Nova con peso 700; bordes propios de 0,25 mm. Se preservan los bordes más gruesos de páginas 1 y 2.
- Proxima Nova todavía no está incorporada como fuente web: se verificaron recursos locales y fuentes de Windows; el PPTX contiene `ProximaNova-bold.fntdata` en formato incrustado de Office, no directamente utilizable mediante CSS. Mientras se recibe una fuente compatible, el navegador usa Arial negrita. La vista previa informa este pendiente. No dar la tipografía por aceptada hasta cargar y verificar el archivo auténtico.
- Para finalizar la fuente se necesita Proxima Nova Bold en WOFF2, WOFF, TTF u OTF utilizable por el proyecto. No se extrajo una fuente parcial del PDF ni se agregó un enlace a una fuente de terceros no verificada.
- Primer ciclo: calificaciones de muestra sólo con palabra, a 8,5 pt. Segundo ciclo: palabra a 8 pt y número a 8,5 pt en una segunda línea consistente, manteniendo el guion y evitando cortes arbitrarios entre etiqueta y número.
- El selector Grado de muestra alterna ambos casos. Las cinco variantes numéricas de prueba son ALCANZADO - 7, DESTACADO - 10, AVANZADO - 8, AVANZADO - 9 y ALCANZADO - 6. Son fixtures explícitos: no se calcula una nota numérica desde una etiqueta ni se agrega un número por el grado en datos reales.
- El componente conserva la etiqueta íntegra del contrato y sólo separa visualmente un sufijo numérico con guion. La futura integración recibirá los valores oficiales de la escala configurada en BBDD; esta iteración no consulta ni modifica PocketBase y no requiere cargar aún el set del segundo ciclo.

Revisión con grados 2, 4 y 7: encabezado a 5 mm, sin desbordes de página ni celdas con las muestras; ambas variantes listas para comparación. La fuente definitiva y la validación PDF siguen pendientes.


## Estado vigente: calificaciones de presentación y fuente Lato

Esta revisión sustituye la solicitud previa de Proxima Nova y el formato con guion. Ya no se necesita recibir esa fuente. Se utiliza Lato Bold local en tablas evaluativas, acompañamiento y leyenda amarilla. Merriweather se conserva en portada y encabezados. Fuente y licencia OFL se incorporaron desde [Google Fonts](https://github.com/google/fonts/tree/main/ofl/lato), con hash en el manifiesto de assets; la visualización no depende de una conexión externa.

El contrato de presentación `CalificacionDocumental` contiene un concepto explícito y un número opcional, separados. El render no analiza cadenas ni deduce notas. Los seis conceptos admitidos son destacado, avanzado, alcanzado, enProceso, noAlcanzoObjetivos y noCorresponde; la integración futura hará la correspondencia desde los valores de escala en BBDD. Por ahora sólo hay fixtures y no se cambia el backend.

- Calificaciones comunes: etiqueta de 8,5 pt centrada. Cuando hay número, aparece en una segunda línea a 10 pt, sin guion.
- No alcanzó los objetivos: etiqueta a 7 pt, con ajuste de línea y número debajo si corresponde.
- No corresponde: texto exacto `NO CORRESPONDE A LA PLANIFICACIÓN DEL BIMESTRE`, a 6,5 pt; no muestra nota numérica.
- Futuro y dato faltante conservan sus estados explícitos (`---` y `Pendiente`).
- Filas evaluativas de 15 mm y columnas fijas: 59 % para criterio y cuatro columnas de 10,25 %. Las celdas no cambian de altura entre ciclos y el texto no se recorta mediante overflow hidden ni elipsis.
- Separación entre materias y antes de la primera tabla: 10 mm. Se mantienen bordes finos de 0,25 mm y dos materias por hoja.
- Leyenda amarilla: de 7,5 a 8,5 pt, en Lato Bold.

Las muestras ahora incluyen todos los conceptos, números diferentes para un mismo concepto y ambos textos largos. La selección de grado alterna las muestras de primer y segundo ciclo; no representa datos académicos reales. Se confirma la dimensión fija con el contenido de referencia y las variantes de muestra; futuros criterios fuera de este tamaño deberán detectarse y resolverse antes de emitir, nunca truncarse silenciosamente.

Siguiente paso: revisión visual del usuario de página 3 con Lato y ambos ciclos. La carga de escalas en BBDD, su adaptador, el PDF final y la prueba física continúan diferidos.

Validación de esta revisión: Lato cargada; grados 2, 4 y 7 sin desbordes de página ni contenido de celdas; las cinco filas de cada tabla miden 15 mm. Lint y build correctos, con la advertencia conocida de tamaño del bundle.


## Baseline de página 4: Lengua y Matemática

La leyenda amarilla compartida sube de 8,5 a 9,5 pt, con Lato Bold 700. Se aplica tanto a página 3 como a página 4.

Página 4 implementada en `AcademicPage.tsx`: dos materias con indicadores de ciclo y grado, agrupación de bimestres por cuatrimestre, fila PPI, cinco criterios y calificación general amarilla. El contrato agrega `materiasAcademicas`, con cuatro valores de PPI y cuatro calificaciones generales por materia. Son datos explícitos de presentación, no cálculos de promedios ni consultas a BBDD.

`EvaluationTable.tsx` unifica tablas formativas y académicas con variantes explícitas; `DocumentCells.tsx` centraliza las calificaciones y `ScaleLegend` comparte la leyenda. Cambios futuros de tipografía, calificaciones y columnas se aplican en un solo lugar.

La prueba inicial quedó demasiado ajustada al pie. Se preservaron filas de criterios de 15 mm y se compactaron sólo las bandas académicas: PPI 6 mm; calificación general 10 mm; indicadores de ciclo/cuatrimestre a 9 pt con padding de 1 mm. Separación entre tablas 8 mm; composición con separación mínima de 4 mm antes de la leyenda. No se redujeron fuentes de criterios ni calificaciones respecto a página 3.

Muestras: Lengua y Matemática con criterios del modelo de primer grado, notas ficticias que incluyen textos largos, calificaciones generales explícitas y PPI NO/SÍ. Cambiar Grado de muestra verifica el formato de calificaciones y los indicadores; no convierte estos textos en una malla oficial del grado seleccionado.

Verificación en grados 1, 4 y 7: contenido de celdas sin desbordes, margen inferior del pie de 5 mm y separación real de aproximadamente 8,1 mm entre segunda tabla y leyenda. Captura de página 4 inspeccionada. La composición cabe en A4 en el navegador; exportación PDF e impresión física permanecen pendientes. Próximo paso: revisión visual del usuario de página 4, antes de extender a páginas 5–7.


## Aprobación de página 4 y variantes por ciclo

Página 4 aprobada por el usuario como base visual académica. A partir de página 5, primer ciclo (1.º–3.º) conserva Conocimiento del Mundo; segundo ciclo (4.º–7.º) incorpora Ciencias Sociales y Ciencias Naturales en su reemplazo. El cambio se resolverá mediante composición por ciclo, compartiendo tablas, celdas, estilos, encabezado y pie.

El adjunto presentado como segundo ciclo contiene aún el modelo de primer ciclo. Quedan pendientes el orden y las parejas de materias, los criterios de referencia y la cantidad final de páginas del segundo ciclo. No se modifica todavía el manifiesto de 13 páginas ni se considera representativa del segundo ciclo la distribución actual de la vista previa. El punto de reanudación y los pasos siguientes están en `gradebook-pdf-reference.md`.


## Página 5: referencia corregida y composición por ciclo

La referencia válida del segundo ciclo tiene 14 hojas, con Ciencias Sociales y Ciencias Naturales juntas en página 5 y Educación Física sola en página 8. El mapa completo queda documentado en `gradebook-pdf-reference.md`. Primer ciclo conserva 13 hojas. Este hallazgo resuelve el pendiente del adjunto incorrecto.

Página 5 renderizada en ambas variantes, reutilizando sin cambios los estilos de página 4: dos tablas, cinco criterios por materia, PPI, cuatrimestres, calificación general y leyenda a 9,5 pt en negrita. El selector de grado actualiza contenido, índice y total de hojas. Las páginas posteriores aún son reservas. Se verificaron ambas composiciones sin desbordes, incluidos conceptos largos y números en segunda línea. Pendiente: aceptación visual del usuario.


## Materias restantes completas

Páginas 6–7 del primer ciclo y 6–8 del segundo renderizadas sin cambios de estilo. Se conservan cinco criterios de altura fija por materia, PPI, cuatrimestres y calificación general. Educación Física aparece sola arriba en la última página académica del segundo ciclo; la leyenda y el pie permanecen abajo, con espacio libre entre ambos bloques. Todas las capturas nuevas fueron inspeccionadas y no presentan desbordes. La distribución de materias mantiene el mapa canónico de `gradebook-pdf-reference.md`. Los cierres y hojas administrativas aún están reservados.


## Primer cierre bimestral: baseline para revisión

Sólo primer bimestre renderizado, compartido entre ciclos. Tabla a 14 mm del encabezado y 1 mm de separación lateral adicional; columna de etiquetas al 69 %, bordes finos compartidos. Títulos 14 pt, filas de asistencia 13 pt y 9 mm de alto. Observaciones: área interior de 43 mm, texto 11 pt, interlineado 1,45, saltos de línea preservados y ajuste de palabras largas. No se aplican elipsis ni recorte. Pendiente definir capacidad máxima antes de emisión.

Firmas: grilla de dos columnas y dos filas, separación superior de 16 mm, recuadros grises de 28 mm de alto y rótulos de 11 pt. Son estáticos para papel. Se conserva leyenda amarilla y pie compartido. Validado visualmente con datos ficticios en A4; otros bimestres pendientes de aprobación de este baseline.


## Cuatro cierres bimestrales: diseño aprobado y replicado

El usuario aprobó el diseño del primer cierre y autorizó replicarlo. Los cuatro bimestres reutilizan `TermClosingPage` sin modificaciones de estilo, con firmas estáticas para papel. El contrato reemplaza `primerCierre` por `cierres`, una tupla ordenada de cuatro cierres que exige los bimestres 1, 2, 3 y 4. Cada cierre conserva sus cuatro valores independientes.

Ubicación: páginas 8–11 del primer ciclo y 9–12 del segundo. La muestra conserva datos ficticios en los dos primeros bimestres y estados futuros (`---`) en tercero y cuarto, coherentes con las tablas académicas. Verificados los cuatro títulos, sus valores y ausencia de desbordes en ambos ciclos; captura del cuarto cierre inspeccionada. Lint y build correctos, con advertencia conocida del bundle. No se modificó PocketBase.

Próximo paso: síntesis conceptual y promoción (página 12/13), luego registro administrativo (13/14). Continúan pendientes el tratamiento definitivo de observaciones extensas, la exportación PDF y la impresión física.


## Hojas anuales completas para revisión final

Síntesis conceptual: tabla ancha con título celeste de 14 pt y área de texto de 43 mm; bloques separados para permanencia y promoción; firma de dirección centrada al 62 % del ancho, con espacio libre de 35 mm. Texto dinámico de 11 pt, saltos de línea preservados y ajuste de palabras largas. No hay leyenda de calificaciones en estas hojas, conforme a la referencia.

Registro administrativo: encabezado propio en Merriweather, República Argentina con escudo y Educación Oficial A-1134; tabla inicial de tres columnas; tabla de cambios con cuatro columnas y cuatro filas; bloques de domicilio, teléfono y cambio de domicilio. Bordes finos y pie compartidos. Las firmas permanecen vacías para papel y no pertenecen al contrato dinámico.

Ambas composiciones se verificaron en navegador A4 para ambos ciclos con valores futuros. No quedan páginas de composición pendiente. Su aceptación visual por el usuario y la prueba con contenido real o extenso siguen pendientes, así como exportación e impresión física. El origen de los datos se definirá en la siguiente etapa.


## Diseño v1 aprobado y revisión curricular por grado

El diseño completo queda aprobado por el usuario. Los conceptos evaluativos y nombres de materia son dinámicos y están incluidos en el resaltado de revisión. Siete URLs `?grado=1` a `?grado=7` usan el mismo diseño y una instantánea de la malla local 2026; no requieren siete copias de componentes o CSS. Los 370 conceptos extraídos caben en las medidas aprobadas, verificados en navegador. Esta constatación no garantiza textos futuros de longitud arbitraria ni sustituye la prueba de exportación PDF. Procedencia y procedimiento de actualización en `gradebook-pdf-reference.md`.


## Prueba de conceptos y PPI a 10 pt

Por pedido del usuario se aumentó un punto la fuente de conceptos evaluativos (incluidas materias formativas) y de la fila PPI, de 9 a 10 pt. Se mantienen las alturas y estilos restantes. Se trata de una prueba visual pendiente de aceptación, no de un cambio validado para emisión.

Comprobación sobre los 370 conceptos de la malla local 2026: grados 1–6 sin desbordes; en 7.º desbordan el quinto concepto de Lengua (página 4) y el cuarto de Ciencias Naturales (página 5). Ambos contenedores miden aproximadamente 56 px y el contenido requiere 60 px según scrollHeight; capturas inspeccionadas confirman texto demasiado próximo a los bordes y fuera del espacio disponible. Las páginas no desbordan y PPI cabe a 10 pt. Lint y build correctos, advertencia conocida del bundle.

Se conserva el aumento solicitado para revisión conjunta, sin aplicar reducción automática ni alterar las filas aprobadas. Próxima decisión: resolver esos dos textos largos con un formato condicional o ajustar el espacio disponible antes de aceptar definitivamente 10 pt. La instantánea contiene el cuarto concepto de Ciencias Naturales de séptimo terminado en «y uti»; ese contenido proviene de la base y no fue recortado por el render. Revisar su integridad curricular en una etapa separada, sin inventar su continuación.


## Regla vigente: ajuste automático de consignas

`CriterionText` mide el alto real del contenido y el ancho disponible después de cargar las fuentes. Usa 10 pt por defecto y sólo cambia a 9 pt si no cabe, sin depender de grado, ID, año o cantidad de caracteres. La variante compacta usa interlineado 1,1 y padding vertical de 0,3 mm; conserva la altura de fila. PPI permanece en 10 pt.

Se recalcula al cambiar el texto, las dimensiones, las fuentes o antes de imprimir. Si un texto nuevo tampoco cabe a 9 pt, se marca `data-text-overflow=true`, visible en rojo sólo en la vista previa, sin recortar ni seguir reduciendo. El futuro emisor deberá esperar las fuentes y comprobar esta marca antes de generar el PDF; todavía no hay bloqueo de emisión implementado.

Validación en los siete grados: 368 conceptos a 10 pt y únicamente los dos de séptimo a 9 pt; cero desbordes detectados. Prueba sintética de texto extraordinariamente largo activa la marca y un texto corto restaura 10 pt. Lint/build correctos con advertencia conocida del bundle. Esta regla reemplaza la prueba anterior pendiente de ajuste manual.
