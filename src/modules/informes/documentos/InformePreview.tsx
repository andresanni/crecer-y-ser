import { useState, useMemo } from 'react';
import { InformeDocument } from './InformeDocument';
import type { InformeDocumentSnapshotDatos } from './informeSnapshot.model';
import './preview.css';

const ARTES_VISUALES_ITEMS = [
  'Relación con la materia.',
  'Relación con el docente.',
  'Relación con los compañeros.',
  'Respeto por las normas de convivencia.',
  'Atención en clase.',
  'Aplicación de contenidos.',
  'Respuesta a pedido de materiales de trabajo.',
  'Respuesta a consignas de trabajo.',
  'Participación en clase.',
  'Incorporación de técnicas nuevas.',
  'Percepción morfológica.',
  'Criterio compositivo.',
  'Estructuración de figura humana.',
  'Investigación en el uso de materiales gráficos.',
  'Investigación en el uso de materiales pictóricos.',
  'Criterio cromático.',
  'Utilización de elementos del lenguaje visual en la bidimensión.',
  'Utilización de elementos del lenguaje visual en la tridimensión.',
];

const MUSICA_ITEMS = [
  'Demuestra interés por el aprendizaje de la materia.',
  'Mantiene buena relación con la docente',
  'Mantiene buena relación con sus pares',
  'Atención en clase',
  'Participa activamente de la clase',
  'Cumple con los materiales',
  'Entona el canto',
  'Identifica los instrumentos musicales según su familia',
  'Es correcto en la ejecución rítmica',
  'Es correcto en la ejecución melódica',
  'Lee grafías pertenecientes al lenguaje musical',
  'Cuida los instrumentos musicales',
  'Ejecuta correctamente los instrumentos musicales',
  'Realiza interpretaciones a dos o más voces',
  'Se interesa por la vida y la música de diferentes compositores',
  'Muestra interés por distintos estilos musicales',
  'Tiene una audición activa de acuerdo a su edad',
  'Distingue y/o ejecuta diferentes parámetros de sonido',
  'Realiza y se interesa por el registro grabado de las producciones musicales',
];

const TECNOLOGIA_ITEMS = [
  'Relación con la materia.',
  'Relación con el docente.',
  'Relación con los compañeros.',
  'Respeto por las normas de convivencia.',
  'Atención en clase.',
  'Aplicación de contenidos.',
  'Respuesta a pedido de materiales de trabajo.',
  'Respuesta a consignas de trabajo.',
  'Comprensión básica del sentido y área de la materia.',
  'Comprensión de las fases del proceso.',
  'Cumplimiento con entregas en tiempo y forma.',
  'Participación en clase.',
  'Participación en trabajos grupales.',
  'Proyección de lo aprendido a otras aplicaciones relacionadas.',
  'Manejo adecuado de herramientas.',
  'Puede integrar partes para formar un todo.',
  'Reflexión sobre procesos tecnológicos y uso de la IA (Inteligencia Artificial).',
];

const INGLES_ITEMS = [
  'Demuestra interés por el aprendizaje de la lengua extranjera',
  'Manejo de estructuras sencillas en Inglés.',
  'Comprensión de estructuras sencillas de salutación y cortesía.',
  'Progreso en el desarrollo de la atención y de la observación del idioma durante el transcurso de la clase.',
  'Mantiene buena relación con la docente.',
  'Mantiene buena relación con sus pares.',
  'Atención en clase.',
  'Participación en clase.',
  'Cumple con los materiales para la materia.',
  'Se expresa oralmente en inglés con coherencia.',
  'Su pronunciación es clara.',
  'Respeta los turnos del habla de sus pares y escucha a los mismos',
  'Utiliza el idioma inglés para narrar, describir y/o pedir.',
  'Interpreta mensajes orales.',
  'Adecua sus respuestas orales y escritas al contexto.',
  'Progresa en escritura.',
  'Incorpora nuevo vocabulario.',
  'Comprende consignas de trabajo o narraciones en inglés.',
];

