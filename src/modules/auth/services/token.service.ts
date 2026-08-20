import pb from '../../../core/pocketbase';
import {
  tokenAccesoDocenteAdapter,
  type TokenAccesoDocente,
  type TokenAccesoDocenteRecord,
} from '../models/token.model';

const COLLECTION_TOKENS = 'tokens_acceso_docente';

export const tokenService = {
  /**
   * Valida si un token existe, está activo y no ha expirado.
   */
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

      // Validar fecha de expiración si está configurada
      if (token.fechaExpiracion) {
        const expirationDate = new Date(token.fechaExpiracion);
        const now = new Date();
        if (now > expirationDate) {
          // Desactivar proactivamente el token expirado
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

  /**
   * Genera/Crea un nuevo token de acceso para un docente (requiere autenticación de administrador).
   */
  createToken: async (data: {
    cursoId: string;
    periodoId: string;
    materiaId: string;
    docenteNombre: string;
    fechaExpiracion?: string;
  }): Promise<TokenAccesoDocente> => {
    // Generar un token aleatorio
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

  /**
   * Desactiva un token de acceso.
   */
  deactivateToken: async (tokenId: string): Promise<boolean> => {
    try {
      await pb.collection(COLLECTION_TOKENS).update(tokenId, { activo: false });
      return true;
    } catch {
      return false;
    }
  },
};
