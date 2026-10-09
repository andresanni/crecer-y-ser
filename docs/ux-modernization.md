# Arquitectura UX/UI vigente

La modernización visual fue desarrollada originalmente en la rama `feature/ui-ux-modernization`, aprobada y fusionada en `master` el 12 de septiembre de 2026. Como parte de las tareas de limpieza y paridad de ramas del 21 de septiembre de 2026, la rama `feature/ui-ux-modernization` fue eliminada en local y remoto al encontrarse plenamente integrada en el historial de `master`. Este documento describe el contrato actual, no el historial de la rama de trabajo.

## Principios

- La aplicación es una herramienta operativa: el contenido de trabajo prevalece sobre encabezados y elementos decorativos.
- El diseño es desktop first, sin abandonar navegación, accesibilidad y modales adaptables en pantallas pequeñas.
- Las decisiones compartidas se centralizan; las reglas específicas permanecen junto al módulo que las necesita.
- Azul institucional identifica acciones, celeste superficies suaves y amarillo acentos. Verde, ámbar y rojo expresan estados siempre acompañados por texto o iconografía.

## Layouts

- `MainLayout` es el shell privado: sidebar, navegación móvil, barra superior, breadcrumbs, sesión y `Outlet`.
- `SectionLayout` es la raíz de cada pantalla operativa: compone el encabezado y el área funcional con separación uniforme.
- `PageHeader` es una implementación interna de `SectionLayout`: icono, título y acciones opcionales, sin subtítulo.
- El sidebar usa 200 px desplegado y 64 px contraído, con fondo azul suave derivado de los tokens del tema, sin borde separador. El menú es transparente para mantener una superficie continua, diferenciada del área de trabajo únicamente por el fondo. El drawer móvil usa 224 px y comparte el fondo. Las opciones de `Boletines` se agrupan en un contenedor con guía visual vertical y sangría para sus subsecciones (`Bimestres` y `Constructor`), expresando claramente su jerarquía secundaria.
- La barra superior y la franja del logo comparten `--cys-shell-header-height` (64 px). En escritorio el logo se centra dentro de esa altura, sin padding superior adicional del sidebar, y su superficie blanca queda contenida con aire arriba y abajo. La altura de la topbar es fija en escritorio y mínima en móvil. El contenido aprovecha todo el ancho disponible.
- `Boletines` es exclusivamente un desplegable: abrirlo o cerrarlo conserva la ruta y el contenido de trabajo. Sólo `Bimestres` y `Constructor` navegan. El menú contraído también abre las opciones mediante clic; en móvil abrir el grupo mantiene el drawer visible y elegir una subsección lo cierra. El grupo empieza cerrado fuera de Boletines y abierto en sus rutas. No existe página de atajos; `/app/boletines` redirige a Bimestres por compatibilidad. En breadcrumbs, Boletines es una categoría sin enlace. La selección de bimestre muestra los períodos directamente, sin bloque introductorio.

## Tipografía y densidad

El marco visual aprobado el 9 de octubre de 2026 utiliza el mismo azul muy claro en la barra lateral, la barra superior y el drawer, derivado de `colorPrimaryBg` (50 %) y `colorBgContainer` (50 %), con textos oscuros y una diferencia sutil respecto del área operativa. La selección se destaca con superficie blanca y texto azul mediante el menú claro nativo. La barra superior forma un marco continuo con el sidebar; `shellHeaderTheme` centraliza los tokens de breadcrumbs, botones de texto y carga, aplicados mediante un ConfigProvider limitado al encabezado. El contenido operativo conserva su tema claro y las etiquetas de ciclo mantienen su significado. La separación se resuelve mediante el fondo, sin borde exterior.

- Manrope para títulos y navegación.
- Inter para cuerpo, tablas, formularios y controles.
- Los encabezados operativos usan un rango fluido de 18 a 21 px y un icono compacto; ambos se definen en `PageHeader`.
- El espaciado entre encabezado y zona operativa se define en `SectionLayout`. Los títulos de la landing conservan sus estilos propios y no se aplican a las pantallas operativas.
- Los modales extensos limitan su altura al viewport, mantienen acciones accesibles y usan scroll interno solo cuando el contenido no puede entrar físicamente.

## Formularios modales

