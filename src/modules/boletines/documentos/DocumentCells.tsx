import type { CalificacionDocumental, ConceptoCalificacion, ValorDocumental } from './boletinDocument.model';
import styles from './BoletinDocument.module.css';

export function ValorCelda({ valor }: { valor: ValorDocumental }) {
  if (valor.estado === 'confirmado') return <>{valor.texto}</>;
  return <span title={valor.estado === 'futuro' ? 'Período futuro' : 'Dato pendiente'}>{valor.estado === 'futuro' ? '---' : 'Pendiente'}</span>;
}

const etiquetasCalificacion: Record<ConceptoCalificacion, string> = {
  destacado: 'DESTACADO',
  avanzado: 'AVANZADO',
  alcanzado: 'ALCANZADO',
  enProceso: 'EN PROCESO',
  noAlcanzoObjetivos: 'NO ALCANZÓ LOS OBJETIVOS',
  noCorresponde: 'NO CORRESPONDE A LA PLANIFICACIÓN DEL BIMESTRE',
};

export function CalificacionCelda({ valor }: { valor: CalificacionDocumental }) {
  if (valor.estado !== 'confirmado') return <span className={styles.calificacion}><ValorCelda valor={valor} /></span>;
  return <span className={styles.calificacion} data-concepto={valor.concepto}>
    <span className={styles.etiquetaCalificacion}>{etiquetasCalificacion[valor.concepto]}</span>
    {valor.numero !== undefined && valor.concepto !== 'noCorresponde' && <span className={styles.numeroCalificacion}>{valor.numero}</span>}
  </span>;
}