const ED_FISICA_G1_ITEMS = [
  { pagina: 1, bloqueNombre: 'Desplazamientos', bloqueOrden: 1, texto: 'Desplazamientos en el espacio, combinando diferentes tiempos y ritmos.' },
  { pagina: 1, bloqueNombre: 'Desplazamientos', bloqueOrden: 1, texto: 'Ajustados a las acciones de los compañeros.' },
  { pagina: 1, bloqueNombre: 'Desplazamientos', bloqueOrden: 1, texto: 'Enlazando diferentes formas y direcciones del desplazamiento.' },
  { pagina: 1, bloqueNombre: 'Desplazamientos', bloqueOrden: 1, texto: 'Ajustado a los espacios de juego, el objeto y los compañeros.' },
  { pagina: 1, bloqueNombre: 'Rolidos', bloqueOrden: 2, texto: 'Rolidos laterales en plano horizontal.' },
  { pagina: 1, bloqueNombre: 'Rolidos', bloqueOrden: 2, texto: 'Rol adelante desde cuclillas.' },
  { pagina: 1, bloqueNombre: 'Rolidos', bloqueOrden: 2, texto: 'Rol adelante desde pies firmes.' },
  { pagina: 1, bloqueNombre: 'Rolidos', bloqueOrden: 2, texto: 'Rol adelante con variantes de salida.' },
  { pagina: 1, bloqueNombre: 'Rolidos', bloqueOrden: 2, texto: 'Rol atrás con ayuda.' },
  { pagina: 1, bloqueNombre: 'Rolidos', bloqueOrden: 2, texto: 'Rol atrás sin asistencia.' },
  { pagina: 2, bloqueNombre: 'Apoyos', bloqueOrden: 3, texto: 'Cuadripeia' },
  { pagina: 2, bloqueNombre: 'Apoyos', bloqueOrden: 3, texto: 'Tripedia' },
  { pagina: 2, bloqueNombre: 'Apoyos', bloqueOrden: 3, texto: 'Conejito' },
  { pagina: 2, bloqueNombre: 'Apoyos', bloqueOrden: 3, texto: 'Potrillito' },
  { pagina: 2, bloqueNombre: 'Apoyos', bloqueOrden: 3, texto: 'Vertical con ayuda' },
  { pagina: 2, bloqueNombre: 'Apoyos', bloqueOrden: 3, texto: 'Vertical sin ayuda' },
  { pagina: 2, bloqueNombre: 'Apoyos', bloqueOrden: 3, texto: 'Media Luna' },
  { pagina: 2, bloqueNombre: 'Saltos', bloqueOrden: 4, texto: 'Saltos bipodales' },
  { pagina: 2, bloqueNombre: 'Saltos', bloqueOrden: 4, texto: 'Saltos unipodales' },
  { pagina: 2, bloqueNombre: 'Saltos', bloqueOrden: 4, texto: 'Saltos en busca de longitud' },
  { pagina: 2, bloqueNombre: 'Saltos', bloqueOrden: 4, texto: 'Saltos en busca de altura' },
  { pagina: 2, bloqueNombre: 'Saltos', bloqueOrden: 4, texto: 'Variabilidad de saltos gimnásticos' },
  { pagina: 2, bloqueNombre: 'Saltos', bloqueOrden: 4, texto: 'Saltos ajustados a un objeto fijo' },
  { pagina: 2, bloqueNombre: 'Saltos', bloqueOrden: 4, texto: 'Con impulso de un elemento externo' },
];

