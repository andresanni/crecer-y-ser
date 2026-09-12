import pb from '../../../core/pocketbase';
import {
  tokenAccesoDocenteAdapter,
  type TokenAccesoDocente,
  type TokenAccesoDocenteRecord,
} from '../models/token.model';

const COLLECTION_TOKENS = 'tokens_acceso_docente';

export const tokenService = {



  validateToken: async (tokenValue: string): Promise<TokenAccesoDocente | null> => {
    try {
      const record = await pb
        .collection(COLLECTION_TOKENS)
        .getFirstListItem<TokenAccesoDocenteRecord>(
          `token = "${tokenValue}" && activo = true`,
          {
            expand: 'curso_id,periodo_id,materia_id',
          }
        );

      const token = tokenAccesoDocenteAdapter(record);


      if (token.fechaExpiracion) {
        const expirationDate = new Date(token.fechaExpiracion);
        const now = new Date();
        if (now > expirationDate) {

          await pb.collection(COLLECTION_TOKENS).update(token.id, { activo: false });
          return null;
        }
      }

      return token;
    } catch (error) {
      console.warn('Error al validar el token de acceso docente:', error);
      return null;
    }
  },




  createToken: async (data: {
    cursoId: string;
    periodoId: string;
    materiaId: string;
    docenteNombre: string;
    fechaExpiracion?: string;
  }): Promise<TokenAccesoDocente> => {

    const randomToken = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    const record = await pb
      .collection(COLLECTION_TOKENS)
      .create<TokenAccesoDocenteRecord>(
        {
          token: randomToken,
          curso_id: data.cursoId,
          periodo_id: data.periodoId,
          materia_id: data.materiaId,
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




  deactivateToken: async (tokenId: string): Promise<boolean> => {
    try {
      await pb.collection(COLLECTION_TOKENS).update(tokenId, { activo: false });
      return true;
    } catch {
      return false;
    }
  },
};
