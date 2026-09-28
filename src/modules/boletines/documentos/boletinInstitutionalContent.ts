export const portadaEstatica = { seccion: 'A', turno: 'Mañana', jornada: 'Simple' } as const;
export const institucionBoletin = { nivel: 'Educación Primaria', cue: '020190600', denominacion: 'Educación oficial nivel inicial primaria', distrito: 'D.E. 13' } as const;

export const objetivosEscuela = [
  'Educar al alumno, integral y armónicamente, propiciando el desarrollo de los aspectos morales, intelectuales, psíquicos y sociales de la personalidad.',
  'Orientar la enseñanza tomando como base los principios de la escuela activa, apuntando a formar un alumno con juicio crítico, favoreciendo el espíritu creativo, la valoración del conocimiento y la superación personal.',
  'Trabajar para formar la conciencia nacional, el respeto por la historia, las instituciones democráticas, los símbolos y tradiciones nacionales.',
  'Ofrecer oportunidades para el desarrollo de actividades artísticas y deportivas.',
  'Sentar las bases para lograr la inserción del alumno en la complejidad del mundo actual, brindando herramientas informáticas y comunicacionales.',
  'Construir una escuela en la cual los alumnos puedan expresarse con libertad y responsabilidad en un marco de respeto mutuo.',
] as const;

export const descripcionEscala = [
  { etiqueta: 'Destacado', descripcion: 'El estudiante evidencia la apropiación e integración de los contenidos, da cuenta de aprendizajes consolidados de manera sobresaliente.' },
  { etiqueta: 'Avanzado', descripcion: 'El estudiante evidencia la apropiación e integración de los contenidos, alcanzando los aprendizajes de manera muy satisfactoria.' },
  { etiqueta: 'Alcanzado', descripcion: 'El estudiante evidencia la apropiación de los contenidos, alcanzando los aprendizajes previstos de manera satisfactoria.' },
  { etiqueta: 'En Proceso', descripcion: 'El estudiante evidencia la apropiación de algunos contenidos esenciales, pero requiere mayores tiempos y apoyos para avanzar.' },
  { etiqueta: 'No alcanzó los objetivos', descripcion: 'El estudiante no logró la apropiación de los contenidos esenciales. Requiere acompañamiento específico.' },
] as const;
