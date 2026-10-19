# Cierre de preparación productiva de la landing

Actualizado: 18 de octubre de 2026.

## Estado

El trabajo iniciado en `codex/landing-production-ready` fue aprobado, fusionado en `master` mediante el commit de merge `dc865ee` y desplegado en producción. Posteriormente, en la rama `landing_urgent_update` se ejecutó el rediseño estético e institucional completo de la landing pública para consolidar la identidad visual oficial del **Colegio Crecer y Ser (A-1134)**.

La landing productiva está disponible en `https://www.creceryser.edu.ar/`. Este documento conserva el alcance aprobado y las condiciones que deben mantenerse en cambios futuros.

## Resultado consolidado

- Identidad visual institucional unificada en torno al escudo circular oficial (`/escudo-circular.png`), la denominación `Instituto Incorporado a la Enseñanza Oficial · Colegio A-1134` y la paleta azul marino (`#1e3a8a`), azul real (`#1d4ed8`), celeste (`#0284c7`), rojo escudo (`#dc2626`) y ámbar cálido (`#d97706`).
- Header, Hero, Niveles Educativos, Propuesta Pedagógica, Admisiones/Contacto y Footer rediseñados y adaptados a pantallas móviles y de escritorio.
- Secuencia de secciones orientada a presentar primero los niveles educativos inmediatamente tras el hero, seguidos por los pilares de la propuesta pedagógica y la sección de admisiones/contacto, manteniendo coherencia de navegación en header y footer.
- Navegación, enlaces externos (`Acadeu`, `Instagram`, `Google Maps`, `mailto:`) y recursos verificados.
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

No se incorporan placeholders ni afirmaciones inventadas a `master`. Las secciones de **Últimas Novedades** y **Propuesta Pedagógica** están estrictamente condicionadas a la existencia de elementos en `landingData.novedades` y `landingData.propuestas`. Al estar ambos arreglos vacíos (`[]`), tanto sus componentes (`NovedadesSection.tsx`, `PropuestaSection.tsx`) como sus enlaces en el menú de navegación (`LandingHeader.tsx`), drawer móvil, llamado secundario del hero (`LandingHero.tsx`) y el pie de página (`LandingFooter.tsx`) se omiten automáticamente para evitar mostrar información provisional o falsa a familias y clientes finales mientras el dominio se encuentra activo. La estructura modular, tipada y de estilos permanece 100% armada e intacta (con `draftPropuestas` preservado en `src/modules/landing/data/landingData.ts`) para un reflote inmediato cuando la dirección proporcione la redacción final aprobada.

## Contrato visual

La landing respeta `frontend_guidelines.md` y `docs/ux-modernization.md`:

- reutiliza los tokens, tipografías (`Manrope` e `Inter`) y paleta institucional;
- usa exclusivamente el tema claro en las secciones de contenido y un cierre institucional en azul marino profundo (`#0b132b -> #070c1b`) para el footer;
- **Header (`LandingHeader.tsx`)**: barra de navegación fija (*sticky*) que acompaña el scroll en todo momento mediante `overflow-x: clip` en el contenedor global; incorpora borde superior institucional `#1e3a8a`, lockup con `/escudo-circular.png` sin contenedor artificial + nombre y código `Colegio A-1134`, enlaces con subrayado progresivo y separación clara entre el acceso familiar (`Acadeu`) y el botón secundario y disimulado de personal (`Gestión Directiva`), dejando visibles únicamente las secciones activas (`Niveles Educativos` y `Admisiones y Contacto`);
- **Hero (`LandingHero.tsx`)**: en escritorio ocupa el alto disponible del primer pantallazo (`calc(100vh - 74px)`, con límites `min-height: 640px` y `max-height: 900px`) distribuyendo la columna izquierda en tres grupos verticales equilibrados mediante `justify-content: space-evenly`: grupo superior con la píldora de admisiones destacada (`#dc2626`), grupo central con H1, bajada, llamado a la acción primario hacia `#contacto` (*"Solicitar Entrevista"*) y accesos ampliados a comunidad (`Acadeu` e `Instagram`), y grupo inferior con la franja institucional en una sola línea (`35 años`, `Inicial y Primaria`, `Av Olivera 1536, CABA`). Esto asegura una distribución visualmente armónica del aire arriba de la píldora, entre píldora y bloque central, entre bloque central y estadísticas, y bajo las estadísticas, mientras que en pantallas móviles y tablets se mantiene en flujo normal con gaps fijos y consistentes de 20px. La fotografía de fachada se extiende hacia la derecha (`width: 55%`) con encuadre en `object-position: 0% center` y máscara CSS gradual (alcanzando opacidad plena al `38%`) para liberar la puerta de entrada del sangrado izquierdo;
- **Títulos de sección**: prescinden de subtítulos superiores redundantes y emplean el tono azul institucional `#1e3a8a` combinado con palabras clave en degradado (`.section-title-accent`) y un filete inferior de `52px`;
- **Niveles Educativos (`NivelesSection.tsx`)**: las tarjetas integran `/JARDIN.jpg` (encuadre en `center 42%`) y `/PRIMARIA.jpg` (`scale(1.4)`), encabezadas directamente por el icono vectorial propio a dos tonos (`InicialLevelIcon` y `PrimariaLevelIcon`) en contenedor squircle flotante, título del nivel (`Nivel Inicial` y `Educación Primaria`), breve descripción pedagógica, caja tonal de tres características clave y botón tonal de consulta de vacantes;
- **Propuesta Pedagógica (`PropuestaSection.tsx`)**: temporalmente archivada / oculta bajo la misma convención de novedades (`landingData.propuestas = []`) para evitar volcar textos mockeados en producción; su arquitectura visual mantiene tarjetas con borde superior de acento en degradado, icono en contenedor squircle y etiqueta de dominio (`Proyecto Curricular`, `Competencias Digitales`, `Convivencia y Valores`, `Vida Estudiantil`);
- **Admisiones y Contacto (`ContactoSection.tsx`)**: tarjetas atómicas para dirección (con enlace a Google Maps), teléfonos, correo (`mailto:`) y horario en la columna izquierda, sin párrafos ni pasos intermedios redundantes; tarjeta de formulario a la derecha con filete superior tricolor institucional, badge de inscripciones abiertas y subtítulo único bajo el encabezado;
- **Footer (`LandingFooter.tsx`)**: diseño atómico en tres columnas con lockup del escudo circular, accesos a `Acadeu` e `Instagram`, navegación que refleja únicamente las secciones activas del sitio (`Inicio Institucional`, `Niveles Educativos`, `Admisiones y Contacto`) con acceso discreto a `Gestión Directiva`, y resumen de secretaría;
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
