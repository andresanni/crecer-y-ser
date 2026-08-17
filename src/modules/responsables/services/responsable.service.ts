import pb from '../../../core/pocketbase';
import {
  responsableAdapter,
  alumnoResponsableAdapter,
  type Responsable,
  type ResponsableRecord,
  type AlumnoResponsable,
  type AlumnoResponsableRecord,
} from '../models/responsable.model';
import { ClientResponseError } from 'pocketbase';

const COLLECTION_RESPONSABLES = 'responsables';
const COLLECTION_ALUMNO_RESPONSABLE = 'alumno_responable';

export const responsableService = {
  /**
   * Busca un responsable por su número de DNI exacto.
   * Si no se encuentra, retorna null sin arrojar excepción.
   */
  getByDni: async (dni: string): Promise<Responsable | null> => {
    const sanitizedDni = dni.trim().replace(/"/g, '\\"');
    if (!sanitizedDni) return null;

    try {
      const record = await pb
        .collection(COLLECTION_RESPONSABLES)
        .getFirstListItem<ResponsableRecord>(`dni = "${sanitizedDni}"`);
      return responsableAdapter(record);
    } catch (error) {
      if (error instanceof ClientResponseError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Crea un nuevo registro en la colección "responsables".
   */
  create: async (data: Omit<ResponsableRecord, 'id' | 'created' | 'updated'>): Promise<Responsable> => {
    const record = await pb
      .collection(COLLECTION_RESPONSABLES)
      .create<ResponsableRecord>(data);
    return responsableAdapter(record);
  },

  /**
   * Actualiza los datos de un responsable existente.
   */
  update: async (
    id: string,
    data: Partial<Omit<ResponsableRecord, 'id' | 'created' | 'updated'>>
  ): Promise<Responsable> => {
    const record = await pb
      .collection(COLLECTION_RESPONSABLES)
      .update<ResponsableRecord>(id, data);
    return responsableAdapter(record);
  },

  /**
   * Crea la vinculación en la tabla intermedia "alumno_responable".
   */
  createAlumnoResponsable: async (data: {
    alumno_id: string;
    responsable_id: string;
    vinculo: string;
  }): Promise<AlumnoResponsable> => {
    const record = await pb
      .collection(COLLECTION_ALUMNO_RESPONSABLE)
      .create<AlumnoResponsableRecord>(data);
    return alumnoResponsableAdapter(record);
  },

  /**
   * Obtiene los responsables vinculados a un alumno junto con el vínculo/parentesco.
   */
  getByAlumnoId: async (
    alumnoId: string
  ): Promise<{ responsable: Responsable; vinculo: string; relationId: string }[]> => {
    const records = await pb
      .collection(COLLECTION_ALUMNO_RESPONSABLE)
      .getFullList<
        AlumnoResponsableRecord & { expand?: { responsable_id?: ResponsableRecord } }
      >({
        filter: `alumno_id = "${alumnoId}"`,
        expand: 'responsable_id',
      });
    return records.map((r) => ({
      relationId: r.id,
      vinculo: r.vinculo,
      responsable: r.expand?.responsable_id
        ? responsableAdapter(r.expand.responsable_id)
        : {
            id: r.responsable_id,
            dni: '',
            apellidos: '',
            nombres: '',
            nacionalidad: '',
            profesion: '',
            telefono: '',
            email: '',
            createdAt: '',
            updatedAt: '',
          },
    }));
  },

  /**
   * Elimina un responsable por su ID.
   */
  delete: async (id: string): Promise<boolean> => {
    return await pb.collection(COLLECTION_RESPONSABLES).delete(id);
  },
};
