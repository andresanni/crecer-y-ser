# Guidelines de Frontend: Sistema "Crecer y Ser"

## 1. Stack Tecnológico
*   **Framework:** React 18 + Vite.
*   **Lenguaje:** TypeScript (Tipado estricto obligatorio).
*   **UI Framework:** Ant Design (ANTD). Priorizar componentes nativos (Table, Form, Modal, Typography).
*   **State Management:** Zustand para estado global.
*   **Routing:** React Router v6.
*   **Backend / BaaS:** PocketBase SDK (`pocketbase` npm package).
    *   URL del servidor: `http://129.121.52.187:8090`

## 2. Arquitectura y Patrones de Diseño
*   **Vertical Slicing:** El código se organiza por dominio/módulo (ej: `/modules/alumnos`), no por tipo de archivo. Cada módulo contiene sus componentes, servicios y modelos.
*   **Patrón Adaptador:** Es obligatorio el uso de adaptadores para aislar los componentes de UI de las respuestas crudas de la API. PocketBase retorna registros con campos autogenerados (`id`, `created`, `collectionId`); el adaptador debe mapear esto a interfaces de TypeScript limpias y orientadas al negocio antes de que lleguen a los componentes de React o a Zustand.
*   **Conexión Directa:** No existe un servidor Node.js intermedio. Los componentes/servicios de React consumen el SDK de PocketBase directamente.

## 3. Módulo Actual en Desarrollo (Fase 1)
*   **Dominio:** `Alumnos`.
*   **Objetivo:** Crear el primer avance vertical. Conectar la aplicación a PocketBase, listar los estudiantes usando una `<Table>` de ANTD y preparar el terreno para las altas y modificaciones.
