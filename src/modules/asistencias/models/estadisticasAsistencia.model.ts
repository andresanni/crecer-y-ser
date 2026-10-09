import type { Curso } from '../../inscripciones/models/inscripcion.model';
import type { EventoCalendario, MesCalendario } from './asistencia.model';
import type { VersionRegistroAsistencia } from './asistenciaSnapshot.model';

export interface ConteoPorSexo {
  v: number;
  m: number;
  t: number;
}

export interface DetalleMovimientoInscripcion {
  otraEscuela: ConteoPorSexo;
  otraSeccion: ConteoPorSexo;
  otroTurno: ConteoPorSexo;
  otroGrado: ConteoPorSexo;
  total: ConteoPorSexo;
}

export interface ResumenInscripcionMovimientos {
  inscriptosPrimerDia: ConteoPorSexo;
  entradosPosteriormente: DetalleMovimientoInscripcion;
  salidosEnElMes: DetalleMovimientoInscripcion;
  quedanUltimoDia: ConteoPorSexo;
}

export interface FilaDistribucionEdad {
  edad: number;
  v: number;
  m: number;
  t: number;
}

export interface DistribucionEdades {
  filas: FilaDistribucionEdad[];
  mayorDe?: ConteoPorSexo;
  total: ConteoPorSexo;
}

export interface DistribucionNacionalidad {
  argentinos: ConteoPorSexo;
  extranjeros: ConteoPorSexo;
  total: ConteoPorSexo;
}

export interface ResumenAsistenciaGeneral {
  totAsistencia: number;
  totInasistencia: number;
  porcentajeAsistencia: number;
  porcentajeInasistencia: number;
  asistenciaMedia: number;
  presentesPorDia: Record<number, number>;
}

export interface MateriaCalificada {
  id: string;
  cursoMateriaId: string;
  nombre: string;
  ordenVisual: number;
}

export interface ResumenAsistenciaAlumno {
  inscripcionId: string;
  alumnoId: string;
  numeroOrden: number | null;
  apellidoYNombre: string;
  sexo: string;
  nacionalidad: string;
  fechaNacimiento: string;
  fechaIngreso: string;
  fechaEgreso: string;
  bajaDesdeDia?: number;
  asistencias: number;
  inasistencias: number;
  llegadasTarde: number;
  marcasPorDia: Record<number, string>;
  observacion: string;
  calificacionesMaterias: Record<string, string>;
  trabajoEnElAula: Record<number, string>;
  convivencia: Record<number, string>;
}

export interface RegistroMensualCompleto extends VersionRegistroAsistencia {
  mesCalendario: MesCalendario;
  curso: Curso;
  materias: MateriaCalificada[];
  eventos: EventoCalendario[];
  alumnos: ResumenAsistenciaAlumno[];
  inscripcion: ResumenInscripcionMovimientos;
  edades: DistribucionEdades;
  nacionalidad: DistribucionNacionalidad;
  asistenciaGeneral: ResumenAsistenciaGeneral;
  observacionesDelMes: string[];
  observacionesAdicionales: string;
}
