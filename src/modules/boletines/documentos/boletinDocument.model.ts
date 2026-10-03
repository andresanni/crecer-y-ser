export type GradoPrimario = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export function cicloPedagogicoDelGrado(grado: GradoPrimario): string {
  if (!Number.isInteger(grado) || grado < 1 || grado > 7) {
    throw new RangeError('El grado del boletín debe estar entre 1 y 7.');
  }
  return grado <= 3 ? '1er Ciclo' : '2do Ciclo';
}

export type ValorDocumental =
  | { estado: 'confirmado'; texto: string }
  | { estado: 'anteriorIngreso'; texto?: string }
  | { estado: 'futuro' }
  | { estado: 'sinDato' };

export type ConceptoCalificacion = 'destacado' | 'avanzado' | 'alcanzado' | 'enProceso' | 'noAlcanzoObjetivos' | 'noCorresponde';

export type CalificacionDocumental =
  | { estado: 'confirmado'; concepto: ConceptoCalificacion; numero?: number }
  | { estado: 'anteriorIngreso'; texto?: string }
  | { estado: 'futuro' }
  | { estado: 'sinDato' };

export interface MateriaFormativaDocumental {
  id: string;
  nombre: string;
  criterios: Array<{
    id: string;
    texto: string;
    bimestres: [CalificacionDocumental, CalificacionDocumental, CalificacionDocumental, CalificacionDocumental];
  }>;
}

export interface MateriaAcademicaDocumental extends MateriaFormativaDocumental {
  ppi: [ValorDocumental, ValorDocumental, ValorDocumental, ValorDocumental];
  calificacionGeneral: [CalificacionDocumental, CalificacionDocumental, CalificacionDocumental, CalificacionDocumental];
}

export interface CierreBimestralDocumental {
  bimestre: 1 | 2 | 3 | 4;
  asistencias: ValorDocumental;
  inasistencias: ValorDocumental;
  llegadasTarde: ValorDocumental;
  observaciones: ValorDocumental;
}

export interface CambioEscuelaDocumental {
  fecha: ValorDocumental;
  causa: ValorDocumental;
  escuelaDestino: ValorDocumental;
}

export interface CierreAnualDocumental {
  sintesis: ValorDocumental;
  permaneceEn: ValorDocumental;
  promovidoA: ValorDocumental;
}

export interface RegistroAdministrativoDocumental {
  escuelaInicial: ValorDocumental;
  fechaIngreso: ValorDocumental;
  fechaEgreso: ValorDocumental;
  cambiosEscuela: [CambioEscuelaDocumental, CambioEscuelaDocumental, CambioEscuelaDocumental, CambioEscuelaDocumental];
  domicilio: ValorDocumental;
  telefono: ValorDocumental;
  cambioDomicilio: ValorDocumental;
}

export interface BoletinDocumentData {
  institucion: {
    nivel: string;
    cue: string;
    denominacion: string;
    distrito: string;
  };
  alumno: { apellidos: string; nombres: string; dni: string };
  responsable: { apellidos: string; nombres: string };
  curso: { grado: GradoPrimario };
  ano: number;
  cierreAnual: CierreAnualDocumental;
  registroAdministrativo: RegistroAdministrativoDocumental;
  integracion: {
    promocionoConAcompanamiento: ValorDocumental;
    poseeApoyos: ValorDocumental;
    cualesApoyos: ValorDocumental;
  };
  materiasFormativas: MateriaFormativaDocumental[];
  materiasAcademicas: MateriaAcademicaDocumental[];
  cierres: [
    CierreBimestralDocumental & { bimestre: 1 },
    CierreBimestralDocumental & { bimestre: 2 },
    CierreBimestralDocumental & { bimestre: 3 },
    CierreBimestralDocumental & { bimestre: 4 },
  ];
}

const paginasPrimerCiclo = [
  'Portada',
  'Proyecto escuela y escala de calificación',
  'Integración escolar, trabajo en el aula y convivencia',
  'Lengua y Matemática',
  'Conocimiento del mundo y Tecnología',
  'Artes visuales y Música',
  'Inglés y Educación física',
  'Cierre del primer bimestre',
  'Cierre del segundo bimestre',
  'Cierre del tercer bimestre',
  'Cierre del cuarto bimestre',
  'Síntesis conceptual y promoción',
  'Registro administrativo',
] as const;

export function paginasBoletinDelGrado(grado: GradoPrimario): readonly string[] {
  cicloPedagogicoDelGrado(grado);
  return grado <= 3 ? paginasPrimerCiclo : [
    ...paginasPrimerCiclo.slice(0, 4),
    'Ciencias Sociales y Ciencias Naturales',
    'Tecnología y Artes visuales',
    'Música e Inglés',
    'Educación física',
    ...paginasPrimerCiclo.slice(7),
  ];
}
