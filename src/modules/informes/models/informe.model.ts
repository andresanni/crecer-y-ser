import { compareGrados, isKindergartenCourse } from '../../alumnos/utils/gradeColors';

export type TipoInforme = 'CICLO_FINAL' | 'PRIMER_CUATRIMESTRE' | 'PRIMER_BIMESTRE';

export type EstadoInstanciaInforme = 'BORRADOR_DOCENTE' | 'CONTROL_DIRECTIVO';

export type EtapaInforme =
  | 'PENDIENTE_CONFIGURACION'
  | 'PENDIENTE_EMISION'
  | 'CARGA_DOCENTE'
  | 'CARGA_PAUSADA'
  | 'REVISION_DIRECTIVA'
  | 'LISTO_PARA_PDF';

export type EstadoVisadoInforme = 'PENDIENTE_REVISION' | 'VISADO';

export interface TipoInformeMeta {
  codigo: TipoInforme;
  numeroOrden: number;
  titulo: string;
  tituloCorto: string;
  subtitulo: string;
  responsable: string;
  corteBimestre: number;
  requiereMateriaEspecial: boolean;
}

export const TIPOS_INFORME_META: Record<TipoInforme, TipoInformeMeta> = {
  CICLO_FINAL: {
    codigo: 'CICLO_FINAL',
    numeroOrden: 1,
    titulo: 'Informe Ciclo Final · Áreas Especiales',
    tituloCorto: 'Ciclo Final',
    subtitulo: 'Contenidos de desempeño anual y calificación general por materia especial',
    responsable: 'Maestras de Áreas Especiales',
    corteBimestre: 4,
    requiereMateriaEspecial: true,
  },
  PRIMER_CUATRIMESTRE: {
    codigo: 'PRIMER_CUATRIMESTRE',
    numeroOrden: 2,
    titulo: 'Informe 1.er Cuatrimestre · Áreas Especiales',
    tituloCorto: 'Primer Cuatrimestre',
    subtitulo: 'Pautas de conducta y observaciones del primer cuatrimestre por materia especial',
    responsable: 'Maestras de Áreas Especiales',
    corteBimestre: 2,
    requiereMateriaEspecial: true,
  },
  PRIMER_BIMESTRE: {
    codigo: 'PRIMER_BIMESTRE',
    numeroOrden: 3,
    titulo: 'Informe 1.er Bimestre · Maestras de Grado',
    tituloCorto: 'Primer Bimestre',
    subtitulo: 'Pautas de conducta y observaciones del primer bimestre por grado',
    responsable: 'Maestra de Grado',
    corteBimestre: 1,
    requiereMateriaEspecial: false,
  },
};

export const TIPOS_INFORME_LIST: TipoInformeMeta[] = [
  TIPOS_INFORME_META.CICLO_FINAL,
  TIPOS_INFORME_META.PRIMER_CUATRIMESTRE,
  TIPOS_INFORME_META.PRIMER_BIMESTRE,
];

export const isValidTipoInforme = (value: string | null | undefined): value is TipoInforme => (
  value === 'CICLO_FINAL' || value === 'PRIMER_CUATRIMESTRE' || value === 'PRIMER_BIMESTRE'
);

export interface EscalaItemInforme {
  codigo: string;
  etiqueta: string;
  descripcion?: string;
}

export interface EscalaDesempenoGeneralInforme {
  codigo: string;
  etiqueta: string;
}

