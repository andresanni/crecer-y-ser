# Estrategia de emisión de boletines PDF

Documento iniciado el 28 de septiembre de 2026. Conserva la propuesta y el historial de implementación. El generador, la persistencia y las descargas ya están implementados y publicados; las secciones finales registran los pulidos vigentes.

## Reglas solicitadas

- El PDF representa el contenido visado en un momento determinado.
- Retirar el visado o corregir el contenido invalida el PDF y requiere una nueva generación tras el nuevo visado.
- Generación individual y masiva por grado y bimestre.
- Nombre de descarga: `APELLIDO, NOMBRE - BOLETIN X BIMESTRE.pdf`.

## Conservación recomendada

Guardar una instantánea documental y el archivo PDF emitido, junto con fecha, emisor, matrícula, curso, ciclo lectivo, bimestre de corte, versiones de plantilla/assets y hash. Descargar devuelve los mismos bytes, no vuelve a interpretar los datos actuales. El archivo se alojaría en almacenamiento protegido de PocketBase; su registro conserva referencia y metadatos, no un PDF codificado en una columna de texto. Referencia técnica: https://pocketbase.io/docs/files-handling/ . Verificar APIs concretas contra PocketBase 0.22.17 al implementar.

La regla actual del usuario sustituye la propuesta anterior de conservar PDFs históricos descargables: al invalidar, bloquear inmediatamente el acceso, cancelar operaciones pendientes y eliminar el archivo administrado. Conservar solamente trazabilidad de la emisión invalidada (identificador, fechas, motivo, hash, revisiones y versión), sin ofrecer descargarla ni reconstruirla desde una instantánea invalidada. Limpiar también esa instantánea según la política de conservación que se acuerde. Las copias ya descargadas por dirección no pueden retirarse de sus dispositivos; los backups tienen su ciclo de retención independiente.

La invalidación del registro debe ser transaccional con el retiro/corrección; la eliminación física debe ser reintentable fuera de la transacción. Un fallo de borrado no rehabilita el acceso. No prometer atomicidad entre SQLite y almacenamiento de archivos. Las descargas pasan por autorización y revalidación de vigencia; evitar URLs públicas o ZIP persistentes que permitan recuperar versiones retiradas.

## Vínculo con visado y dependencias

El backend actual expone revision_contenido y revision_visada. Una corrección incrementa la primera y retira el visado. Retirar y volver a visar sin editar puede conservar la misma revision_contenido: agregar una generación monotónica de autorización por alumno/período o identificador de evento de visado. El trabajo debe conservar y revalidar este identificador, no sólo el booleano VISADO ni la fecha.

La unidad documental es matrícula + ciclo lectivo + bimestre de corte. Sólo incluir datos académicos hasta el corte; posteriores permanecen futuros aunque ya tengan cargas. Propuesta: exigir visados vigentes de cada período académico incluido. Resolver explícitamente históricos previos a la app o altas tardías; jamás completar desde borradores docentes ni usar guiones para ocultar faltantes obligatorios.

Una emisión del segundo bimestre depende de primero y segundo. Retirar/corregir primero invalida todas las emisiones de ese alumno que lo incluyan, sin afectar archivos de compañeros. Invalidar un PDF acumulativo no significa retirar automáticamente todos los visados posteriores: la UI debe explicar qué dependencia requiere revisión.

La instantánea incluye datos personales, responsable elegido, apoyos, malla, escalas y datos anuales además de notas. Los cambios externos a la planilla también pueden cambiar lo impreso: vincular dependencias y revalidar una huella documental al finalizar y descargar. Si cambia el contenido documental aprobado, exigir revisión antes de regenerar. No usar la revisión global del curso como identidad única del PDF, ya que una corrección de otro alumno no debería invalidar todos los archivos.

## Generación

1. Servidor valida rol, alcance, visados y versiones esperadas; obtiene instantánea coherente en una transacción breve.
2. Registra solicitud con clave de idempotencia basada en alcance, visados, huella y versión de plantilla. Repetir una solicitud igual reutiliza el trabajo o archivo vigente.
3. Un worker privado renderiza React/HTML con Chromium fuera de la transacción. Usa plantilla y assets versionados, sin credenciales administrativas en el navegador ni datos leídos directamente por la plantilla.
4. Espera fuentes, imágenes y ajuste tipográfico. Rechaza desbordes pendientes, páginas adicionales o recursos faltantes; no publica PDFs parciales.
5. Revalida dependencias y autorización en transacción antes de publicar. Si cambió algo durante el render, descarta el resultado.
6. Guarda archivo protegido y hash; marca DISPONIBLE sólo tras completar y verificar almacenamiento. Limpia temporales o archivos huérfanos tras fallos.

Estados técnicos propuestos: EN_COLA, GENERANDO, DISPONIBLE, ERROR e INVALIDADO. No reemplazan CONTROL_DIRECTIVO, VISADO ni LISTO_PARA_PDF. El diseño/hardware del worker y su alojamiento requieren una prueba antes de decidir despliegue; no se incorpora un servidor al frontend estático por suposición.

## Individual y por grado

Confirmado por el usuario: emisión individual habilitada por el visado vigente y las dependencias del alumno, sin exigir que terminen sus compañeros. Lote completo habilitado con LISTO_PARA_PDF y dependencias completas; el servidor vuelve a comprobarlo. Un lote es una lista de operaciones individuales con concurrencia acotada, estado por alumno y reintentos sólo de fallidos o invalidados. Archivos vigentes se reutilizan.

Descarga masiva como ZIP: `GRADO - BOLETINES X BIMESTRE - AÑO.zip`, con PDFs individuales nombrados como pidió el usuario. Normalizar caracteres inválidos de sistemas de archivos y resolver homónimos con un sufijo estable sin DNI. Año y matrícula forman parte del identificador interno aunque no aparezcan en el nombre pedido. El ZIP se arma con un manifiesto de versiones vigentes y se revalida antes de entregarlo; no reutilizar un ZIP que contiene un archivo invalidado. Un fallo parcial se muestra como tal, con lista de faltantes y reintento, nunca como lote completo.

