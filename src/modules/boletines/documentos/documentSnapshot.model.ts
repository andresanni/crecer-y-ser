export interface DocumentSnapshot {
  huella: string;
  datos: {
    versionContrato: number;
    cursada?: { estado: 'PENDIENTE' | 'CONFIRMADA' | 'SIN_CURSADA'; desde: number; hasta: number; revision: number };
    inscripcionId: string;
    ciclo: { id: string; ano: number };
    curso: { id: string; nombre: string };
    bimestreCorte: number;
    alumno: { apellidos: string; nombres: string; dni: string };
    responsable: { id: string; apellidos: string; nombres: string; vinculo: string };
    materias: Array<{
      id: string;
      materiaNombre: string;
      ordenVisual: number;
      formativa: boolean;
      criterios: Array<{ id: string; texto: string; orden: number }>;
    }>;
    escala: Array<{ id: string; etiqueta: string; pesoNumerico: number; orden: number }>;
    periodos: Array<{
      bimestre: number;
      periodoId: string;
      evaluaciones: Array<{
        id: string;
        cursoMateriaId: string;
        ppi: boolean;
        calificacionGeneralId: string | null;
        criterios: Array<{ criterioId: string; valorEscalaId: string }>;
      }>;
      cierre: { asistencias: number; inasistencias: number; llegadasTarde: number; observaciones: string } | null;
    }>;
    apoyos: { poseeApoyos: string; cualesApoyos: string; promocionoConAcompanamiento: string | null };
    administrativo: { domicilio: string; telefono: string; fechaIngreso: string; fechaEgreso: string };
    dependencias: Array<{ bimestre: number; vigente: boolean; visadoId: string | null; generacionVisado: number | null; revisionContenido: number | null; revisionVisada: number | null }>;
    pendientesDeIntegracion: string[];
  };
}
