# Contrato compartido para agentes

Este archivo es la autoridad de trabajo del repositorio para Codex, Google Antigravity y cualquier otro agente. Ninguna herramienta es propietaria del código ni de la arquitectura.

## Contexto obligatorio

Antes de modificar código, consultar:

1. `docs/project-context.md` para el estado funcional y arquitectónico actual.
2. `frontend_guidelines.md` para convenciones de frontend y modelo de datos.
3. `pb_schema.json` antes de cambiar consultas, relaciones o escrituras de PocketBase.
4. `docs/ux-modernization.md` cuando el trabajo afecte layout, estilos, temas o componentes compartidos.
5. `docs/magic-link-gradebook.md` y `docs/pocketbase-api.md` cuando el trabajo afecte boletines, enlaces docentes o sus transiciones de estado.
6. `docs/pocketbase-magic-link-hardening.md` y `deploy/README.md` antes de cambiar hooks, migraciones, reglas o despliegue de PocketBase.
7. `docs/pocketbase-environments.md` antes de crear, probar, promover, revertir o sincronizar cambios entre PocketBase local y el VPS.

## Reglas de trabajo

- Respetar TypeScript estricto y la organización vertical por dominio en `src/modules`.
- Preservar cambios existentes y revisar `git status` antes de editar.
- No añadir comentarios en código fuente, archivos de configuración, CSS o HTML. Expresar la intención mediante nombres claros y mantener las decisiones duraderas en `docs/`.
- No duplicar paletas, tipografías, layouts ni estilos compartidos dentro de módulos.
- Usar `MainLayout` únicamente como shell global de `/app` y `SectionLayout` para cada pantalla operativa.
- Mantener `PageHeader` encapsulado por `SectionLayout`; los encabezados de sección llevan icono, título y acciones opcionales, sin subtítulo.
- Priorizar componentes y propiedades nativas de Ant Design antes de crear abstracciones o selectores globales.
- No agregar dependencias de producción sin una necesidad concreta y validada.
- No incorporar secretos ni archivos `.env` al control de versiones.
- No copiar `pb_data` de desarrollo al VPS. Promover cambios mediante migraciones y hooks versionados; toda copia de producción usada localmente debe sanearse según `docs/pocketbase-environments.md`.
- Mantener `deploy/pocketbase-dev-seed` exclusivamente para datos sintéticos locales; nunca incluirlo entre los artefactos del VPS ni introducir allí datos derivados de personas reales.
- Mantener un único editor de boletines compartido y resolver las diferencias entre docentes y dirección mediante políticas de acceso y orígenes de datos.
- No escribir evaluaciones, criterios ni cierres directamente desde el cliente; toda escritura de planilla debe atravesar el gateway correspondiente al rol y respetar el estado del workflow.
- Ejecutar `npm run lint` y `npm run build` después de cambios de código.
- Tratar el warning actual de tamaño del bundle como deuda conocida; no ocultarlo cambiando el límite sin optimizar la carga.

## Convivencia entre agentes

- Mantener este archivo y los documentos enlazados como única fuente de verdad compartida.
- No crear instrucciones paralelas con contenido duplicado en `.agents/rules`, `.codex` o archivos específicos de proveedor.
- Si una herramienta exige un archivo adaptador, este debe limitarse a apuntar a `AGENTS.md`, sin redefinir reglas.
- Ante una contradicción entre contexto global de una herramienta y este repositorio, prevalecen la petición actual del usuario y luego este archivo dentro del alcance del proyecto.
- Actualizar el documento canónico correspondiente en el mismo cambio cuando evolucione la arquitectura o el modelo funcional.
