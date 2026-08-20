import pb from '../../../core/pocketbase';
import { alumnoAdapter, type Alumno, type AlumnoRecord } from '../models/alumno.model';
import type { EstadoInscripcion } from '../../inscripciones/models/inscripcion.model';

const COLLECTION_NAME = 'alumnos';
const COLLECTION_RESPONSABLES = 'responsables';
const COLLECTION_ALUMNO_RESPONSABLE = 'alumno_responable';
const COLLECTION_INSCRIPCIONES = 'inscripciones';

export interface CreateAlumnoIntegralParams {
  alumno: {
    numero_legajo?: string;
    dni: string;
    apellidos: string;
    nombres: string;
    fecha_nacimiento: string;
    nacionalidad?: string;
    sexo?: string;
    telefono?: string;
    domicilio?: string;
    usuario_acadeu?: string;
    clave_acadeu?: string;
  };
  inscripcion?: {
    curso_id: string;
    ciclo_id: string;
    numero_orden?: number;
    numero_inscripcion?: string;
    fecha_inscripcion?: string;
    fecha_ingreso?: string;
    fecha_egreso?: string;
    estado?: EstadoInscripcion;
  };
  responsable?: {
    id?: string;
    dni: string;
    apellidos: string;
    nombres: string;
    nacionalidad?: string;
    profesion?: string;
    telefono?: string;
    email?: string;
  };
  vinculo?: string;
}

