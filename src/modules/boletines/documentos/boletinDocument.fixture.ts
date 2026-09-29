import { materiasRestantesPrimerCiclo, materiasRestantesSegundoCiclo } from './boletinRemainingSubjects.fixture';
import type { CalificacionDocumental, ConceptoCalificacion, GradoPrimario, MateriaAcademicaDocumental, MateriaFormativaDocumental } from './boletinDocument.model';

const criteriosDeMuestra = [
  {
    id: 'trabajo-aula',
    nombre: 'TRABAJO EN EL AULA',
    textos: [
      'Se organiza para realizar sus tareas ajustándose a las pautas de trabajo y demuestra una autonomía creciente.',
      'Expresa sus ideas de manera clara y participa activamente en clase.',
      'Asume de manera colaborativa las tareas dentro de un grupo y contribuye al logro de los objetivos comunes.',
      'Manifiesta interés por aprender y pregunta cuando no comprende.',
      'Reconoce sus logros e identifica sus dificultades como parte de su proceso de aprendizaje.',
    ],
  },
  {
    id: 'convivencia',
    nombre: 'CONVIVENCIA',
    textos: [
      'Participa en la construcción de acuerdos escolares de convivencia y respeta las normas institucionales.',
      'Utiliza estrategias comunicacionales asertivas para expresar sus emociones, experiencias y opiniones.',
      'Resuelve conflictos a través de la escucha activa y el diálogo constructivo, apelando a la reflexión y a instancias de reparación.',
      'Participa en tareas grupales y juegos de manera colaborativa, cooperativa e inclusiva.',
      'Contribuye a la construcción de un clima escolar de bienestar social, estableciendo vínculos con pares y adultos de la escuela, promoviendo el cuidado de sí y de los otros, el respeto y la inclusión de la diversidad.',
    ],
  },
];

const calificacionesDeMuestra: Array<{ concepto: ConceptoCalificacion; numero?: number }> = [
  { concepto: 'destacado', numero: 10 },
  { concepto: 'avanzado', numero: 9 },
  { concepto: 'alcanzado', numero: 7 },
  { concepto: 'noAlcanzoObjetivos', numero: 2 },
  { concepto: 'noCorresponde' },
  { concepto: 'enProceso', numero: 5 },
  { concepto: 'avanzado', numero: 8 },
  { concepto: 'alcanzado', numero: 6 },
];

export function crearMateriasFormativasDeMuestra(grado: GradoPrimario): MateriaFormativaDocumental[] {
  const calificaciones: CalificacionDocumental[] = calificacionesDeMuestra.map(valor => ({
    estado: 'confirmado',
    concepto: valor.concepto,
    numero: grado >= 4 ? valor.numero : undefined,
  }));
  return criteriosDeMuestra.map((materia, materiaIndex) => ({
  id: materia.id,
  nombre: materia.nombre,
  criterios: materia.textos.map((texto, index) => ({
    id: `${materia.id}-${index + 1}`,
    texto,
    bimestres: [
      calificaciones[(index + materiaIndex * 3) % calificaciones.length],
      calificaciones[(index + 1 + materiaIndex * 3) % calificaciones.length],
      { estado: 'futuro' },
      { estado: 'futuro' },
    ],
  })),
  }));
}

