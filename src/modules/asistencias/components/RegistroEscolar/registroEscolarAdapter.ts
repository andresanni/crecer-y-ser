import dayjs from 'dayjs';
import { displayAssessment } from './cyclePresentation';
import { NOMBRES_MESES } from '../../models/asistencia.model';
import type { RegistroMensualCompleto } from '../../models/estadisticasAsistencia.model';
import type {
  RegistroEscolarData,
  StudentRecord,
  EventoColumna,
} from './types';

const formatConteo = (n?: number): string => (n !== undefined && n > 0 ? String(n) : '-');

const normalizar = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

function formatearCalificacion(value: string, firstCycle: boolean): string {
  return displayAssessment(value, firstCycle);
}

function columnaMateria(name: string): number | undefined {
  const label = normalizar(name);
  if (/INGLES|LENGUA ADICIONAL/.test(label)) return 7;
  if (/LENGUA/.test(label)) return 0;
  if (/MATEMAT/.test(label)) return 1;
  if (/SOCIALES|CONOCIMIENTO.*MUNDO/.test(label)) return 2;
  if (/NATURALES/.test(label)) return 3;
  if (/TECNOLOG|PROGRAMACION|DISENO/.test(label)) return 4;
  if (/VISUALES|PLASTICA/.test(label)) return 5;
  if (/MUSICA/.test(label)) return 6;
  if (/FISICA/.test(label)) return 8;
  return undefined;
}