const ED_FISICA_G2_ITEMS = [
  { pagina: 1, bloqueNombre: 'Desplazamientos', bloqueOrden: 1, texto: 'Desplazamientos ajustados a un objeto móvil.' },
  { pagina: 1, bloqueNombre: 'Desplazamientos', bloqueOrden: 1, texto: 'Desplazamientos ajustados al objeto móvil y la acción del compañero.' },
  { pagina: 1, bloqueNombre: 'Desplazamientos', bloqueOrden: 1, texto: 'Desplazamientos ajustados a los tiempos musicales.' },
  { pagina: 1, bloqueNombre: 'Desplazamientos', bloqueOrden: 1, texto: 'Desplazamientos con manipulación de objetos.' },
  { pagina: 1, bloqueNombre: 'Rolidos', bloqueOrden: 2, texto: 'Rolidos laterales.' },
  { pagina: 1, bloqueNombre: 'Rolidos', bloqueOrden: 2, texto: 'Rol adelante con variantes de salida.' },
  { pagina: 1, bloqueNombre: 'Rolidos', bloqueOrden: 2, texto: 'Rol desde diferentes entradas.' },
  { pagina: 1, bloqueNombre: 'Rolidos', bloqueOrden: 2, texto: 'Rol atrás en plano horizontal.' },
  { pagina: 1, bloqueNombre: 'Rolidos', bloqueOrden: 2, texto: 'Rol atrás con impulso de brazos.' },
  { pagina: 2, bloqueNombre: 'Apoyos', bloqueOrden: 3, texto: 'Tripedias' },
  { pagina: 2, bloqueNombre: 'Apoyos', bloqueOrden: 3, texto: 'Potrillito.' },
  { pagina: 2, bloqueNombre: 'Apoyos', bloqueOrden: 3, texto: 'Vertical con ayuda.' },
  { pagina: 2, bloqueNombre: 'Apoyos', bloqueOrden: 3, texto: 'Vertical sin ayuda.' },
  { pagina: 2, bloqueNombre: 'Apoyos', bloqueOrden: 3, texto: 'Media luna.' },
  { pagina: 2, bloqueNombre: 'Apoyos', bloqueOrden: 3, texto: 'Media luna con carrera previa.' },
  { pagina: 2, bloqueNombre: 'Saltos', bloqueOrden: 4, texto: 'Saltos unipodales y bipodales.' },
  { pagina: 2, bloqueNombre: 'Saltos', bloqueOrden: 4, texto: 'Saltos enlazados en cadena motora.' },
  { pagina: 2, bloqueNombre: 'Saltos', bloqueOrden: 4, texto: 'Saltos ajustados a un objeto móvil.' },
  { pagina: 2, bloqueNombre: 'Saltos', bloqueOrden: 4, texto: 'Variabilidad de saltos gimnásticos.' },
  { pagina: 2, bloqueNombre: 'Saltos', bloqueOrden: 4, texto: 'Saltos con tabla de pique o minitramp.' },
];

const ED_FISICA_G3_ITEMS = [
  { pagina: 1, bloqueNombre: 'Desplazamientos', bloqueOrden: 1, texto: 'Desplazamientos con cambios de ritmo y dirección.' },
  { pagina: 1, bloqueNombre: 'Desplazamientos', bloqueOrden: 1, texto: 'Desplazamientos ajustados a la acción del compañero, el objeto y el espacio.' },
  { pagina: 1, bloqueNombre: 'Desplazamientos', bloqueOrden: 1, texto: 'Desplazamientos con manipulación de objetos.' },
  { pagina: 1, bloqueNombre: 'Desplazamientos', bloqueOrden: 1, texto: 'Desplazamientos ajustados a la acción del compañero y los tiempos musicales.' },
  { pagina: 1, bloqueNombre: 'Rolidos', bloqueOrden: 2, texto: 'Rol adelante.' },
  { pagina: 1, bloqueNombre: 'Rolidos', bloqueOrden: 2, texto: 'Rol con variantes de entrada y salida.' },
  { pagina: 1, bloqueNombre: 'Rolidos', bloqueOrden: 2, texto: 'Rol volado.' },
  { pagina: 1, bloqueNombre: 'Rolidos', bloqueOrden: 2, texto: 'Rol atrás sin ayuda.' },
  { pagina: 1, bloqueNombre: 'Rolidos', bloqueOrden: 2, texto: 'Rol atrás con impulso de brazos.' },
  { pagina: 2, bloqueNombre: 'Apoyos', bloqueOrden: 3, texto: 'Potrillito.' },
  { pagina: 2, bloqueNombre: 'Apoyos', bloqueOrden: 3, texto: 'Vertical.' },
  { pagina: 2, bloqueNombre: 'Apoyos', bloqueOrden: 3, texto: 'Medialuna.' },
  { pagina: 2, bloqueNombre: 'Apoyos', bloqueOrden: 3, texto: 'Medialuna con carrera previa.' },
  { pagina: 2, bloqueNombre: 'Apoyos', bloqueOrden: 3, texto: 'Rondo.' },
  { pagina: 2, bloqueNombre: 'Apoyos', bloqueOrden: 3, texto: 'Mortero.' },
  { pagina: 2, bloqueNombre: 'Saltos', bloqueOrden: 4, texto: 'Cadenas motoras de saltos enlazados.' },
  { pagina: 2, bloqueNombre: 'Saltos', bloqueOrden: 4, texto: 'Variabilidad de saltos gimnásticos.' },
  { pagina: 2, bloqueNombre: 'Saltos', bloqueOrden: 4, texto: 'Saltos en longitud.' },
  { pagina: 2, bloqueNombre: 'Saltos', bloqueOrden: 4, texto: 'Saltos ajustados a un objeto móvil.' },
  { pagina: 2, bloqueNombre: 'Saltos', bloqueOrden: 4, texto: 'Saltos con impulso de un elemento.' },
  { pagina: 2, bloqueNombre: 'Saltos', bloqueOrden: 4, texto: 'Variabilidad de saltos con tabla de pique o minitramp.' },
  { pagina: 2, bloqueNombre: 'Saltos', bloqueOrden: 4, texto: 'Saltos utilizando el cajón.' },
];

