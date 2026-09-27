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
- El sidebar usa 200 px desplegado y 64 px contraído. El drawer móvil usa 224 px. Las opciones de `Boletines` se alinean con las secciones principales y comparten un fondo sutil que indica pertenencia sin indentación.
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
