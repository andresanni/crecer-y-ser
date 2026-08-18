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
  type Materia,
  type MateriaRecord,
  type Periodo,
  type PeriodoRecord,
  type CursoMateria,
  type CursoMateriaRecord,
  type CriterioEvaluacion,
  type CriterioEvaluacionRecord,
  type CriterioFormItem,
} from '../models/boletin.model';

const COLLECTION_CURSOS = 'cursos';
const COLLECTION_MATERIAS = 'materias';
const COLLECTION_PERIODOS = 'periodos';
const COLLECTION_CURSO_MATERIAS = 'curso_materias';
const COLLECTION_CRITERIOS = 'criterios_evaluacion';

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
    // Primero eliminamos los criterios de evaluación asociados
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

    // Eliminamos la asignación de la materia al curso
    await pb.collection(COLLECTION_CURSO_MATERIAS).delete(cursoMateriaId);
    return true;
  },

  updateCursoMateriasOrder: async (items: { id: string; orden_visual: number }[]): Promise<void> => {
    // Actualizamos secuencialmente el orden visual
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

  /**
   * Guarda o sincroniza los 5 criterios de una materia en un curso.
   * Maneja altas, modificaciones y eliminaciones si se quita algún ítem.
   */
  saveCriteriosForCursoMateria: async (
    cursoMateriaId: string,
    criterios: CriterioFormItem[]
  ): Promise<CriterioEvaluacion[]> => {
    // 1. Obtener criterios existentes en la base de datos
    const existentes = await pb.collection(COLLECTION_CRITERIOS).getFullList<CriterioEvaluacionRecord>({
      filter: `curso_materia_id = "${cursoMateriaId}"`,
    });

    const existentesMap = new Map(existentes.map((c) => [c.id, c]));
    const processedIds = new Set<string>();

    for (const item of criterios) {
      const trimmedNombre = item.nombre.trim();
      if (!trimmedNombre) continue;

      if (item.id && existentesMap.has(item.id)) {
        // Actualizar existente
        await pb.collection(COLLECTION_CRITERIOS).update(item.id, {
          nombre: trimmedNombre,
          orden_visual: item.orden_visual,
        });
        processedIds.add(item.id);
      } else {
        // Crear nuevo
        const created = await pb.collection(COLLECTION_CRITERIOS).create<CriterioEvaluacionRecord>({
          curso_materia_id: cursoMateriaId,
          nombre: trimmedNombre,
          orden_visual: item.orden_visual,
        });
        processedIds.add(created.id);
      }
    }

    // 2. Eliminar criterios que existían antes pero fueron removidos o vaciados
    for (const exist of existentes) {
      if (!processedIds.has(exist.id)) {
        await pb.collection(COLLECTION_CRITERIOS).delete(exist.id);
      }
    }

    // 3. Retornar la lista final actualizada
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

  /**
   * Inicializa automáticamente los 4 bimestres estándar para el ciclo si no existen.
   */
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
};
