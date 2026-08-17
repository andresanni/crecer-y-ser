export interface AlumnoRecord {
  id: string;
  created: string;
  updated: string;
  numero_legajo: string;
  dni: string;
  apellidos: string;
  nombres: string;
  fecha_nacimiento: string;
  nacionalidad: string;
  sexo: string;
  telefono: string;
  domicilio: string;
  usuario_acadeu: string;
  clave_acadeu: string;
}

export interface Alumno {
  id: string;
  numeroLegajo: string;
  dni: string;
  apellidos: string;
  nombres: string;
  fechaNacimiento: string;
  nacionalidad: string;
  sexo: string;
  telefono: string;
  domicilio: string;
  usuarioAcadeu: string;
  claveAcadeu: string;
  createdAt: string;
  updatedAt: string;
}

export const alumnoAdapter = (record: AlumnoRecord): Alumno => {
  return {
    id: record.id,
    numeroLegajo: record.numero_legajo || '',
    dni: record.dni || '',
    apellidos: record.apellidos || '',
    nombres: record.nombres || '',
    fechaNacimiento: record.fecha_nacimiento || '',
    nacionalidad: record.nacionalidad || '',
    sexo: record.sexo || '',
    telefono: record.telefono || '',
    domicilio: record.domicilio || '',
    usuarioAcadeu: record.usuario_acadeu || '',
    claveAcadeu: record.clave_acadeu || '',
    createdAt: record.created,
    updatedAt: record.updated,
  };
};
