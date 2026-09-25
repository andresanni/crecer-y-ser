import pb from '../../../core/pocketbase';
import { ClientResponseError } from 'pocketbase';
import {
  cursoAdapter,
  type Curso,
  type CursoRecord,
} from '../../inscripciones/models/inscripcion.model';
import {
  materiaAdapter,
  periodoAdapter,
  cursoMateriaAdapter,
  criterioEvaluacionAdapter,
  escalaCalificacionAdapter,
  valorEscalaAdapter,
  cierrePeriodoAlumnoAdapter,
  type Materia,
  type MateriaRecord,
  type Periodo,
  type PeriodoRecord,
  type CursoMateria,
  type CursoMateriaRecord,
  type CriterioEvaluacion,
  type CriterioEvaluacionRecord,
  type CriterioFormItem,
  type EscalaCalificacion,
  type EscalaCalificacionRecord,
  type ValorEscala,
  type ValorEscalaRecord,
  type EvaluacionMateriaRecord,
  type EvaluacionCriterioRecord,
  type CierrePeriodoAlumno,
  type CierrePeriodoAlumnoRecord,
  type AlumnoInscriptoRow,
  type ProgresoAlumnoDetalle,
  type ProgresoCursoResumen,
  type EstadoProgresoAlumno,
  type EstadoMonitoreoCurso,
  type EtapaBoletinCurso,
  type CursoMonitoreoResumen,
  type MonitoreoInstitucionalData,
  type TokenAccesoDocente,
  type ProgresoConstructorCurso,
  esMateriaConducta,
} from '../models/boletin.model';
import type { AlumnoRecord } from '../../alumnos/models/alumno.model';
import { extractGradeNumber, compareGrados } from '../../alumnos/utils/gradeColors';
import { accesoDocenteService } from './accesoDocente.service';

const COLLECTION_CURSOS = 'cursos';
const COLLECTION_MATERIAS = 'materias';
const COLLECTION_PERIODOS = 'periodos';
const COLLECTION_CURSO_MATERIAS = 'curso_materias';
const COLLECTION_CRITERIOS = 'criterios_evaluacion';
const COLLECTION_ESCALAS = 'escalas_calificacion';
const COLLECTION_VALORES_ESCALA = 'valores_escala';
const COLLECTION_EVALUACIONES_MATERIA = 'evaluaciones_materia';
const COLLECTION_EVALUACIONES_CRITERIOS = 'evaluaciones_criterios';
const COLLECTION_CIERRES_PERIODO = 'cierres_periodo_alumno';
const COLLECTION_INSCRIPCIONES = 'inscripciones';

const isNotFoundResponse = (error: unknown) => (
  error instanceof ClientResponseError && error.status === 404
);