export function crearMateriasAcademicasDeMuestra(grado: GradoPrimario): MateriaAcademicaDocumental[] {
  const referencias = [
    { id: 'lengua', nombre: 'LENGUA', textos: [
      'Conoce la escritura y relaciona sonidos y letras.',
      'Lee y escribe palabras con autonomía.',
      'Participa durante la lectura de textos que hace el docente.',
      'Escribe textos breves en colaboración con el docente y sus compañeros.',
      'Comunica sus ideas en las conversaciones grupales.',
    ] },
    { id: 'matematica', nombre: 'MATEMÁTICA', textos: [
      'Usa y comprende números de una y dos cifras, reconoce cómo se escriben, se dicen y se representan de distintas maneras, y observa algunas regularidades en la secuencia de números.',
      'Cuenta, organiza y compara cantidades; utiliza diferentes formas de contar y distintos materiales para resolver situaciones sencillas.',
      'Resuelve problemas y realiza cálculos de suma y resta; utiliza distintas formas de pensar y calcular según cada situación.',
      'Comprende y comunica relaciones espaciales y geométricas, ubica objetos, describe recorridos, y reconoce figuras y cuerpos geométricos del entorno.',
      'Compara y mide longitudes y comprende situaciones relacionadas con el tiempo, como la duración de actividades y el orden de los acontecimientos.',
    ] },
  ];
  const materiasPaginaCinco = grado <= 3 ? [
    { id: 'conocimiento-mundo', nombre: 'CONOCIMIENTO DEL MUNDO', textos: [
      'Observa, describe y compara objetos, fenómenos y procesos en distintos tiempos y espacios.',
      'Identifica diferentes formas en que las personas se organizan y transforman los espacios.',
      'Reconoce aspectos de la vida cotidiana familiar y social del presente y del pasado.',
      'Reconoce la importancia del cuidado integral a través del conocimiento del cuerpo, prácticas saludables, instituciones y derechos.',
      'Reconoce, describe y compara las características observables de plantas, animales y materiales.',
    ] },
    { id: 'tecnologia', nombre: 'TECNOLOGÍA, DISEÑO Y PROGRAMACIÓN', textos: [
      'Utiliza herramientas en forma adecuada.',
      'Experimenta estructuras con bloques.',
      'Comunica secuencias de operaciones.',
      'Crea soluciones para problemas simples de programación y robótica.',
      'Identifica y reflexiona sobre aplicaciones de IA.',
    ] },
  ] : [
    { id: 'ciencias-sociales', nombre: 'CIENCIAS SOCIALES', textos: [
      'Explica distintas características de sociedades del pasado y del presente.',
      'Establece relaciones entre hechos y procesos del pasado a través del tiempo.',
      'Reconoce las normas que regulan la convivencia entre las personas.',
      'Describe y caracteriza distintos espacios geográficos.',
      'Reflexiona con argumentos basándose en fuentes de información.',
    ] },
    { id: 'ciencias-naturales', nombre: 'CIENCIAS NATURALES', textos: [
      'Explica los cambios del agua en la Tierra, su importancia como componente de mezclas y las interacciones entre esta y los seres vivos.',
      'Interpreta y explica la nutrición humana como un proceso integrado de funciones y valora prácticas para el cuidado de los sistemas involucrados.',
      'Describe la propagación de la luz y el sonido y la relaciona con la interacción con diferentes materiales.',
      'Describe el movimiento de los astros y de la Luna y los relaciona con fenómenos cotidianos.',
      'Indaga, describe y explica fenómenos, objetos o procesos científicos escolares, aplicando habilidades del lenguaje científico.',
    ] },
  ];
  const materiasRestantes = grado <= 3 ? materiasRestantesPrimerCiclo : materiasRestantesSegundoCiclo;
  const muestras = crearMateriasFormativasDeMuestra(grado);
  return [...referencias, ...materiasPaginaCinco, ...materiasRestantes].map((materia, index) => ({
    id: materia.id,
    nombre: materia.nombre,
    criterios: materia.textos.map((texto, criterioIndex) => ({
      id: `${materia.id}-${criterioIndex + 1}`,
      texto,
      bimestres: muestras[index % muestras.length].criterios[criterioIndex].bimestres,
    })),
    ppi: [{ estado: 'confirmado', texto: 'NO' }, { estado: 'confirmado', texto: index === 0 ? 'NO' : 'SÍ' }, { estado: 'futuro' }, { estado: 'futuro' }],
    calificacionGeneral: [
      { estado: 'confirmado', concepto: 'alcanzado', numero: grado >= 4 ? 7 : undefined },
      { estado: 'confirmado', concepto: 'avanzado', numero: grado >= 4 ? 9 : undefined },
      { estado: 'futuro' }, { estado: 'futuro' },
    ],
  }));
}
