import dayjs from 'dayjs';
import type {
  ConteoPorSexo,
  DistribucionEdades,
  DistribucionNacionalidad,
  FilaDistribucionEdad,
  ResumenAsistenciaGeneral,
} from '../models/estadisticasAsistencia.model';
import { esMujer } from './matriculaCalculos';

export interface AlumnoEstadisticaInput {
  fechaNacimiento?: string;
  nacionalidad?: string;
  sexo?: string;
}

export const calcularEdadAlumno = (
  fechaNacimiento: string,
  ano: number,
  mes: number
): number => {
  if (!fechaNacimiento) return 0;
  const nacimiento = dayjs(fechaNacimiento.slice(0, 10));
  if (!nacimiento.isValid()) return 0;

  if (mes <= 6) {
    const fechaCorteJunio = dayjs(`${ano}-06-30`);
    return fechaCorteJunio.diff(nacimiento, 'year');
  }

  const mesPad = String(mes).padStart(2, '0');
  const ultimoDiaNum = dayjs(`${ano}-${mesPad}-01`).daysInMonth();
  const fechaCorteMes = dayjs(`${ano}-${mesPad}-${String(ultimoDiaNum).padStart(2, '0')}`);
  return fechaCorteMes.diff(nacimiento, 'year');
};

export const calcularDistribucionEdades = (
  alumnos: AlumnoEstadisticaInput[],
  ano: number,
  mes: number
): DistribucionEdades => {
  const mapaEdades = new Map<number, { v: number; m: number; t: number }>();
  const total: ConteoPorSexo = { v: 0, m: 0, t: 0 };

  for (const alumno of alumnos) {
    if (!alumno.fechaNacimiento) continue;
    const edad = calcularEdadAlumno(alumno.fechaNacimiento, ano, mes);
    if (edad <= 0) continue;

    const actual = mapaEdades.get(edad) || { v: 0, m: 0, t: 0 };
    if (esMujer(alumno.sexo)) {
      actual.m += 1;
      total.m += 1;
    } else {
      actual.v += 1;
      total.v += 1;
    }
    actual.t += 1;
    total.t += 1;
    mapaEdades.set(edad, actual);
  }

  const edadesOrdenadas = Array.from(mapaEdades.keys()).sort((a, b) => a - b);
  const filas: FilaDistribucionEdad[] = edadesOrdenadas.map((edad) => {
    const datos = mapaEdades.get(edad)!;
    return {
      edad,
      v: datos.v,
      m: datos.m,
      t: datos.t,
    };
  });

  return {
    filas,
    total,
  };
};

export const esArgentino = (nacionalidad?: string): boolean => {
  if (!nacionalidad) return true;
  const n = nacionalidad.trim().toLowerCase();
  return n.startsWith('argentin') || n === 'arg';
};

export const calcularDistribucionNacionalidad = (
  alumnos: AlumnoEstadisticaInput[]
): DistribucionNacionalidad => {
  const argentinos: ConteoPorSexo = { v: 0, m: 0, t: 0 };
  const extranjeros: ConteoPorSexo = { v: 0, m: 0, t: 0 };
  const total: ConteoPorSexo = { v: 0, m: 0, t: 0 };

  for (const alumno of alumnos) {
    const esArg = esArgentino(alumno.nacionalidad);
    const destino = esArg ? argentinos : extranjeros;

    if (esMujer(alumno.sexo)) {
      destino.m += 1;
      total.m += 1;
    } else {
      destino.v += 1;
      total.v += 1;
    }
    destino.t += 1;
    total.t += 1;
  }

  return {
    argentinos,
    extranjeros,
    total,
  };
};

export const calcularResumenAsistenciaGeneral = (
  totalAsistencias: number,
  totalInasistencias: number,
  totalDiasHabiles: number,
  presentesPorDia: Record<number, number> = {}
): ResumenAsistenciaGeneral => {
  const totalPosibles = totalAsistencias + totalInasistencias;
  const porcentajeAsistencia = totalPosibles > 0 ? Math.round((totalAsistencias / totalPosibles) * 100) : 0;
  const porcentajeInasistencia = totalPosibles > 0 ? Math.round((totalInasistencias / totalPosibles) * 100) : 0;
  const asistenciaMedia = totalDiasHabiles > 0 ? Math.round(totalAsistencias / totalDiasHabiles) : 0;

  return {
    totAsistencia: totalAsistencias,
    totInasistencia: totalInasistencias,
    porcentajeAsistencia,
    porcentajeInasistencia,
    asistenciaMedia,
    presentesPorDia,
  };
};

export const determinarMarcaDia = (
  fechaIso: string,
  fechaIngreso?: string,
  fechaEgreso?: string,
  estadoInscripcion?: string,
  novedadEstado?: string,
  esDiaHabil: boolean = true
): string => {
  const fecha = fechaIso.slice(0, 10);
  const ingreso = fechaIngreso ? fechaIngreso.slice(0, 10) : '';
  const egreso = fechaEgreso ? fechaEgreso.slice(0, 10) : '';
  const esBaja = estadoInscripcion === 'Baja';

  if (ingreso && fecha < ingreso) {
    return '---';
  }

  if (esBaja && egreso && fecha > egreso) {
    return '---';
  }

  if (!esDiaHabil) {
    return '';
  }

  if (novedadEstado) {
    return novedadEstado;
  }

  return 'P';
};