## Incorporación gradual

1. Cerrar reglas pendientes: elegibilidad individual/acumulada, responsable de portada, ausencias de históricos, captura anual y política de borrado. Usuario ya pidió eliminar el PDF invalidado; no volver a asumir archivo histórico descargable.
2. Mapear cada campo a su fuente y construir gateway/adaptador de instantánea sólo lectura. Probar con alumno local sintético por ciclo, sin botones de emisión aún.
3. Ensayar un PDF real desde la plantilla y validar paginación, fuentes, ajuste de consignas y observaciones extensas. Elegir alojamiento del worker con mediciones.
4. Implementar persistencia, invalidación y descarga protegida con migraciones/gateway; probar corrección y retiro antes, durante y después del render, incluido re-visado sin editar.
5. Añadir generación individual en revisión directiva: Generar PDF, estado/progreso, Descargar y Reintentar. Mantener la acción de visado independiente.
6. Añadir generación por grado en Bimestres: progreso, faltantes, reintentos y ZIP. Usar las mismas operaciones individuales.
7. Probar doble clic, dos directivos, desconexión, caída de worker, fallos de borrado, corrección de bimestres anteriores y cambios administrativos. Preparar promoción según documentos de entornos, hardening y despliegue.

Ninguna generación equivale a envío a familias. No se implementa correo, publicación familiar ni firma digital en este alcance.


## Vigencia acumulativa: definición para la siguiente implementación

El usuario confirmó la generación individual y busca una garantía del sistema sobre la actualidad del PDF respecto de todos los visados incluidos. Se recomienda implementar esta garantía; no depender de la memoria operativa de dirección. No representa firma digital ni certificación legal: el término de interfaz recomendado es «PDF vigente».

Cada emisión registra una lista explícita de dependencias por alumno y período: ID de visado, generación monotónica de visado y revisión de contenido aprobada. El snapshot del segundo bimestre guarda las dependencias de primero y segundo; tercero guarda primero, segundo y tercero. El cuarto guarda las cuatro. La cantidad es pequeña y acotada: no requiere reconstruir el PDF para comprobarla. Además se conserva la huella de otros datos documentales, según las reglas anteriores.

La descarga sólo se habilita si todos esos visados siguen vigentes, sus generaciones coinciden y las revisiones aprobadas coinciden con el contenido actual. Se comprueba en servidor al solicitar, al publicar el resultado y al autorizar una descarga. Realtime actualiza la interfaz, pero no es la garantía de vigencia. Retirar y volver a visar sin modificar notas genera una nueva autorización: una emisión invalidada nunca vuelve a ser válida por coincidencia de valores.

Para un alumno con PDFs emitidos hasta tercero: retirar el visado de segundo invalida las emisiones de segundo y tercero; primero permanece vigente. No se retiran automáticamente los visados de tercero ni se afectan compañeros. Corregir primero invalida todas las emisiones que lo incluyen. El servidor revoca su descarga en la misma transacción que retira/corrige el visado; cancela trabajos pendientes y programa borrado físico reintentable.

Al volver a visar el período corregido, las emisiones afectadas quedan pendientes de regeneración cuando todas sus dependencias vuelven a cumplir las condiciones. Para v1, la regeneración será una acción explícita individual o de lote, no un proceso automático silencioso. El ZIP se arma sólo con versiones vigentes y revalida su manifiesto antes de entregarse.

La garantía corresponde al instante de autorización de descarga. Un cambio concurrente posterior no permite retirar bytes ya entregados. La app informa cuál archivo sigue vigente; no puede certificar permanentemente una copia guardada fuera del sistema. Un QR/verificador público o una firma digital no están incluidos en esta fase.

Pendiente antes de implementar: distinguir período futuro, período anterior obligatorio con visado faltante y período previo no aplicable a la cursada por alta tardía o historia fuera de la app. «Si los hubiese» no debe implementarse como saltar silenciosamente registros ausentes. El servidor determina el conjunto esperado y bloquea los faltantes obligatorios con un motivo comprensible.

Pruebas de aceptación específicas: retirar segundo invalida sólo segundo y posteriores del mismo alumno; re-visado sin editar no resucita PDFs; corrección durante render impide publicación; URL previa y ZIP previo no permiten nuevas descargas inválidas; error de borrado mantiene revocado el acceso; un visado faltante en período requerido bloquea la generación y señala el período.


## Primera entrega local: preparación y elegibilidad

28 de septiembre de 2026: inspección inicial de desarrollo completada. PocketBase local responde health 200; dispone de los cuatro períodos y cinco registros de visado (uno VISADO y cuatro PENDIENTE_REVISION). El esquema local de visados coincide con el snapshot versionado y aún no tiene generación monotónica de autorización ni colecciones de emisión. No se modificaron datos, reglas, esquema o producción en esta inspección.

Orden para comenzar:

1. Respaldar el entorno local y ensayar cambios sobre una copia de desarrollo aislada. Preservar los datos de prueba existentes.
2. Añadir por migración la generación monotónica de autorización del visado y actualizarla en los gateways de visado, retiro y corrección. Inicializar coherentemente registros existentes y comprobar que retirar/revisar sin editar cambia la identidad de autorización.
3. Crear una consulta institucional de elegibilidad por alumno, ciclo y bimestre. Responder períodos requeridos, estado de sus visados y motivos de bloqueo; no generar ni almacenar archivos en este paso. Para casos normales exigir períodos 1..corte. Ante historia/alta tardía ambigua, devolver un motivo explícito pendiente de política, sin omitir períodos automáticamente.
4. Probar casos de primero habilitado, segundo bloqueado por primero, segundo habilitado por ambos, corrección de primero y nuevo visado sin editar. Usar datos sintéticos aislados y validar acceso autenticado.
5. Incorporar esta información a revisión directiva sin ofrecer todavía un botón de generación que no funcione.

