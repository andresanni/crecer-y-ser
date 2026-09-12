# Arquitectura UX/UI vigente

La modernización visual fue aprobada y fusionada en `master` el 12 de septiembre de 2026. Este documento describe el contrato actual, no el historial de la rama de trabajo.

## Principios

- La aplicación es una herramienta operativa: el contenido de trabajo prevalece sobre encabezados y elementos decorativos.
- El diseño es desktop first, sin abandonar navegación, accesibilidad y modales adaptables en pantallas pequeñas.
- Las decisiones compartidas se centralizan; las reglas específicas permanecen junto al módulo que las necesita.
- Azul institucional identifica acciones, celeste superficies suaves y amarillo acentos. Verde, ámbar y rojo expresan estados siempre acompañados por texto o iconografía.

## Layouts

- `MainLayout` es el shell privado: sidebar, navegación móvil, barra superior, breadcrumbs, sesión, tema y `Outlet`.
- `SectionLayout` es la raíz de cada pantalla operativa: compone el encabezado y el área funcional con separación uniforme.
- `PageHeader` es una implementación interna de `SectionLayout`: icono, título y acciones opcionales, sin subtítulo.
- El sidebar usa 240 px desplegado y 72 px contraído. El drawer móvil usa 264 px.
- La barra superior usa una altura mínima de 64 px y el contenido aprovecha todo el ancho disponible.

## Tipografía y densidad

- Manrope para títulos y navegación.
- Inter para cuerpo, tablas, formularios y controles.
- Los encabezados de sección usan un rango fluido de 20 a 24 px.
- El espaciado entre encabezado y zona operativa se define en `SectionLayout`.
- Los modales extensos limitan su altura al viewport, mantienen acciones accesibles y usan scroll interno solo cuando el contenido no puede entrar físicamente.

## Propiedad de estilos

| Necesidad | Fuente canónica |
| --- | --- |
| Paleta institucional | `src/theme/colors.ts` |
| Tipografía, radios y tokens semánticos | `src/theme/tokens.ts` y variables raíz |
| Componentes Ant Design | `src/theme/themeConfig.ts` |
| Shell privado | `src/shared/components/MainLayout*` |
| Pantallas operativas | `src/shared/components/SectionLayout*` |
| Encabezado de sección | `src/shared/components/PageHeader*` |
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

Cada cambio visual debe revisar tema claro y oscuro, estados con datos, carga, vacío y error. Ejecutar `npm run lint` y `npm run build`. Para flujos de escritura, usar datos descartables y verificar persistencia después de recargar.