const ESCALA_EDUCACION_FISICA = [
  { codigo: 'A', etiqueta: 'A', descripcion: 'No se trabajó el contenido durante el año' },
  { codigo: 'B', etiqueta: 'B', descripcion: 'Aun le esta costando trabajo el contenido durante este año' },
  { codigo: 'C', etiqueta: 'C', descripcion: 'Se ven claros avances en la adquisición del contenido propuesto' },
  { codigo: 'D', etiqueta: 'D', descripcion: 'Lo logra con soltura y seguridad' },
];

const ESCALA_TRES_NIVELES = [
  { codigo: 'NO_ALCANZADO', etiqueta: 'No Alcanzado' },
  { codigo: 'EN_PROCESO', etiqueta: 'En proceso de Alcanzar' },
  { codigo: 'ALCANZADO', etiqueta: 'Alcanzado' },
];

const ESCALA_DESEMPENO_PRIMER_CICLO = [
  { codigo: 'NO_ALCANZO', etiqueta: 'No Alcanzó los objetivos' },
  { codigo: 'EN_PROCESO', etiqueta: 'En proceso' },
  { codigo: 'ALCANZADO', etiqueta: 'Alcanzado' },
  { codigo: 'AVANZADO', etiqueta: 'Avanzado' },
  { codigo: 'DESTACADO', etiqueta: 'Destacado' },
];

const ESCALA_DESEMPENO_SEGUNDO_CICLO = [
  { codigo: 'NO_ALCANZO_1_3', etiqueta: 'No Alcanzó Los Objetivos 1..3' },
  { codigo: 'EN_PROCESO_4_5', etiqueta: 'En Proceso 4..5' },
  { codigo: 'ALCANZADO_6_7', etiqueta: 'Alcanzado 6..7' },
  { codigo: 'AVANZADO_8_9', etiqueta: 'Avanzado 8..9' },
  { codigo: 'DESTACADO_10', etiqueta: 'Destacado 10' },
];

const EJEMPLOS_OBSERVACIONES = [
  {
    id: 'ninguna',
    label: 'Ninguna (Alumno regular)',
    texto: '',
  },
  {
    id: 'ppi',
    label: 'PPI / Adaptaciones curriculares (Extensa)',
    texto:
      'Su situación de alumno se encuentra respaldada por un PPI que enmarca adaptaciones curriculares y de recursos, los cuales tienen como finalidad respetar los tiempos y favorecer los procesos de comprensión y ejecución de tareas.',
  },
  {
    id: 'destacado',
    label: 'Desempeño destacado (Media)',
    texto:
      'Demostró un compromiso sobresaliente con las propuestas del taller, explorando diversas técnicas con autonomía, sensibilidad estética y excelente colaboración con sus pares.',
  },
  {
    id: 'breve',
    label: 'Breve / Pauta de trabajo',
    texto:
      'Participó con entusiasmo de las actividades grupales y cumplió de manera responsable con los materiales de trabajo.',
  },
];

