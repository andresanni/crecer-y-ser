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
  const [materiaCodigo, setMateriaCodigo] = useState<'ARTES_VISUALES' | 'MUSICA' | 'TECNOLOGIA'>('TECNOLOGIA');
  const [gradoNumero, setGradoNumero] = useState<number>(3);
  const [ejemploObservacionId, setEjemploObservacionId] = useState<string>('ppi');
  const [desempenoCodigo, setDesempenoCodigo] = useState<string>('ALCANZADO');
  const [mostrarSubtituloColegio, setMostrarSubtituloColegio] = useState<boolean>(true);

  const esSegundoCiclo = gradoNumero >= 4;

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
    return ARTES_VISUALES_ITEMS;
  }, [materiaCodigo]);

  const plantillaCodigo =
    materiaCodigo === 'MUSICA'
      ? 'FINAL_MUSICA_BASE'
      : materiaCodigo === 'TECNOLOGIA'
        ? 'FINAL_TECNOLOGIA_BASE'
        : 'FINAL_ARTES_VISUALES_G2';

  const tituloTabla =
    materiaCodigo === 'MUSICA'
      ? 'Contenidos de Educación Musical'
      : materiaCodigo === 'TECNOLOGIA'
        ? 'Contenidos de Tecnología'
        : 'Contenidos de Artes Visuales';

  const items = useMemo(
    () =>
      rawItemTexts.map((texto, idx) => ({
        id: `item-${materiaCodigo.toLowerCase()}-${idx + 1}`,
        plantillaId: `plantilla-${materiaCodigo.toLowerCase()}`,
        bloqueNombre: null,
        bloqueOrden: null,
        ordenVisual: idx + 1,
        pagina: 1,
        texto,
      })),
    [rawItemTexts, materiaCodigo],
  );

  const respuestas = useMemo(
    () =>
      items.map((item) => ({
        itemId: item.id,
        valorCodigo: 'ALCANZADO',
      })),
    [items],
  );

  const data: InformeDocumentSnapshotDatos = useMemo(() => {
    const isMusica = materiaCodigo === 'MUSICA';
    const isTecnologia = materiaCodigo === 'TECNOLOGIA';
    const nombreMateria = isMusica
      ? 'Educación Artística - Música'
      : isTecnologia
        ? 'Tecnología, Diseño y Programación'
        : 'Educación Artística - Artes visuales';
    const etiquetaMateria = isMusica
      ? 'Educación Musical'
      : isTecnologia
        ? 'Tecnología'
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
        nombre: isMusica ? 'MARIA INES' : 'FLORENCIA',
        apellido: isMusica ? 'COSTA' : 'BULACIO',
      },
      direccion: {
        nombre: 'MYRIAM GRACIELA',
        apellido: 'ADDUCCI',
      },
      alumno: {
        id: 'alumno-preview-1',
        apellidos: isMusica || isTecnologia ? 'Castillo' : 'Villca Romero',
        nombres: isMusica || isTecnologia ? 'April Oriana' : 'Malena Abigail',
        numeroOrden: 1,
      },
      plantilla: {
        id: `plantilla-${materiaCodigo.toLowerCase()}`,
        codigo: plantillaCodigo,
        tipoInforme: 'CICLO_FINAL',
        materiaId: `materia-${materiaCodigo.toLowerCase()}`,
        gradoDesde: 1,
        gradoHasta: 7,
        tituloTabla,
        escalaItems: ESCALA_TRES_NIVELES,
        mostrarLeyendaEscala: false,
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
              onChange={(e) => setMateriaCodigo(e.target.value as 'ARTES_VISUALES' | 'MUSICA' | 'TECNOLOGIA')}
            >
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
