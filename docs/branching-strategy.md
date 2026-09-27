# Estrategia de ramas y promoción

Actualizado: 27 de septiembre de 2026.

## Objetivo

Git separa la integración cotidiana de la publicación productiva. Los entornos de datos continúan definidos por la configuración local y del VPS; una rama nunca transporta `pb_data`, credenciales ni archivos `.env`.

## Ramas permanentes

| Rama | Rol | Backend permitido | Deployment automático |
| --- | --- | --- | --- |
| `dev` | Integración y validación local | PocketBase local en `127.0.0.1:8090` | Ninguno |
| `master` | Código aprobado de producción | PocketBase del VPS mediante el build de Vercel | Vercel Production |

`master` es la rama predeterminada y productiva. `dev` parte del baseline productivo etiquetado y acumula cambios validados durante el desarrollo.

## Ramas de trabajo

Durante el desarrollo temprano, las features, correcciones y tareas documentales pueden integrarse mediante commits y push directos a `dev`. Cuando convenga aislar una tarea o revisar cambios antes de integrarlos, se puede crear una rama desde `dev` y abrir un pull request:

```text
dev -> feature/<nombre> -> pull request opcional hacia dev
```

Los nombres deben ser breves y descriptivos. Las ramas temporales se eliminan después de confirmar que su historial quedó integrado. Esta excepción para `dev` dura hasta que la aplicación tenga su primera versión operativa; en ese momento se revisará la política de integración.

No se trabaja directamente sobre `master` y no se usa `master` como rama de desarrollo cotidiano.

## Integración en `dev`

Antes de integrar cambios en `dev`, tanto por push directo como por pull request, se debe:

1. Tener alcance identificable y documentación actualizada cuando corresponda.
2. Incorporar el estado vigente de `dev` y resolver conflictos cuando corresponda.
3. Ejecutar `npm run lint` y `npm run build` después de cambios de código. La acción `Quality` ejecuta `npm ci`, auditoría de dependencias productivas, lint y build en cada push y pull request.
4. Haber sido probado contra PocketBase local cuando afecte datos o gateways.
5. No incluir secretos, `.env`, `pb_data` ni datos personales reales.

## Release a producción

Una release se prepara mediante pull request de `dev` hacia `master`.

1. Confirmar que las features incluidas están aceptadas y que `dev` está verde.
2. Repetir pruebas integradas contra PocketBase local.
3. Ensayar migraciones y hooks contra una copia aislada y saneada de producción cuando corresponda.
4. Crear el backup productivo y desplegar primero el backend si el cambio es compatible con el frontend vigente.
5. Verificar health, permisos y endpoints del VPS.
6. Aprobar y fusionar el pull request hacia `master`.
7. Esperar el deployment de Vercel y ejecutar la aceptación productiva.
8. Crear un tag anotado para releases o baselines relevantes.

Vercel construye y publica únicamente `master`. Mientras no exista un PocketBase de staging, `dev` y las ramas temporales omiten el build de Preview y nunca reciben la URL del backend productivo. Los eventos de pull request pueden dejar un deployment omitido visible en Vercel.

## Hotfixes

Un incidente productivo parte del último `master`:

```text
master -> hotfix/<nombre> -> pull request hacia master -> retorno hacia dev
```

Después de publicar el hotfix, su commit debe integrarse inmediatamente en `dev` mediante merge o pull request. Esto evita que la siguiente release reintroduzca el defecto.

## Protecciones esperadas en GitHub

Para `master`:

- exigir pull request;
- exigir que `Quality` finalice correctamente;
- exigir resolución de conversaciones;
- bloquear force-push y eliminación;
- aplicar las reglas también a administradores cuando el plan lo permita.

Para `dev`:

- permitir commits y push directos durante el desarrollo temprano, sin exigir pull request ni checks previos al push;
- mantener `Quality` en cada push y pull request para detectar fallos de integración;
- bloquear force-push y eliminación.

Un fallo de `Quality` en `dev` debe corregirse antes de preparar una release. `master` conserva la exigencia de pull request y checks aprobados; sus operaciones excepcionales deben quedar justificadas en el historial.

## Entorno local

Antes de cargar o modificar datos de prueba:

```powershell
.\deploy\start-pocketbase-dev.ps1
.\deploy\verify-pocketbase-dev.ps1
npm run dev
```

`.env.development.local` debe apuntar a `http://127.0.0.1:8090`. Cambiar de `master` a `dev` no cambia automáticamente el backend: la separación efectiva depende de esta configuración y de usar exclusivamente credenciales locales.

La configuración SMTP local vive en `C:\pocketbase\pb_data`. Una reconstrucción desde cero no incorpora credenciales SMTP desde Git y requiere configurar nuevamente el servidor de correo desde el panel local.