export function InformePreview() {
  const [materiaCodigo, setMateriaCodigo] = useState<'ARTES_VISUALES' | 'MUSICA' | 'TECNOLOGIA' | 'INGLES' | 'ED_FISICA'>('ED_FISICA');
  const [gradoNumero, setGradoNumero] = useState<number>(3);
  const [ejemploObservacionId, setEjemploObservacionId] = useState<string>('ppi');
  const [desempenoCodigo, setDesempenoCodigo] = useState<string>('ALCANZADO');
  const [mostrarSubtituloColegio, setMostrarSubtituloColegio] = useState<boolean>(true);

  const esSegundoCiclo = gradoNumero >= 4;
  const isEdFisica = materiaCodigo === 'ED_FISICA';

  const escalaDesempeno = useMemo(
    () => (esSegundoCiclo ? ESCALA_DESEMPENO_SEGUNDO_CICLO : ESCALA_DESEMPENO_PRIMER_CICLO),
    [esSegundoCiclo],
  );

  const selectedDesempenoEtiqueta = useMemo(() => {
    const found = escalaDesempeno.find((opt) => opt.codigo === desempenoCodigo);
    return found ? found.etiqueta : escalaDesempeno[escalaDesempeno.length - 1].etiqueta;
  }, [escalaDesempeno, desempenoCodigo]);

  const selectedObservacionTexto = useMemo(() => {
    const found = EJEMPLOS_OBSERVACIONES.find((ej) => ej.id === ejemploObservacionId);
    return found ? found.texto : '';
  }, [ejemploObservacionId]);

  const rawItemTexts = useMemo(() => {
    if (materiaCodigo === 'MUSICA') return MUSICA_ITEMS;
    if (materiaCodigo === 'TECNOLOGIA') return TECNOLOGIA_ITEMS;
    if (materiaCodigo === 'INGLES') return INGLES_ITEMS;
    return ARTES_VISUALES_ITEMS;
  }, [materiaCodigo]);

  const plantillaCodigo = useMemo(() => {
    if (materiaCodigo === 'MUSICA') return 'FINAL_MUSICA_BASE';
    if (materiaCodigo === 'TECNOLOGIA') return 'FINAL_TECNOLOGIA_BASE';
    if (materiaCodigo === 'INGLES') return 'FINAL_INGLES_BASE';
    if (materiaCodigo === 'ED_FISICA') {
      if (gradoNumero <= 3) return 'FINAL_ED_FISICA_G2';
      if (gradoNumero <= 5) return 'FINAL_ED_FISICA_G4_5';
      return 'FINAL_ED_FISICA_G6_7';
    }
    return 'FINAL_ARTES_VISUALES_G2';
  }, [materiaCodigo, gradoNumero]);

  const tituloTabla = useMemo(() => {
    if (materiaCodigo === 'MUSICA') return 'Contenidos de Educación Musical';
    if (materiaCodigo === 'TECNOLOGIA') return 'Contenidos de Tecnología';
    if (materiaCodigo === 'INGLES') return 'Contenidos de Inglés';
    if (materiaCodigo === 'ED_FISICA') return 'Logros del Area Educacion Fisica';
    return 'Contenidos de Artes Visuales';
  }, [materiaCodigo]);

  const items = useMemo(() => {
    if (isEdFisica) {
      const edItems =
        gradoNumero <= 3
          ? ED_FISICA_G1_ITEMS
          : gradoNumero <= 5
            ? ED_FISICA_G2_ITEMS
            : ED_FISICA_G3_ITEMS;
      return edItems.map((it, idx) => ({
        id: `item-ed-fisica-${idx + 1}`,
        plantillaId: `plantilla-${plantillaCodigo.toLowerCase()}`,
        bloqueNombre: it.bloqueNombre,
        bloqueOrden: it.bloqueOrden,
        ordenVisual: idx + 1,
        pagina: it.pagina,
        texto: it.texto,
      }));
    }
    return rawItemTexts.map((texto, idx) => ({
      id: `item-${materiaCodigo.toLowerCase()}-${idx + 1}`,
      plantillaId: `plantilla-${materiaCodigo.toLowerCase()}`,
      bloqueNombre: null,
      bloqueOrden: null,
      ordenVisual: idx + 1,
      pagina: 1,
      texto,
    }));
  }, [isEdFisica, gradoNumero, rawItemTexts, materiaCodigo, plantillaCodigo]);

  const respuestas = useMemo(
    () =>
      items.map((item) => ({
        itemId: item.id,
        valorCodigo: isEdFisica ? 'D' : 'ALCANZADO',
      })),
    [items, isEdFisica],
  );

  const data: InformeDocumentSnapshotDatos = useMemo(() => {
    const isMusica = materiaCodigo === 'MUSICA';
    const isTecnologia = materiaCodigo === 'TECNOLOGIA';
    const isIngles = materiaCodigo === 'INGLES';
    const nombreMateria = isMusica
      ? 'Educación Artística - Música'
      : isTecnologia
        ? 'Tecnología, Diseño y Programación'
        : isIngles
          ? 'Lenguas Adicionales - Inglés'
          : isEdFisica
            ? 'Educación Física'
            : 'Educación Artística - Artes visuales';
    const etiquetaMateria = isMusica
      ? 'Educación Musical'
      : isTecnologia
        ? 'Tecnología'
        : isIngles
          ? 'Inglés'
          : isEdFisica
            ? 'Educación Física'
            : 'Artes Visuales';

    return {
      instanciaId: `instancia-preview-${materiaCodigo.toLowerCase()}`,
      inscripcionId: 'inscripcion-preview-1',
      tipoInforme: 'CICLO_FINAL',
      ciclo: {
        id: 'ciclo-2026',
        nombre: 'Ciclo Lectivo 2026',
        ano: 2026,
      },
      curso: {
        id: `curso-${gradoNumero}`,
        nombre: `${gradoNumero}º Grado`,
        grado: `${gradoNumero}º`,
        gradoNumero,
        turno: 'Mañana',
      },
      materia: {
        id: `materia-${materiaCodigo.toLowerCase()}`,
        nombre: nombreMateria,
        codigoEspecial: materiaCodigo,
        etiquetaPdf: etiquetaMateria,
      },
      docente: {
        nombre: isMusica
          ? 'MARIA INES'
          : isIngles
            ? 'CELESTE'
            : isEdFisica
              ? (gradoNumero <= 5 ? 'GIMENA' : 'ALAN')
              : 'FLORENCIA',
        apellido: isMusica
          ? 'COSTA'
          : isIngles
            ? 'ARAGÓN'
            : isEdFisica
              ? (gradoNumero <= 5 ? 'CRUZADO ZEVALLOS' : 'FISSER')
              : 'BULACIO',
      },
      direccion: {
        nombre: 'MYRIAM GRACIELA',
        apellido: 'ADDUCCI',
      },
      alumno: {
        id: 'alumno-preview-1',
        apellidos: isEdFisica
          ? (gradoNumero <= 3 ? 'Carrillo Obando' : gradoNumero <= 5 ? 'Guillermo' : 'Blanco')
          : isIngles
            ? 'Camarero'
            : isMusica || isTecnologia
              ? 'Castillo'
              : 'Villca Romero',
        nombres: isEdFisica
          ? (gradoNumero <= 3 ? 'Luciano Anderson' : gradoNumero <= 5 ? 'Gael Carlos' : 'Nahiara Belén')
          : isIngles
            ? 'Ciro Nahuel'
            : isMusica || isTecnologia
              ? 'April Oriana'
              : 'Malena Abigail',
        numeroOrden: 1,
      },
      plantilla: {
        id: `plantilla-${plantillaCodigo.toLowerCase()}`,
        codigo: plantillaCodigo,
        tipoInforme: 'CICLO_FINAL',
        materiaId: `materia-${materiaCodigo.toLowerCase()}`,
        gradoDesde: isEdFisica ? (gradoNumero <= 3 ? 1 : gradoNumero <= 5 ? 4 : 6) : 1,
        gradoHasta: isEdFisica ? (gradoNumero <= 3 ? 3 : gradoNumero <= 5 ? 5 : 7) : 7,
        tituloTabla,
        escalaItems: isEdFisica ? ESCALA_EDUCACION_FISICA : ESCALA_TRES_NIVELES,
        mostrarLeyendaEscala: isEdFisica,
        requiereDesempenoGeneral: true,
        escalaDesempenoGeneral: escalaDesempeno,
        permiteObservaciones: true,
      },
      items,
      evaluacion: {
        desempenoGeneralCodigo: desempenoCodigo,
        desempenoGeneralEtiqueta: selectedDesempenoEtiqueta,
        observaciones: selectedObservacionTexto,
        respuestas,
      },
      visado: {
        generacionVisado: 1,
        revisionVisada: 1,
        visadoAt: '2026-11-20T10:00:00.000Z',
        visadoPor: 'Dirección',
      },
    };
  }, [
    materiaCodigo,
    isEdFisica,
    gradoNumero,
    plantillaCodigo,
    tituloTabla,
    escalaDesempeno,
    desempenoCodigo,
    selectedDesempenoEtiqueta,
    selectedObservacionTexto,
    items,
    respuestas,
  ]);

  return (
    <div>
      <header className="preview-toolbar">
        <div className="preview-toolbar-left">
          <span className="preview-toolbar-title">Previsualización en vivo · Informe Ciclo Final</span>
          <div className="preview-toolbar-group">
            <label htmlFor="preview-materia-select">Materia:</label>
            <select
              id="preview-materia-select"
              value={materiaCodigo}
              onChange={(e) =>
                setMateriaCodigo(
                  e.target.value as 'ARTES_VISUALES' | 'MUSICA' | 'TECNOLOGIA' | 'INGLES' | 'ED_FISICA',
                )
              }
            >
              <option value="ED_FISICA">Educación Física (2 páginas · 3 variantes por grado)</option>
              <option value="INGLES">Lenguas Adicionales - Inglés (18 consignas)</option>
              <option value="TECNOLOGIA">Tecnología, Diseño y Programación (17 consignas)</option>
              <option value="MUSICA">Educación Artística - Música (19 consignas)</option>
              <option value="ARTES_VISUALES">Educación Artística - Artes Visuales (18 consignas)</option>
            </select>
          </div>
          <div className="preview-toolbar-group">
            <label htmlFor="preview-grado-select">Grado:</label>
            <select
              id="preview-grado-select"
              value={gradoNumero}
              onChange={(e) => {
                const nextGrado = Number(e.target.value);
                setGradoNumero(nextGrado);
                setDesempenoCodigo(nextGrado >= 4 ? 'DESTACADO_10' : 'DESTACADO');
              }}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((g) => (
                <option key={g} value={g}>
                  {g}º Grado ({g <= 3 ? '1.er Ciclo - Conceptual' : '2.° Ciclo - Numérico'})
                </option>
              ))}
            </select>
          </div>
          <div className="preview-toolbar-group">
            <label htmlFor="preview-desempeno-select">Desempeño General:</label>
            <select
              id="preview-desempeno-select"
              value={desempenoCodigo}
              onChange={(e) => setDesempenoCodigo(e.target.value)}
            >
              {escalaDesempeno.map((opt) => (
                <option key={opt.codigo} value={opt.codigo}>
                  {opt.etiqueta}
                </option>
              ))}
            </select>
          </div>
          <div className="preview-toolbar-group">
            <label htmlFor="preview-observaciones-select">Observaciones:</label>
            <select
              id="preview-observaciones-select"
              value={ejemploObservacionId}
              onChange={(e) => setEjemploObservacionId(e.target.value)}
            >
              {EJEMPLOS_OBSERVACIONES.map((ej) => (
                <option key={ej.id} value={ej.id}>
                  {ej.label}
                </option>
              ))}
            </select>
          </div>
          <label>
            <input
              type="checkbox"
              checked={mostrarSubtituloColegio}
              onChange={(e) => setMostrarSubtituloColegio(e.target.checked)}
            />
            Subtítulo colegio
          </label>
        </div>
        <div>
          <button type="button" onClick={() => window.print()}>
            Imprimir / Guardar PDF
          </button>
        </div>
      </header>

      <main className="preview-container">
        <div className="preview-sheet">
          <InformeDocument
            data={data}
            mostrarSubtituloColegio={mostrarSubtituloColegio}
          />
        </div>
      </main>
    </div>
  );
}
