import type { GradoPrimario, MateriaAcademicaDocumental } from './boletinDocument.model';
import { EvaluationTable, ScaleLegend } from './EvaluationTable';
import styles from './BoletinDocument.module.css';

export function AcademicPage({ grado, materias }: { grado: GradoPrimario; materias: MateriaAcademicaDocumental[] }) {
  return <div className={`${styles.academica} ${grado <= 3 ? styles.primerCiclo : styles.segundoCiclo}`}>
    <div className={styles.materiasAcademicas}>{materias.map(materia => <EvaluationTable key={materia.id} tipo="academica" materia={materia} grado={grado} />)}</div>
    <ScaleLegend />
  </div>;
}
