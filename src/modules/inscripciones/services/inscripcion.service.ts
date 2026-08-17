import pb from '../../../core/pocketbase';
import {
  cursoAdapter,
  cicloLectivoAdapter,
  inscripcionAdapter,
  type Curso,
  type CursoRecord,
  type CicloLectivo,
  type CicloLectivoRecord,
  type Inscripcion,
  type InscripcionRecord,
} from '../models/inscripcion.model';

const COLLECTION_CURSOS = 'cursos';
const COLLECTION_CICLOS = 'ciclos_lectivos';
const COLLECTION_INSCRIPCIONES = 'inscripciones';

export const inscripcionService = {
  /**
   * Obtiene la lista completa de cursos disponibles junto con su nivel educativo.
   */
  getCursos: async (): Promise<Curso[]> => {
    const records = await pb.collection(COLLECTION_CURSOS).getFullList<CursoRecord>({
      expand: 'nivel_id',
      sort: 'nombre',
    });
    return records.map(cursoAdapter);
  },

  /**
   * Obtiene la lista de ciclos lectivos.
   */
  getCiclos: async (): Promise<CicloLectivo[]> => {
    const records = await pb.collection(COLLECTION_CICLOS).getFullList<CicloLectivoRecord>({
      sort: '-ano',
    });
    return records.map(cicloLectivoAdapter);
  },

  /**
   * Obtiene el ciclo lectivo actual/activo.
   */
  getCicloActual: async (): Promise<CicloLectivo | null> => {
    try {
      const record = await pb
        .collection(COLLECTION_CICLOS)
        .getFirstListItem<CicloLectivoRecord>('actual = true');
      return cicloLectivoAdapter(record);
    } catch {
      return null;
    }
  },

  /**
   * Registra una nueva inscripción para un alumno.
   */
  create: async (
    data: Omit<InscripcionRecord, 'id' | 'created' | 'updated' | 'expand'>
  ): Promise<Inscripcion> => {
    const record = await pb
      .collection(COLLECTION_INSCRIPCIONES)
      .create<InscripcionRecord>(data, {
        expand: 'curso_id.nivel_id,ciclo_id',
      });
    return inscripcionAdapter(record);
  },

  /**
   * Obtiene las inscripciones asociadas a un alumno.
   */
  getByAlumnoId: async (alumnoId: string): Promise<Inscripcion[]> => {
    const records = await pb.collection(COLLECTION_INSCRIPCIONES).getFullList<InscripcionRecord>({
      filter: `alumno_id = "${alumnoId}"`,
      expand: 'curso_id.nivel_id,ciclo_id',
      sort: '-fecha_inscripcion',
    });
    return records.map(inscripcionAdapter);
  },
};
