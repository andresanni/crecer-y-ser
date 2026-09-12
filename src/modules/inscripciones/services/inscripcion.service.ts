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



  getCursos: async (): Promise<Curso[]> => {
    const records = await pb.collection(COLLECTION_CURSOS).getFullList<CursoRecord>({
      expand: 'nivel_id',
      sort: 'nombre',
    });
    return records.map(cursoAdapter);
  },




  getCiclos: async (): Promise<CicloLectivo[]> => {
    const records = await pb.collection(COLLECTION_CICLOS).getFullList<CicloLectivoRecord>({
      sort: '-ano',
    });
    return records.map(cicloLectivoAdapter);
  },




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




  getByAlumnoId: async (alumnoId: string): Promise<Inscripcion[]> => {
    const records = await pb.collection(COLLECTION_INSCRIPCIONES).getFullList<InscripcionRecord>({
      filter: `alumno_id = "${alumnoId}"`,
      expand: 'curso_id.nivel_id,ciclo_id',
      sort: '-fecha_inscripcion',
    });
    return records.map(inscripcionAdapter);
  },




  update: async (
    id: string,
    data: Partial<Omit<InscripcionRecord, 'id' | 'created' | 'updated' | 'expand'>>
  ): Promise<Inscripcion> => {
    const record = await pb
      .collection(COLLECTION_INSCRIPCIONES)
      .update<InscripcionRecord>(id, data, {
        expand: 'curso_id.nivel_id,ciclo_id',
      });
    return inscripcionAdapter(record);
  },




  darDeBaja: async (inscripcionId: string, fechaEgreso: string): Promise<Inscripcion> => {
    const record = await pb
      .collection(COLLECTION_INSCRIPCIONES)
      .update<InscripcionRecord>(
        inscripcionId,
        {
          estado: 'Baja',
          fecha_egreso: fechaEgreso,
        },
        {
          expand: 'curso_id.nivel_id,ciclo_id',
        }
      );
    return inscripcionAdapter(record);
  },
};
