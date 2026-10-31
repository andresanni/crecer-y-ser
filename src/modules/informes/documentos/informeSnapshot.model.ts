export interface InformeDocumentSnapshotDatos {
  instanciaId: string;
  inscripcionId: string;
  tipoInforme: 'PRIMER_BIMESTRE' | 'PRIMER_CUATRIMESTRE' | 'CICLO_FINAL';
  ciclo: {
    id: string;
    nombre: string;
    ano: number;
  };
  curso: {
    id: string;
    nombre: string;
    grado: string;
    gradoNumero: number;
    turno: string;
  };
  materia: {
    id: string;
    nombre: string;
    codigoEspecial: string | null;
    etiquetaPdf: string;
  } | null;
  docente: {
    nombre: string;
    apellido: string;
  };
  direccion: {
    nombre: string;
    apellido: string;
  };
  alumno: {
    id: string;
    apellidos: string;
    nombres: string;
    numeroOrden: number | null;
  };
  plantilla: {
    id: string;
    codigo: string;
    tipoInforme: 'PRIMER_BIMESTRE' | 'PRIMER_CUATRIMESTRE' | 'CICLO_FINAL';
    materiaId: string | null;
    gradoDesde: number;
    gradoHasta: number;
    tituloTabla: string;
    escalaItems: Array<{ codigo: string; etiqueta: string; descripcion?: string }>;
    mostrarLeyendaEscala: boolean;
    requiereDesempenoGeneral: boolean;
    escalaDesempenoGeneral: Array<{ codigo: string; etiqueta: string }>;
    permiteObservaciones: boolean;
  };
  items: Array<{
    id: string;
    plantillaId: string;
    bloqueNombre: string | null;
    bloqueOrden: number | null;
    ordenVisual: number;
    pagina: number;
    texto: string;
  }>;
  evaluacion: {
    desempenoGeneralCodigo: string | null;
    desempenoGeneralEtiqueta: string | null;
    observaciones: string;
    respuestas: Array<{ itemId: string; valorCodigo: string }>;
  };
  visado: {
    generacionVisado: number;
    revisionVisada: number;
    visadoAt: string | null;
    visadoPor: string | null;
  };
}

export interface InformeDocumentSnapshot {
  huella: string;
  datos: InformeDocumentSnapshotDatos;
}
