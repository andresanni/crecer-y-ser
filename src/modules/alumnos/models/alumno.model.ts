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
  domicilio: string;
  localidad?: string;
  usuario_acadeu: string;
  clave_acadeu: string;
  expand?: {
    inscripciones_via_alumno_id?: Array<{
      id: string;
      curso_id: string;
      ciclo_id?: string;
      numero_orden?: number;
      numero_inscripcion?: string;
      fecha_inscripcion?: string;
      fecha_ingreso?: string;
      fecha_egreso?: string;
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
  domicilio: string;
  localidad?: string;
  usuarioAcadeu: string;
  claveAcadeu: string;
  cursoId?: string;
  cursoNombre?: string;
  nivelNombre?: string;
  turno?: string;
  estadoInscripcion?: string;
  fechaEgreso?: string;
  fechaIngreso?: string;
  numeroOrden?: number | null;
  numeroInscripcion?: string;
  inscripcionId?: string;
  cicloId?: string;
  createdAt: string;
  updatedAt: string;
}

export const alumnoAdapter = (record: AlumnoRecord): Alumno => {

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
    fechaNacimiento: record.fecha_nacimiento?.slice(0, 10) || '',
    nacionalidad: record.nacionalidad || '',
    sexo: record.sexo || '',
    domicilio: record.domicilio || '',
    localidad: record.localidad || '',
    usuarioAcadeu: record.usuario_acadeu || '',
    claveAcadeu: record.clave_acadeu || '',
    cursoId: cursoRecord?.id || activeInsc?.curso_id || undefined,
    cursoNombre: cursoRecord?.nombre || undefined,
    nivelNombre: cursoRecord?.expand?.nivel_id?.nombre || undefined,
    turno: cursoRecord?.turno || undefined,
    estadoInscripcion: activeInsc?.estado || undefined,
    fechaEgreso: activeInsc?.fecha_egreso?.slice(0, 10) || undefined,
    fechaIngreso: activeInsc?.fecha_ingreso?.slice(0, 10) || undefined,
    numeroOrden: activeInsc?.numero_orden ?? null,
    numeroInscripcion: activeInsc?.numero_inscripcion || undefined,
    inscripcionId: activeInsc?.id || undefined,
    cicloId: activeInsc?.ciclo_id || undefined,
    createdAt: record.created,
    updatedAt: record.updated,
  };
};
