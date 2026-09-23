# Cierre de preparación productiva de la landing

Actualizado: 23 de septiembre de 2026.

## Estado

El trabajo iniciado en `codex/landing-production-ready` fue aprobado, fusionado en `master` mediante el commit de merge `dc865ee` y desplegado en producción. La rama temporal fue eliminada después de comprobar que todo su historial quedó contenido en `master`.

La landing productiva está disponible en `https://crecer-y-ser-ten.vercel.app/`. Este documento conserva el alcance aprobado y las condiciones que deben mantenerse en cambios futuros; ya no describe una rama activa ni una entrega pendiente.

## Resultado consolidado

- Contenido institucional y recursos visuales actualizados.
- Hero, propuesta, niveles, footer y acceso institucional adaptados a móvil.
- Navegación, enlaces externos, temas y recursos verificados.
- Formulario conectado a PocketBase y SMTP institucional.
- Scripts de despliegue ampliados para incluir los hooks de contacto.
- Lint, build y comprobaciones productivas superadas antes del merge.

## Fuente del contenido

El contenido estructurado continúa centralizado en `src/modules/landing/data/landingData.ts`. Todo cambio futuro debe confirmar con el propietario:

- nombre institucional, código, lema y campañas vigentes;
- título, descripción y puntos destacados del hero;
- URL, etiqueta y descripción del acceso a Acadeu;
- pilares pedagógicos, niveles y características ofrecidas;
- novedades, fechas, títulos y descripciones;
- dirección, teléfonos, WhatsApp, correo y horario de atención;
- imágenes, logotipos, iconos, favicon y textos alternativos;
- enlaces del header, footer y llamados a la acción;
- métricas o afirmaciones cuantitativas, aunque no sean visibles.

No se incorporan placeholders ni afirmaciones inventadas a `master`.

## Contrato visual

La landing respeta `frontend_guidelines.md` y `docs/ux-modernization.md`:

- reutiliza los tokens, tipografías y paleta existentes;
- evita duplicar estilos compartidos o ampliar selectores globales sin necesidad;
- prioriza componentes y propiedades nativas de Ant Design;
- conserva soporte móvil y validación en anchos representativos de móvil, 1366, 1440 y 1920 px;
- mantiene navegación por teclado, foco visible, contraste, etiquetas y textos alternativos útiles;
- no agrega dependencias de producción sin una necesidad concreta y validada.

## Formulario de consultas

`ContactoSection.tsx` consume `POST /api/cys/contacto` mediante `src/modules/landing/services/contactService.ts`. PocketBase registra la ruta en `pb_hooks/contacto.pb.js` y resuelve validación, mitigación y correo en `pb_hooks/lib/contactService.js`.

El servicio vigente incluye:

- destino `secretariacreceryser@gmail.com`;
- `Reply-To` con nombre y correo del remitente;
- cuerpo HTML y texto plano con contenido escapado;
- honeypot `_hp`;
- límite en memoria de cinco solicitudes cada diez minutos por IP, excepto loopback local;
- cuerpo máximo de 16 KB;
- validaciones de tipos y longitudes en cliente y servidor;
- bloqueo de envíos duplicados mientras una solicitud está en curso;
- éxito sólo después de la confirmación del servidor;
- conservación de campos y mensaje accionable ante errores.

Las credenciales SMTP permanecen en la configuración privada de cada instancia de PocketBase y nunca en Git. El endpoint no persiste consultas en colecciones.

## Criterios permanentes

- No dejar imágenes rotas, enlaces vacíos ni destinos de ejemplo.
- No mostrar éxito si PocketBase no confirmó el envío.
- No escribir directamente desde el navegador en una colección pública.
- No registrar cuerpos completos de consultas ni datos personales innecesarios.
- Probar las protecciones con datos sintéticos en el entorno local.
- Mantener intactos los comportamientos de `/login`, `/carga` y `/app`.
- Ejecutar `npm run lint` y `npm run build` después de cambios de código.
- Desplegar hooks mediante los scripts versionados y verificar el endpoint después del reinicio.

Los cambios posteriores siguen el flujo de ramas definido en `docs/branching-strategy.md`.
