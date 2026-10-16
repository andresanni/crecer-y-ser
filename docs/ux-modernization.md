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
- El sidebar usa 200 px desplegado y 64 px contraído, con fondo diferenciado y borde institucional en tono azul. El drawer móvil usa 224 px. Las opciones de `Boletines` se agrupan en un contenedor con guía visual vertical y sangría para sus subsecciones (`Bimestres` y `Constructor`), expresando claramente su jerarquía secundaria.
- La barra superior usa una altura mínima de 64 px y el contenido aprovecha todo el ancho disponible.
- `Boletines` presenta sólo dos accesos navegables, `Bimestres` y `Constructor`. La selección de bimestre muestra los períodos directamente, sin bloque introductorio.

## Tipografía y densidad

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
| Formularios en modal | `src/shared/components/FormModal*` |
| Foco de validación | `src/shared/utils/formValidation.ts` |
| Composición reutilizable menor | `src/shared/styles/ui.module.css` |
| Estilo propio de una pantalla | CSS Module dentro de su módulo |

`src/index.css` contiene reglas globales e históricas todavía vigentes. Debe reducirse gradualmente al migrar cada área; no es el destino para nuevas reglas específicas.

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

## Sistema de identidad institucional y primitivas visuales (Convergencia Landing -> App)

El rediseño institucional de la landing (`landing_urgent_update`, octubre de 2026) estableció un lenguaje visual propio del **Colegio Crecer y Ser (A-1134)**. Para que la futura evolución visual de `/app` y `/carga` comparta la misma identidad sin duplicar reglas por módulo, las siguientes primitivas constituyen la referencia canónica al centralizar tokens en `src/theme/colors.ts`, `src/theme/tokens.ts`, `src/theme/themeConfig.ts` y `src/shared/styles/ui.module.css`:

### 1. Paleta cromática institucional

| Rol | Valor / Rango | Uso canónico |
| --- | --- | --- |
| **Azul Marino Institucional** | `#1e3a8a` (hover `#172554`) | Autoridad institucional, títulos principales, bordes superiores de identidad, base de botones primarios e iconos principales. |
| **Azul Real de Acción** | `#1d4ed8` / `#2563eb` | Foco interactivo, parada final en degradados primarios, bordes activos en hover y enlaces destacados. |
| **Celeste Académico** | `#0284c7` / `#eff6ff` / `#dbeafe` | Superficies suaves de tarjetas e iconos, acentos tipográficos en degradado (`#1d4ed8 -> #0284c7`) y contenedores de resumen. |
| **Rojo Escarlata del Escudo** | `#dc2626` / `#fff1f2` / `#be123c` | Indicadores puntuales de vigencia/atención (beacons), remate tricolor institucional y estados críticos o socioemocionales. |
| **Ámbar Cálido** | `#d97706` / `#fffbeb` / `#fde68a` | Identidad cálida (Nivel Inicial) y advertencias operativas constructivas. |
| **Neutros Pizarra** | `#0f172a` (títulos), `#1e293b` (controles), `#475569` (cuerpo), `#64748b` (metadatos), `#e2e8f0` / `#cbd5e1` (bordes), `#f8fafc` / `#f1f5f9` (fondos) | Estructura limpia en tema claro, evitando grises puros desaturados. |

### 2. Familia de botones y controles interactivos

1. **Botón Primario Institucional (Sólido con degradado marino)**:
   - **Fondo**: `linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)` (hover `linear-gradient(135deg, #172554 0%, #1e40af 100%)`).
   - **Geometría y tipografía**: radio `10px–12px`, fuente `Manrope` (`font-weight: 700`), texto `#ffffff`.
   - **Elevación**: `box-shadow: 0 8px 20px -4px rgba(30, 58, 138, 0.35)` con micro-elevación `translateY(-1px / -2px)` en hover.
   - **Aplicación en `/app`**: Acción principal única por pantalla o modal (`Guardar`, `Emitir`, `Generar PDFs`, `Confirmar`).