Después: consulta de instantánea documental, prueba de motor, colecciones de emisión/dependencias y archivos protegidos, generación individual, lotes. No es necesario crear ahora todo el esquema definitivo de archivos para comprobar las reglas de elegibilidad. El alcance de esta primera entrega permite probar integridad antes de introducir Chromium, almacenamiento y descargas.


## Primera entrega implementada y verificada localmente

Migración `1790553600_versioned_approval_authorization.js` aplicada a desarrollo. Respaldo previo consistente, con PocketBase detenido, en `C:/pocketbase/backups/pdf-eligibility-20260928/data.db`; preserva la base anterior y no modifica archivos de almacenamiento. Ensayo en copia aislada `C:/pocketbase/pdf-eligibility-test`, puerto 8092. La instancia habitual 8090 conserva los cinco visados originales y su contenido; únicamente se inicializó la nueva generación.

Implementación: contador de autorización en visado/retiro/corrección y cálculo de elegibilidad incorporado a la lectura transaccional existente de revisión. No se agregó un endpoint redundante. Interfaz con resultado por alumno, sin botón de emisión; los eventos de otros períodos del mismo curso también provocan actualización y ocultan el resultado anterior mientras está desactualizado. Esquema snapshot actualizado desde la colección local. Listas de despliegue incluyen la nueva migración, sin ejecutar despliegue.

Pruebas HTTP en copia aislada: primero elegible; segundo elegible con ambas autorizaciones; retiro de primero bloquea segundo sin retirar su visado; versión obsoleta devuelve 409; nuevo visado sin editar incrementa generación sin incrementar contenido; repetir visado no incrementa; corrección incrementa ambas revisiones y bloquea la dependencia; revisión sin sesión devuelve 401. Los cambios de prueba no se trasladaron a la instancia habitual.

Pruebas reproducibles de reglas: `node --test deploy/test-pdf-eligibility.cjs` (cinco casos, incluyendo corte, dependencia, generación, faltantes, duplicados y ciclo incorrecto). Verificación del entorno habitual con `deploy/verify-pocketbase-dev.ps1`: todos los controles correctos. No se generó ni invalidó un PDF real: almacenamiento y motor siguen pendientes.

Próximo paso: mapa campo/fuente, decisiones de responsable e históricos y gateway de instantánea documental. Después prueba real de renderizado y persistencia de emisiones. La validación visual completa del nuevo mensaje en la pantalla operativa sigue pendiente de revisión conjunta.


## Lectura de instantánea implementada

El usuario confirma que cada alumno tiene un único tutor vinculado por norma del colegio. La lectura requiere exactamente un responsable distinto; cero o varios bloquean con un motivo explícito, sin selector ni prioridad arbitraria. Esta validación no modifica el modelo de vínculos existente ni borra duplicados.

Se implementó en desarrollo el GET de instantánea documentado en `pocketbase-api.md`, reutilizando la lectura académica y dentro de una sola transacción. No se conecta todavía la plantilla a una respuesta incompleta ni se ofrece Generar PDF. Mapa de fuentes:

| Bloque | Fuente | Tratamiento |
| --- | --- | --- |
| Alumno y tutor | alumnos, alumno_responable, responsables | Identidad mínima, un tutor único |
| Año y curso | ciclos_lectivos, cursos, inscripción | Alcance validado; grado numérico a resolver en adaptador |
| Materias y consignas | curso_materias del año, materias, criterios_evaluacion | Orden curricular y cinco criterios existentes, sin fixtures |
| Notas y PPI | evaluaciones_materia, evaluaciones_criterios | Sólo períodos incluidos, referencias explícitas a escala |
| Escala | valores_escala del curso | Etiqueta y peso sin equiparar peso a nota impresa |
| Asistencia y observaciones | cierres_periodo_alumno | Números explícitos, conserva cero; ausencia no equivale a cero |
| Apoyos | inscripciones | Valores actuales, promoción con acompañamiento reservada a cuarto |
| Contacto y fechas | alumnos e inscripciones | Datos actuales; no representan historial de cambios |
| Síntesis/promoción/historial | Sin fuente confirmada | Pendientes explícitos; no inferidos |

Pruebas HTTP locales de sólo lectura: un alumno con visado obtiene 200, 10 materias y un período; dos lecturas conservan huella; cuatro alumnos pendientes obtienen 422; anónimo obtiene 401. Se verificó exclusión de credenciales y separación de los períodos posteriores. No se modificaron calificaciones ni vínculos. La huella describe la lectura actual, no garantiza vigencia después de un cambio ni reemplaza la revalidación que deberá hacer el emisor.

Siguiente paso: adaptador de escala y contrato documental, con tratamiento explícito de ausencias y bloques anuales. Después vista previa institucional sobre esta instantánea y prueba del motor. La política de campos anuales y de históricos no aplicables sigue pendiente.

## Adaptador documental de primer ciclo

Se agregó el contrato TypeScript de la instantánea, su servicio de lectura y `adaptarInstantaneaDocumental`, separado de los componentes visuales. Transforma las referencias de la escala existente en conceptos de presentación, conserva ceros y observaciones vacías y deja los bimestres posteriores como futuros. Los pesos de escala representan orden: nunca se convierten en notas numéricas impresas. Datos académicos obligatorios ausentes, duplicados o fuera del corte bloquean la adaptación.

El usuario confirmó que aún no está cargado el catálogo de segundo ciclo. Los grados 4 a 7 quedan bloqueados explícitamente en este adaptador hasta incorporar y validar concepto y número. No se modificó la base ni se creó una equivalencia artificial. Las muestras de diseño de los siete grados siguen disponibles como muestras, separadas de esta lectura operativa.

Síntesis, promoción y registro administrativo permanecen futuros antes del cuarto bimestre y sin dato al llegar al cuarto, con un pendiente explícito de integración. No se deduce historial a partir de contactos actuales. Obtener un documento adaptable permite preparar la vista previa; no declara habilitada la emisión.

