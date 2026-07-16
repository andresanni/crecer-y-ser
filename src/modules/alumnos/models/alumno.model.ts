export interface AlumnoRecord {
  id: string;
  created: string;
  updated: string;
  numero_legajo: string;
  dni: string;
  apellidos: string;
  nombres: string;
  fecha_nacimiento: string;
}

export interface Alumno {
  id: string;
  numeroLegajo: string;
  dni: string;
  apellidos: string;
  nombres: string;
  fechaNacimiento: string;
  createdAt: string;
  updatedAt: string;
}

export const alumnoAdapter = (record: AlumnoRecord): Alumno => {
  return {
    id: record.id,
    numeroLegajo: record.numero_legajo,
    dni: record.dni,
    apellidos: record.apellidos,
    nombres: record.nombres,
    fechaNacimiento: record.fecha_nacimiento,
    createdAt: record.created,
    updatedAt: record.updated,
  };
};