- `FormModal` es el marco compartido para formularios en modal: encabezado, icono, descripción opcional, área desplazable, footer persistente y comportamiento responsive.
- `FormModalSteps` centraliza la navegación visual de formularios secuenciales, incluidos los estados pendiente, activo y completado.
- Cada dominio conserva la composición de sus campos, reglas, columnas y contenido condicional; no se fuerza una grilla única cuando perjudica la tarea.
- Los campos obligatorios se identifican visualmente y la validación dirige el foco al primer error mediante `focusFirstFormError`.
- En formularios largos, las acciones deben permanecer visibles mientras solo el cuerpo del formulario se desplaza.
- Los textos de acción son breves y consistentes: `Cancelar`, `Anterior`, `Continuar` y una acción final específica.

## Propiedad de estilos

| Necesidad | Fuente canónica |
| --- | --- |
| Paleta institucional | `src/theme/colors.ts` |
| Tipografía, radios y tokens semánticos | `src/theme/tokens.ts` y variables raíz |
| Componentes Ant Design | `src/theme/themeConfig.ts` |
| Shell privado | `src/shared/components/MainLayout*` |
| Pantallas operativas | `src/shared/components/SectionLayout*` |
| Encabezado de sección | `src/shared/components/PageHeader*` |
| Tarjetas de selección y grilla adaptable | `src/shared/components/NavigationCard*` |
| Formularios en modal | `src/shared/components/FormModal*` |
| Foco de validación | `src/shared/utils/formValidation.ts` |
| Composición reutilizable menor | `src/shared/styles/ui.module.css` |
| Estilo propio de una pantalla | CSS Module dentro de su módulo |

`src/index.css` contiene reglas globales e históricas todavía vigentes. Debe reducirse gradualmente al migrar cada área; no es el destino para nuevas reglas específicas.

## Centralización gradual de la zona operativa — 9 de octubre de 2026

La selección de bimestres y meses de asistencia comparte `NavigationCard` y `NavigationCardGrid`. La tarjeta centraliza superficie neutra, borde, radio, espaciado, título, marcador, flecha, interacción y foco; la grilla usa Row/Col de Ant Design con cuatro columnas en escritorio, dos desde 576 px y una en teléfonos. Los módulos aportan título, marcador, acción y estado opcional, sin duplicar el CSS de la tarjeta ni definir paletas locales. Toda la superficie activa la navegación mediante un botón nativo accesible por teclado; el estado también se anuncia como descripción accesible.

Los meses abiertos conservan la etiqueta verde con verificación y texto `Abierto`; el estado no tiñe toda la superficie ni cambia el color de la acción. Los restantes muestran `Sin abrir`. Bimestres conserva su número y nombre, sin inventar estados. El encabezado pertenece a SectionLayout y la selección comienza directamente con las tarjetas. Carga y vacío reutilizan los paneles de `shared/styles/ui.module.css`; los errores mantienen sus alertas operativas. Las demás pantallas se migrarán por composición a medida que se trabaje sobre ellas, conservando el tema Ant Design como fuente de botones y etiquetas.

## Reglas de implementación

- Preferir propiedades nativas de Ant Design y tokens semánticos.
- Evitar valores de color, tipografía, radios o espaciados compartidos duplicados.
- Evitar estilos inline estáticos en componentes nuevos o migrados.
- Mantener foco visible, navegación por teclado, cierre con Escape y retorno del foco.
- No usar color como único indicador de estado.
- No mostrar éxito, conexión o disponibilidad sin evidencia real del modelo o la API.
- No agregar comentarios al código; registrar decisiones duraderas en esta documentación.

## Validación

El tablero de Bimestres mantiene la tabla montada durante las actualizaciones de progreso. El botón de actualización muestra actividad durante la consulta y un punto discreto cuando hay cambios Realtime pendientes; sólo la primera carga reemplaza el contenido por un indicador de espera. Si falla una actualización, el último resumen válido permanece visible.

El tema claro es la única presentación. Cada cambio visual debe revisar estados con datos, carga, vacío y error. Ejecutar `npm run lint` y `npm run build`. Para flujos de escritura, usar datos descartables y verificar persistencia después de recargar.


## Revisión individual y descarga PDF

La barra del alumno conserva su navegación y muestra únicamente el estado VISADO o SIN VISAR junto a Visar / Quitar visado y Descargar PDF. El conteo de visados pertenece al listado del curso. Se elimina la instancia de vista previa institucional; la descarga se realiza directamente con los controles de elegibilidad y vigencia existentes. El modal de PDFs del curso omite el aviso introductorio de reglas, conservando las alertas operativas de errores y exclusiones.