Validación: ocho pruebas automatizadas entre `deploy/test-document-adapter.cjs` y `deploy/test-pdf-eligibility.cjs`, lint y build correctos, con el warning conocido de tamaño del bundle. Una lectura autenticada del alumno visado de desarrollo se adaptó sin bloqueos a dos materias formativas y ocho académicas. La comprobación fue de sólo lectura y no guardó datos personales en el repositorio.

Próximo paso: conectar la vista previa institucional individual con esta instantánea, mostrar pendientes y bloqueos, y verificar el renderizado antes de incorporar motor y almacenamiento. El adaptador y servicio todavía no están conectados a la interfaz operativa. No hay PDFs emitidos ni cambios en producción.

## Vista previa institucional individual

La revisión directiva incluye «Vista previa del boletín» para el alumno seleccionado cuando los visados acumulados están completos, la revisión está actualizada y no hay cambios pendientes. Cada apertura consulta nuevamente el gateway y adapta su respuesta; no usa las muestras del diseño. El modal reutiliza la plantilla centralizada y permite navegar sus 13 páginas de primer ciclo. La carga del módulo visual es diferida.

El servidor vuelve a validar las condiciones al leer. Los errores se muestran sin documento y permiten reintentar; los bloqueos del adaptador (incluida la escala de segundo ciclo ausente) se explican en el modal. Los campos anuales pendientes se muestran como aviso. Cambiar alumno, período, revisión local o recibir una nueva versión del workflow del curso desmonta la vista previa. Las respuestas tardías de solicitudes desmontadas se descartan. Realtime no reemplaza la revalidación de una futura emisión.

La vista es de revisión: no guarda instantáneas, no ofrece descarga ni declara emitido el PDF. No se persisten datos documentales en almacenamiento del navegador. Los datos institucionales se centralizaron para compartirlos con la muestra de diseño.

Verificación en Edge con sesión de desarrollo: apertura desde un alumno visado, 13 páginas, cero consignas con desborde y cero errores JavaScript; respuesta 422 simulada sin páginas residuales y reintento exitoso contra el gateway local. Se revisó la portada y se aisló su tipografía de los títulos globales de la app. Lint, build y ocho pruebas automáticas correctos; continúa el warning conocido de bundle. No se modificaron notas ni producción.

Para revisar: Bimestres → curso entregado → alumno visado → Vista previa del boletín. Próxima etapa: prueba de generación PDF real y definición de persistencia y vigencia, conservando los pendientes anuales y de escala de segundo ciclo.

## Prueba local del motor PDF y ajustes de revisión

Por indicación del usuario, el aviso de campos anuales se omite en los bimestres 1 a 3. Esos campos siguen futuros y no son faltantes de la carga directiva. En cuarto se conserva el pendiente hasta implementar su fuente. No se ajusta la celda de calificación general para «No corresponde a la planificación del bimestre»: esa opción no forma parte de la calificación general operativa; su presencia en mocks no justifica cambiar el diseño.

Se agregó `deploy/probe-document-pdf.cjs`, una prueba local de impresión Chromium/Edge. Reutiliza el HTML y CSS de la plantilla ya renderizada, espera fuentes e imágenes y rechaza consignas marcadas con desborde. Imprime en una página aislada del mismo origen, sin interfaz ni scripts de la aplicación. Se corrigió la sustitución silenciosa de fuentes causada por imprimir desde un origen vacío. No es un worker productivo ni autoriza emisiones; no persiste archivos en PocketBase ni declara vigencia.

Uso: definir `PLAYWRIGHT_MODULE` con la ubicación de Playwright disponible en el equipo y ejecutar `node deploy/probe-document-pdf.cjs "http://127.0.0.1:5173/plantilla-boletin.html?grado=1" "C:/pocketbase/pdf-probe/primer-ciclo.pdf"`. Requiere Vite local y Microsoft Edge. No agrega dependencias de producción ni contiene credenciales. Para una instantánea autenticada, el helper exportado recibe la página ya abierta en un contexto de navegador independiente.

Resultados finales con muestras ficticias de grados 1 y 7: 13 y 14 páginas A4, aproximadamente 670 y 680 kB; impresión de unos 0,95 segundos por archivo después de cargar recursos (no es tiempo total ni medición del VPS). Se rasterizaron todas las páginas con Poppler y se revisó su distribución. Los archivos de prueba permanecen fuera del repositorio, en `C:/pocketbase/pdf-probe`. La primera prueba con lectura operativa se realizó antes del ajuste de fuentes; al repetir ya no había un alumno VISADO local, por lo que la validación final del motor utilizó muestras y no modificó visados para habilitarla.

Lint, build y las ocho pruebas existentes pasan. La prueba verifica paginación y carga de recursos; aún falta un control completo de desbordes por bloque y la validación final en el futuro worker. Próximo paso: definir y construir la persistencia de emisiones y su invalidación transaccional, antes de habilitar Generar/Descargar en la interfaz. Segundo ciclo real sigue bloqueado por catálogo pendiente.

## Generación individual de prueba desde la interfaz

Se agregó «Generar PDF de prueba» al pie de la vista previa únicamente en desarrollo. Permite revisar el archivo real sin declarar una emisión persistida. El botón requiere adaptación válida y ausencia de pendientes; bloquea segundo ciclo sin catálogo y cuarto bimestre sin fuentes anuales. Una solicitud descarga `APELLIDO, NOMBRE - BOLETIN X BIMESTRE.pdf`. Cerrar o cambiar el alcance aborta la descarga pendiente del cliente.

`localPdfPlugin` atiende POST `/__cys/pdf-prueba` sólo en el servidor Vite de desarrollo, desde loopback y con origen local permitido. Recibe matrícula, período y huella, nunca HTML aportado por el cliente. Reenvía la sesión institucional exclusivamente al gateway local de instantánea; valida elegibilidad y huella antes del render y vuelve a consultarlas antes de entregar los bytes. El navegador de impresión recibe sólo la instantánea interceptada en memoria, sin credenciales. Los requests externos del navegador están bloqueados.

