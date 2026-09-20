# Preparación productiva de la landing

Actualizado: 20 de septiembre de 2026.

## Propósito de la rama

La rama temporal `codex/landing-production-ready` parte del commit productivo `7ea4304` y concentra los ajustes necesarios para convertir la landing actual en una página pública con contenido institucional real y un formulario de consultas efectivo.

Esta rama no es `dev` ni inaugura todavía el flujo permanente de desarrollo. `master` continúa representando producción y despliega automáticamente en `https://crecer-y-ser-ten.vercel.app/`. La futura rama `dev` se creará desde `master` únicamente después de aprobar, fusionar y verificar este trabajo.

## Resultado esperado

La entrega debe dejar la ruta `/` lista para difusión pública:

- sin textos, datos, fechas, enlaces, imágenes ni métricas de ejemplo;
- con identidad visual coherente en escritorio y móvil;
- con navegación, tema y enlaces externos funcionales;
- con un formulario que entregue realmente cada consulta o informe un error verificable;
- sin modificar los flujos institucionales de `/app`, `/login` o `/carga`.

## Inventario que debe validarse

La mayor parte del contenido está centralizada en `src/modules/landing/data/landingData.ts`. No asumir que un dato actual es real sólo porque no contiene la palabra `Placeholder`. El propietario debe confirmar:

- nombre institucional, código, lema y texto de admisiones;
- título, descripción y puntos destacados del hero;
- URL, etiqueta y descripción del acceso a Acadeu;
- pilares pedagógicos, niveles y características ofrecidas;
- novedades, fechas, títulos y descripciones;
- dirección, teléfonos, WhatsApp, correo y horario de atención;
- imágenes, logotipos, iconos, favicon y textos alternativos;
- enlaces del header, footer y llamados a la acción;
- cualquier métrica o afirmación cuantitativa, aunque actualmente no sea visible.

Los datos evidentes de ejemplo se encuentran en `landingData.contacto`. El formulario de `src/modules/landing/components/ContactoSection.tsx` también es una simulación: espera mediante `setTimeout`, muestra éxito y borra los campos sin transmitir la consulta.

## Alcance visual

Se permite ajustar composición, copy, espaciado, jerarquía, imágenes y comportamiento responsive dentro de la landing. Deben respetarse `frontend_guidelines.md` y `docs/ux-modernization.md`:

- reutilizar los tokens, tipografías y paleta existentes;
- no duplicar estilos compartidos ni introducir selectores globales innecesarios;
- priorizar componentes y propiedades nativas de Ant Design;
- conservar soporte móvil y validar como mínimo anchos representativos de móvil, 1366, 1440 y 1920 px;
- mantener navegación por teclado, foco visible, contraste suficiente, etiquetas y textos alternativos útiles;
- evitar una dependencia de producción nueva salvo necesidad concreta y validada.

## Formulario de consultas

No implementar el formulario hasta que el propietario defina explícitamente el destino de las consultas, los campos definitivos, la política de conservación y si se requiere consentimiento o aviso de privacidad.

La implementación aprobada debe cumplir como mínimo:

- no contener credenciales ni secretos en el bundle de Vite;
- no escribir directamente desde el navegador en una colección pública de PocketBase;
- usar un gateway del servidor u otro proveedor expresamente aprobado;
- validar y limitar longitudes tanto en cliente como en servidor;
- normalizar entradas y tratar todo texto recibido como no confiable;
- incluir mitigación razonable de spam y abuso, con limitación de frecuencia en el servidor;
- no registrar el cuerpo completo de las consultas ni datos personales innecesarios;
- mostrar éxito sólo después de una confirmación real del servidor;
- conservar los campos y mostrar un error accionable cuando falle el envío;
- impedir envíos duplicados mientras una solicitud está en curso.

Si se elige PocketBase como receptor, cualquier colección, regla, hook o migración debe seguir `docs/pocketbase-environments.md`, `docs/pocketbase-magic-link-hardening.md` y `deploy/README.md`. Primero se implementa y prueba localmente; nunca se experimenta con datos reales en el VPS.

## Fuera de alcance

- Crear la rama permanente `dev`.
- Cambiar autenticación, permisos o pantallas internas.
- Modificar el workflow de boletines o enlaces docentes.
- Copiar datos entre PocketBase local y producción.
- Configurar Preview Deployments contra el backend productivo.
- Fusionar o publicar en `master` sin aprobación explícita del propietario.

## Flujo de trabajo para otros agentes

1. Leer `AGENTS.md` y todos los documentos obligatorios aplicables.
2. Cambiar a `codex/landing-production-ready` y actualizarla desde su remoto sin mezclar cambios ajenos.
3. Revisar `git status` antes de editar y preservar cualquier modificación existente.
4. Trabajar contra el frontend local y PocketBase local cuando el formulario necesite backend.
5. Mantener los cambios limitados a la landing, sus recursos, el contrato de consultas y la documentación relacionada.
6. Hacer commits pequeños y descriptivos en esta rama; no hacer push directo a `master`.
7. Ejecutar `npm run lint` y `npm run build` después de cambios de código.
8. Verificar visualmente todas las secciones, rutas y estados del formulario.
9. Actualizar este documento y `docs/project-context.md` si cambia una decisión funcional o arquitectónica.
10. Presentar el diff y los resultados de validación antes de solicitar el merge.

## Criterios de aceptación

- Todo contenido público fue confirmado por el propietario y no quedan placeholders ni afirmaciones inventadas.
- No hay imágenes rotas, enlaces vacíos ni destinos de ejemplo.
- La landing es usable con teclado y en los anchos definidos.
- Los temas claro y oscuro mantienen contraste y legibilidad.
- El formulario demuestra un envío real en desarrollo con estados de carga, éxito y error.
- Las protecciones del formulario fueron probadas sin usar datos personales reales.
- `npm run lint` y `npm run build` finalizan correctamente; el warning vigente del bundle se registra como deuda conocida y no se oculta elevando el límite.
- Las rutas `/login`, `/carga` y `/app` conservan su comportamiento.
- La rama está actualizada, publicada y lista para una revisión final antes del merge.

## Merge y verificación productiva

El merge se realizará sólo después de la aprobación explícita del propietario. La secuencia final es:

1. Confirmar que `master` no avanzó o integrar sus cambios en esta rama de forma controlada.
2. Repetir lint, build y aceptación visual sobre el commit candidato.
3. Fusionar la rama en `master` y publicar `master` en GitHub.
4. Esperar el deployment de Production en Vercel.
5. Verificar landing, recursos, enlaces, formulario y consola en la URL pública.
6. Confirmar que el bundle continúa apuntando únicamente a `https://alumnos-api.duckdns.org`.
7. Crear `dev` desde el `master` productivo ya verificado y documentar entonces el flujo permanente de ramas.