export const isNoCorrespondeOption = (codigo?: string, etiqueta?: string): boolean => {
  const normCode = (codigo || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  const normLabel = (etiqueta || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return (
    normCode === 'NO_CORRESPONDE' ||
    normCode === 'NC' ||
    normLabel === 'no corresponde' ||
    normLabel.startsWith('no corresponde')
  );
};

export const formatMateriaNombreUI = (nombre?: string | null): string => {
  if (!nombre) return '';
  const trimmed = nombre.trim();
  const normalized = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (
    normalized.includes('artes visuales') ||
    normalized === 'educacion artistica - artes visuales' ||
    normalized === 'artistica - artes visuales'
  ) {
    return 'Artes Visuales';
  }

  if (
    (normalized.includes('musica') || normalized.includes('musical')) &&
    (normalized.includes('artistica') || normalized.includes('educacion artistica'))
  ) {
    return 'Música';
  }

  if (
    normalized.includes('ingles') ||
    normalized.includes('lenguas adicionales')
  ) {
    return 'Inglés';
  }

  if (
    normalized.includes('tecnologia') ||
    normalized.includes('diseno y programacion')
  ) {
    return 'Tecnología';
  }

  return trimmed;
};

export interface PlantillaInforme {
  id: string;
  codigo: string;
  tipoInforme: TipoInforme;
  materiaId: string | null;
  gradoDesde: number;
  gradoHasta: number;
  tituloTabla: string;
  escalaItems: EscalaItemInforme[];
  mostrarLeyendaEscala: boolean;
  requiereDesempenoGeneral: boolean;
  escalaDesempenoGeneral: EscalaDesempenoGeneralInforme[];
  permiteObservaciones: boolean;
}

export interface ItemPlantillaInforme {
  id: string;
  plantillaId: string;
  bloqueNombre: string | null;
  bloqueOrden: number | null;
  ordenVisual: number;
  pagina: number;
  texto: string;
}

export interface InstanciaInforme {
  id: string;
  cicloId: string;
  tipoInforme: TipoInforme;
  cursoId: string;
  materiaId: string | null;
  plantillaId: string;
  estado: EstadoInstanciaInforme;
  docenteNombre: string;
  docenteApellido: string;
  revision: number;
  enviadoAt: string | null;
  enviadoPor: string | null;
}

export interface TokenAccesoInforme {
  id: string;
  instanciaId: string;
  instanciaIds?: string[];
  cicloId: string;
  tipoInforme: TipoInforme;
  cursoId: string;
  cursoIds?: string[];
  materiaId: string | null;
  docenteNombre: string;
  docenteApellido: string;
  tokenPrefijo: string;
  recuperable: boolean;
  secreto?: string;
}

export interface CursoAsignadoDocenteInforme {
  instanciaId: string;
  cursoId: string;
  cursoNombre: string;
  grado: string;
  turno: string;
  nivel?: 'INICIAL' | 'PRIMARIO';
  orden?: number;
  plantillaCodigo: string;
  totalAlumnos: number;
  alumnosCompletos: number;
  completa: boolean;
  revision: number;
}

export interface MateriaEspecialInforme {
  id: string;
  nombre: string;
  codigoEspecial: string;
  orden: number;
}

export interface CursoInformeResumen {
  id: string;
  nombre: string;
  grado: string;
  gradoNumero: number;
  turno: string;
  nivel?: 'INICIAL' | 'PRIMARIO';
  orden?: number;
}

export const isInicialCursoInforme = (
  curso?: { nombre?: string | null; gradoNumero?: number | null; nivel?: 'INICIAL' | 'PRIMARIO' } | null,
): boolean => {
  if (!curso) return false;
  if (curso.nivel === 'INICIAL') return true;
  if (curso.nivel === 'PRIMARIO') return false;
  return curso.gradoNumero === 0 || isKindergartenCourse(curso.nombre);
};

export const compareCursosInforme = (
  a: { nombre?: string | null; gradoNumero?: number | null; orden?: number | null },
  b: { nombre?: string | null; gradoNumero?: number | null; orden?: number | null },
): number => {
  const orderA = a.orden && a.orden > 0 ? a.orden : 0;
  const orderB = b.orden && b.orden > 0 ? b.orden : 0;
  if (orderA > 0 && orderB > 0 && orderA !== orderB) {
    return orderA - orderB;
  }
  return compareGrados(a.nombre, b.nombre);
};

export interface CursadaPendienteInforme {
  inscripcionId: string;
  alumnoId: string;
  nombreCompleto: string;
}

export interface CeldaEtapaInforme {
  cursoId: string;
  materiaId: string | null;
  plantillaId: string | null;
  plantillaCodigo: string | null;
  totalItems: number;
  instanciaId: string | null;
  etapa: EtapaInforme;
  revision: number | null;
  docenteNombre: string | null;
  docenteApellido: string | null;
  enlace: TokenAccesoInforme | null;
  inscripcionesEvaluables: string[];
  totalInscripcionesCurso?: number;
  ajustesNominaManuales?: number;
  alumnosCompletos: number;
  totalInformes: number;
  visados: number;
  cursadasPendientes: CursadaPendienteInforme[];
}

export interface AlumnoExcluidoInforme {
  inscripcionId: string;
  alumnoId: string;
  numeroOrden: number | null;
  apellidos: string;
  nombres: string;
  nombreCompleto: string;
  estadoAdministrativo: string;
}

export interface EtapasInformeData {
  ciclo: {
    id: string;
    nombre: string;
    ano: number;
  };
  tipoInforme: TipoInforme;
  requiereMateriaEspecial: boolean;
  cursos: CursoInformeResumen[];
  materiasEspeciales: MateriaEspecialInforme[];
  celdas: CeldaEtapaInforme[];
}

export type InformeSemaforoTone = 'verde' | 'amarillo' | 'rojo' | 'neutro';

export interface SemaforoInformeResumen {
  verde: number;
  amarillo: number;
  rojo: number;
  neutro: number;
}

export interface DisonanciaInformeItem {
  codigo: string;
  mensaje: string;
}

export interface ResumenRevisionCursoInforme {
  alumnosConRojos: number;
  alumnosConAmarillos: number;
  alumnosConDisonancias: number;
  alumnosConAtencion: number;
}

export interface AlumnoInformeRow {
  inscripcionId: string;
  numeroOrden: number | null;
  apellidos: string;
  nombres: string;
  nombreCompleto: string;
  completo: boolean;
  itemsRespondidos: number;
  totalItems: number;
  desempenoGeneralCompleto: boolean;
  estadoVisado?: EstadoVisadoInforme;
  desempenoGeneralValor?: string | null;
  desempenoGeneralEtiqueta?: string | null;
  semaforo?: SemaforoInformeResumen;
  disonancias?: DisonanciaInformeItem[];
  itemsAisladosIds?: string[];
}

export interface RespuestaItemInforme {
  itemId: string;
  valorCodigo: string;
}

export interface EvaluacionInformeData {
  id: string | null;
  desempenoGeneralValor: string | null;
  observaciones: string;
  respuestas: RespuestaItemInforme[];
}

export interface VisadoInformeDto {
  inscripcionId: string;
  estado: EstadoVisadoInforme;
  generacionVisado: number;
  revisionContenido: number;
  revisionVisada: number | null;
  visadoAt: string | null;
  visadoPor: string | null;
}

export interface PreparacionDocumentalInforme {
  completa: boolean;
  alumnoId: string;
  faltantes: Array<{
    campo: string;
    mensaje: string;
    origen: 'alumno' | 'docente';
  }>;
}

export interface ElegibilidadPdfInforme {
  elegiblePorVisado: boolean;
  elegibleParaPdf: boolean;
  motivos: string[];
}

export interface InformeRevisionAlumno extends VisadoInformeDto {
  nombreCompleto: string;
  apellidos: string;
  nombres: string;
  numeroOrden: number | null;
  completo: boolean;
  itemsRespondidos: number;
  totalItems: number;
  desempenoGeneralValor: string | null;
  desempenoGeneralEtiqueta?: string | null;
  semaforo?: SemaforoInformeResumen;
  disonancias?: DisonanciaInformeItem[];
  itemsAisladosIds?: string[];
  elegibilidadPdf: ElegibilidadPdfInforme;
  preparacionDocumental: PreparacionDocumentalInforme;
}

export interface RevisionInformeData {
  instancia: InstanciaInforme;
  ciclo: {
    id: string;
    nombre: string;
    ano: number;
  };
  curso: {
    id: string;
    nombre: string;
    grado: string;
    turno: string;
    nivel?: 'INICIAL' | 'PRIMARIO';
  };
  materia: {
    id: string;
    nombre: string;
  } | null;
  plantilla: PlantillaInforme;
  items: ItemPlantillaInforme[];
  etapa: 'REVISION_DIRECTIVA' | 'LISTO_PARA_PDF';
  totalInformes: number;
  visados: number;
  alumnosSinIncorporar: number;
  inscripcionesEvaluables: string[];
  resumenCurso?: ResumenRevisionCursoInforme;
  informes: InformeRevisionAlumno[];
  alumnosExcluidos?: AlumnoExcluidoInforme[];
}

const normalizeInsightText = (text: string): string => (
  String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
);

export const isInverseConductItemText = (texto: string): boolean => {
  const normalized = normalizeInsightText(texto);
  const keywords = [
    'dificultades',
    'agresion',
    'descalifica',
    'resistencia',
    'dispersa',
    'deja dispersar',
    'habla cuando',
    'convers',
    'interrumpe',
  ];
  return keywords.some((kw) => normalized.includes(kw));
};

const usesAbcdScaleTemplate = (plantillaCodigo: string): boolean => {
  const tpl = String(plantillaCodigo || '').trim().toUpperCase();
  return tpl.includes('ED_FISICA') && !tpl.includes('INICIAL');
};

export const classifyInformeItemTone = (
  plantillaCodigo: string,
  itemTexto: string,
  valorCodigo: string,
): InformeSemaforoTone => {
  const code = String(valorCodigo || '').trim().toUpperCase();
  if (!code) return 'neutro';
  if (code === 'ALCANZADO') return 'verde';
  if (code === 'EN_PROCESO') return 'amarillo';
  if (code === 'NO_ALCANZADO') return 'rojo';
  if (usesAbcdScaleTemplate(plantillaCodigo) || code === 'A' || code === 'B' || code === 'C' || code === 'D') {
    if (code === 'D' || code === 'C') return 'verde';
    if (code === 'B') return 'amarillo';
    if (code === 'A') return 'neutro';
  }
  if (code === 'SIEMPRE' || code === 'A_VECES' || code === 'NUNCA') {
    if (code === 'A_VECES') return 'amarillo';
    const inverse = isInverseConductItemText(itemTexto);
    if (code === 'SIEMPRE') return inverse ? 'rojo' : 'verde';
    if (code === 'NUNCA') return inverse ? 'verde' : 'rojo';
  }
  return 'neutro';
};

export const classifyGeneralPerformanceBand = (
  generalCode: string | null | undefined,
): 'ALTO' | 'MEDIO' | 'PROCESO' | 'BAJO' | null => {
  const code = String(generalCode || '').trim().toUpperCase();
  if (!code || code === 'NO_CORRESPONDE' || code === 'NC') return null;
  if (
    code === 'DESTACADO' ||
    code === 'DESTACADO_10' ||
    code === 'AVANZADO' ||
    code === 'AVANZADO_9' ||
    code === 'AVANZADO_8'
  ) {
    return 'ALTO';
  }
  if (code === 'ALCANZADO' || code === 'ALCANZADO_7' || code === 'ALCANZADO_6') {
    return 'MEDIO';
  }
  if (code === 'EN_PROCESO' || code === 'EN_PROCESO_5' || code === 'EN_PROCESO_4') {
    return 'PROCESO';
  }
  if (
    code === 'NO_ALCANZO' ||
    code === 'NO_ALCANZO_3' ||
    code === 'NO_ALCANZO_2' ||
    code === 'NO_ALCANZO_1'
  ) {
    return 'BAJO';
  }
  return null;
};

export const getGeneralPerformanceTone = (
  valorCodigo: string | null | undefined,
): InformeSemaforoTone => {
  const band = classifyGeneralPerformanceBand(valorCodigo);
  if (band === 'ALTO' || band === 'MEDIO') return 'verde';
  if (band === 'PROCESO') return 'amarillo';
  if (band === 'BAJO') return 'rojo';
  return 'neutro';
};

const DESEMPENO_SHORT_LABELS: Record<string, string> = {
  NO_ALCANZO: 'NA',
  EN_PROCESO: 'EP',
  ALCANZADO: 'AL',
  AVANZADO: 'AV',
  DESTACADO: 'DE',
  NO_CORRESPONDE: 'NC',
  NC: 'NC',
  NO_ALCANZO_1: 'NA-1',
  NO_ALCANZO_2: 'NA-2',
  NO_ALCANZO_3: 'NA-3',
  EN_PROCESO_4: 'EP-4',
  EN_PROCESO_5: 'EP-5',
  ALCANZADO_6: 'AL-6',
  ALCANZADO_7: 'AL-7',
  AVANZADO_8: 'AV-8',
  AVANZADO_9: 'AV-9',
  DESTACADO_10: 'DE-10',
};

export const formatDesempenoGeneralShortLabel = (
  valorCodigo?: string | null,
  etiqueta?: string | null,
): string => {
  const code = String(valorCodigo || '').trim().toUpperCase();
  if (code && DESEMPENO_SHORT_LABELS[code]) {
    return DESEMPENO_SHORT_LABELS[code];
  }
  return etiqueta || valorCodigo || '';
};

export const computeLiveStudentSemaforo = (
  plantilla: PlantillaInforme,
  items: ItemPlantillaInforme[],
  respuestasMap: Record<string, string>,
  desempenoGeneralValor: string,
  itemsAisladosIds?: string[],
): { semaforo: SemaforoInformeResumen; disonancias: DisonanciaInformeItem[] } => {
  const semaforo: SemaforoInformeResumen = { verde: 0, amarillo: 0, rojo: 0, neutro: 0 };
  const isEdFisica = usesAbcdScaleTemplate(plantilla.codigo);
  const isolatedSet = new Set(itemsAisladosIds || []);
  const isolatedOrders: number[] = [];

  for (const item of items) {
    const code = String(respuestasMap[item.id] || '').trim();
    if (!code) continue;
    const tone = classifyInformeItemTone(plantilla.codigo, item.texto, code);
    semaforo[tone] += 1;
    if (isEdFisica && isolatedSet.has(item.id) && code.toUpperCase() === 'A') {
      isolatedOrders.push(item.ordenVisual);
    }
  }

  const disonancias: DisonanciaInformeItem[] = [];
  const band = plantilla.requiereDesempenoGeneral
    ? classifyGeneralPerformanceBand(desempenoGeneralValor)
    : null;

  if (band === 'ALTO' && (semaforo.rojo >= 1 || (isEdFisica && semaforo.amarillo >= 2))) {
    disonancias.push({
      codigo: 'NOTA_ALTA_CON_ROJOS',
      mensaje: 'Desempeño general alto con valoración baja en algún indicador.',
    });
  }

  if (
    semaforo.verde > 0 &&
    semaforo.amarillo === 0 &&
    semaforo.rojo === 0 &&
    (band === 'PROCESO' || band === 'BAJO')
  ) {
    disonancias.push({
      codigo: 'TODO_VERDE_NOTA_BAJA',
      mensaje: 'Todos los indicadores logrados con desempeño general en proceso o bajo.',
    });
  }

  if (
    semaforo.rojo > semaforo.verde + semaforo.amarillo &&
    (band === 'MEDIO' || band === 'ALTO')
  ) {
    disonancias.push({
      codigo: 'MAYORIA_ROJA_NOTA_APROBADA',
      mensaje: 'Predominio de indicadores bajos con desempeño general alcanzado o superior.',
    });
  }

  if (isolatedOrders.length > 0) {
    isolatedOrders.sort((a, b) => a - b);
    disonancias.push({
      codigo: 'ITEM_A_AISLADO',
      mensaje: `Registra «A» (no trabajado) en ${isolatedOrders.length > 1 ? 'los ítems ' : 'el ítem '}${isolatedOrders.join(', ')} mientras el resto del curso tiene calificación.`,
    });
  }

  return { semaforo, disonancias };
};