`boletin-render.html` reutiliza el adaptador y los componentes documentales, espera fuentes e imágenes y el ajuste de consignas. Playwright/Edge imprime; pdf-lib valida 13 páginas A4 antes de la segunda lectura. Ambas dependencias son de desarrollo. El módulo de impresión y el botón no se publican como funcionalidad productiva. El servicio limita a un trabajo simultáneo, responde no-store y no escribe PDF ni instantánea en disco o PocketBase. Una descarga ya entregada no se puede retirar del equipo del directivo.

Verificación: descarga real desde un alumno visado local, 13 páginas A4 y revisión rasterizada de una página académica. Nueve pruebas pasan, incluida la integración sintética `node --test deploy/test-local-pdf.cjs`: 401 sin sesión, 403 por origen ajeno, 409 por huella anterior, 422 por visado faltante, PDF válido con dos lecturas, 409 al cambiar la huella durante render y 422 para segundo ciclo. La prueba requiere Edge instalado; no modifica la base habitual. Lint y build correctos, con warning de bundle conocido.

Para probar: iniciar PocketBase local y `npm run dev`, abrir Bimestres → alumno elegible → Vista previa → Generar PDF de prueba. El archivo queda en las descargas elegidas por el navegador. No es el almacenamiento acordado ni una emisión certificada como vigente: siguen pendientes las colecciones de emisión/dependencias, worker desplegable, invalidación transaccional, borrado y descarga protegida. Esta entrega hace revisable el PDF desde la interfaz antes de implementar esa etapa.

## Apoyos anuales vinculados a inscripción

Aclaración confirmada: promoción con acompañamiento, posee apoyos y cuáles ya pertenecen a `inscripciones`; la UX los presenta dentro del boletín. El gateway documental los lee desde esa inscripción. Posee apoyos y su detalle se completan en primer bimestre y se conservan para los cortes siguientes. Promoción con acompañamiento se muestra sólo en cuarto, aunque el valor ya exista al pedir un corte anterior. Esto es independiente de síntesis/promoción de la hoja anual, cuyas fuentes siguen pendientes.

El adaptador imprime SI como SÍ, NO como NO y «Cuáles» como `---` cuando no hay apoyos. Con SI muestra el detalle persistido; con valor ausente o `-` conserva el estado sin dato y no inventa NO ni utiliza detalles residuales. La revisión de sólo lectura local encontró tanto una inscripción visada con NO como otra con `-`: ese último caso explica que aparezca Pendiente aun estando implementada la relación. No se modificaron inscripciones ni visados. Pruebas cubren los cuatro cortes, detalle no aplicable, ausencias y detalle residual.

## Emisiones persistidas y descarga vigente en desarrollo

La generación individual local ahora publica el archivo en `emisiones_boletin` mediante el gateway. Conserva PDF protegido, instantánea, dependencias de todos los visados incluidos, huella documental, huella SHA-256 del archivo, versión de plantilla/assets, usuario emisor, nombre de descarga y fechas del registro. Todas las reglas de acceso directo a la colección están cerradas. El archivo tampoco puede descargarse por la URL estándar sin autorización; se utiliza el gateway de descarga que vuelve a comprobar la instantánea actual.

Publicar exige simultáneamente sesión institucional y clave privada del generador. La clave local está en `C:/pocketbase/pdf-worker-dev.key` y en la variable no pública `CYS_PDF_WORKER_KEY` de `.env.development.local`; el lanzador de PocketBase carga el archivo. No llega al navegador, no se registra ni se versiona. Se requiere configurar un secreto separado antes de una futura promoción; el VPS no fue modificado.

La publicación revalida huella y visados dentro de una transacción. Repetir una publicación del mismo alumno, período, huella y versión reutiliza la emisión disponible. La interfaz consulta primero si ya existe: la segunda descarga obtiene los mismos bytes sin ejecutar Chromium. Cambios de plantilla/assets requieren nueva emisión. No se usa el HTML proporcionado por el cliente para publicar.

Retirar o modificar un visado invalida en la misma transacción las emisiones del mismo alumno con corte igual o posterior. Se borra inmediatamente su instantánea; permanecen metadatos/dependencias de auditoría. El archivo queda inaccesible desde ese momento. Cada minuto una tarea intenta quitar físicamente los archivos invalidados; si falla conserva la referencia para reintentar. Cambios externos a la planilla se detectan por la huella al consultar o descargar y también invalidan el documento. Una emisión INVALIDADA nunca se descarga ni se reactiva al volver a visar.

Migración `1790625600_document_emissions.js` probada en copia aislada 8092 y aplicada a desarrollo 8090. Respaldo previo consistente con PocketBase detenido: `C:/pocketbase/backups/pdf-emissions-20260928/data.db`. La colección nueva se incorporó al snapshot de esquema y los artefactos a las listas de promoción, sin ejecutar despliegue. No se alteraron notas ni visados de la instancia habitual.

Verificación HTTP aislada: publicación 200, repetición devuelve el mismo ID, descarga autenticada 200, URL anónima del archivo 403, retiro de visado 200, descarga anterior 409, instantánea eliminada y limpieza física posterior registrada con archivo vacío. Prueba de interfaz habitual: generar/descargar y volver a descargar devolvieron bytes idénticos. Doce pruebas automatizadas, lint y build correctos; persiste el warning conocido del bundle.

La acción local pasa a «Generar / descargar PDF» y luego «Descargar PDF». Informa cuando el PDF quedó guardado. Si cambia el boletín, se debe cerrar y reabrir la vista previa. Esta es la primera persistencia funcional individual; aún no hay cola durable de renders, estados de progreso persistidos, lotes/ZIP ni worker desplegado. El motor sigue dentro del servidor local Vite y el botón se habilita sólo en desarrollo. Un fallo durante render no crea una emisión disponible. Resta ensayar fallos de almacenamiento y recuperación de huérfanos antes de producción; no se promete atomicidad entre archivos y SQLite. Segundo ciclo y cuarto bimestre mantienen los bloqueos documentales ya descritos.