export const boletinService = {

  getConfigurationStatus: async (cursoId: string, cicloId: string): Promise<{ editable: boolean }> => (
    pb.send<{ editable: boolean }>(
      `/api/cys/directivo/configuracion/estado/${cursoId}/${cicloId}`,
      { requestKey: null },
    )
  ),



  getCursos: async (): Promise<Curso[]> => {
    const records = await pb.collection(COLLECTION_CURSOS).getFullList<CursoRecord>({
      expand: 'nivel_id',
      sort: 'nombre',
    });
    return records.map(cursoAdapter);
  },




  getEscalasCalificacion: async (): Promise<EscalaCalificacion[]> => {
    const records = await pb.collection(COLLECTION_ESCALAS).getFullList<EscalaCalificacionRecord>({
      sort: 'nombre',
    });
    return records.map(escalaCalificacionAdapter);
  },

  getValoresByEscala: async (escalaId: string): Promise<ValorEscala[]> => {
    const records = await pb.collection(COLLECTION_VALORES_ESCALA).getFullList<ValorEscalaRecord>({
      filter: `escala_id = "${escalaId}"`,
      sort: 'orden_visual',
    });
    return records.map(valorEscalaAdapter);
  },




  getAllMaterias: async (): Promise<Materia[]> => {
    const records = await pb.collection(COLLECTION_MATERIAS).getFullList<MateriaRecord>({
      sort: 'nombre',
    });
    return records.map(materiaAdapter);
  },

  createMateria: async (nombre: string): Promise<Materia> => {
    const record = await pb.collection(COLLECTION_MATERIAS).create<MateriaRecord>({
      nombre: nombre.trim(),
    });
    return materiaAdapter(record);
  },




  getMateriasByCurso: async (cursoId: string, cicloId: string): Promise<CursoMateria[]> => {
    const records = await pb.collection(COLLECTION_CURSO_MATERIAS).getFullList<CursoMateriaRecord>({
      filter: `curso_id = "${cursoId}" && ciclo_id = "${cicloId}"`,
      expand: 'materia_id,curso_id',
      sort: 'orden_visual',
    });
    return records.map(cursoMateriaAdapter);
  },

  assignMateriaToCurso: async (
    cursoId: string,
    cicloId: string,
    materiaId: string,
    ordenVisual: number
  ): Promise<CursoMateria> => {
    const record = await pb.send<{
      id: string;
      cursoId: string;
      cicloId: string;
      materiaId: string;
      materiaNombre: string;
      ordenVisual: number;
    }>('/api/cys/directivo/configuracion/materias', {
      method: 'POST',
      body: { cursoId, cicloId, materiaId, ordenVisual },
    });
    return { ...record, createdAt: '', updatedAt: '' };
  },

  removeMateriaFromCurso: async (cursoMateriaId: string): Promise<boolean> => {
    await pb.send(`/api/cys/directivo/configuracion/materias/${cursoMateriaId}`, { method: 'DELETE' });
    return true;
  },

  updateCursoMateriasOrder: async (items: { id: string; orden_visual: number }[]): Promise<void> => {
    await pb.send('/api/cys/directivo/configuracion/materias/orden', {
      method: 'PUT',
      body: { items },
    });
  },




  getCriteriosByCursoMateria: async (cursoMateriaId: string): Promise<CriterioEvaluacion[]> => {
    const records = await pb.collection(COLLECTION_CRITERIOS).getFullList<CriterioEvaluacionRecord>({
      filter: `curso_materia_id = "${cursoMateriaId}"`,
      sort: 'orden_visual',
    });
    return records.map(criterioEvaluacionAdapter);
  },

  saveCriteriosForCursoMateria: async (
    cursoMateriaId: string,
    criterios: CriterioFormItem[]
  ): Promise<CriterioEvaluacion[]> => {
    const response = await pb.send<{ criterios: Array<{
      id: string;
      cursoMateriaId: string;
      nombre: string;
      ordenVisual: number;
    }> }>(`/api/cys/directivo/configuracion/materias/${cursoMateriaId}/criterios`, {
      method: 'PUT',
      body: { criterios: criterios.filter((item) => item.nombre.trim()) },
    });
    return response.criterios.map((item) => ({ ...item, createdAt: '', updatedAt: '' }));
  },




  getPeriodosByCiclo: async (cicloId: string): Promise<Periodo[]> => {
    const records = await pb.collection(COLLECTION_PERIODOS).getFullList<PeriodoRecord>({
      filter: `ciclo_id = "${cicloId}"`,
      sort: 'numero_periodo',
      expand: 'ciclo_id',
    });
    return records.map(periodoAdapter);
  },

  getPeriodoById: async (periodoId: string): Promise<Periodo> => {
    const record = await pb.collection(COLLECTION_PERIODOS).getOne<PeriodoRecord>(periodoId);
    return periodoAdapter(record);
  },

  createPeriodo: async (
    cicloId: string,
    nombre: string,
    numeroPeriodo: number
  ): Promise<Periodo> => {
    const record = await pb.collection(COLLECTION_PERIODOS).create<PeriodoRecord>(
      {
        ciclo_id: cicloId,
        nombre: nombre.trim(),
        numero_periodo: numeroPeriodo,
      },
      {
        expand: 'ciclo_id',
      }
    );
    return periodoAdapter(record);
  },

  initDefaultPeriodos: async (cicloId: string): Promise<Periodo[]> => {
    const existentes = await boletinService.getPeriodosByCiclo(cicloId);
    const existingNums = new Set(existentes.map((p) => p.numeroPeriodo));

    const bimestresDefault = [
      { numero: 1, nombre: '1° Bimestre' },
      { numero: 2, nombre: '2° Bimestre' },
      { numero: 3, nombre: '3° Bimestre' },
      { numero: 4, nombre: '4° Bimestre' },
    ];

    for (const b of bimestresDefault) {
      if (!existingNums.has(b.numero)) {
        await pb.collection(COLLECTION_PERIODOS).create({
          ciclo_id: cicloId,
          nombre: b.nombre,
          numero_periodo: b.numero,
        });
      }
    }

    return boletinService.getPeriodosByCiclo(cicloId);
  },




  getCierrePeriodoAlumno: async (
    inscripcionId: string,
    periodoId: string
  ): Promise<CierrePeriodoAlumno | null> => {
    try {
      const record = await pb
        .collection(COLLECTION_CIERRES_PERIODO)
        .getFirstListItem<CierrePeriodoAlumnoRecord>(
          `inscripcion_id = "${inscripcionId}" && periodo_id = "${periodoId}"`,
          {
            expand: 'periodo_id',
          }
        );
      return cierrePeriodoAlumnoAdapter(record);
    } catch (error) {
      if (isNotFoundResponse(error)) return null;
      throw error;
    }
  },

  getAlumnosByCursoCiclo: async (
    cursoId: string,
    cicloId: string,
  ): Promise<AlumnoInscriptoRow[]> => {
    interface InscripcionRaw {
      id: string;
      alumno_id: string;
      numero_orden?: number;
      estado: string;
      promociono_con_acompanamiento?: string;
      posee_apoyos?: string;
      cuales_apoyos?: string;
      expand?: {
        alumno_id?: AlumnoRecord;
      };
    }

    const records = await pb.collection(COLLECTION_INSCRIPCIONES).getFullList<InscripcionRaw>({
      filter: `curso_id = "${cursoId}" && ciclo_id = "${cicloId}"`,
      expand: 'alumno_id',
    });

    const mapped: AlumnoInscriptoRow[] = records.map((r) => {
      const alu = r.expand?.alumno_id;
      const apellidos = alu?.apellidos || '';
      const nombres = alu?.nombres || '';
      const nombreCompleto = `${apellidos}, ${nombres}`.trim() || 'Estudiante sin nombre';

      return {
        inscripcionId: r.id,
        alumnoId: r.alumno_id,
        numeroOrden: r.numero_orden ?? null,
        numeroLegajo: alu?.numero_legajo || '',
        dni: alu?.dni || '',
        apellidos,
        nombres,
        nombreCompleto,
        estado: r.estado,
        promocionoConAcompanamiento: r.promociono_con_acompanamiento || '-',
        poseeApoyos: r.posee_apoyos || '-',
        cualesApoyos: r.cuales_apoyos || '',
      };
    });


    return mapped.sort((a, b) => {
      if (a.numeroOrden !== null && b.numeroOrden !== null) {
        if (a.numeroOrden !== b.numeroOrden) {
          return a.numeroOrden - b.numeroOrden;
        }
      } else if (a.numeroOrden !== null) {
        return -1;
      } else if (b.numeroOrden !== null) {
        return 1;
      }
      return a.nombreCompleto.localeCompare(b.nombreCompleto, 'es', { sensitivity: 'base' });
    });
  },






  getEvaluacionesByInscripcionAndPeriodo: async (
    inscripcionId: string,
    periodoId: string
  ): Promise<
    Record<
      string,
      {
        evaluacionMateriaId: string;
        ppi: boolean;
        calificacionGeneralId: string | null;
        criteriosValores: Record<string, string>;
      }
    >
  > => {
    const evalRecords = await pb
      .collection(COLLECTION_EVALUACIONES_MATERIA)
      .getFullList<EvaluacionMateriaRecord>({
        filter: `inscripcion_id = "${inscripcionId}" && periodo_id = "${periodoId}"`,
      });

    if (evalRecords.length === 0) return {};

    const evalMap: Record<
      string,
      {
        evaluacionMateriaId: string;
        ppi: boolean;
        calificacionGeneralId: string | null;
        criteriosValores: Record<string, string>;
      }
    > = {};

    const evalIds = evalRecords.map((e) => e.id);
    for (const e of evalRecords) {
      evalMap[e.curso_materia_id] = {
        evaluacionMateriaId: e.id,
        ppi: Boolean(e.ppi),
        calificacionGeneralId: e.calificacion_general_id || null,
        criteriosValores: {},
      };
    }

    const idFilter = evalIds.map((id) => `evaluacion_materia_id = "${id}"`).join(' || ');
    if (idFilter) {
      const critRecords = await pb
        .collection(COLLECTION_EVALUACIONES_CRITERIOS)
        .getFullList<EvaluacionCriterioRecord>({
          filter: idFilter,
        });

      for (const cr of critRecords) {
        const parentEval = evalRecords.find((e) => e.id === cr.evaluacion_materia_id);
        if (parentEval && evalMap[parentEval.curso_materia_id]) {
          evalMap[parentEval.curso_materia_id].criteriosValores[cr.criterio_id] =
            cr.valor_escala_id;
        }
      }
    }

    return evalMap;
  },

  getCriteriosByCursoMateriasBatch: async (
    cursoMateriaIds: string[]
  ): Promise<Record<string, CriterioEvaluacion[]>> => {
    if (cursoMateriaIds.length === 0) return {};

    const filterStr = cursoMateriaIds.map((id) => `curso_materia_id = "${id}"`).join(' || ');
    const records = await pb
      .collection(COLLECTION_CRITERIOS)
      .getFullList<CriterioEvaluacionRecord>({
        filter: filterStr,
      });

    const map: Record<string, CriterioEvaluacion[]> = {};
    for (const cmId of cursoMateriaIds) {
      map[cmId] = [];
    }

    for (const r of records) {
      if (!map[r.curso_materia_id]) {
        map[r.curso_materia_id] = [];
      }
      map[r.curso_materia_id].push(criterioEvaluacionAdapter(r));
    }


    for (const cmId of Object.keys(map)) {
      map[cmId].sort((a, b) => (a.ordenVisual ?? 0) - (b.ordenVisual ?? 0));
    }

    return map;
  },

  getProgresoCursoPeriodo: async (
    alumnos: AlumnoInscriptoRow[],
    cursoMaterias: CursoMateria[],
    criteriosMap: Record<string, CriterioEvaluacion[]>,
    periodoId: string
  ): Promise<{
    alumnosProgreso: Record<string, ProgresoAlumnoDetalle>;
    resumen: ProgresoCursoResumen;
  }> => {
    if (alumnos.length === 0 || cursoMaterias.length === 0 || !periodoId) {
      return {
        alumnosProgreso: {},
        resumen: {
          totalAlumnos: alumnos.length,
          completadosCount: 0,
          enProgresoCount: 0,
          sinIniciarCount: alumnos.length,
          porcentajeGlobal: 0,
        },
      };
    }

    try {

      const evalRecords = await pb
        .collection(COLLECTION_EVALUACIONES_MATERIA)
        .getFullList<EvaluacionMateriaRecord>({
          filter: `periodo_id = "${periodoId}"`,
        });


      const evalIds = evalRecords.map((e) => e.id);
      const critCountMap: Record<string, number> = {};

      if (evalIds.length > 0) {
        const chunkSize = 35;
        for (let i = 0; i < evalIds.length; i += chunkSize) {
          const chunk = evalIds.slice(i, i + chunkSize);
          const idFilter = chunk.map((id) => `evaluacion_materia_id = "${id}"`).join(' || ');
          const critRecords = await pb
            .collection(COLLECTION_EVALUACIONES_CRITERIOS)
            .getFullList<EvaluacionCriterioRecord>({
              filter: idFilter,
            });

          for (const cr of critRecords) {
            critCountMap[cr.evaluacion_materia_id] =
              (critCountMap[cr.evaluacion_materia_id] || 0) + 1;
          }
        }
      }


      const cierreRecords = await pb
        .collection(COLLECTION_CIERRES_PERIODO)
        .getFullList<CierrePeriodoAlumnoRecord>({
          filter: `periodo_id = "${periodoId}"`,
        });

      const cierresMap: Record<string, boolean> = {};
      for (const c of cierreRecords) {
        cierresMap[c.inscripcion_id] = true;
      }


      const evalStructureMap: Record<
        string,
        Record<
          string,
          {
            calificacionGeneralId: string | null;
            ppi: boolean;
            criteriosCargados: number;
          }
        >
      > = {};

      for (const e of evalRecords) {
        if (!evalStructureMap[e.inscripcion_id]) {
          evalStructureMap[e.inscripcion_id] = {};
        }
        evalStructureMap[e.inscripcion_id][e.curso_materia_id] = {
          calificacionGeneralId: e.calificacion_general_id || null,
          ppi: Boolean(e.ppi),
          criteriosCargados: critCountMap[e.id] || 0,
        };
      }


      const alumnosProgreso: Record<string, ProgresoAlumnoDetalle> = {};
      let completadosCount = 0;
      let enProgresoCount = 0;
      let sinIniciarCount = 0;
      let sumaPorcentajes = 0;

      for (const alu of alumnos) {
        const inscId = alu.inscripcionId;
        const aluEvals = evalStructureMap[inscId] || {};
        const tieneAsistencia = Boolean(cierresMap[inscId]);

        let materiasCompletadas = 0;
        const materiasDetalle = cursoMaterias.map((cm) => {
          const mat = aluEvals[cm.id];
          const critsTotal = (criteriosMap[cm.id] || []).length;
          const criteriosEvaluados = mat?.criteriosCargados || 0;
          const hasCalGral = Boolean(mat?.calificacionGeneralId);
          const hasAllCrits = critsTotal === 0 || criteriosEvaluados >= critsTotal;
          const completada = esMateriaConducta(cm.materiaNombre)
            ? hasAllCrits
            : hasCalGral && hasAllCrits;

          if (completada) {
            materiasCompletadas++;
          }

          return {
            cursoMateriaId: cm.id,
            materiaNombre: cm.materiaNombre,
            completada,
            ppi: mat?.ppi ?? false,
            calificacionGeneralId: mat?.calificacionGeneralId || null,
            criteriosEvaluados,
            criteriosTotal: critsTotal,
          };
        });

        const totalMaterias = cursoMaterias.length;
        const porcentaje =
          totalMaterias > 0
            ? Math.round((materiasCompletadas / totalMaterias) * 100)
            : 0;

        let estado: EstadoProgresoAlumno = 'SIN_INICIAR';
        if (materiasCompletadas === totalMaterias && tieneAsistencia) {
          estado = 'COMPLETO';
          completadosCount++;
        } else if (materiasCompletadas > 0 || tieneAsistencia) {
          estado = 'EN_PROGRESO';
          enProgresoCount++;
        } else {
          sinIniciarCount++;
        }

        sumaPorcentajes += porcentaje;

        alumnosProgreso[inscId] = {
          inscripcionId: inscId,
          alumnoId: alu.alumnoId,
          numeroOrden: alu.numeroOrden,
          nombreCompleto: alu.nombreCompleto,
          totalMaterias,
          materiasCompletadas,
          tieneAsistencia,
          porcentaje,
          estado,
          materiasDetalle,
        };
      }

      const totalAlumnos = alumnos.length;
      const porcentajeGlobal =
        totalAlumnos > 0 ? Math.round(sumaPorcentajes / totalAlumnos) : 0;

      return {
        alumnosProgreso,
        resumen: {
          totalAlumnos,
          completadosCount,
          enProgresoCount,
          sinIniciarCount,
          porcentajeGlobal,
        },
      };
    } catch (err) {
      console.error('[boletinService.getProgresoCursoPeriodo] Error:', err);
      return {
        alumnosProgreso: {},
        resumen: {
          totalAlumnos: alumnos.length,
          completadosCount: 0,
          enProgresoCount: 0,
          sinIniciarCount: alumnos.length,
          porcentajeGlobal: 0,
        },
      };
    }
  },




  getMonitoreoInstitucional: async (
    periodoId: string
  ): Promise<MonitoreoInstitucionalData> => {
    if (!periodoId) {
      return {
        cursosCompletosCount: 0,
        cursosEnProgresoCount: 0,
        cursosPausadosCount: 0,
        cursosSinIniciarCount: 0,
        cursosSinTokenCount: 0,
        cursos: [],
      };
    }

    try {
      const periodo = await boletinService.getPeriodoById(periodoId);

      const cursosRecords = await pb.collection(COLLECTION_CURSOS).getFullList<CursoRecord>({
        sort: 'nombre',
      });
      const cursos = cursosRecords.map(cursoAdapter);


      cursos.sort((a, b) => compareGrados(a.nombre, b.nombre));


      const inscripcionesRecords = await pb.collection(COLLECTION_INSCRIPCIONES).getFullList<{
        id: string;
        curso_id: string;
        alumno_id: string;
        estado: string;
      }>({
        filter: `ciclo_id = "${periodo.cicloId}" && estado != "Baja"`,
      });


      const cursoInscripcionesMap: Record<string, string[]> = {};
      for (const cur of cursos) {
        cursoInscripcionesMap[cur.id] = [];
      }
      for (const insc of inscripcionesRecords) {
        if (cursoInscripcionesMap[insc.curso_id]) {
          cursoInscripcionesMap[insc.curso_id].push(insc.id);
        }
      }


      const cmRecords = await pb.collection(COLLECTION_CURSO_MATERIAS).getFullList<CursoMateriaRecord>({
        filter: `ciclo_id = "${periodo.cicloId}"`,
        expand: 'materia_id',
      });
      const cursoMateriasMap: Record<string, CursoMateria[]> = {};
      const cmMateriaNombreMap: Record<string, string> = {};
      for (const cur of cursos) {
        cursoMateriasMap[cur.id] = [];
      }
      for (const cm of cmRecords) {
        cmMateriaNombreMap[cm.id] = cm.expand?.materia_id?.nombre || '';
        if (cursoMateriasMap[cm.curso_id]) {
          cursoMateriasMap[cm.curso_id].push(cursoMateriaAdapter(cm));
        }
      }


      const critRecords = await pb.collection(COLLECTION_CRITERIOS).getFullList<CriterioEvaluacionRecord>();
      const criteriosMap: Record<string, number> = {};
      for (const cr of critRecords) {
        criteriosMap[cr.curso_materia_id] = (criteriosMap[cr.curso_materia_id] || 0) + 1;
      }


      const [tokenRecords, stageResponse] = await Promise.all([
        accesoDocenteService.list(undefined, periodoId),
        pb.send<{ cursos: Array<{
          cursoId: string;
          etapa: EtapaBoletinCurso;
          visados: number;
          totalBoletines: number;
        }> }>(`/api/cys/directivo/etapas/${periodoId}`, { requestKey: null }),
      ]);
      const tokens = tokenRecords;
      const stagesByCourse = new Map(stageResponse.cursos.map((stage) => [stage.cursoId, stage]));

      const tokensCursoMap: Record<string, TokenAccesoDocente> = {};
      for (const t of tokens) {
        if (t.cursoId && !tokensCursoMap[t.cursoId]) {
          tokensCursoMap[t.cursoId] = t;
        }
      }


      const evalRecords = await pb.collection(COLLECTION_EVALUACIONES_MATERIA).getFullList<EvaluacionMateriaRecord>({
        filter: `periodo_id = "${periodoId}"`,
      });

      const evalIds = evalRecords.map((e) => e.id);
      const critEvaluadosMap: Record<string, number> = {};

      if (evalIds.length > 0) {
        const chunkSize = 40;
        for (let i = 0; i < evalIds.length; i += chunkSize) {
          const chunk = evalIds.slice(i, i + chunkSize);
          const idFilter = chunk.map((id) => `evaluacion_materia_id = "${id}"`).join(' || ');
          const evalCritRecords = await pb.collection(COLLECTION_EVALUACIONES_CRITERIOS).getFullList<EvaluacionCriterioRecord>({
            filter: idFilter,
          });
          for (const ec of evalCritRecords) {
            critEvaluadosMap[ec.evaluacion_materia_id] = (critEvaluadosMap[ec.evaluacion_materia_id] || 0) + 1;
          }
        }
      }

      const evalAlumnoMateriaMap: Record<string, Record<string, boolean>> = {};
      for (const e of evalRecords) {
        if (!evalAlumnoMateriaMap[e.inscripcion_id]) {
          evalAlumnoMateriaMap[e.inscripcion_id] = {};
        }
        const totalCrits = criteriosMap[e.curso_materia_id] || 0;
        const evaluados = critEvaluadosMap[e.id] || 0;
        const matNombre = cmMateriaNombreMap[e.curso_materia_id];
        const esConducta = esMateriaConducta(matNombre);
        const hasCalGral = Boolean(e.calificacion_general_id);
        const hasAllCrits = totalCrits === 0 || evaluados >= totalCrits;
        evalAlumnoMateriaMap[e.inscripcion_id][e.curso_materia_id] = esConducta
          ? hasAllCrits
          : (hasCalGral && hasAllCrits);
      }


      const cierreRecords = await pb.collection(COLLECTION_CIERRES_PERIODO).getFullList<CierrePeriodoAlumnoRecord>({
        filter: `periodo_id = "${periodoId}"`,
      });
      const cierresMap: Record<string, boolean> = {};
      for (const c of cierreRecords) {
        cierresMap[c.inscripcion_id] = true;
      }


      let cursosCompletosCount = 0;
      let cursosEnProgresoCount = 0;
      let cursosPausadosCount = 0;
      let cursosSinIniciarCount = 0;
      let cursosSinTokenCount = 0;

      const cursosResumen: CursoMonitoreoResumen[] = [];

      for (const cur of cursos) {
        const inscIds = cursoInscripcionesMap[cur.id] || [];
        const totalAlumnosCurso = inscIds.length;
        const materiasCurso = cursoMateriasMap[cur.id] || [];
        const totalMateriasCurso = materiasCurso.length;
        const tokenGeneral = tokensCursoMap[cur.id];
        const stage = stagesByCourse.get(cur.id);
        if (!stage) throw new Error(`Falta la etapa del curso ${cur.id}`);
        const entregado = stage.etapa === 'REVISION_DIRECTIVA' || stage.etapa === 'LISTO_PARA_PDF';

        let alumnosCompletosCurso = 0;
        let alumnosEnProgresoCurso = 0;
        let alumnosSinIniciarCurso = 0;

        for (const inscId of inscIds) {
          const aluMats = evalAlumnoMateriaMap[inscId] || {};
          const tieneAsistencia = Boolean(cierresMap[inscId]);

          let matsCompletas = 0;
          for (const cm of materiasCurso) {
            if (aluMats[cm.id]) {
              matsCompletas++;
            }
          }

          if (totalMateriasCurso > 0 && matsCompletas === totalMateriasCurso && tieneAsistencia) {
            alumnosCompletosCurso++;
          } else if (matsCompletas > 0 || tieneAsistencia) {
            alumnosEnProgresoCurso++;
          } else {
            alumnosSinIniciarCurso++;
          }
        }

        const porcentajeCurso = totalAlumnosCurso > 0
          ? Math.round((alumnosCompletosCurso / totalAlumnosCurso) * 100)
          : 0;

        let estado: EstadoMonitoreoCurso = 'SIN_INICIAR';
        if (entregado) {
          estado = 'COMPLETO';
          cursosCompletosCount++;
        } else if (stage.etapa === 'CARGA_PAUSADA') {
          estado = 'PAUSADO';
          cursosPausadosCount++;
        } else if (stage.etapa === 'CARGA_DOCENTE') {
          estado = 'EN_PROGRESO';
          cursosEnProgresoCount++;
        } else if (stage.etapa === 'PENDIENTE_EMISION') {
          estado = 'SIN_ENLACE';
          cursosSinTokenCount++;
          cursosSinIniciarCount++;
        } else {
          estado = 'SIN_INICIAR';
          cursosSinIniciarCount++;
        }

        cursosResumen.push({
          cursoId: cur.id,
          cursoNombre: cur.nombre,
          gradoNumero: extractGradeNumber(cur.nombre),
          totalAlumnos: totalAlumnosCurso,
          alumnosCompletos: alumnosCompletosCurso,
          alumnosEnProgreso: alumnosEnProgresoCurso,
          alumnosSinIniciar: alumnosSinIniciarCurso,
          porcentaje: porcentajeCurso,
          estado,
          etapa: stage.etapa,
          visados: stage.visados,
          totalBoletines: stage.totalBoletines,
          entregado,
          tokenDocente: tokenGeneral,
        });
      }

      return {
        cursosCompletosCount,
        cursosEnProgresoCount,
        cursosPausadosCount,
        cursosSinIniciarCount,
        cursosSinTokenCount,
        cursos: cursosResumen,
      };
    } catch (err) {
      console.error('[boletinService.getMonitoreoInstitucional] Error:', err);
      throw err;
    }
  },
  getProgresoConstructorCursos: async (cicloId: string): Promise<Record<string, ProgresoConstructorCurso>> => {
    try {
      const [cursoMaterias, criterios] = await Promise.all([
        pb.collection(COLLECTION_CURSO_MATERIAS).getFullList<CursoMateriaRecord>({
          filter: `ciclo_id = "${cicloId}"`,
          fields: 'id,curso_id,materia_id',
        }),
        pb.collection(COLLECTION_CRITERIOS).getFullList<CriterioEvaluacionRecord>({
          fields: 'id,curso_materia_id',
        }),
      ]);


      const critsPorCm: Record<string, number> = {};
      for (const crit of criterios) {
        critsPorCm[crit.curso_materia_id] = (critsPorCm[crit.curso_materia_id] || 0) + 1;
      }


      const cmsPorCurso: Record<string, CursoMateriaRecord[]> = {};
      for (const cm of cursoMaterias) {
        if (!cmsPorCurso[cm.curso_id]) {
          cmsPorCurso[cm.curso_id] = [];
        }
        cmsPorCurso[cm.curso_id].push(cm);
      }

      const progresoMap: Record<string, ProgresoConstructorCurso> = {};
      for (const [cursoId, cms] of Object.entries(cmsPorCurso)) {
        const totalMaterias = cms.length;
        let materiasCompletas = 0;
        let criteriosConfigurados = 0;

        for (const cm of cms) {
          const critsCount = critsPorCm[cm.id] || 0;
          criteriosConfigurados += critsCount;
          if (critsCount >= 5) {
            materiasCompletas++;
          }
        }

        const criteriosTotalEsperado = totalMaterias * 5;
        const porcentaje =
          totalMaterias > 0 ? Math.round((materiasCompletas / totalMaterias) * 100) : 0;

        let estado: 'COMPLETO' | 'EN_PROGRESO' | 'SIN_CRITERIOS' | 'VACIO' = 'VACIO';
        if (totalMaterias > 0) {
          if (materiasCompletas === totalMaterias) {
            estado = 'COMPLETO';
          } else if (criteriosConfigurados > 0) {
            estado = 'EN_PROGRESO';
          } else {
            estado = 'SIN_CRITERIOS';
          }
        }

        progresoMap[cursoId] = {
          cursoId,
          totalMaterias,
          materiasCompletas,
          criteriosConfigurados,
          criteriosTotalEsperado,
          porcentaje,
          estado,
        };
      }

      return progresoMap;
    } catch (err) {
      console.error('Error al calcular progreso del constructor de cursos:', err);
      return {};
    }
  },
};
