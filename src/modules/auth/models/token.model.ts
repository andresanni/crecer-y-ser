import type { CursoRecord } from '../../inscripciones/models/inscripcion.model';
import type { PeriodoRecord, MateriaRecord } from '../../boletines/models/boletin.model';

export interface TokenAccesoDocenteRecord {
  id: string;
  created: string;
  updated: string;
  token: string;
  curso_id: string;
  periodo_id: string;
  materia_id: string;
  docente_nombre: string;
  activo: boolean;
  fecha_expiracion: string;
  expand?: {
    curso_id?: CursoRecord;
    periodo_id?: PeriodoRecord;
    materia_id?: MateriaRecord;
  };
}

export interface TokenAccesoDocente {
  id: string;
  token: string;
  cursoId: string;
  periodoId: string;
  materiaId: string;
  docenteNombre: string;
  activo: boolean;
  fechaExpiracion: string;
  cursoNombre?: string;
  periodoNombre?: string;
  materiaNombre?: string;
  createdAt: string;
  updatedAt: string;
}

export const tokenAccesoDocenteAdapter = (record: TokenAccesoDocenteRecord): TokenAccesoDocente => ({
  id: record.id,
  token: record.token,
  cursoId: record.curso_id,
  periodoId: record.periodo_id,
  materiaId: record.materia_id,
  docenteNombre: record.docente_nombre || '',
  activo: Boolean(record.activo),
  fechaExpiracion: record.fecha_expiracion || '',
  cursoNombre: record.expand?.curso_id?.nombre,
  periodoNombre: record.expand?.periodo_id?.nombre,
  materiaNombre: record.expand?.materia_id?.nombre,
  createdAt: record.created,
  updatedAt: record.updated,
});
