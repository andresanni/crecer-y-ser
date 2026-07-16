import pb from '../../../core/pocketbase';
import { alumnoAdapter, type Alumno, type AlumnoRecord } from '../models/alumno.model';

const COLLECTION_NAME = 'alumnos';

export const alumnoService = {
  getAll: async (): Promise<Alumno[]> => {
    const records = await pb.collection(COLLECTION_NAME).getFullList<AlumnoRecord>({
      sort: '-created', // Opcional, por si queremos los más nuevos primero
    });
    return records.map(alumnoAdapter);
  },

  create: async (data: Omit<AlumnoRecord, 'id' | 'created' | 'updated'>): Promise<Alumno> => {
    const record = await pb.collection(COLLECTION_NAME).create<AlumnoRecord>(data);
    return alumnoAdapter(record);
  },

  update: async (id: string, data: Partial<Omit<AlumnoRecord, 'id' | 'created' | 'updated'>>): Promise<Alumno> => {
    const record = await pb.collection(COLLECTION_NAME).update<AlumnoRecord>(id, data);
    return alumnoAdapter(record);
  },

  delete: async (id: string): Promise<boolean> => {
    return await pb.collection(COLLECTION_NAME).delete(id);
  }
};
