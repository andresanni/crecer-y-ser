import dayjs from 'dayjs';
import { ClientResponseError } from 'pocketbase';
import pb from '../../../core/pocketbase';
import type { RegistroAsistenciaSnapshot } from '../models/asistenciaSnapshot.model';
import type { CambioNovedadItem } from './asistenciaDiaria.service';
import {
  type Curso,
  cursoAdapter,
} from '../../inscripciones/models/inscripcion.model';
import {
  esMateriaConducta,
  type CursoMateriaRecord,
  type EvaluacionMateriaRecord,
  type EvaluacionCriterioRecord,
  type PeriodoRecord,
} from '../../boletines/models/boletin.model';
import {
  MESES_ENTREGA_BOLETIN,
  type EventoCalendario,
  type RegistroAsistenciaCurso,
  type RegistroAsistenciaCursoRecord,
  registroAsistenciaCursoAdapter,
  mesCalendarioAdapter,
  eventoCalendarioAdapter,
  asistenciaDiariaAdapter,
} from '../models/asistencia.model';
import type {
  MateriaCalificada,
  RegistroMensualCompleto,
  ResumenAsistenciaAlumno,
} from '../models/estadisticasAsistencia.model';
import {
  calcularDistribucionEdades,
  calcularDistribucionNacionalidad,
  calcularResumenAsistenciaGeneral,
  determinarMarcaDia,
} from '../utils/asistenciaCalculos';
import {
  calcularMovimientosInscripcion,
  permaneceAlUltimoDia,
  type AlumnoMatriculaInput,
} from '../utils/matriculaCalculos';

const COLLECTION_REGISTROS = 'registros_asistencia_curso';
const COLLECTION_PERIODOS = 'periodos';
const COLLECTION_CURSO_MATERIAS = 'curso_materias';
const COLLECTION_EVALUACIONES_MATERIA = 'evaluaciones_materia';
const COLLECTION_EVALUACIONES_CRITERIOS = 'evaluaciones_criterios';

export class MesNoConfiguradoError extends Error {
  constructor(mes: number) {
    super(`No se encontró el mes calendario ${mes} para el ciclo especificado.`);
  }
}

