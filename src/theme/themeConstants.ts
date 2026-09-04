/**
 * Constantes y estilos reutilizables de la interfaz de usuario
 */
export const THEME_CONSTANTS = {
  // Gradientes institucionales
  gradients: {
    primary: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
    primaryHover: 'linear-gradient(135deg, #1e40af, #1d4ed8)',
    royal: 'linear-gradient(135deg, #0a1936, #1e3a8a)',
    sky: 'linear-gradient(135deg, #0284c7, #38bdf8)',
    emerald: 'linear-gradient(135deg, #059669, #10b981)',
    coral: 'linear-gradient(135deg, #e11d48, #f43f5e)',
    amber: 'linear-gradient(135deg, #d97706, #f59e0b)',
  },

  // Sombras refinadas
  shadows: {
    card: '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
    cardHover: '0 10px 25px -5px rgba(37, 99, 235, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
    floating: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
    buttonPrimary: '0 4px 14px rgba(37, 99, 235, 0.35)',
    buttonPrimaryHover: '0 6px 18px rgba(37, 99, 235, 0.45)',
  },

  // Glassmorphism
  glass: {
    light: {
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(226, 232, 240, 0.8)',
    },
    dark: {
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
    },
  },
} as const;

/**
 * Generador consistente de gradientes para avatares a partir de un identificador/nombre
 */
export const getAvatarGradient = (str: string): string => {
  const gradients = [
    'linear-gradient(135deg, #1d4ed8, #2563eb)',
    'linear-gradient(135deg, #0284c7, #38bdf8)',
    'linear-gradient(135deg, #059669, #10b981)',
    'linear-gradient(135deg, #4f46e5, #6366f1)',
    'linear-gradient(135deg, #d97706, #f59e0b)',
    'linear-gradient(135deg, #e11d48, #f43f5e)',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
};