2. **Botón Secundario Transparente / Outline Estructurado**:
   - **Fondo**: `#ffffff` o `rgba(255, 255, 255, 0.92)`, borde `1px–1.5px solid #cbd5e1`, color `#1e293b` (`#334155` en variantes compactas de barra superior).
   - **Hover**: borde `#1d4ed8` o `#93c5fd`, texto `#1e3a8a` / `#1d4ed8`, fondo `#f8fafc` / `#ffffff`, sombra sutil `0 4px 12px rgba(29, 78, 216, 0.08)`.
   - **Aplicación en `/app`**: Acciones secundarias de cabecera (`PageHeader`), filtros, navegación entre alumnos (`Anterior` / `Siguiente`) y accesos administrativos.

3. **Botón Tonal Contextual**:
   - **Fondo**: superficie tintada de baja saturación (`#eff6ff` con borde `rgba(59, 130, 246, 0.38)` y texto `#1e3a8a`; o `#fffbeb` con borde `rgba(245, 158, 11, 0.45)` y texto `#b45309`).
   - **Hover**: incremento suave de saturación del fondo (`#dbeafe` o `#fef3c7`) sin competir con el botón primario sólido.
   - **Aplicación en `/app`**: Acciones dentro de tarjetas de curso, filas de tabla o paneles laterales (`Editar`, `Revisar apoyos`, `Completar ficha`).

4. **Píldoras de Acceso y Chips (Pill Controls)**:
   - **Geometría**: `border-radius: 999px`, altura compacta (`34px–36px`), fondo blanco o translúcido con borde `#e2e8f0`, icono a la izquierda e indicador direccional o de estado a la derecha.
   - **Aplicación en `/app`**: Accesos rápidos, filtros rápidos de estado y enlaces externos o entre módulos.

### 3. Superficies, tarjetas y contenedores

- **Tarjetas con filete superior de identidad**:
  - Fondo `#ffffff`, radio `16px–24px` (según jerarquía entre tarjeta operativa y contenedor principal), borde `1px solid rgba(226, 232, 240, 0.95)` y sombra suave `0 12px 30px -8px rgba(15, 23, 42, 0.06)`.
  - Filete superior (`::before` de `3px–5px`) en degradado institucional (`#1e3a8a -> #2563eb`) o tricolor institucional (`#1e3a8a -> #2563eb -> #dc2626`) para destacar contenedores principales, modales o formularios.
- **Filas / Tarjetas Atómicas Interactivas**:
  - Contenedores horizontales compactos (`border-radius: 14px–16px`, `padding: 14px 18px`, `border: 1px solid #e2e8f0`) con icono izquierdo en squircle (`44px x 44px`, radio `12px`, fondo `linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)`, borde `rgba(191, 219, 254, 0.8)`, color `#1e3a8a`), etiqueta superior `11.5px` en `#64748b`, valor principal en `Manrope 800` `#0f172a` y metadato inferior.
- **Cajas Tonales de Agrupación**:
  - Bloques internos con fondo `rgba(239, 246, 255, 0.65)` y borde `1px solid rgba(191, 219, 254, 0.65)` (o su equivalente ámbar/escarlata según contexto) y radio `14px–16px` para agrupar listas de verificación, requisitos o resúmenes sin recargar con bordes grises pesados.

### 4. Identidad institucional, encabezados y badges

- **Lockup con Escudo Circular**:
  - Usar siempre `/escudo-circular.png` libre de recuadros blancos artificiales, acompañado por tipografía `Manrope` (`800` para el nombre del colegio, `600` para el código `Colegio A-1134` o rol del sistema) y filete divisor vertical (`2px solid #cbd5e1`) o borde superior (`3px solid #1e3a8a`) en barras de navegación y shells (`MainLayout`, `/login`, `/carga`).
- **Títulos con Acento Institucional y Economía de Texto**:
  - Priorizar un único título expresivo en `#1e3a8a` con palabra clave en degradado (`linear-gradient(135deg, #1d4ed8 0%, #2563eb 52%, #0284c7 100%)`) antes que acumular subtítulos, etiquetas superiores o párrafos instructivos redundantes.
- **Badges con Punto Indicador (Beacon Pills)**:
  - Píldoras `border-radius: 999px` con fondo `#eff6ff`, borde `#bfdbfe`, texto `#1e3a8a` (`Manrope 700`) y punto circular de `7px–8px` en color semántico (`#dc2626` atención/vigencia, `#16a34a` completado/visado, `#d97706` pendiente).


