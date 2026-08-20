import pb from '../../../core/pocketbase';
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
  evaluacionMateriaAdapter,
  evaluacionCriterioAdapter,
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
  type EvaluacionMateria,
  type EvaluacionMateriaRecord,
  type EvaluacionCriterio,
  type EvaluacionCriterioRecord,
  type CierrePeriodoAlumno,
  type CierrePeriodoAlumnoRecord,
  type AlumnoInscriptoRow,
  type TokenAccesoDocente,
  type TokenAccesoDocenteRecord,
  tokenAccesoDocenteAdapter,
} from '../models/boletin.model';
import type { AlumnoRecord } from '../../alumnos/models/alumno.model';

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
const COLLECTION_TOKENS = 'tokens_acceso_docente';

export const boletinService = {
  // ==========================================
  // CURSOS
  // ==========================================
  getCursos: async (): Promise<Curso[]> => {
    const records = await pb.collection(COLLECTION_CURSOS).getFullList<CursoRecord>({
      expand: 'nivel_id',
      sort: 'nombre',
    });
    return records.map(cursoAdapter);
  },

  // ==========================================
  // ESCALAS Y VALORES
  // ==========================================
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

  // ==========================================
  // MATERIAS (Catálogo General)
  // ==========================================
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

  // ==========================================
  // CURSO_MATERIAS (Malla Curricular por Curso)
  // ==========================================
  getMateriasByCurso: async (cursoId: string): Promise<CursoMateria[]> => {
    const records = await pb.collection(COLLECTION_CURSO_MATERIAS).getFullList<CursoMateriaRecord>({
      filter: `curso_id = "${cursoId}"`,
      expand: 'materia_id,curso_id',
      sort: 'orden_visual',
    });
    return records.map(cursoMateriaAdapter);
  },

  assignMateriaToCurso: async (
    cursoId: string,
    materiaId: string,
    ordenVisual: number
  ): Promise<CursoMateria> => {
    const record = await pb.collection(COLLECTION_CURSO_MATERIAS).create<CursoMateriaRecord>(
      {
        curso_id: cursoId,
        materia_id: materiaId,
        orden_visual: ordenVisual,
      },
      {
        expand: 'materia_id,curso_id',
      }
    );
    return cursoMateriaAdapter(record);
  },

  removeMateriaFromCurso: async (cursoMateriaId: string): Promise<boolean> => {
    try {
      const criterios = await pb.collection(COLLECTION_CRITERIOS).getFullList<CriterioEvaluacionRecord>({
        filter: `curso_materia_id = "${cursoMateriaId}"`,
      });
      for (const crit of criterios) {
        await pb.collection(COLLECTION_CRITERIOS).delete(crit.id);
      }
    } catch (err) {
      console.warn('Error al limpiar criterios previos de curso_materia:', err);
    }

    await pb.collection(COLLECTION_CURSO_MATERIAS).delete(cursoMateriaId);
    return true;
  },

  updateCursoMateriasOrder: async (items: { id: string; orden_visual: number }[]): Promise<void> => {
    for (const item of items) {
      await pb.collection(COLLECTION_CURSO_MATERIAS).update(item.id, {
        orden_visual: item.orden_visual,
      });
    }
  },

  // ==========================================
  // CRITERIOS DE EVALUACIÓN (5 Conceptos por Materia)
  // ==========================================
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
    const existentes = await pb.collection(COLLECTION_CRITERIOS).getFullList<CriterioEvaluacionRecord>({
      filter: `curso_materia_id = "${cursoMateriaId}"`,
    });

    const existentesMap = new Map(existentes.map((c) => [c.id, c]));
    const processedIds = new Set<string>();

    for (const item of criterios) {
      const trimmedNombre = item.nombre.trim();
      if (!trimmedNombre) continue;

      if (item.id && existentesMap.has(item.id)) {
        await pb.collection(COLLECTION_CRITERIOS).update(item.id, {
          nombre: trimmedNombre,
          orden_visual: item.orden_visual,
        });
        processedIds.add(item.id);
      } else {
        const created = await pb.collection(COLLECTION_CRITERIOS).create<CriterioEvaluacionRecord>({
          curso_materia_id: cursoMateriaId,
          nombre: trimmedNombre,
          orden_visual: item.orden_visual,
        });
        processedIds.add(created.id);
      }
    }

    for (const exist of existentes) {
      if (!processedIds.has(exist.id)) {
        await pb.collection(COLLECTION_CRITERIOS).delete(exist.id);
      }
    }

    return boletinService.getCriteriosByCursoMateria(cursoMateriaId);
  },

  // ==========================================
  // PERIODOS (Bimestres)
  // ==========================================
  getPeriodosByCiclo: async (cicloId: string): Promise<Periodo[]> => {
    const records = await pb.collection(COLLECTION_PERIODOS).getFullList<PeriodoRecord>({
      filter: `ciclo_id = "${cicloId}"`,
      sort: 'numero_periodo',
      expand: 'ciclo_id',
    });
    return records.map(periodoAdapter);
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

  // ==========================================
  // EVALUACIONES MATERIA & CRITERIOS
  // ==========================================
  getEvaluacionMateria: async (
    inscripcionId: string,
    cursoMateriaId: string,
    periodoId: string
  ): Promise<EvaluacionMateria | null> => {
    try {
      const record = await pb
        .collection(COLLECTION_EVALUACIONES_MATERIA)
        .getFirstListItem<EvaluacionMateriaRecord>(
          `inscripcion_id = "${inscripcionId}" && curso_materia_id = "${cursoMateriaId}" && periodo_id = "${periodoId}"`,
          {
            expand: 'curso_materia_id.materia_id,periodo_id,calificacion_general_id',
          }
        );
      return evaluacionMateriaAdapter(record);
    } catch {
      return null;
    }
  },

  getEvaluacionesCriteriosByEvaluacionMateria: async (
    evaluacionMateriaId: string
  ): Promise<EvaluacionCriterio[]> => {
    const records = await pb
      .collection(COLLECTION_EVALUACIONES_CRITERIOS)
      .getFullList<EvaluacionCriterioRecord>({
        filter: `evaluacion_materia_id = "${evaluacionMateriaId}"`,
        expand: 'criterio_id,valor_escala_id',
      });
    const mapped = records.map(evaluacionCriterioAdapter);
    return mapped.sort((a, b) => (a.criterioOrden ?? 0) - (b.criterioOrden ?? 0));
  },

  saveEvaluacionMateriaCompleta: async (data: {
    inscripcionId: string;
    cursoMateriaId: string;
    periodoId: string;
    ppi: boolean;
    calificacionGeneralId: string;
    criterios: { criterioId: string; valorEscalaId: string }[];
  }): Promise<EvaluacionMateria> => {
    let evalMateriaRecord: EvaluacionMateriaRecord;

    const existing = await boletinService.getEvaluacionMateria(
      data.inscripcionId,
      data.cursoMateriaId,
      data.periodoId
    );

    if (existing) {
      evalMateriaRecord = await pb
        .collection(COLLECTION_EVALUACIONES_MATERIA)
        .update<EvaluacionMateriaRecord>(existing.id, {
          ppi: data.ppi,
          calificacion_general_id: data.calificacionGeneralId || null,
        }, {
          expand: 'curso_materia_id.materia_id,periodo_id,calificacion_general_id',
        });
    } else {
      evalMateriaRecord = await pb
        .collection(COLLECTION_EVALUACIONES_MATERIA)
        .create<EvaluacionMateriaRecord>({
          inscripcion_id: data.inscripcionId,
          curso_materia_id: data.cursoMateriaId,
          periodo_id: data.periodoId,
          ppi: data.ppi,
          calificacion_general_id: data.calificacionGeneralId || null,
        }, {
          expand: 'curso_materia_id.materia_id,periodo_id,calificacion_general_id',
        });
    }

    // Sincronizar criterios
    const existentesCriterios = await pb
      .collection(COLLECTION_EVALUACIONES_CRITERIOS)
      .getFullList<EvaluacionCriterioRecord>({
        filter: `evaluacion_materia_id = "${evalMateriaRecord.id}"`,
      });
    const critMap = new Map(existentesCriterios.map((c) => [c.criterio_id, c]));

    for (const c of data.criterios) {
      if (!c.valorEscalaId) continue;
      if (critMap.has(c.criterioId)) {
        const item = critMap.get(c.criterioId)!;
        await pb.collection(COLLECTION_EVALUACIONES_CRITERIOS).update(item.id, {
          valor_escala_id: c.valorEscalaId,
        });
      } else {
        await pb.collection(COLLECTION_EVALUACIONES_CRITERIOS).create({
          evaluacion_materia_id: evalMateriaRecord.id,
          criterio_id: c.criterioId,
          valor_escala_id: c.valorEscalaId,
        });
      }
    }

    return evaluacionMateriaAdapter(evalMateriaRecord);
  },

  // ==========================================
  // CIERRES DE PERIODO POR ALUMNO
  // ==========================================
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
    } catch {
      return null;
    }
  },

  saveCierrePeriodoAlumno: async (data: {
    inscripcionId: string;
    periodoId: string;
    asistencias: number;
    inasistencias: number;
    llegadasTarde: number;
    observaciones: string;
  }): Promise<CierrePeriodoAlumno> => {
    const existing = await boletinService.getCierrePeriodoAlumno(
      data.inscripcionId,
      data.periodoId
    );

    let record: CierrePeriodoAlumnoRecord;
    if (existing) {
      record = await pb
        .collection(COLLECTION_CIERRES_PERIODO)
        .update<CierrePeriodoAlumnoRecord>(existing.id, {
          asistencias: data.asistencias,
          inasistencias: data.inasistencias,
          llegadas_tarde: data.llegadasTarde,
          observaciones: data.observaciones,
        }, {
          expand: 'periodo_id',
        });
    } else {
      record = await pb
        .collection(COLLECTION_CIERRES_PERIODO)
        .create<CierrePeriodoAlumnoRecord>({
          inscripcion_id: data.inscripcionId,
          periodo_id: data.periodoId,
          asistencias: data.asistencias,
          inasistencias: data.inasistencias,
          llegadas_tarde: data.llegadasTarde,
          observaciones: data.observaciones,
        }, {
          expand: 'periodo_id',
        });
    }

    return cierrePeriodoAlumnoAdapter(record);
  },

  // ==========================================
  // MATRIZ DE CALIFICACIONES (CARGA DOCENTE BATCH)
  // ==========================================
  getAlumnosRegularesByCurso: async (cursoId: string): Promise<AlumnoInscriptoRow[]> => {
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
      filter: `curso_id = "${cursoId}" && estado != "Baja"`,
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

    // Ordenamiento robusto en TypeScript: por numero_orden asc (si está asignado), y luego alfabéticamente por Apellidos y Nombres
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



  // ==========================================
  // VISTA POR ALUMNO (CARGA INTEGRAL INDIVIDUAL)
  // ==========================================
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

    // Ordenar criterios en cliente
    for (const cmId of Object.keys(map)) {
      map[cmId].sort((a, b) => (a.ordenVisual ?? 0) - (b.ordenVisual ?? 0));
    }

    return map;
  },

  updateInscripcionApoyos: async (
    inscripcionId: string,
    data: {
      promocionoConAcompanamiento?: string;
      poseeApoyos?: string;
      cualesApoyos?: string;
    }
  ): Promise<void> => {
    await pb.collection(COLLECTION_INSCRIPCIONES).update(inscripcionId, {
      promociono_con_acompanamiento: data.promocionoConAcompanamiento || '-',
      posee_apoyos: data.poseeApoyos || '-',
      cuales_apoyos: data.cualesApoyos || '',
    });
  },

  // ==========================================
  // TOKENS DE ACCESO DOCENTE (MAGIC LINKS)
  // ==========================================
  getTokensAccesoDocente: async (
    cursoId?: string,
    periodoId?: string
  ): Promise<TokenAccesoDocente[]> => {
    const conditions: string[] = [];
    if (cursoId) conditions.push(`curso_id = "${cursoId}"`);
    if (periodoId) conditions.push(`periodo_id = "${periodoId}"`);
    const filter = conditions.length > 0 ? conditions.join(' && ') : undefined;

    const records = await pb
      .collection(COLLECTION_TOKENS)
      .getFullList<TokenAccesoDocenteRecord>({
        filter,
        expand: 'curso_id,periodo_id,materia_id',
        sort: '-created',
      });

    return records.map(tokenAccesoDocenteAdapter);
  },

  createTokenAccesoDocente: async (data: {
    cursoId: string;
    periodoId: string;
    materiaId?: string;
    docenteNombre: string;
    fechaExpiracion?: string;
  }): Promise<TokenAccesoDocente> => {
    const token = `cys_${crypto.randomUUID().replace(/-/g, '')}`;

    const record = await pb
      .collection(COLLECTION_TOKENS)
      .create<TokenAccesoDocenteRecord>(
        {
          token,
          curso_id: data.cursoId,
          periodo_id: data.periodoId,
          materia_id: data.materiaId || null,
          docente_nombre: data.docenteNombre,
          activo: true,
          fecha_expiracion: data.fechaExpiracion || null,
        },
        {
          expand: 'curso_id,periodo_id,materia_id',
        }
      );

    return tokenAccesoDocenteAdapter(record);
  },

  toggleTokenAccesoDocente: async (
    tokenId: string,
    activo: boolean
  ): Promise<TokenAccesoDocente> => {
    const record = await pb
      .collection(COLLECTION_TOKENS)
      .update<TokenAccesoDocenteRecord>(
        tokenId,
        { activo },
        {
          expand: 'curso_id,periodo_id,materia_id',
        }
      );
    return tokenAccesoDocenteAdapter(record);
  },

  deleteTokenAccesoDocente: async (tokenId: string): Promise<boolean> => {
    await pb.collection(COLLECTION_TOKENS).delete(tokenId);
    return true;
  },

  validarTokenAccesoDocente: async (tokenStr: string): Promise<TokenAccesoDocente | null> => {
    try {
      const record = await pb
        .collection(COLLECTION_TOKENS)
        .getFirstListItem<TokenAccesoDocenteRecord>(
          `token = "${tokenStr}" && activo = true`,
          {
            expand: 'curso_id,periodo_id,materia_id',
          }
        );

      if (record.fecha_expiracion) {
        const expDate = new Date(record.fecha_expiracion);
        const now = new Date();
        if (now > expDate) {
          return null;
        }
      }

      return tokenAccesoDocenteAdapter(record);
    } catch {
      return null;
    }
  },
};