## Lotes por curso y descarga ZIP en desarrollo

Desde Bimestres → revisión del curso → «Generar PDFs / ZIP del curso», dirección puede preparar el conjunto de boletines incorporados a la revisión del período seleccionado. No exige que todo el grado esté visado: cada alumno se comprueba individualmente y los excluidos aparecen con su motivo. Las altas sin incorporar se informan aparte. El lote no modifica notas, matrícula ni visados.

1. Abrir el modal y seleccionar «Preparar PDFs del curso». Se consulta nuevamente la revisión autoritativa.
2. Procesar secuencialmente los boletines con visados acumulativos completos. Cada uno consulta su instantánea y usa el mismo generador individual, incluyendo adaptación, control de cambios, almacenamiento y reutilización de emisiones existentes.
3. Revisar el resultado por alumno. Una falla individual queda visible y no descarta los demás PDFs guardados. El contador del botón informa exactamente cuántos archivos integrarán el ZIP.
4. Seleccionar «Descargar ZIP». El servidor consulta otra vez instantánea, pertenencia al curso, huella, versión de plantilla e identidad de cada emisión; obtiene sus bytes mediante la descarga protegida. Después de reunir los archivos vuelve a validar todas las entradas. Si alguna cambió, rechaza el ZIP completo y pide preparar nuevamente el lote.
5. «Volver a preparar» relee los datos y reutiliza los PDFs que sigan vigentes. Cerrar el modal cancela las solicitudes del cliente y detiene los siguientes alumnos; una emisión que ya estuviera procesándose en el servidor puede terminar guardándose. Los PDFs guardados no se pierden. El proceso no continúa como una tarea durable después de cerrar la ventana.

Cada PDF conserva el nombre `APELLIDO, NOMBRE - BOLETIN X BIMESTRE.pdf`. Ante nombres coincidentes, incluyendo diferencias sólo de mayúsculas, se agrega `(2)`, `(3)`, etc. para evitar sobrescrituras al extraer en Windows. El ZIP se identifica por curso, bimestre y año. No se incluyen informes de errores dentro de los archivos destinados a las familias; las exclusiones permanecen en el modal.

El ZIP se arma en memoria y no se persiste en PocketBase ni en disco del servidor. Las emisiones individuales son la fuente persistida. La validación final es por archivo, no una transacción conjunta de todos los alumnos; acredita las verificaciones realizadas durante la descarga, no una vigencia indefinida del ZIP. Ningún archivo descargado previamente puede revocarse en el equipo del usuario.

Límites locales: hasta 100 boletines y 100 MB por ZIP, un trabajo de generación o empaquetado activo por servidor. `fflate` se agrega exclusivamente como dependencia de desarrollo para escribir el archivo ZIP; no incorpora una dependencia de ejecución al frontend productivo. El endpoint exige la configuración del almacenamiento de emisiones y nunca incluye PDFs de prueba no persistidos.

Verificación: 13 pruebas automatizadas con `node --test deploy/test-document-adapter.cjs deploy/test-pdf-eligibility.cjs deploy/test-pdf-emissions.cjs deploy/test-local-pdf.cjs deploy/test-pdf-batch.cjs`. El caso nuevo verifica autenticación, origen, lote vacío/duplicado/malformado, pertenencia al curso, identidad de emisión, nombres coincidentes, bytes íntegros y cambio detectado después de descargar los archivos pero antes de entregar el ZIP. La prueba de interfaz local obtuvo dos PDFs A4 de 13 páginas y tres exclusiones por falta de visado, sin errores JavaScript, y verificó el cierre durante la preparación. Los archivos de comprobación permanecen fuera del repositorio. Lint y build correctos; persiste el warning conocido del bundle.

No requiere nuevas colecciones, migraciones ni modificaciones de hooks. El motor y el acceso a lotes siguen disponibles sólo en desarrollo. Continúan pendientes la integración y validación de la escala real de segundo ciclo, las fuentes de las últimas hojas anuales y el despliegue del generador productivo. Cargar el catálogo de segundo ciclo no elimina automáticamente el bloqueo explícito actual del adaptador: debe validarse su contrato antes de habilitarlo.


## Escala operativa de segundo ciclo

Se verificó el catálogo local cargado por el usuario: No alcanzó los objetivos 1, 2 y 3; En proceso 4 y 5; Alcanzado 6 y 7; Avanzado 8 y 9; Destacado 10. El adaptador extrae el número explícito de la etiqueta y conserva el concepto como dato separado. El peso numérico no interviene en la nota impresa. Se normalizan acentos, mayúsculas y espacios. Los valores desconocidos, duplicados por ID, sin número o con números fuera de 1–10 bloquean el documento. Primer ciclo sigue imprimiendo únicamente conceptos.

«No corresponde» continúa soportado sin número y se expande al texto institucional en la plantilla, pero todavía no estaba presente en el catálogo de segundo ciclo al revisar la base. No se agregó un registro automáticamente. La malla de segundo ciclo exige 11 materias, dos formativas y nueve académicas; el motor verifica 14 páginas A4. La plantilla existente muestra concepto y número en líneas separadas, incluyendo sus formatos para textos largos.

Por autorización expresa del usuario se actualizaron únicamente los vínculos `cursos.escala_id` de 4.º–7.º en PocketBase local, mediante administración. La cuenta institucional no admite esta edición directa. Se verificaron los cuatro vínculos guardados. No se convirtieron notas anteriores ni se tocaron visados: el usuario recargará las notas de prueba. Las referencias a valores de la escala anterior no se resuelven en la escala nueva y bloquean la emisión hasta corregirlas mediante la planilla.

