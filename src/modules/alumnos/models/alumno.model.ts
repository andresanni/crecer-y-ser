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
  expand?: {
    inscripciones_via_alumno_id?: Array<{
      id: string;
      curso_id: string;
      estado: string;
      expand?: {
        curso_id?: {
          id: string;
          nombre: string;
          turno: string;
          expand?: {
            nivel_id?: {
              nombre: string;
            };
          };
        };
      };
    }>;
  };
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
  cursoId?: string;
  cursoNombre?: string;
  nivelNombre?: string;
  turno?: string;
  estadoInscripcion?: string;
  createdAt: string;
  updatedAt: string;
}

export const alumnoAdapter = (record: AlumnoRecord): Alumno => {
  // Extraer información de curso si viene expandida
  const activeInsc = record.expand?.inscripciones_via_alumno_id?.find(
    (i) => i.estado === 'Regular'
  ) || record.expand?.inscripciones_via_alumno_id?.[0];

  const cursoRecord = activeInsc?.expand?.curso_id;

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
    cursoId: cursoRecord?.id || activeInsc?.curso_id || undefined,
    cursoNombre: cursoRecord?.nombre || undefined,
    nivelNombre: cursoRecord?.expand?.nivel_id?.nombre || undefined,
    turno: cursoRecord?.turno || undefined,
    estadoInscripcion: activeInsc?.estado || undefined,
    createdAt: record.created,
    updatedAt: record.updated,
  };
};
