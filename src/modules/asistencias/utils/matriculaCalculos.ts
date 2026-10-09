import dayjs from 'dayjs';
import type {
  ConteoPorSexo,
  DetalleMovimientoInscripcion,
  ResumenInscripcionMovimientos,
} from '../models/estadisticasAsistencia.model';

export interface AlumnoMatriculaInput {
  inscripcionId: string;
  sexo: string;
  fechaIngreso?: string;
  fechaEgreso?: string;
  estado: string;
  procedenciaIngreso?: string;
  destinoEgreso?: string;
}

const crearConteoCero = (): ConteoPorSexo => ({ v: 0, m: 0, t: 0 });

export const permaneceAlUltimoDia = (item: Pick<AlumnoMatriculaInput, 'fechaIngreso' | 'fechaEgreso' | 'estado'>, ultimoDiaMes: string): boolean => {
  const ingreso = item.fechaIngreso?.slice(0, 10);
  const egreso = item.fechaEgreso?.slice(0, 10);
  return (!ingreso || ingreso <= ultimoDiaMes)
    && !(item.estado === 'Baja' && egreso && egreso <= ultimoDiaMes);
};

const crearDetalleCero = (): DetalleMovimientoInscripcion => ({
  otraEscuela: crearConteoCero(),
  otraSeccion: crearConteoCero(),
  otroTurno: crearConteoCero(),
  otroGrado: crearConteoCero(),
  total: crearConteoCero(),
});

export const esVaron = (sexo?: string): boolean => {
  if (!sexo) return false;
  const s = sexo.trim().toLowerCase();
  return s === 'masculino' || s === 'v' || s === 'varon' || s === 'm';
};

export const esMujer = (sexo?: string): boolean => {
  if (!sexo) return false;
  const s = sexo.trim().toLowerCase();
  return s === 'femenino' || s === 'f' || s === 'mujer';
};

const sumarAlConteo = (conteo: ConteoPorSexo, sexo?: string): void => {
  if (esMujer(sexo)) {
    conteo.m += 1;
  } else {
    conteo.v += 1;
  }
  conteo.t += 1;
};

export const calcularMovimientosInscripcion = (
  alumnos: AlumnoMatriculaInput[],
  ano: number,
  mes: number
): ResumenInscripcionMovimientos => {
  const mesPad = String(mes).padStart(2, '0');
  const primerDiaMes = `${ano}-${mesPad}-01`;
  const ultimoDiaNum = dayjs(primerDiaMes).daysInMonth();
  const ultimoDiaMes = `${ano}-${mesPad}-${String(ultimoDiaNum).padStart(2, '0')}`;

  const inscriptosPrimerDia = crearConteoCero();
  const entradosPosteriormente = crearDetalleCero();
  const salidosEnElMes = crearDetalleCero();

  for (const item of alumnos) {
    const fechaIn = item.fechaIngreso ? item.fechaIngreso.slice(0, 10) : '';
    const fechaOut = item.fechaEgreso ? item.fechaEgreso.slice(0, 10) : '';
    const esBaja = item.estado === 'Baja';

    const ingresoAntesOEnPrimerDia = !fechaIn || fechaIn <= primerDiaMes;
    const ingresoDespuesDelPrimerDia = Boolean(fechaIn && fechaIn > primerDiaMes && fechaIn <= ultimoDiaMes);
    const egresoAntesDelPrimerDia = Boolean(esBaja && fechaOut && fechaOut < primerDiaMes);
    const egresoDuranteElMes = Boolean(esBaja && fechaOut && fechaOut >= primerDiaMes && fechaOut <= ultimoDiaMes);

    if (egresoAntesDelPrimerDia || (fechaIn && fechaIn > ultimoDiaMes)) {
      continue;
    }

    if (ingresoAntesOEnPrimerDia) {
      sumarAlConteo(inscriptosPrimerDia, item.sexo);
    } else if (ingresoDespuesDelPrimerDia) {
      const procedencia = (item.procedenciaIngreso || '').toUpperCase();
      if (procedencia === 'OTRA_SECCION') {
        sumarAlConteo(entradosPosteriormente.otraSeccion, item.sexo);
      } else if (procedencia === 'OTRO_TURNO') {
        sumarAlConteo(entradosPosteriormente.otroTurno, item.sexo);
      } else if (procedencia === 'OTRO_GRADO') {
        sumarAlConteo(entradosPosteriormente.otroGrado, item.sexo);
      } else {
        sumarAlConteo(entradosPosteriormente.otraEscuela, item.sexo);
      }
      sumarAlConteo(entradosPosteriormente.total, item.sexo);
    }

    if (egresoDuranteElMes) {
      const destino = (item.destinoEgreso || '').toUpperCase();
      if (destino === 'OTRA_SECCION') {
        sumarAlConteo(salidosEnElMes.otraSeccion, item.sexo);
      } else if (destino === 'OTRO_TURNO') {
        sumarAlConteo(salidosEnElMes.otroTurno, item.sexo);
      } else if (destino === 'OTRO_GRADO') {
        sumarAlConteo(salidosEnElMes.otroGrado, item.sexo);
      } else {
        sumarAlConteo(salidosEnElMes.otraEscuela, item.sexo);
      }
      sumarAlConteo(salidosEnElMes.total, item.sexo);
    }
  }

  const quedanUltimoDia: ConteoPorSexo = {
    v: inscriptosPrimerDia.v + entradosPosteriormente.total.v - salidosEnElMes.total.v,
    m: inscriptosPrimerDia.m + entradosPosteriormente.total.m - salidosEnElMes.total.m,
    t: inscriptosPrimerDia.t + entradosPosteriormente.total.t - salidosEnElMes.total.t,
  };

  return {
    inscriptosPrimerDia,
    entradosPosteriormente,
    salidosEnElMes,
    quedanUltimoDia,
  };
};
