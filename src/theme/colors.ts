/**
 * Crecer y Ser - Paleta de Colores Institucionales y de Marca
 * Extraída directamente del imagotipo oficial del Colegio A-1134:
 * - Azul Real Colegial (Letras "Crecer" y "Colegio")
 * - Celeste Cielo / Bandera (Isotipo de mar y sol argentino)
 * - Rojo / Coral Cálido (Letra "y" y gorra)
 * - Dorado Solar (Sol del amanecer)
 */

export const BRAND_COLORS = {
  // Azules Institucionales
  royalBlue: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#1e1b4b',
    deep: '#0a1936',      // Fondo Sidebar
    primary: '#1d4ed8',   // Azul Principal Institucional
    dark: '#1e40af',      // Hover / Active profundo
  },

  // Azul Vibrante Tecnológico (para interactividad, botones y foco en UI)
  vibrantBlue: {
    base: '#2563eb',
    hover: '#3b82f6',
    active: '#1d4ed8',
    subtle: '#eff6ff',
    border: 'rgba(37, 99, 235, 0.25)',
  },

  // Celeste / Cian Cielo (Identidad y Mar de la Bandera Argentina)
  sky: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
  },

  // Acento Rojo / Coral (Gorra y trazo "y" del logo)
  coral: {
    50: '#fff1f2',
    100: '#ffe4e6',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
  },

  // Dorado Solar (Sol del Isotipo)
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
  },

  // Verde Esmeralda (Éxito y Alumnos Regulares)
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
  },

  // Rojo Peligro (Bajas / Errores)
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },

  // Neutros Slate Modernos (Modo Claro & Oscuro)
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
} as const;
