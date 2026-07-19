# Sistema "Crecer y Ser"

Proyecto Frontend para el sistema "Crecer y Ser".

## Tecnologías

*   **React 18** + **Vite**
*   **TypeScript** (Tipado estricto)
*   **Ant Design (ANTD)** - Framework de UI
*   **Zustand** - Manejo de Estado Global (próximamente)
*   **React Router v6** - Enrutamiento
*   **PocketBase** - Backend y SDK (`pocketbase`)

## Arquitectura

*   **Vertical Slicing:** Organización del código por dominio (ej: `src/modules/alumnos`).
*   **Patrón Adaptador:** Aislamiento de la UI frente a las respuestas de la API. Convirtiendo los `Records` de PocketBase en Modelos de Dominio limpios.
*   **Conexión Directa:** El cliente consume directamente PocketBase mediante su SDK.

## Hitos Alcanzados

*   **Hito 1:**
    *   Configuración y limpieza inicial del proyecto con Vite.
    *   Definición de estructura base (`src/core`, `src/modules`, `src/shared`).
    *   Integración del App Shell (`MainLayout`) con Ant Design y React Router.
    *   **Módulo Alumnos:** CRUD completo (Listado, Creación, Edición y Eliminación) conectando a PocketBase.

*   **Hito 2:**
    *   **Autenticación:** Implementación de Login, protección de rutas y estado global con Zustand (sincronizado con SDK `authStore`).
    *   **Control de Concurrencia Optimista (OCC):** Prevención de colisiones al editar el mismo registro simultáneamente.
    *   **Tiempo Real (Realtime):** Suscripciones por WebSockets para actualización en vivo de las vistas, eliminando el "Doble Fetch" y mitigando "Ecos".
    *   **Paginación y Búsqueda (Server-Side):** Optimización de la tabla de alumnos para escalar a grandes volúmenes de datos usando el motor de filtros de PocketBase.
    *   **Estabilización y Tipado:** Implementación de variables de entorno locales y refactorización a tipado estricto (0 linter warnings).

## Instalación y Uso

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Levantar servidor de desarrollo:
   ```bash
   npm run dev
   ```