export const registroAsistenciaCursoService = {
  async obtenerRegistroCurso(
    cursoId: string,
    mesCalendarioId: string
  ): Promise<RegistroAsistenciaCurso | null> {
    try {
      const record = await pb.collection(COLLECTION_REGISTROS).getFirstListItem<RegistroAsistenciaCursoRecord>(
        `curso_id = "${cursoId}" && mes_calendario_id = "${mesCalendarioId}"`
      );
      return registroAsistenciaCursoAdapter(record);
    } catch (error) {
      if (error instanceof ClientResponseError && error.status === 404) return null;
      throw error;
    }
  },

  async guardarCambios(registro: RegistroMensualCompleto, cambios: CambioNovedadItem[], observaciones: string): Promise<RegistroAsistenciaSnapshot> {
    return pb.send(`/api/cys/directivo/asistencias/${registro.curso.id}/${registro.mesCalendario.cicloId}/${registro.mesCalendario.mes}`, {
      method: 'PUT', body: { expectedRevision: registro.revision, expectedVersionFuentes: registro.versionFuentes, cambios, observaciones },
    });
  },

  async obtenerHojaAsistenciaCompleta(
    cursoId: string,
    cicloId: string,
    mes: number
  ): Promise<RegistroMensualCompleto> {
    let snapshot: RegistroAsistenciaSnapshot;
    try {
      snapshot = await pb.send(`/api/cys/directivo/asistencias/${cursoId}/${cicloId}/${mes}`, { method: 'GET' });
    } catch (error) {
      if (error instanceof ClientResponseError && error.status === 404) throw new MesNoConfiguradoError(mes);
      throw error;
    }
    const mesCalendario = mesCalendarioAdapter(snapshot.mes);

    const eventos = snapshot.eventos.map(eventoCalendarioAdapter);
    const eventosPorDia = new Map<number, EventoCalendario>();
    for (const ev of eventos) {
      eventosPorDia.set(ev.dia, ev);
    }

    const curso: Curso = cursoAdapter(snapshot.curso);
    const inscripcionesDelCurso = snapshot.inscripciones;

    const inscripcionesRecords = inscripcionesDelCurso.filter(inscripcion => inscripcion.cursada_estado !== 'SIN_CURSADA');

    inscripcionesRecords.sort((a, b) => {
      const ordA = a.numero_orden && a.numero_orden > 0 ? a.numero_orden : Infinity;
      const ordB = b.numero_orden && b.numero_orden > 0 ? b.numero_orden : Infinity;
      return ordA === ordB ? 0 : ordA - ordB;
    });

    const ano = mesCalendario.ano;
    const mesPad = String(mes).padStart(2, '0');
    const primerDiaMes = `${ano}-${mesPad}-01`;
    const diasEnElMes = dayjs(primerDiaMes).daysInMonth();
    const ultimoDiaMes = `${ano}-${mesPad}-${String(diasEnElMes).padStart(2, '0')}`;

    const inscripcionIds = inscripcionesRecords.map((i) => i.id);
    const novedades = snapshot.novedades.map(asistenciaDiariaAdapter);

    const novedadesMap = new Map<string, string>();
    for (const nov of novedades) {
      novedadesMap.set(`${nov.inscripcionId}_${nov.fecha}`, nov.estado);
    }

    const regCurso = snapshot.registroCurso ? registroAsistenciaCursoAdapter(snapshot.registroCurso) : null;
    const observacionesAdicionales = regCurso?.observacionesAdicionales || '';

    const numeroPeriodoBoletin = MESES_ENTREGA_BOLETIN[mes];
    let periodoIdBoletin: string | undefined;

    if (numeroPeriodoBoletin) {
      try {
        const perRecord = await pb.collection(COLLECTION_PERIODOS).getFirstListItem<PeriodoRecord>(
          `ciclo_id = "${cicloId}" && numero_periodo = ${numeroPeriodoBoletin}`
        );
        if (perRecord.ciclo_id !== cicloId || perRecord.numero_periodo !== numeroPeriodoBoletin) {
          throw new Error('El período de boletines no corresponde al ciclo y mes seleccionados.');
        }
        periodoIdBoletin = perRecord.id;
      } catch (error) {
        if (!(error instanceof ClientResponseError && error.status === 404)) throw error;
      }
    }

    const materiasCalificadas: MateriaCalificada[] = [];
    const evaluacionesPorInscripcion = new Map<string, Map<string, string>>();
    const trabajoAulaPorInscripcion = new Map<string, Map<number, string>>();
    const convivenciaPorInscripcion = new Map<string, Map<number, string>>();

    const cursoMateriasRecords = await pb.collection(COLLECTION_CURSO_MATERIAS).getFullList<CursoMateriaRecord>({
      filter: `curso_id = "${cursoId}" && ciclo_id = "${cicloId}"`,
      sort: 'orden_visual',
      expand: 'materia_id',
    });

    let cmTrabajoAulaId: string | undefined;
    let cmConvivenciaId: string | undefined;

    for (const cm of cursoMateriasRecords) {
      const nombreMat = cm.expand?.materia_id?.nombre || '';
      if (esMateriaConducta(nombreMat)) {
        const nomUpper = nombreMat.toUpperCase();
        if (nomUpper.includes('TRABAJO')) {
          cmTrabajoAulaId = cm.id;
        } else if (nomUpper.includes('CONVIVENCIA') || nomUpper.includes('CONDUCTA')) {
          cmConvivenciaId = cm.id;
        }
      } else {
        materiasCalificadas.push({
          id: cm.materia_id,
          cursoMateriaId: cm.id,
          nombre: nombreMat,
          ordenVisual: cm.orden_visual,
        });
      }
    }

    if (periodoIdBoletin) {

      if (inscripcionIds.length > 0) {
        const orInsc = inscripcionIds.map((id) => `inscripcion_id = "${id}"`).join(' || ');
        const evalRecords = await pb.collection(COLLECTION_EVALUACIONES_MATERIA).getFullList<EvaluacionMateriaRecord>({
          filter: `(${orInsc}) && periodo_id = "${periodoIdBoletin}"`,
          expand: 'calificacion_general_id',
        });

        const evalIdsConducta: string[] = [];

        for (const ev of evalRecords) {
          const inscripcionEvaluada = inscripcionesRecords.find(inscripcion => inscripcion.id === ev.inscripcion_id);
          if (inscripcionEvaluada?.cursada_estado === 'CONFIRMADA' && numeroPeriodoBoletin
            && (numeroPeriodoBoletin < (inscripcionEvaluada.bimestre_desde || 1) || numeroPeriodoBoletin > (inscripcionEvaluada.bimestre_hasta || 4))) continue;
          const etiqueta = ev.expand?.calificacion_general_id?.etiqueta || '';
          if (!evaluacionesPorInscripcion.has(ev.inscripcion_id)) {
            evaluacionesPorInscripcion.set(ev.inscripcion_id, new Map());
          }
          evaluacionesPorInscripcion.get(ev.inscripcion_id)!.set(ev.curso_materia_id, etiqueta);

          if (ev.curso_materia_id === cmTrabajoAulaId || ev.curso_materia_id === cmConvivenciaId) {
            evalIdsConducta.push(ev.id);
          }
        }

        if (evalIdsConducta.length > 0) {
          const evalConductaMap = new Map<string, EvaluacionMateriaRecord>();
          for (const ev of evalRecords) {
            evalConductaMap.set(ev.id, ev);
          }

          const orEval = evalIdsConducta.map((id) => `evaluacion_materia_id = "${id}"`).join(' || ');
          const evalCritRecords = await pb.collection(COLLECTION_EVALUACIONES_CRITERIOS).getFullList<EvaluacionCriterioRecord>({
            filter: `(${orEval})`,
            expand: 'criterio_id,valor_escala_id',
          });

          for (const ec of evalCritRecords) {
            const ev = evalConductaMap.get(ec.evaluacion_materia_id);
            if (!ev) continue;

            const orden = ec.expand?.criterio_id?.orden_visual ?? 1;
            const etiqueta = ec.expand?.valor_escala_id?.etiqueta || '';

            if (ev.curso_materia_id === cmTrabajoAulaId) {
              if (!trabajoAulaPorInscripcion.has(ev.inscripcion_id)) {
                trabajoAulaPorInscripcion.set(ev.inscripcion_id, new Map());
              }
              trabajoAulaPorInscripcion.get(ev.inscripcion_id)!.set(orden, etiqueta);
            } else if (ev.curso_materia_id === cmConvivenciaId) {
              if (!convivenciaPorInscripcion.has(ev.inscripcion_id)) {
                convivenciaPorInscripcion.set(ev.inscripcion_id, new Map());
              }
              convivenciaPorInscripcion.get(ev.inscripcion_id)!.set(orden, etiqueta);
            }
          }
        }
      }
    }

    const presentesPorDia: Record<number, number> = {};
    for (let d = 1; d <= diasEnElMes; d++) {
      presentesPorDia[d] = 0;
    }

    const novedadesAltasBajasObservaciones: string[] = [];
    const alumnosResumen: ResumenAsistenciaAlumno[] = [];
    let totAsistenciaAcumulada = 0;
    let totInasistenciaAcumulada = 0;

    for (const insc of inscripcionesRecords) {
      const alu = insc.expand?.alumno_id;
      const apellidoYNombre = alu ? `${alu.apellidos}, ${alu.nombres}` : 'Sin datos';
      const fechaNac = alu?.fecha_nacimiento || '';
      const sexo = alu?.sexo || '';
      const nacionalidad = alu?.nacionalidad || 'Argentina';

      let asistenciasAlumno = 0;
      let inasistenciasAlumno = 0;
      let llegadasTardeAlumno = 0;
      const marcasPorDia: Record<number, string> = {};

      for (let dia = 1; dia <= diasEnElMes; dia++) {
        const diaPad = String(dia).padStart(2, '0');
        const fechaDiaIso = `${ano}-${mesPad}-${diaPad}`;
        const fechaObj = dayjs(fechaDiaIso);
        const dayOfWeek = fechaObj.day();
        const esFinDeSemana = dayOfWeek === 0 || dayOfWeek === 6;
        const eventoDelDia = eventosPorDia.get(dia);
        const esDiaHabil = !esFinDeSemana && !eventoDelDia;

        const novedad = novedadesMap.get(`${insc.id}_${fechaDiaIso}`);
        const marca = determinarMarcaDia(
          fechaDiaIso,
          insc.fecha_ingreso,
          insc.fecha_egreso,
          insc.estado,
          novedad,
          esDiaHabil
        );

        marcasPorDia[dia] = marca;

        if (esDiaHabil) {
          if (marca === 'P' || marca === 'IT' || marca === 'RA') {
            asistenciasAlumno += 1;
            presentesPorDia[dia] = (presentesPorDia[dia] || 0) + 1;
          } else if (marca === 'A' || marca === 'J' || marca === 'E') {
            inasistenciasAlumno += 1;
          }

          if (marca === 'IT') {
            llegadasTardeAlumno += 1;
          }
        }
      }

      totAsistenciaAcumulada += asistenciasAlumno;
      totInasistenciaAcumulada += inasistenciasAlumno;

      const obsPartes: string[] = [];
      const resolucion = insc.resolucion_apoyo?.trim() || '';
      if (resolucion) {
        obsPartes.push(resolucion);
      }

      const fechaIngresoCorta = insc.fecha_ingreso ? insc.fecha_ingreso.slice(0, 10) : '';
      if (fechaIngresoCorta && fechaIngresoCorta >= primerDiaMes && fechaIngresoCorta <= ultimoDiaMes) {
        const diaIngreso = dayjs(fechaIngresoCorta).date();
        const etiquetaAlta = `ALTA ${diaIngreso}/${mes}`;
        obsPartes.push(etiquetaAlta);
        novedadesAltasBajasObservaciones.push(`${diaIngreso}. Alta : ${apellidoYNombre}`);
      }

      const fechaEgresoCorta = insc.fecha_egreso ? insc.fecha_egreso.slice(0, 10) : '';
      if (insc.estado === 'Baja' && fechaEgresoCorta && fechaEgresoCorta >= primerDiaMes && fechaEgresoCorta <= ultimoDiaMes) {
        const diaEgreso = dayjs(fechaEgresoCorta).date();
        const etiquetaBaja = `BAJA ${diaEgreso}/${mes}`;
        obsPartes.push(etiquetaBaja);
        novedadesAltasBajasObservaciones.push(`${diaEgreso}. Baja : ${apellidoYNombre}`);
      }

      const califsMateria: Record<string, string> = {};
      const evalMap = evaluacionesPorInscripcion.get(insc.id);
      if (evalMap) {
        for (const mat of materiasCalificadas) {
          califsMateria[mat.cursoMateriaId] = evalMap.get(mat.cursoMateriaId) || '';
        }
      }

      const trabAulaMap = trabajoAulaPorInscripcion.get(insc.id);
      const trabajoEnElAula: Record<number, string> = {};
      for (let i = 1; i <= 5; i++) {
        trabajoEnElAula[i] = trabAulaMap?.get(i) || '';
      }

      const convMap = convivenciaPorInscripcion.get(insc.id);
      const convivencia: Record<number, string> = {};
      for (let i = 1; i <= 5; i++) {
        convivencia[i] = convMap?.get(i) || '';
      }

      alumnosResumen.push({
        inscripcionId: insc.id,
        alumnoId: alu?.id || '',
        numeroOrden: insc.numero_orden && insc.numero_orden > 0 ? insc.numero_orden : null,
        apellidoYNombre,
        sexo,
        nacionalidad,
        fechaNacimiento: fechaNac,
        fechaIngreso: fechaIngresoCorta,
        fechaEgreso: fechaEgresoCorta,
        bajaDesdeDia: insc.estado === 'Baja' && fechaEgresoCorta && fechaEgresoCorta < ultimoDiaMes
          ? fechaEgresoCorta < primerDiaMes ? 1 : dayjs(fechaEgresoCorta).date() + 1
          : undefined,
        asistencias: asistenciasAlumno,
        inasistencias: inasistenciasAlumno,
        llegadasTarde: llegadasTardeAlumno,
        marcasPorDia,
        observacion: obsPartes.join(' - '),
        calificacionesMaterias: califsMateria,
        trabajoEnElAula,
        convivencia,
      });
    }

    const matriculaInputs: AlumnoMatriculaInput[] = inscripcionesRecords.map((i) => ({
      inscripcionId: i.id,
      sexo: i.expand?.alumno_id?.sexo || '',
      fechaIngreso: i.fecha_ingreso,
      fechaEgreso: i.fecha_egreso,
      estado: i.estado,
      procedenciaIngreso: i.procedencia_ingreso,
      destinoEgreso: i.destino_egreso,
    }));

    const inscripcion = calcularMovimientosInscripcion(matriculaInputs, ano, mes);

    const alumnosEstadisticas = inscripcionesRecords
      .filter((i) => permaneceAlUltimoDia({ fechaIngreso: i.fecha_ingreso, fechaEgreso: i.fecha_egreso, estado: i.estado }, ultimoDiaMes))
      .map((i) => ({
        fechaNacimiento: i.expand?.alumno_id?.fecha_nacimiento,
        nacionalidad: i.expand?.alumno_id?.nacionalidad,
        sexo: i.expand?.alumno_id?.sexo,
      }));

    const edades = calcularDistribucionEdades(alumnosEstadisticas, ano, mes);
    const nacionalidad = calcularDistribucionNacionalidad(alumnosEstadisticas);
    const asistenciaGeneral = calcularResumenAsistenciaGeneral(
      totAsistenciaAcumulada,
      totInasistenciaAcumulada,
      mesCalendario.totalDiasHabiles,
      presentesPorDia
    );

    const observacionesDelMes: string[] = [];
    for (const ev of eventos) {
      if (ev.tipo !== 'SIN_CLASES' && ev.descripcionObservaciones) {
        observacionesDelMes.push(/^\s*\d/.test(ev.descripcionObservaciones) ? ev.descripcionObservaciones : `${ev.dia}. ${ev.descripcionObservaciones}`);
      }
    }
    observacionesDelMes.push(...novedadesAltasBajasObservaciones);
    if (observacionesAdicionales.trim()) {
      observacionesDelMes.push(observacionesAdicionales.trim());
    }

    return {
      revision: snapshot.revision,
      versionFuentes: snapshot.versionFuentes,
      mesCalendario,
      curso,
      materias: materiasCalificadas,
      eventos,
      alumnos: alumnosResumen,
      inscripcion,
      edades,
      nacionalidad,
      asistenciaGeneral,
      observacionesDelMes,
      observacionesAdicionales,
    };
  },
};