export const alumnoService = {
  getList: async (
    page: number = 1,
    perPage: number = 50,
    searchTerm: string = ''
  ): Promise<{ items: Alumno[]; totalItems: number; totalPages: number }> => {
    const trimmed = searchTerm.trim();
    let filter = '';

    if (trimmed) {
      const words = trimmed.split(/\s+/).filter(Boolean);
      if (words.length === 1) {
        const sanitized = words[0].replace(/"/g, '\\"');
        filter = `nombres ~ "${sanitized}" || apellidos ~ "${sanitized}" || dni ~ "${sanitized}" || numero_legajo ~ "${sanitized}" || usuario_acadeu ~ "${sanitized}"`;
      } else if (words.length > 1) {
        filter = words
          .map((w) => {
            const sanitized = w.replace(/"/g, '\\"');
            return `(nombres ~ "${sanitized}" || apellidos ~ "${sanitized}" || dni ~ "${sanitized}" || numero_legajo ~ "${sanitized}" || usuario_acadeu ~ "${sanitized}")`;
          })
          .join(' && ');
      }
    }

    const result = await pb.collection(COLLECTION_NAME).getList<AlumnoRecord>(page, perPage, {
      filter,
      sort: 'apellidos',
      expand: 'inscripciones_via_alumno_id.curso_id.nivel_id',
    });

    const items = result.items.map(alumnoAdapter);

    // Complementar con carga en lote de inscripciones si no vinieron por expand
    const unlinkedIds = items.filter((a) => !a.cursoNombre).map((a) => a.id);
    if (unlinkedIds.length > 0) {
      try {
        const idsFilter = unlinkedIds.map((id) => `alumno_id = "${id}"`).join(' || ');
        const inscripciones = await pb.collection(COLLECTION_INSCRIPCIONES).getFullList({
          filter: `(${idsFilter})`,
          expand: 'curso_id.nivel_id',
          sort: '-created',
        });

        const inscMap = new Map<string, { curso_id?: string; estado?: string; expand?: { curso_id?: { id: string; nombre: string; turno: string; expand?: { nivel_id?: { nombre: string } } } } }>();
        for (const insc of inscripciones) {
          const current = inscMap.get(insc.alumno_id);
          if (!current || (current.estado !== 'Regular' && insc.estado === 'Regular')) {
            inscMap.set(insc.alumno_id, insc);
          }
        }

        for (const item of items) {
          if (!item.cursoNombre) {
            const insc = inscMap.get(item.id);
            if (insc) {
              const cursoExp = insc.expand?.curso_id;
              item.cursoId = cursoExp?.id || insc.curso_id;
              item.cursoNombre = cursoExp?.nombre;
              item.nivelNombre = cursoExp?.expand?.nivel_id?.nombre;
              item.turno = cursoExp?.turno;
              item.estadoInscripcion = insc.estado;
            }
          }
        }
      } catch (e) {
        console.warn('Advertencia al consultar cursos en lote para alumnos:', e);
      }
    }

    return {
      items,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  },

  create: async (data: Omit<AlumnoRecord, 'id' | 'created' | 'updated'>): Promise<Alumno> => {
    const record = await pb.collection(COLLECTION_NAME).create<AlumnoRecord>(data);
    return alumnoAdapter(record);
  },

  /**
   * Registra integralmente al alumno con su inscripción al curso y vinculación de responsable.
   * Ejecuta una secuencia controlada con rollback ante excepciones para evitar inconsistencias.
   */
  createIntegral: async (
    params: CreateAlumnoIntegralParams
  ): Promise<{ alumno: Alumno; responsableId?: string; inscripcionId?: string }> => {
    let createdAlumnoRecord: AlumnoRecord | null = null;
    let newlyCreatedResponsableId: string | null = null;
    let newlyCreatedAlumnoResponsableId: string | null = null;
    let newlyCreatedInscripcionId: string | null = null;
    let responsableId: string | undefined = params.responsable?.id;

    // Helper interno de compensación / rollback
    const rollback = async () => {
      if (newlyCreatedInscripcionId) {
        try {
          await pb.collection(COLLECTION_INSCRIPCIONES).delete(newlyCreatedInscripcionId);
        } catch (e) {
          console.error('Fallo al revertir inscripción:', e);
        }
      }
      if (newlyCreatedAlumnoResponsableId) {
        try {
          await pb.collection(COLLECTION_ALUMNO_RESPONSABLE).delete(newlyCreatedAlumnoResponsableId);
        } catch (e) {
          console.error('Fallo al revertir vinculación de responsable:', e);
        }
      }
      if (createdAlumnoRecord) {
        try {
          await pb.collection(COLLECTION_NAME).delete(createdAlumnoRecord.id);
        } catch (e) {
          console.error('Fallo al revertir alumno:', e);
        }
      }
      if (newlyCreatedResponsableId) {
        try {
          await pb.collection(COLLECTION_RESPONSABLES).delete(newlyCreatedResponsableId);
        } catch (e) {
          console.error('Fallo al revertir responsable nuevo:', e);
        }
      }
    };

    // 1. PASO 1: Crear Alumno
    try {
      createdAlumnoRecord = await pb.collection(COLLECTION_NAME).create<AlumnoRecord>({
        numero_legajo: params.alumno.numero_legajo || '',
        dni: params.alumno.dni.trim(),
        apellidos: params.alumno.apellidos.trim(),
        nombres: params.alumno.nombres.trim(),
        fecha_nacimiento: params.alumno.fecha_nacimiento,
        nacionalidad: params.alumno.nacionalidad || '',
        sexo: params.alumno.sexo || '',
        telefono: params.alumno.telefono || '',
        domicilio: params.alumno.domicilio || '',
        usuario_acadeu: params.alumno.usuario_acadeu || '',
        clave_acadeu: params.alumno.clave_acadeu || '',
      });
    } catch (error) {
      throw new Error(
        `Error al guardar los Datos del Alumno (Sección 1): ${
          error instanceof Error ? error.message : 'Fallo en la creación'
        }`,
        { cause: error }
      );
    }

    // 2. PASO 2: Resolver o Crear Responsable (si se cargaron datos)
    if (params.responsable && params.responsable.dni?.trim()) {
      try {
        if (!responsableId) {
          const sanitizedDni = params.responsable.dni.trim().replace(/"/g, '\\"');
          try {
            const existing = await pb
              .collection(COLLECTION_RESPONSABLES)
              .getFirstListItem(`dni = "${sanitizedDni}"`);
            responsableId = existing.id;
          } catch {
            // No existe, creamos el nuevo responsable
            const newResp = await pb.collection(COLLECTION_RESPONSABLES).create({
              dni: params.responsable.dni.trim(),
              apellidos: params.responsable.apellidos.trim(),
              nombres: params.responsable.nombres.trim(),
              nacionalidad: (params.responsable.nacionalidad || '').trim(),
              profesion: (params.responsable.profesion || '').trim(),
              telefono: (params.responsable.telefono || '').trim(),
              email: (params.responsable.email || '').trim(),
            });
            responsableId = newResp.id;
            newlyCreatedResponsableId = newResp.id;
          }
        }
      } catch (error) {
        await rollback();
        throw new Error(
          `Error al procesar el Responsable (Sección 3): ${
            error instanceof Error ? error.message : 'Fallo en la creación del responsable'
          }`,
          { cause: error }
        );
      }

      // 3. PASO 3: Vincular en alumno_responable
      if (responsableId && createdAlumnoRecord) {
        try {
          const relRecord = await pb.collection(COLLECTION_ALUMNO_RESPONSABLE).create({
            alumno_id: createdAlumnoRecord.id,
            responsable_id: responsableId,
            vinculo: (params.vinculo || 'Tutor/a').trim(),
          });
          newlyCreatedAlumnoResponsableId = relRecord.id;
        } catch (error) {
          await rollback();
          throw new Error(
            `Error al vincular el Responsable con el Alumno (Sección 3): ${
              error instanceof Error ? error.message : 'Fallo en tabla intermedia'
            }`,
            { cause: error }
          );
        }
      }
    }

    // 4. PASO 4: Crear Inscripción al Curso y Ciclo Lectivo
    if (params.inscripcion && params.inscripcion.curso_id && params.inscripcion.ciclo_id && createdAlumnoRecord) {
      try {
        const inscRecord = await pb.collection(COLLECTION_INSCRIPCIONES).create({
          alumno_id: createdAlumnoRecord.id,
          curso_id: params.inscripcion.curso_id,
          ciclo_id: params.inscripcion.ciclo_id,
          numero_orden: params.inscripcion.numero_orden || null,
          numero_inscripcion: params.inscripcion.numero_inscripcion || '',
          fecha_inscripcion: params.inscripcion.fecha_inscripcion || '',
          fecha_ingreso: params.inscripcion.fecha_ingreso || '',
          fecha_egreso: params.inscripcion.fecha_egreso || '',
          estado: params.inscripcion.estado || 'Regular',
        });
        newlyCreatedInscripcionId = inscRecord.id;
      } catch (error) {
        await rollback();
        throw new Error(
          `Error al registrar la Inscripción al Curso (Sección 2): ${
            error instanceof Error ? error.message : 'Fallo en inscripción'
          }`,
          { cause: error }
        );
      }
    }

    return {
      alumno: alumnoAdapter(createdAlumnoRecord),
      responsableId,
      inscripcionId: newlyCreatedInscripcionId || undefined,
    };
  },

  update: async (
    id: string,
    data: Partial<Omit<AlumnoRecord, 'id' | 'created' | 'updated'>>,
    originalUpdatedDate: string
  ): Promise<Alumno> => {
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
  },
};