export function adaptarRegistroEscolar(registro: RegistroMensualCompleto): RegistroEscolarData {
  const ano = registro.mesCalendario.ano;
  const mes = registro.mesCalendario.mes;
  const mesPad = String(mes).padStart(2, '0');
  const diasEnElMes = dayjs(`${ano}-${mesPad}-01`).daysInMonth();

  const weekends: number[] = [];
  for (let d = 1; d <= 31; d++) {
    if (d > diasEnElMes) {
      weekends.push(d);
    } else {
      const dow = dayjs(`${ano}-${mesPad}-${String(d).padStart(2, '0')}`).day();
      if (dow === 0 || dow === 6) {
        weekends.push(d);
      }
    }
  }

  const eventDays = new Set(registro.eventos.map((e) => e.dia));
  const blockedDays: number[] = [];
  for (let d = 1; d <= 31; d++) {
    if (weekends.includes(d) || eventDays.has(d)) {
      blockedDays.push(d);
    }
  }

  const events: EventoColumna[] = registro.eventos.map((e) => ({
    dia: e.dia,
    texto: (e.textoCeldaVertical || e.tipo).toUpperCase(),
    observation: e.descripcionObservaciones,
  }));

  const esPrimerCiclo = /^[123](?:\D|$)/.test(registro.curso.nombre.trim());

  const slots = new Map<string, number>();
  const occupied = new Set<number>(esPrimerCiclo ? [3] : []);
  for (const materia of registro.materias) {
    const column = columnaMateria(materia.nombre);
    if (column !== undefined) {
      slots.set(materia.cursoMateriaId, column);
      occupied.add(column);
    }
  }
  for (const materia of registro.materias) {
    if (slots.has(materia.cursoMateriaId)) continue;
    const column = Array.from({ length: 9 }, (_, i) => i).find(i => !occupied.has(i));
    if (column === undefined) throw new RangeError('La malla curricular excede las columnas de la planilla.');
    slots.set(materia.cursoMateriaId, column);
    occupied.add(column);
  }

  const students: StudentRecord[] = registro.alumnos.map((alu, idx) => {
    const notas = Array<string>(9).fill('');
    for (const materia of registro.materias) {
      const slot = slots.get(materia.cursoMateriaId)!;
      notas[slot] = formatearCalificacion(alu.calificacionesMaterias[materia.cursoMateriaId] || '', esPrimerCiclo);
    }

    return {
      id: alu.inscripcionId || `alu-${idx}`,
      name: alu.apellidoYNombre,
      order: alu.numeroOrden,
      withdrawalFromDay: alu.bajaDesdeDia,
      attendance: alu.marcasPorDia as StudentRecord['attendance'],
      totals: [alu.asistencias, alu.inasistencias, alu.llegadasTarde] as const,
      grades: notas,
      classroom: [1, 2, 3, 4, 5].map((k) => formatearCalificacion(alu.trabajoEnElAula[k] || '', esPrimerCiclo)),
      coexistence: [1, 2, 3, 4, 5].map((k) => formatearCalificacion(alu.convivencia[k] || '', esPrimerCiclo)),
      observation: alu.observacion || '',
    };
  });

  const dailyTotals: Record<number, number | string> = {};
  for (let d = 1; d <= 31; d++) {
    if (!blockedDays.includes(d)) {
      let presentes = 0;
      for (const alu of registro.alumnos) {
        const m = alu.marcasPorDia[d];
        if (m === 'P' || m === 'IT' || m === 'RA') {
          presentes += 1;
        }
      }
      dailyTotals[d] = presentes;
    }
  }

  const insc = registro.inscripcion;
  const edad = registro.edades;
  const nac = registro.nacionalidad;
  const asist = registro.asistenciaGeneral;

  const footer: Record<string, string | number> = {
    t1027: insc.inscriptosPrimerDia.v || '-',
    t1028: insc.inscriptosPrimerDia.m || '-',
    t1029: insc.inscriptosPrimerDia.t || '-',
    t1049: formatConteo(insc.entradosPosteriormente.otroGrado.v),
    t1050: formatConteo(insc.entradosPosteriormente.otroGrado.m),
    t1051: formatConteo(insc.entradosPosteriormente.otroGrado.t),
    t1067: formatConteo(insc.entradosPosteriormente.otraSeccion.v),
    t1068: formatConteo(insc.entradosPosteriormente.otraSeccion.m),
    t1069: formatConteo(insc.entradosPosteriormente.otraSeccion.t),
    t1079: formatConteo(insc.entradosPosteriormente.otroTurno.v),
    t1080: formatConteo(insc.entradosPosteriormente.otroTurno.m),
    t1081: formatConteo(insc.entradosPosteriormente.otroTurno.t),
    t1091: formatConteo(insc.entradosPosteriormente.otraEscuela.v),
    t1092: formatConteo(insc.entradosPosteriormente.otraEscuela.m),
    t1093: formatConteo(insc.entradosPosteriormente.otraEscuela.t),
    t1101: formatConteo(insc.salidosEnElMes.otroTurno.v),
    t1102: formatConteo(insc.salidosEnElMes.otroTurno.m),
    t1103: formatConteo(insc.salidosEnElMes.otroTurno.t),
    t1111: formatConteo(insc.salidosEnElMes.otraSeccion.v),
    t1112: formatConteo(insc.salidosEnElMes.otraSeccion.m),
    t1113: formatConteo(insc.salidosEnElMes.otraSeccion.t),
    t1119: formatConteo(insc.salidosEnElMes.otroGrado.v),
    t1120: formatConteo(insc.salidosEnElMes.otroGrado.m),
    t1121: formatConteo(insc.salidosEnElMes.otroGrado.t),
    t1135: formatConteo(insc.salidosEnElMes.otraEscuela.v),
    t1136: formatConteo(insc.salidosEnElMes.otraEscuela.m),
    t1137: formatConteo(insc.salidosEnElMes.otraEscuela.t),
    t1144: insc.quedanUltimoDia.v || '-',
    t1145: insc.quedanUltimoDia.m || '-',
    t1146: insc.quedanUltimoDia.t || '-',

    t1030: edad.filas[0]?.edad ? String(edad.filas[0].edad) : '-',
    t1031: edad.filas[0]?.v ? String(edad.filas[0].v) : '-',
    t1032: edad.filas[0]?.m ? String(edad.filas[0].m) : '-',
    t1033: edad.filas[0]?.t ? String(edad.filas[0].t) : '-',
    t1052: edad.filas[1]?.edad ? String(edad.filas[1].edad) : '-',
    t1053: edad.filas[1]?.v ? String(edad.filas[1].v) : '-',
    t1054: edad.filas[1]?.m ? String(edad.filas[1].m) : '-',
    t1055: edad.filas[1]?.t ? String(edad.filas[1].t) : '-',
    t1139: edad.total.v || '-',
    t1140: edad.total.m || '-',
    t1141: edad.total.t || '-',

    t1038: asist.totAsistencia,
    t1039: asist.porcentajeAsistencia,
    t1059: asist.totInasistencia,
    t1060: asist.porcentajeInasistencia,
    t1072: asist.asistenciaMedia,

    t1115: nac.argentinos.v || '-',
    t1116: nac.argentinos.m || '-',
    t1117: nac.argentinos.t || '-',
    t1126: nac.extranjeros.v || '-',
    t1127: nac.extranjeros.m || '-',
    t1128: nac.extranjeros.t || '-',
  };

  return {
    firstCycle: esPrimerCiclo,
    ageDistribution: { rows: edad.filas, older: edad.mayorDe },
    header: {
      month: NOMBRES_MESES[registro.mesCalendario.mes] || '',
      workingDays: registro.mesCalendario.totalDiasHabiles,
      accumulatedWorkingDays: registro.mesCalendario.diasHabilesAcumulados,
      grade: registro.curso.nombre,
      section: '"A"',
      shift: registro.curso.turno.toUpperCase(),
      year: registro.mesCalendario.ano,
    },
    students,
    dailyTotals,
    monthlyTotals: [asist.totAsistencia, asist.totInasistencia, registro.alumnos.reduce((total, alumno) => total + alumno.llegadasTarde, 0)],
    weekends,
    blockedDays,
    events,
    observations: registro.observacionesDelMes,
    footer,
  };
}
