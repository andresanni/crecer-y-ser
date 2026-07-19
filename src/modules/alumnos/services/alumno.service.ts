import pb from '../../../core/pocketbase';
import { alumnoAdapter, type Alumno, type AlumnoRecord } from '../models/alumno.model';

const COLLECTION_NAME = 'alumnos';

export const alumnoService = {
  getList: async (page: number = 1, perPage: number = 50, searchTerm: string = ''): Promise<{ items: Alumno[], totalItems: number, totalPages: number }> => {
    const filter = searchTerm ? `apellidos ~ "${searchTerm}" || dni ~ "${searchTerm}"` : '';
    const result = await pb.collection(COLLECTION_NAME).getList<AlumnoRecord>(page, perPage, {
      filter,
      sort: 'apellidos'
    });
    return {
      items: result.items.map(alumnoAdapter),
      totalItems: result.totalItems,
      totalPages: result.totalPages
    };
  },

  create: async (data: Omit<AlumnoRecord, 'id' | 'created' | 'updated'>): Promise<Alumno> => {
    const record = await pb.collection(COLLECTION_NAME).create<AlumnoRecord>(data);
    return alumnoAdapter(record);
  },

  update: async (id: string, data: Partial<Omit<AlumnoRecord, 'id' | 'created' | 'updated'>>, originalUpdatedDate: string): Promise<Alumno> => {
    // Chequeo de seguridad OCC (Optimistic Concurrency Control)
    const currentRecord = await pb.collection(COLLECTION_NAME).getOne(id, { fields: 'updated' });
    if (currentRecord.updated !== originalUpdatedDate) {
      throw new Error('El registro fue modificado por otro usuario. Por favor, refresca los datos.');
    }

    const record = await pb.collection(COLLECTION_NAME).update<AlumnoRecord>(id, data);
    return alumnoAdapter(record);
  },

  delete: async (id: string): Promise<boolean> => {
    return await pb.collection(COLLECTION_NAME).delete(id);
  },

  subscribeToRealtime: async (callback: (action: string, alumno: Alumno) => void): Promise<void> => {
    await pb.collection(COLLECTION_NAME).subscribe('*', (e) => {
      callback(e.action, alumnoAdapter(e.record as unknown as AlumnoRecord));
    });
  },

  unsubscribeRealtime: async (): Promise<void> => {
    await pb.collection(COLLECTION_NAME).unsubscribe('*');
  }
};
