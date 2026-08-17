export interface PropuestaPilar {
  id: string;
  iconName: 'book' | 'rocket' | 'heart' | 'trophy';
  colorTheme: 'blue' | 'emerald' | 'purple' | 'amber';
  title: string;
  description: string;
}

export interface NivelEducativo {
  id: string;
  badge: string;
  isFeatured?: boolean;
  iconName: 'smile' | 'team' | 'global';
  title: string;
  description: string;
  features: string[];
}

export interface NovedadItem {
  id: string;
  tag: string;
  tagColor: 'blue' | 'green' | 'gold' | 'purple';
  date: string;
  title: string;
  excerpt: string;
}

export interface ContactoInfo {
  direccion: string;
  telefonos: string;
  email: string;
  horario: string;
}

export interface LandingData {
  schoolName: string;
  schoolCode: string;
  tagline: string;
  badgeText: string;
  heroTitle: {
    prefix: string;
    gradient: string;
  };
  heroSubtitle: string;
  trustPoints: string[];
  metrics: {
    historyYears: string;
    levelsCount: string;
    commitmentPercentage: string;
    platformVersion: string;
  };
  propuestas: PropuestaPilar[];
  niveles: NivelEducativo[];
  novedades: NovedadItem[];
  contacto: ContactoInfo;
}

export const landingData: LandingData = {
  schoolName: 'Crecer y Ser',
  schoolCode: 'Colegio A-1134',
  tagline: 'Formación Académica y Emocional',
  badgeText: 'Admisiones 2026 — Inscripciones Abiertas',
  heroTitle: {
    prefix: 'Educación con propósito, valores y ',
    gradient: 'excelencia',
  },
  heroSubtitle:
    'Acompañamos a nuestros estudiantes en cada etapa de su desarrollo pedagógico y humano. Una propuesta integral orientada al futuro, la innovación y el bien común.',
  trustPoints: [
    'Nivel Inicial, Primario y Secundario',
    'Plataforma Digital Integrada',
    'Comunidad Comprometida',
  ],
  metrics: {
    historyYears: '+25',
    levelsCount: '3',
    commitmentPercentage: '100%',
    platformVersion: '2.0',
  },
  propuestas: [
    {
      id: 'excelencia',
      iconName: 'book',
      colorTheme: 'blue',
      title: 'Excelencia Académica',
      description:
        'Planes de estudio integradores con foco en la lectura comprensiva, razonamiento matemático e idiomas.',
    },
    {
      id: 'innovacion',
      iconName: 'rocket',
      colorTheme: 'emerald',
      title: 'Innovación y Tecnología',
      description:
        'Incorporación de herramientas digitales, robótica y pensamiento computacional desde etapas tempranas.',
    },
    {
      id: 'emocional',
      iconName: 'heart',
      colorTheme: 'purple',
      title: 'Educación Emocional',
      description:
        'Desarrollo de habilidades socioafectivas, empatía y convivencia armónica en un ámbito contenedor.',
    },
    {
      id: 'deportes',
      iconName: 'trophy',
      colorTheme: 'amber',
      title: 'Talleres & Deportes',
      description:
        'Actividades extracurriculares de expresión artística, música, educación física y trabajo en equipo.',
    },
  ],
  niveles: [
    {
      id: 'inicial',
      badge: 'Nivel Inicial',
      iconName: 'smile',
      title: 'Jardín de Infantes',
      description:
        'Espacio lúdico y afectivo destinado a estimular la curiosidad natural, el lenguaje y la sociabilización inicial.',
      features: [
        'Salas de 3, 4 y 5 años',
        'Iniciación al inglés y a la música',
        'Desarrollo de la autonomía',
      ],
    },
    {
      id: 'primario',
      badge: 'Nivel Primario',
      isFeatured: true,
      iconName: 'team',
      title: 'Educación Primaria',
      description:
        'Consolidación de competencias fundamentales en un ambiente estructurado, dinámico y participativo.',
      features: [
        'Aprendizaje basado en proyectos',
        'Inglés intensivo y tecnología',
        'Acompañamiento psicopedagógico',
      ],
    },
    {
      id: 'secundario',
      badge: 'Nivel Secundario',
      iconName: 'global',
      title: 'Educación Secundaria',
      description:
        'Formación crítica, ética y científica orientada a los desafíos de la universidad y el mundo laboral actual.',
      features: [
        'Orientaciones especializadas',
        'Proyectos de orientación vocacional',
        'Convenios institucionales y debates',
      ],
    },
  ],
  novedades: [
    {
      id: 'reunion-familias',
      tag: 'Institucional',
      tagColor: 'blue',
      date: '10 de Marzo, 2026',
      title: 'Reunión General de Familias Ciclo Lectivo 2026',
      excerpt:
        'Invitamos a todas las familias a la presentación del plan pedagógico y la introducción a la nueva Plataforma Web.',
    },
    {
      id: 'talleres-inscripcion',
      tag: 'Talleres',
      tagColor: 'green',
      date: '15 de Marzo, 2026',
      title: 'Apertura de Inscripciones a Talleres Extracurriculares',
      excerpt:
        'Robótica, Teatro, Deportes e Inglés Avanzado. Consultá la grilla de horarios e inscribite a través de la App.',
    },
    {
      id: 'feria-ciencias',
      tag: 'Proyectos',
      tagColor: 'gold',
      date: '22 de Abril, 2026',
      title: 'Feria Anual de Ciencias, Arte e Innovación Digital',
      excerpt:
        'Nuestros alumnos presentarán trabajos de investigación y creatividad abiertos a toda la comunidad escolar.',
    },
  ],
  contacto: {
    direccion: 'Calle Principal 1234, Ciudad (Placeholder)',
    telefonos: '(011) 4567-8900 / Whatsapp: +54 9 11 1234-5678',
    email: 'contacto@creceryser.edu.ar',
    horario: 'Lunes a Viernes de 08:00 a 16:30 hs',
  },
};
