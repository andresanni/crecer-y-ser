import type { BoletinDocumentData, CalificacionDocumental, ConceptoCalificacion, GradoPrimario, ValorDocumental } from './boletinDocument.model';
import type { DocumentSnapshot } from './documentSnapshot.model';

const conceptos: Record<string, ConceptoCalificacion> = {
  destacado: 'destacado',
  avanzado: 'avanzado',
  alcanzado: 'alcanzado',
  'en proceso': 'enProceso',
  'no alcanzo los objetivos': 'noAlcanzoObjetivos',
  'no corresponde': 'noCorresponde',
};

export function adaptarInstantaneaDocumental(snapshot: DocumentSnapshot, institucion: BoletinDocumentData['institucion']): {
  documento: BoletinDocumentData | null;
  bloqueos: string[];
  pendientes: string[];
} {
  const data = snapshot.datos;
  const bloqueos: string[] = [];
  const pendientes = data.bimestreCorte === 4 ? ['Definir síntesis, promoción y registro administrativo anual antes de emitir.'] : [];
  const match = /^([1-7])\s*[°º]?$/.exec(data.curso.nombre.trim());
  if (!match || data.versionContrato !== 1 || !Number.isInteger(data.bimestreCorte) || data.bimestreCorte < 1 || data.bimestreCorte > 4) {
    return { documento: null, bloqueos: ['El grado, corte o versión del contrato no está admitido.'], pendientes };
  }
  const grado = Number(match[1]) as GradoPrimario;
  const futuro = { estado: 'futuro' } as const;
  const sinDato = { estado: 'sinDato' } as const;
  const texto = (value: string | null): ValorDocumental => value?.trim() && value !== '-' ? { estado: 'confirmado', texto: value } : sinDato;
  const cuatro = <T,>(factory: (n: number) => T): [T, T, T, T] => [factory(1), factory(2), factory(3), factory(4)];
  const periodos = new Map(data.periodos.map(period => [period.bimestre, period]));
  if (periodos.size !== data.periodos.length || data.periodos.some(p => p.bimestre > data.bimestreCorte || p.bimestre < 1)) bloqueos.push('La instantánea contiene períodos duplicados o fuera del corte.');
  for (let n = 1; n <= data.bimestreCorte; n++) {
    const dependencies = data.dependencias.filter(d => d.bimestre === n);
    if (!periodos.has(n) || dependencies.length !== 1 || !dependencies[0].vigente) bloqueos.push(`Faltan datos o visado vigente del bimestre ${n}.`);
  }
  const escala = new Map<string, { concepto: ConceptoCalificacion; numero?: number }>();
  data.escala.forEach(value => {
    const key = value.etiqueta.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
    const numeric = /^(.*?)\s+(?:-\s*)?(10|[1-9])$/.exec(key);
    const concepto = conceptos[grado >= 4 && numeric ? numeric[1] : key];
    const numero = grado >= 4 && numeric ? Number(numeric[2]) : undefined;
    if (!concepto || escala.has(value.id) || (grado >= 4 && (concepto === 'noCorresponde' ? numero !== undefined : numero === undefined))) {
      bloqueos.push(`Valor de escala no reconocido, duplicado o sin número de segundo ciclo: ${value.etiqueta}.`);
    } else escala.set(value.id, { concepto, ...(numero === undefined ? {} : { numero }) });
  });
  const nota = (id: string | null | undefined, n: number, campo: string): CalificacionDocumental => {
    if (n > data.bimestreCorte) return futuro;
    const calificacion = id ? escala.get(id) : undefined;
    if (!calificacion) { bloqueos.push(`Falta una calificación válida: ${campo}, bimestre ${n}.`); return sinDato; }
    return { estado: 'confirmado', ...calificacion };
  };
  const materias = [...data.materias].sort((a, b) => a.ordenVisual - b.ordenVisual);
  if (materias.length !== (grado <= 3 ? 10 : 11) || materias.filter(m => m.formativa).length !== 2) bloqueos.push(`La malla no coincide con la composición de ${grado <= 3 ? 'primer' : 'segundo'} ciclo.`);
  const academic = materias.map(materia => {
    if (materia.criterios.length !== 5) bloqueos.push(`${materia.materiaNombre} requiere cinco conceptos.`);
    const evaluacion = (n: number) => {
      const matches = periodos.get(n)?.evaluaciones.filter(e => e.cursoMateriaId === materia.id) || [];
      if (matches.length > 1) bloqueos.push(`Evaluación duplicada: ${materia.materiaNombre}, bimestre ${n}.`);
      return matches.length === 1 ? matches[0] : undefined;
    };
    return {
      id: materia.id,
      nombre: materia.materiaNombre.toLocaleUpperCase('es-AR'),
      criterios: [...materia.criterios].sort((a, b) => a.orden - b.orden).map(criterio => ({
        id: criterio.id,
        texto: criterio.texto,
        bimestres: cuatro(n => {
          if (n > data.bimestreCorte) return futuro;
          const matches = evaluacion(n)?.criterios.filter(c => c.criterioId === criterio.id) || [];
          return nota(matches.length === 1 ? matches[0].valorEscalaId : null, n, criterio.texto);
        }),
      })),
      ppi: cuatro<ValorDocumental>(n => {
        if (n > data.bimestreCorte) return futuro;
        const value = evaluacion(n)?.ppi;
        if (typeof value !== 'boolean') { bloqueos.push(`Falta PPI: ${materia.materiaNombre}, bimestre ${n}.`); return sinDato; }
        return { estado: 'confirmado', texto: value ? 'SÍ' : 'NO' };
      }),
      calificacionGeneral: cuatro<CalificacionDocumental>(n => materia.formativa ? sinDato : nota(evaluacion(n)?.calificacionGeneralId, n, materia.materiaNombre)),
    };
  });
  const cierre = <N extends 1 | 2 | 3 | 4>(bimestre: N) => {
    const source = periodos.get(bimestre)?.cierre;
    const cantidad = (value: number | undefined): ValorDocumental => {
      if (bimestre > data.bimestreCorte) return futuro;
      if (value === undefined || !Number.isInteger(value) || value < 0) { bloqueos.push(`Falta un cierre válido en bimestre ${bimestre}.`); return sinDato; }
      return { estado: 'confirmado', texto: String(value) };
    };
    return { bimestre, asistencias: cantidad(source?.asistencias), inasistencias: cantidad(source?.inasistencias), llegadasTarde: cantidad(source?.llegadasTarde), observaciones: bimestre > data.bimestreCorte ? futuro : source ? { estado: 'confirmado', texto: source.observaciones } as const : sinDato };
  };
  const anual = data.bimestreCorte < 4 ? futuro : sinDato;
  const respuestaBinaria = (value: string | null): ValorDocumental => value === 'SI'
    ? { estado: 'confirmado', texto: 'SÍ' }
    : value === 'NO' ? { estado: 'confirmado', texto: 'NO' } : sinDato;
  const integracion: BoletinDocumentData['integracion'] = {
    poseeApoyos: respuestaBinaria(data.apoyos.poseeApoyos),
    cualesApoyos: data.apoyos.poseeApoyos === 'NO'
      ? { estado: 'confirmado', texto: '---' }
      : data.apoyos.poseeApoyos === 'SI' ? texto(data.apoyos.cualesApoyos) : sinDato,
    promocionoConAcompanamiento: data.bimestreCorte < 4 ? futuro : respuestaBinaria(data.apoyos.promocionoConAcompanamiento),
  };
  const cambio = () => ({ fecha: anual, causa: anual, escuelaDestino: anual });
  const documento: BoletinDocumentData = {
    institucion,
    alumno: data.alumno,
    responsable: { apellidos: data.responsable.apellidos, nombres: data.responsable.nombres },
    curso: { grado },
    ano: data.ciclo.ano,
    materiasFormativas: academic.filter((_, index) => materias[index].formativa),
    materiasAcademicas: academic.filter((_, index) => !materias[index].formativa),
    cierres: [cierre(1), cierre(2), cierre(3), cierre(4)],
    integracion,
    cierreAnual: { sintesis: anual, permaneceEn: anual, promovidoA: anual },
    registroAdministrativo: { escuelaInicial: anual, fechaIngreso: anual, fechaEgreso: anual, cambiosEscuela: [cambio(), cambio(), cambio(), cambio()], domicilio: anual, telefono: anual, cambioDomicilio: anual },
  };
  return { documento: bloqueos.length ? null : documento, bloqueos: [...new Set(bloqueos)], pendientes };
}