El listado de revisión del curso omite buscador, indicaciones iniciales, subtítulo y contador separado de estudiantes. Su barra superior ubica Generar PDFs del curso a la izquierda y el conteo de boletines visados a la derecha, con ajuste a pantallas estrechas. Los alumnos se ordenan alfabéticamente por apellido y nombre usando comparación española, sin distinguir mayúsculas o acentos; conservan su número de orden. La navegación Anterior/Siguiente de revisión comparte ese orden.


La obtención de PDFs muestra actividad durante la comprobación y, en los casos habituales, PDF listo o Falta visar. No expone diferencias entre generación y reutilización. Abrir Generar PDFs del curso inicia la comprobación y generación necesaria. Actualizar PDFs del curso permite repetirla; Descargar PDFs es una acción separada, con su propio estado de actividad. El resumen cuenta PDFs listos para descargar. Descargar PDF individual confirma sólo el inicio de descarga sin abrir modales.


En el lote PDF, los boletines sin visados o con bloqueos documentales muestran una advertencia y su motivo; una comprobación terminada con esos bloqueos no usa una barra roja. Los fallos de servicio se informan por separado y muestran mensajes operativos, sin instrucciones de infraestructura dentro de la tabla de alumnos.


## Abstracción de PDFs para dirección

El modal del curso muestra únicamente Alumno/a y Estado. Los estados habituales son PDF listo y Falta visar. El resumen indica cuántos PDFs están listos para descargar, sin distinguir generación nueva, regeneración o reutilización. El motivo concreto de un visado faltante puede consultarse sobre su etiqueta, sin una columna adicional. Durante el proceso se conservan los indicadores de actividad. Los casos excepcionales muestran Revisar datos para bloqueos documentales o Reintentar para fallos del servicio, evitando atribuirlos falsamente al visado. La descarga individual confirma solamente Descarga iniciada.

La preparación documental anticipada agrega una advertencia en la libreta cuando faltan identidad o apoyos, aun antes del visado. Lista los campos concretos y reutiliza los formularios vigentes mediante Completar ficha / Revisar responsable / Revisar apoyos. La URL conserva matrícula, curso y bimestre para volver a la misma revisión; navegar a otro bimestre para corregir apoyos agrega Volver al boletín de origen. Los accesos quedan inactivos mientras hay cambios académicos sin guardar. El listado señala Faltan datos para PDF y las filas bloqueadas del lote ofrecen Completar datos dentro de Estado, sin una columna adicional. Realtime refresca el aviso sin remontar el editor ni reemplazar borradores; preparación desconocida o desactualizada no habilita descargar. El visado académico permanece independiente del bloqueo documental.


La etapa 2 incorpora un único CursadaModal basado en FormModal para confirmar bimestres y registrar bajas. Bimestres presenta pendientes por curso con acceso individual; la ficha de cursada muestra rango/estado por matrícula. Las bajas incluyen fecha administrativa y rango, o Sin cursada. Un conflicto conserva el formulario y ofrece Volver a cargar; el servidor no acepta reintentos con versiones vencidas. El aviso docente permite continuar el borrador, pero informa que dirección debe confirmar antes de la entrega.

## Adaptación mobile para carga docente por Magic Link

El flujo de carga docente accesible mediante enlaces mágicos (`/carga`) está optimizado para su uso en teléfonos móviles preservando intacta la experiencia de escritorio:

- **Encabezado institucional**: En pantallas reducidas (≤ 767 px), las tarjetas de grado, turno y período se reorganizan en una grilla de distribución uniforme y el isotipo institucional y título escalan armoniosamente sin desbordes horizontales.
- **Barra fija del estudiante**: La navegación compacta sitúa los botones Anterior/Siguiente y la identidad del estudiante en una única fila fluida, truncando nombres extensos y restringiendo el selector de alumnos al ancho visible. Las acciones operativas ("Guía del Curso" y "Enviar bimestre") se ubican en una segunda fila con áreas táctiles amplias.
- **Tarjetas y criterios pedagógicos**: Los criterios de evaluación se apilan verticalmente en pantallas móviles (≤ 575 px), presentando la descripción en la parte superior y el selector de notas debajo a ancho completo con altura táctil accesible (40 px). Los criterios ya calificados muestran un resumen con acceso cómodo de modificación. La Calificación General adopta idéntico comportamiento de apilamiento vertical.
- **Barra de guardado y panel de monitoreo**: La barra flotante de cambios pendientes se fija inferiormente con botones táctiles de ancho completo, y el drawer lateral de la guía del curso aprovecha la totalidad del ancho móvil.

