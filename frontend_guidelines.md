# Guidelines de Frontend: Sistema "Crecer y Ser"

## 1. Stack Tecnológico
*   **Framework:** React 18 / 19 + Vite.
*   **Lenguaje:** TypeScript (Tipado estricto obligatorio).
*   **UI Framework:** Ant Design (ANTD). Priorizar componentes nativos (Table, Form, Modal, Typography).
*   **State Management:** Zustand para estado global.
*   **Routing:** React Router v7.
*   **Backend / BaaS:** PocketBase SDK (`pocketbase` npm package).
    *   URL del servidor: `https://alumnos-api.duckdns.org`
    *   **Esquema de Base de Datos:** Archivo [`pb_schema.json`](file:///c:/Users/andyg/OneDrive/Documents/crecer-y-ser/pb_schema.json) en la raíz del proyecto. Este archivo es la **fuente de verdad** para conocer colecciones, campos, tipos, reglas de acceso (`listRule`, etc.) y relaciones `expand`.

## 2. Arquitectura y Patrones de Diseño
*   **Vertical Slicing:** El código se organiza por dominio/módulo (ej: `/modules/alumnos`, `/modules/inscripciones`), no por tipo de archivo. Cada módulo contiene sus componentes, servicios y modelos.
*   **Coherencia con `pb_schema.json` & Patrón Adaptador:**
    *   El modelo `*Record` refleja los campos exactos de PocketBase (`snake_case`, IDs de relaciones, `created`, `updated`).
    *   El modelo de dominio frontend (`camelCase`) se usa en componentes y estado de UI.
    *   Cada módulo debe implementar su adaptador (ej: `alumnoAdapter`) para transformar registros `*Record` a entidades de dominio.
*   **Conexión Directa:** No existe un servidor Node.js intermedio. Los servicios consumen directamente el cliente centralizado [`pocketbase.ts`](file:///c:/Users/andyg/OneDrive/Documents/crecer-y-ser/src/core/pocketbase.ts).

## 3. Mapa de Colecciones (PocketBase)
*   **`users`**: Usuarios del sistema (auth).
*   **`alumnos`**: Información de estudiantes (`numero_legajo`, `dni`, `apellidos`, `nombres`, `fecha_nacimiento`).
*   **`responsables`**: Padres/tutores (`dni`, `apellidos`, `nombres`, `telefono`, `email`).
*   **`alumno_responable`**: Relación M:N entre `alumnos` y `responsables` con campo `vinculo`.
*   **`ciclos_lectivos`**: Años escolares (`ano`, `actual`).
*   **`niveles`**: Niveles educativos (`nombre`, relación con `escalas_calificacion`).
*   **`cursos`**: Divisiones/cursos (`nombre`, relación con `niveles`, `turno`).
*   **`inscripciones`**: Matrículas (`alumno_id`, `curso_id`, `ciclo_id`, `estado`, `fecha_matriculacion`).
*   **`escalas_calificacion`** & **`valores_escala`**: Configuración de notas y escalas.

## 4. Módulo Actual en Desarrollo
*   **Dominio:** `Alumnos`.
*   **Objetivo:** Conectar la aplicación a PocketBase, listar estudiantes usando `<Table>` de ANTD, filtrado/búsqueda y preparar formularios de alta y modificación respetando el esquema.