Validación automatizada: 15 pruebas; todas las etiquetas para los cuatro grados, independencia del peso numérico, No corresponde sin número, rechazo de números inválidos, regresión de primer ciclo y generación real con Edge de 14 páginas desde una instantánea sintética de segundo ciclo. Lotes/ZIP conservan los controles existentes. Lint y build correctos. Resta la comprobación operativa con un alumno de segundo ciclo después de recargar notas y visar; no se fabricaron calificaciones ni autorizaciones para completar esa prueba. El cuarto bimestre sigue bloqueado para emisión por fuentes anuales pendientes; el generador productivo aún no está desplegado.


## Publicacion productiva de boletines PDF — 29 de septiembre de 2026

PocketBase productivo recibio las migraciones `1790553600_versioned_approval_authorization.js`, `1790625600_document_emissions.js` y `1790630000_second_cycle_grading_catalog.js`, junto con los hooks documentales. Respaldo consistente anterior: `/root/pb/deploy_backups/20260928-223816`. El publicador ahora conserva tambien todo `pb_migrations` y storage para recuperacion. Se ensayaron las migraciones sobre una copia remota aislada y saneada; no se trasladaron alumnos, notas ni bases de desarrollo al VPS. La migracion de catalogo crea los diez valores de segundo ciclo ausentes sin duplicar los existentes y vincula los cursos 4 a 7; no convierte calificaciones ya cargadas. Tambien se aplico en desarrollo, con respaldo `C:/pocketbase/backups/second-cycle-catalog-20260929/data.db`. No cambia el esquema de colecciones.

El motor ya no depende de un servidor Vite productivo. `scripts/build-pdf-worker.mjs` genera `dist-render` con la plantilla y assets estaticos. `scripts/pdf-worker.ts` sirve esos archivos exclusivamente por loopback y reutiliza `createPdfMiddleware`, compartido con desarrollo. `cys-pdf.service` ejecuta Node como usuario sin privilegios `cys-pdf` en 127.0.0.1:8093; Chromium conserva su sandbox. Node 24.21.0 fue instalado desde nodejs.org con comprobacion SHA-256 y Chromium desde Playwright. El servicio limita memoria a 900 MB y mantiene un solo trabajo activo; no incorpora una cola durable.

Caddy publica unicamente POST/OPTIONS `/api/cys/pdf/generar` y `/api/cys/pdf/lote` hacia el worker, conservando PocketBase para las demas rutas. El middleware restringe origen a `https://crecer-y-ser-ten.vercel.app`, valida la sesion con los gateways de PocketBase, no confia en HTML del cliente y no pasa credenciales al navegador de impresion. La clave privada vive solo en `/etc/cys-pdf.env`, permisos 0600, y la cargan ambos servicios; es independiente de la clave local. Los archivos de impresion internos y health del worker no se exponen por Caddy. El frontend productivo deriva la URL del servicio desde `VITE_POCKETBASE_URL`; desarrollo conserva los endpoints Vite locales.

Operacion reproducible: `deploy/publish-pocketbase.ps1` actualiza esquema/hooks, y `deploy/publish-pdf-worker.ps1` construye, empaqueta, instala una release, ejecuta impresion y ZIP sinteticos bajo el usuario del servicio y valida/re carga Caddy. Las releases viven en `/opt/cys-pdf/releases`, con symlink `/opt/cys-pdf/current`; el staging conserva el destino anterior y la configuracion anterior de Caddy. Para rollback del worker, restaurar ese symlink, reiniciar `cys-pdf` y restaurar el proxy si cambio; para PocketBase, usar el respaldo compatible y no revertir el catalogo borrando notas referenciadas. No publicar solo el frontend si el servicio PDF no supera sus pruebas.

Verificaciones: health PocketBase local/productivo, migraciones registradas, permisos de endpoints sin sesion, preflight CORS 204, generacion con Chromium/Linux de 13 y 14 paginas, y prueba del middleware productivo con backend sintetico que obtiene un PDF de 14 paginas y comprueba bytes identicos dentro del ZIP. Las pruebas de persistencia/invalidation contra PocketBase habian sido verificadas en una copia aislada local. No se generaron notas ni visados ficticios en produccion. Queda la aceptacion con una sesion institucional y los datos operativos del colegio, ademas de las fuentes de cierre anual pendientes. Lint, build y las 15 pruebas automatizadas pasan; sigue el warning conocido de bundle.


## Pulido del flujo de descarga — 30 de septiembre de 2026

La revisión individual elimina la vista previa institucional y su modal, navegación de páginas y estilos. La barra del alumno muestra VISADO o SIN VISAR, Visar / Quitar visado y Descargar PDF. El mismo botón cambia entre Visar y Quitar visado según el estado del alumno. Quitar visado requiere confirmación e invalida los PDFs que incluyan ese bimestre; las correcciones siguen invalidándolo automáticamente. Descargar PDF exige la elegibilidad acumulativa vigente, sin cambios locales pendientes ni actualizaciones en curso. Consulta una instantánea nueva y llama al generador existente, que reutiliza la emisión disponible o genera y guarda una nueva; el servidor conserva sus comprobaciones documentales y de vigencia. Cambiar alumno, curso, período o revisión cancela la solicitud del cliente, al igual que perder la habilitación. Una emisión que ya esté procesándose puede terminar guardándose en el servidor. Las plantillas técnicas de desarrollo y el render interno del motor siguen siendo necesarios.

El modal masivo omite el aviso introductorio de reglas y conserva resultados, exclusiones, errores y progreso. En el PDF, las observaciones confirmadas vacías o compuestas sólo por espacios se imprimen como --- centrado horizontal y verticalmente. El dato persistido permanece vacío; los períodos futuros y datos faltantes conservan su tratamiento documental. Este cambio de plantilla modifica su versión calculada y permite regenerar las emisiones anteriores.


### Recuperación de autorización local del generador

