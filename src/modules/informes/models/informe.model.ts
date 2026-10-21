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
}

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
  alumnosCompletos: number;
  totalInformes: number;
  visados: number;
  cursadasPendientes: CursadaPendienteInforme[];
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
  informes: InformeRevisionAlumno[];
}
