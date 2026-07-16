# Sistema "Crecer y Ser"

Proyecto Frontend para el sistema "Crecer y Ser".

## 🚀 Tecnologías

*   **React 18** + **Vite**
*   **TypeScript** (Tipado estricto)
*   **Ant Design (ANTD)** - Framework de UI
*   **Zustand** - Manejo de Estado Global (próximamente)
*   **React Router v6** - Enrutamiento
*   **PocketBase** - Backend y SDK (`pocketbase`)

## 🏗 Arquitectura

*   **Vertical Slicing:** Organización del código por dominio (ej: `src/modules/alumnos`).
*   **Patrón Adaptador:** Aislamiento de la UI frente a las respuestas de la API. Convirtiendo los `Records` de PocketBase en Modelos de Dominio limpios.
*   **Conexión Directa:** El cliente consume directamente PocketBase mediante su SDK.

## 📦 Hitos Alcanzados

*   **Hito 1:**
    *   Configuración y limpieza inicial del proyecto con Vite.
    *   Definición de estructura base (`src/core`, `src/modules`, `src/shared`).
    *   Integración del App Shell (`MainLayout`) con Ant Design y React Router.
    *   **Módulo Alumnos:** CRUD completo (Listado, Creación, Edición y Eliminación) conectando a PocketBase.

## 🛠 Instalación y Uso

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Levantar servidor de desarrollo:
   ```bash
   npm run dev
   ```