El 30 de septiembre se reprodujo un 403 al publicar: PocketBase respondía «Generador no autorizado» aunque la clave de `.env.development.local` coincidía con `C:/pocketbase/pdf-worker-dev.key`. Reiniciar la instancia local mediante `deploy/start-pocketbase-dev.ps1` restableció la autorización. Se comprobó una descarga operativa 200 con emisión persistida y 13 páginas A4, sin modificar notas ni visados. El middleware ahora distingue el rechazo 403 del publicador y pide revisar la clave privada y reiniciar los servicios; los mensajes de cambio documental indican actualizar y volver a descargar, sin referencias residuales al modal eliminado.


## Resultado explícito de generación y UX de descarga

El publicador devuelve `{ id, created }`: created es true sólo si almacenó una emisión nueva dentro de esa transacción; false si reutilizó una emisión coincidente. El worker entrega `X-CYS-PDF-Result: generated | reused | unknown` y lo expone por CORS. Una descarga de una emisión ya encontrada usa reused; tras render y publicación utiliza created para distinguir una nueva emisión de una reutilización concurrente. Si un backend anterior no informa created, devuelve unknown sin atribuir una generación. No cambia permisos, persistencia ni vigencia. La primera generación y la regeneración tras cambios se presentan juntas como «Generado ahora».

El modal usa Obtener PDFs del curso y Actualizar PDFs del curso. Sus estados son Por comprobar, Procesando PDF…, PDF disponible y No disponible. Detalle muestra Ya estaba generado o Generado ahora según el resultado del servidor; los bloqueos muestran su motivo. Al terminar informa cuántos PDFs están disponibles, existentes y generados ahora. Ante versiones anteriores sin metadatos, informa sólo la disponibilidad. Descargar ZIP mantiene su contador y muestra Descargando ZIP… durante el empaquetado y validación, sin señalar actividad de generación. La descarga individual muestra Procesando PDF… y confirma Descarga iniciada · PDF existente o PDF generado ahora, sin afirmar que el navegador haya terminado de guardar el archivo.


## Bloqueos de visado y fallos de servicio en lotes — 1 de octubre de 2026

La falta de visado es una exclusión esperada, no un fallo del proceso: el alumno permanece No disponible con el motivo de elegibilidad y no fuerza una barra roja. Los rechazos documentales 422 recibidos al consultar la instantánea o solicitar el PDF se tratan igual, incluyendo un visado retirado entre consultas. Los errores del servicio se cuentan por separado, permiten reintentar con Actualizar PDFs del curso y no se confunden con alumnos sin visar. El rechazo de autorización privada del publicador conserva el 403, pero muestra un mensaje funcional de indisponibilidad sin instrucciones sobre claves, PocketBase o reinicios en la interfaz.

El diagnóstico local encontró al alumno 15 ya visado y elegible y reprodujo el rechazo de la clave del worker. Reiniciar PocketBase con el lanzador versionado recuperó la autorización; la generación de ese alumno devolvió 200, generated y una emisión almacenada, sin modificar notas ni visados. Un cambio de visado invalida emisiones, pero no cambia la clave privada del proceso. Si se inicia PocketBase fuera del lanzador con un entorno incompleto, los PDFs existentes pueden seguir descargándose mientras las nuevas publicaciones se rechazan.


## Inicio automático del lote — 1 de octubre de 2026

Generar PDFs del curso abre el modal e inicia la obtención sin un segundo clic. La consulta inicial muestra Consultando boletines… y cancela su solicitud al cerrar. El arranque se programa para el siguiente turno del navegador y se cancela al desmontar, evitando duplicar consultas y renders durante la comprobación adicional de efectos de StrictMode. Cada apertura nueva relee el curso y reutiliza sus PDFs vigentes. La acción manual restante es Actualizar PDFs del curso.

Descargar PDFs (N) inicia la descarga manual del ZIP; el formato, validaciones y límite del archivo permanecen iguales. Abrir no inicia una descarga al equipo. Cerrar detiene los siguientes alumnos y aborta las solicitudes del cliente; un render ya iniciado puede terminar en el servidor. Reabrir durante ese intervalo puede recibir 429: la interfaz informa que el servicio está terminando otro PDF y permite actualizar después, sin reintentos automáticos. El componente se identifica por curso y período para aislar aperturas de distintos alcances.

Prueba de interfaz con datos sintéticos y Edge: ejecución única bajo StrictMode, consulta inicial, cierre durante lectura y aborto, reapertura con servicio ocupado, curso vacío y fallo de consulta. No modifica PocketBase ni datos académicos.


## Abstracción de generación en la interfaz — 1 de octubre de 2026

Dirección ve PDF listo o Falta visar en los casos habituales. Se elimina la columna Detalle y los conteos de generación/reutilización. El resumen muestra únicamente PDFs listos para descargar; el origen técnico del archivo sigue disponible en el contrato del servicio y las pruebas, pero no interviene en la presentación. Un bloqueo documental distinto del visado usa Revisar datos; un fallo del servicio usa Reintentar. Los motivos pueden consultarse sobre la etiqueta de estado y las alertas siguen separando visados pendientes de fallos reales.

Al quitar un visado se invalidan sus emisiones. Volver a visar no resucita el archivo anterior: la próxima apertura automática del modal, actualización o descarga individual genera y almacena el PDF nuevo cuando corresponde, sin una acción de regeneración explícita para dirección. No se agrega una cola en segundo plano ni una generación al confirmar el visado: el procesamiento continúa ocurriendo durante la obtención/descarga, con revalidación de datos y autorizaciones. La interfaz individual sólo confirma Descarga iniciada.


## Preparación de release — 1 de octubre de 2026

La release reúne los pulidos aprobados de PDF y revisión directiva, sin nuevas migraciones ni cambios de datos. Se validaron 17 pruebas automatizadas (interfaz en StrictMode, cancelación y reapertura, adapter, elegibilidad acumulativa, persistencia, reutilización y ZIP), lint, build y auditoría de dependencias productivas sin vulnerabilidades. La promoción usa los publicadores versionados de PocketBase y worker, respaldo consistente del VPS y publicación del frontend mediante PR dev → master. Se conserva el warning conocido del bundle.
