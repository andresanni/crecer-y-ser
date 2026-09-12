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


    const unlinkedIds = items.filter((a) => !a.cursoNombre).map((a) => a.id);
    if (unlinkedIds.length > 0) {
      try {
        const idsFilter = unlinkedIds.map((id) => `alumno_id = "${id}"`).join(' || ');
        const inscripciones = await pb.collection(COLLECTION_INSCRIPCIONES).getFullList({
          filter: `(${idsFilter})`,
          expand: 'curso_id.nivel_id',
          sort: '-created',
        });

        const inscMap = new Map<string, (typeof inscripciones)[number]>();
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
              item.fechaEgreso = insc.fecha_egreso || undefined;
              item.fechaIngreso = insc.fecha_ingreso || undefined;
              item.numeroOrden = insc.numero_orden ?? null;
              item.numeroInscripcion = insc.numero_inscripcion || undefined;
              item.inscripcionId = insc.id || undefined;
              item.cicloId = insc.ciclo_id || undefined;
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





  createIntegral: async (
    params: CreateAlumnoIntegralParams
  ): Promise<{ alumno: Alumno; responsableId?: string; inscripcionId?: string }> => {
    let createdAlumnoRecord: AlumnoRecord | null = null;
    let newlyCreatedResponsableId: string | null = null;
    let newlyCreatedAlumnoResponsableId: string | null = null;
    let newlyCreatedInscripcionId: string | null = null;
    let responsableId: string | undefined = params.responsable?.id;


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


    try {
      createdAlumnoRecord = await pb.collection(COLLECTION_NAME).create<AlumnoRecord>({
        numero_legajo: (params.alumno.numero_legajo || '').trim(),
        dni: (params.alumno.dni || '').trim(),
        apellidos: (params.alumno.apellidos || '').trim(),
        nombres: (params.alumno.nombres || '').trim(),
        fecha_nacimiento: params.alumno.fecha_nacimiento,
        nacionalidad: (params.alumno.nacionalidad || '').trim(),
        sexo: (params.alumno.sexo || '').trim(),
        telefono: (params.alumno.telefono || '').trim(),
        domicilio: (params.alumno.domicilio || '').trim(),
        usuario_acadeu: (params.alumno.usuario_acadeu || '').trim(),
        clave_acadeu: (params.alumno.clave_acadeu || '').trim(),
      });
    } catch (error) {
      throw new Error(
        `Error al guardar los Datos del Alumno (Sección 1): ${
          error instanceof Error ? error.message : 'Fallo en la creación'
        }`,
        { cause: error }
      );
    }


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

    const currentRecord = await pb.collection(COLLECTION_NAME).getOne(id, { fields: 'updated' });
    if (currentRecord.updated !== originalUpdatedDate) {
      throw new Error('El registro fue modificado por otro usuario. Por favor, refresca los datos.');
    }

    const record = await pb.collection(COLLECTION_NAME).update<AlumnoRecord>(id, data);
    return alumnoAdapter(record);
  },




  updateIntegral: async (
    id: string,
    params: {
      alumno: Partial<Omit<AlumnoRecord, 'id' | 'created' | 'updated'>>;
      inscripcion?: {
        id?: string;
        curso_id?: string;
        ciclo_id?: string;
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
    },
    originalUpdatedDate: string
  ): Promise<Alumno> => {

    const currentRecord = await pb.collection(COLLECTION_NAME).getOne(id, { fields: 'updated' });
    if (currentRecord.updated !== originalUpdatedDate) {
      throw new Error('El registro fue modificado por otro usuario. Por favor, refresca los datos.');
    }

    await pb.collection(COLLECTION_NAME).update<AlumnoRecord>(id, params.alumno);


    if (params.inscripcion && (params.inscripcion.curso_id || params.inscripcion.estado)) {
      let targetInscId = params.inscripcion.id;
      if (!targetInscId) {
        try {
          const list = await pb.collection(COLLECTION_INSCRIPCIONES).getFullList({
            filter: `alumno_id = "${id}"`,
            sort: '-created',
          });
          const active = list.find((i) => i.estado === 'Regular') || list[0];
          if (active) targetInscId = active.id;
        } catch {
          targetInscId = undefined;
        }
      }

      if (targetInscId) {
        await pb.collection(COLLECTION_INSCRIPCIONES).update(targetInscId, {
          ...(params.inscripcion.curso_id ? { curso_id: params.inscripcion.curso_id } : {}),
          ...(params.inscripcion.ciclo_id ? { ciclo_id: params.inscripcion.ciclo_id } : {}),
          numero_orden: params.inscripcion.numero_orden || null,
          numero_inscripcion: params.inscripcion.numero_inscripcion || '',
          fecha_inscripcion: params.inscripcion.fecha_inscripcion || '',
          fecha_ingreso: params.inscripcion.fecha_ingreso || '',
          fecha_egreso: params.inscripcion.fecha_egreso || '',
          estado: params.inscripcion.estado || 'Regular',
        });
      } else if (params.inscripcion.curso_id && params.inscripcion.ciclo_id) {
        await pb.collection(COLLECTION_INSCRIPCIONES).create({
          alumno_id: id,
          curso_id: params.inscripcion.curso_id,
          ciclo_id: params.inscripcion.ciclo_id,
          numero_orden: params.inscripcion.numero_orden || null,
          numero_inscripcion: params.inscripcion.numero_inscripcion || '',
          fecha_inscripcion: params.inscripcion.fecha_inscripcion || '',
          fecha_ingreso: params.inscripcion.fecha_ingreso || '',
          fecha_egreso: params.inscripcion.fecha_egreso || '',
          estado: params.inscripcion.estado || 'Regular',
        });
      }
    }


    if (params.responsable && params.responsable.dni?.trim()) {
      let responsableId = params.responsable.id;
      const sanitizedDni = params.responsable.dni.trim().replace(/"/g, '\\"');

      if (!responsableId) {
        try {
          const existing = await pb
            .collection(COLLECTION_RESPONSABLES)
            .getFirstListItem(`dni = "${sanitizedDni}"`);
          responsableId = existing.id;
        } catch {

          const newResp = await pb.collection(COLLECTION_RESPONSABLES).create({
            dni: params.responsable.dni.trim(),
            apellidos: (params.responsable.apellidos || '').trim(),
            nombres: (params.responsable.nombres || '').trim(),
            nacionalidad: (params.responsable.nacionalidad || '').trim(),
            profesion: (params.responsable.profesion || '').trim(),
            telefono: (params.responsable.telefono || '').trim(),
            email: (params.responsable.email || '').trim(),
          });
          responsableId = newResp.id;
        }
      } else {

        try {
          await pb.collection(COLLECTION_RESPONSABLES).update(responsableId, {
            apellidos: (params.responsable.apellidos || '').trim(),
            nombres: (params.responsable.nombres || '').trim(),
            nacionalidad: (params.responsable.nacionalidad || '').trim(),
            profesion: (params.responsable.profesion || '').trim(),
            telefono: (params.responsable.telefono || '').trim(),
            email: (params.responsable.email || '').trim(),
          });
        } catch (e) {
          console.error('Error al actualizar datos del responsable:', e);
        }
      }


      if (responsableId) {
        try {
          const existingRels = await pb.collection(COLLECTION_ALUMNO_RESPONSABLE).getFullList({
            filter: `alumno_id = "${id}"`,
          });
          const matchRel = existingRels.find((r) => r.responsable_id === responsableId) || existingRels[0];
          if (matchRel) {
            await pb.collection(COLLECTION_ALUMNO_RESPONSABLE).update(matchRel.id, {
              responsable_id: responsableId,
              vinculo: (params.vinculo || 'Tutor/a').trim(),
            });
          } else {
            await pb.collection(COLLECTION_ALUMNO_RESPONSABLE).create({
              alumno_id: id,
              responsable_id: responsableId,
              vinculo: (params.vinculo || 'Tutor/a').trim(),
            });
          }
        } catch (e) {
          console.error('Error al actualizar relación alumno_responsable:', e);
        }
      }
    }


    const fullUpdated = await pb.collection(COLLECTION_NAME).getOne<AlumnoRecord>(id, {
      expand: 'inscripciones_via_alumno_id.curso_id.nivel_id',
    });

    return alumnoAdapter(fullUpdated);
  },




  darDeBaja: async (alumnoId: string, fechaEgreso: string, inscripcionId?: string): Promise<void> => {
    let targetInscId = inscripcionId;

    if (!targetInscId) {
      try {
        const inscripciones = await pb.collection(COLLECTION_INSCRIPCIONES).getFullList({
          filter: `alumno_id = "${alumnoId}"`,
          sort: '-created',
        });
        const active = inscripciones.find((i) => i.estado === 'Regular') || inscripciones[0];
        if (active) {
          targetInscId = active.id;
        }
      } catch (e) {
        console.error('Error al buscar inscripción activa del alumno para baja:', e);
      }
    }

    if (targetInscId) {
      await pb.collection(COLLECTION_INSCRIPCIONES).update(targetInscId, {
        estado: 'Baja',
        fecha_egreso: fechaEgreso,
      });
    } else {
      throw new Error('No se encontró una inscripción activa para registrar la baja del estudiante.');
    }
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
