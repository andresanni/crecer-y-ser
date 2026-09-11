# Modernización UX/UI de Crecer y Ser

Rama de trabajo: `feature/ui-ux-modernization`. La aprobación visual y la validación funcional son requisitos previos al merge con `master`.

## Prioridades confirmadas

- **Desktop first:** las PC del colegio y el navegador a pantalla completa son el escenario principal. Validar primero 1366/1440 px y Full HD. Las tablas y planillas aprovechan todo el ancho disponible; el comportamiento móvil es secundario.
- **Jerarquía:** Alumnos y Boletines son secciones principales. Resumen, Carga de notas, Monitoreo y Constructor curricular pertenecen a Boletines. La ruta activa debe mantener visible y seleccionado su contexto.

## Dos frentes, una misma entrega por módulo

1. **Arquitectura:** tokens compartidos, composición reutilizable y estilos locales. Cada pantalla migrada debe reducir la duplicación y retirar sus reglas globales obsoletas.
2. **Experiencia visual:** jerarquía clara, lectura cómoda de datos y una identidad escolar alegre. Azul institucional para acciones, celeste para superficies suaves y amarillo como acento. Verde, rojo y ámbar comunican estados acompañados de texto.

La centralización se aplica a decisiones compartidas. Las reglas específicas de una pantalla permanecen en su módulo; no se crea un componente genérico para cada `div` o cada componente nativo de Ant Design.

## Contrato de estilos

| Necesidad | Lugar |
| --- | --- |
| Paleta institucional | `src/theme/colors.ts` |
| Tamaños, tipografía, radios y colores semánticos claros/oscuros | `src/theme/tokens.ts` |
| Apariencia de componentes Ant Design | `src/theme/themeConfig.ts` mediante `ConfigProvider` |
| Composición reutilizable, por ejemplo encabezado | `src/shared/components` con CSS Modules |
| Composición particular de una pantalla | CSS Module junto a la pantalla |
| Estilos anteriores aún pendientes de migrar | `src/index.css`; no agregar nuevos overrides globales |

- Preferir props nativas: `type`, `danger`, `status`, `size`, `variant`, `loading`, `disabled`, `color`, `Grid`, `Space` y `Flex`.
- Consumir variables semánticas `--cys-color-*` en CSS dentro del árbol temático. Usar `theme.useToken()` cuando una API de JavaScript necesita un token.
- Usar `classNames` para nodos semánticos expuestos por Ant Design. Evitar selectores que dependan de su DOM interno.
- No agregar estilos inline estáticos ni `!important` en componentes migrados. Se permiten valores dinámicos calculados a partir de datos, con una razón concreta y alcance local.
- Usar `App.useApp()` para mensajes, notificaciones y confirmaciones que deban heredar el tema. Evitar APIs estáticas que pierden el contexto.
- Mantener comportamiento de teclado, etiquetas accesibles, estados de foco y textos de error. El color no es el único indicador de estado.
- No presentar indicadores de conexión, permisos, período activo o éxito sin evidencia del modelo o de una respuesta real.
- No introducir dependencias adicionales cuando Ant Design resuelve la necesidad.

