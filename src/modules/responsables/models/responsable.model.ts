export interface ResponsableRecord {
  id: string;
  created: string;
  updated: string;
  dni: string;
  apellidos: string;
  nombres: string;
  nacionalidad: string;
  profesion: string;
  telefono: string;
  email: string;
}

export interface Responsable {
  id: string;
  dni: string;
  apellidos: string;
  nombres: string;
  nacionalidad: string;
  profesion: string;
  telefono: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export const responsableAdapter = (record: ResponsableRecord): Responsable => {
  return {
    id: record.id,
    dni: record.dni || '',
    apellidos: record.apellidos || '',
    nombres: record.nombres || '',
    nacionalidad: record.nacionalidad || '',
    profesion: record.profesion || '',
    telefono: record.telefono || '',
    email: record.email || '',
    createdAt: record.created,
    updatedAt: record.updated,
  };
};

export interface AlumnoResponsableRecord {
  id: string;
  created: string;
  updated: string;
  alumno_id: string;
  responsable_id: string;
  vinculo: string;
}

export interface AlumnoResponsable {
  id: string;
  alumnoId: string;
  responsableId: string;
  vinculo: string;
  createdAt: string;
  updatedAt: string;
}

export const alumnoResponsableAdapter = (record: AlumnoResponsableRecord): AlumnoResponsable => {
  return {
    id: record.id,
    alumnoId: record.alumno_id,
    responsableId: record.responsable_id,
    vinculo: record.vinculo,
    createdAt: record.created,
    updatedAt: record.updated,
  };
};