Referencia técnica: [personalización oficial de Ant Design](https://ant.design/docs/react/customize-theme/). La versión instalada y los tipos TypeScript del repositorio determinan qué API se utiliza.

## Primera entrega implementada

- Navegación compartida: menú que responde al tema, subsecciones de Boletines agrupadas, breadcrumbs, menú móvil con `Drawer`, contracción en escritorio y acceso de teclado al contenido.
- `PageHeader`: jerarquía de título, descripción, icono y acciones; utilizado en Alumnos y Boletines.
- Portal de Boletines: composición con CSS Modules, `Statistic`, tarjetas por área y estados explícitos de carga, ausencia de ciclo y error recuperable. Evita mostrar ceros como si fueran resultados cuando falla la consulta y descarta respuestas de una consulta anterior.
- Idioma español para componentes Ant Design y Day.js.
- Tokens estructurales compartidos entre tema claro y oscuro. Retirado el CSS global de la navegación reemplazada y las tarjetas del portal.

Esta entrega no representa la migración completa del directorio, las planillas ni los formularios. Sus reglas anteriores siguen pendientes.

## Próximas entregas

| Orden | Área | Arquitectura | Revisión UX |
| --- | --- | --- | --- |
| 2 | Directorio de alumnos | Extraer filtros, identidad del alumno y estilos de tabla/tarjetas | Búsqueda, filtros activos, selección, densidad, acciones y estados vacíos |
| 3 | Ficha y formularios | Secciones de formulario, layouts de modales y estados semánticos | Jerarquía de datos, validación, errores, baja y eliminación |
| 4 | Calificaciones y monitoreo | Patrones para planillas, celdas editables y barras de acciones | Edición intensiva, contexto fijo, guardado, progreso y móvil |
| 5 | Constructor curricular y carga pública | Sustituir estilos globales restantes por tokens y módulos | Asignaciones, períodos, enlaces docentes y accesibilidad |
| 6 | Consolidación | Eliminar CSS muerto y duplicaciones de paleta; corregir lint pendiente | Repaso integral claro/oscuro y consistencia de todas las rutas |

## Criterio de aceptación por entrega

1. Revisar pantallas con datos, sin datos, cargando y con error.
2. Verificar primero escritorio a 1366/1440 y 1920 px; el contenido general no debe desbordar y las tablas anchas deben tener scroll propio. Revisar luego el comportamiento secundario a 390 y 768 px.
3. Revisar ambos temas, foco visible, navegación por teclado, cierre con Escape y regreso del foco después de cerrar modales/menús.
4. Ejecutar build y lint; distinguir fallos previos y nuevos. No esconder fallos desactivando reglas.
5. Registrar evidencia visual y resultados funcionales. La compilación por sí sola no demuestra ausencia de regresiones.

## Validación antes del merge

En un entorno de prueba con datos descartables:

- Inicio y cierre de sesión; rutas protegidas y navegación directa/recarga de cada ruta.
- Alumnos: búsqueda, filtros, tabla/tarjetas, orden, paginación, selección y apertura de ficha.
- Alta, edición, validaciones, responsables, inscripción, baja y eliminación con confirmación.
- Sincronización entre dos sesiones y conflicto de edición concurrente.
- Boletines: cursos/períodos, carga de notas, asistencias, observaciones y persistencia al recargar.
- Monitoreo, configuración de materias/criterios/períodos y enlaces de carga pública.
- Errores de red y recuperación sin mensajes de éxito ni contadores engañosos.
- Aprobación visual del usuario, build exitoso, lint resuelto y revisión del diff final antes de integrar con `master`.

## Evidencia inicial

- Baseline del lint antes de cambios: 15 errores y 8 advertencias.
- Build inicial de la implementación: correcto; advertencia de bundle de más de 500 kB. La optimización de carga debe evaluarse por separado.
- Lint después de la primera entrega: 13 errores y 7 advertencias en archivos no modificados. Los archivos modificados pasan lint.
- Revisión autenticada: Boletines carga 7 cursos y 4 períodos; tema claro/oscuro revisado y contraste corregido mediante tokens.
- Boletines revisado a 390, 768 y 1024 px; menú móvil con Drawer, cierre con Escape y retorno del foco comprobados. El portal adapta sus tarjetas a una, dos o tres columnas.
- Alumnos: navegación desde el menú y alternancia tabla/tarjetas comprobadas con 15 registros activos. No se modificaron registros.
- Pendientes: recorridos de escritura, concurrencia, carga docente y aprobación visual. Esta evidencia parcial no habilita el merge.

## Segunda entrega y recuperación del corte — 11/09/2026

El corte no dejó errores de sintaxis ni archivos incompletos. Build y revisión de whitespace pasan. El lint conserva 13 errores y 7 advertencias anteriores; ahora algunos están en archivos que también recibieron ajustes visuales, por lo que no debe interpretarse que todos los archivos modificados están libres de deuda previa.

Implementado:

- Restablecida la jerarquía del menú con Ant Design `Menu` y sus submenús. Ampliado el sidebar a 272 px para mostrar el nombre del Constructor sin recortes.
- Retirado el límite de 1440 px del contenido de gestión y de 1280 px de la carga pública docente. Conservado el ancho acotado de formularios y mensajes cuando favorece su lectura.
- Encabezados compartidos en Alumnos, portal, Constructor, Monitoreo y Carga de notas.
- Extraído `AlumnoFilters` con composición de escritorio y nombres accesibles para búsqueda, grado y recarga.
- Centralizadas 208 ocurrencias iniciales de estilos repetidos en `shared/styles/ui.module.css`, alcanzando formularios, fichas, planillas, configuración, modales y login.
- Actualizadas APIs de Ant Design: `Space.orientation` y `Card.styles.body`. Corregidos colores de texto, bordes y superficies mediante tokens semánticos en las pantallas de gestión.
- Incorporado `MetricCard` para los indicadores de Monitoreo, con carga nativa y acentos por estado; retirados los gradientes claros que perjudicaban el modo oscuro.
- Corregidas superficies de criterios, navegación de alumnos y apoyos en la planilla; eliminado el landmark `main` anidado del layout.

Comprobaciones de interfaz realizadas, sin escrituras de registros:

| Área | Evidencia |
| --- | --- |
| Navegación de escritorio | Jerarquía de Boletines, selección de rutas y nombres completos del menú |
| Alumnos | Tabla/tarjetas y búsqueda revisadas en la primera entrega; formulario abre, muestra campos obligatorios y permite cancelar sin guardar |
| Constructor | Cursos, materias y criterios cargan; períodos y catálogo abren y cierran |
| Monitoreo | Indicadores y cursos cargan; tema oscuro corregido; gestor de enlaces abre sin generar credenciales |
| Carga de notas | Curso, período y criterios cargan; controles de evaluación visibles; guía de curso abre y cierra |
| Acceso docente | Sin token muestra el estado de enlace inválido; el acceso con token válido queda pendiente |
| Login y sitio institucional | Rutas cargan con sus encabezados y sin desbordamiento horizontal en el ancho observado |

La migración de estilos específicos continúa: aún hay estilos inline y CSS global heredado. Esta entrega consolida los patrones compartidos y corrige los defectos observados; no declara terminada la migración de cada celda o formulario. Restan la revisión de detalle de todos los estados, las pruebas de persistencia/concurrencia en un entorno de prueba, la resolución del lint anterior y la aprobación visual antes de integrar.


## Consolidación previa al commit — 11/09/2026

- Lint completo: **0 errores y 0 advertencias**, sin desactivar reglas. El resultado reemplaza los conteos históricos anteriores.
- Build de producción y chequeo de TypeScript: correctos. Persiste la advertencia de tamaño del bundle (aproximadamente 1,64 MB sin comprimir / 494 kB gzip).
- Las cargas iniciales de catálogo, selector, períodos, criterios, constructor, monitoreo, libreta y responsable descartan respuestas de efectos anteriores.
- Las recargas de constructor, monitoreo y libreta se solicitan mediante una revisión; el efecto administra el ciclo de la consulta y su limpieza.
- La selección inicial de alumno se deriva de la lista vigente, sin un efecto que sincronice estado redundante.
- La libreta muestra carga hasta recibir los datos del alumno y período actuales. Un error permite reintentar y no habilita el guardado de datos de una selección anterior.
- Los modales reinician su sesión al abrir mediante useModalSessionKey; conservan el montaje durante el cierre para respetar la animación y el retorno del foco de Ant Design.
- Eliminado el any explícito del mapa de inscripciones; usa el tipo inferido de los registros consultados.

Verificación manual de esta consolidación, con la sesión existente y sin guardar registros:

| Prueba | Resultado |
| --- | --- |
| Constructor: curso, materias y cinco criterios | Cargan correctamente |
| Catálogo | Carga 12 materias; Escape cierra y devuelve el foco al botón de apertura |
| Monitoreo y botón de recarga | Recuperan 7 cursos y los indicadores de matrícula |
| Escritorio a 1440 px | Constructor, monitoreo y libreta sin desbordamiento horizontal del documento |
| Tema oscuro | Monitoreo y libreta abiertos y operativos |
| Cambio de alumno en libreta | Muestra carga intermedia, luego indicadores de la nueva selección; Guardar continúa deshabilitado sin cambios |

Este commit es un punto de control del rediseño. Quedan para aceptación: revisión visual final, migración de estilos específicos heredados y pruebas de escritura, errores de red, permisos y concurrencia con datos descartables. No se ejecutó el merge ni se probaron altas, bajas, guardado de notas o generación de credenciales en la base del colegio.
