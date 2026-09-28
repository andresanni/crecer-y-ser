import type { GradoPrimario, MateriaAcademicaDocumental, MateriaFormativaDocumental } from './boletinDocument.model';
import { cicloPedagogicoDelGrado } from './boletinDocument.model';
import { descripcionEscala } from './boletinInstitutionalContent';
import { CalificacionCelda, ValorCelda } from './DocumentCells';
import { CriterionText } from './CriterionText';
import styles from './BoletinDocument.module.css';

type EvaluationTableProps =
  | { tipo: 'formativa'; materia: MateriaFormativaDocumental }
  | { tipo: 'academica'; materia: MateriaAcademicaDocumental; grado: GradoPrimario };

export function EvaluationTable(props: EvaluationTableProps) {
  const { materia } = props;
  return <table className={styles.tablaFormativa} aria-label={materia.nombre}>
    <colgroup><col className={styles.colCriterio} />{[1, 2, 3, 4].map(numero => <col key={numero} />)}</colgroup>
    <thead>
      {props.tipo === 'academica' && <tr className={styles.cuatrimestres}>
        <th scope="col">{cicloPedagogicoDelGrado(props.grado)} · {props.grado}° Grado</th>
        <th scope="colgroup" colSpan={2}>1er Cuatrimestre</th><th scope="colgroup" colSpan={2}>2do Cuatrimestre</th>
      </tr>}
      <tr><th scope="col" data-dynamic-field="Nombre de la materia">{materia.nombre}</th>{['Primer', 'Segundo', 'Tercer', 'Cuarto'].map(nombre => <th key={nombre} scope="col">{nombre}<br />Bimestre</th>)}</tr>
    </thead>
    <tbody>
      {props.tipo === 'academica' && <tr className={styles.filaPpi}><th scope="row">PPI</th>{props.materia.ppi.map((valor, index) => <td key={index} data-dynamic-field={`${materia.nombre}, PPI, bimestre ${index + 1}`}><ValorCelda valor={valor} /></td>)}</tr>}
      {materia.criterios.map(criterio => <tr key={criterio.id}>
        <th scope="row"><CriterionText texto={criterio.texto} materia={materia.nombre} /></th>
        {criterio.bimestres.map((valor, index) => <td key={index} data-dynamic-field={`${materia.nombre}, criterio ${criterio.id}, bimestre ${index + 1}`}><CalificacionCelda valor={valor} /></td>)}
      </tr>)}
      {props.tipo === 'academica' && <tr className={styles.filaGeneral}><th scope="row">CALIFICACIÓN GENERAL</th>{props.materia.calificacionGeneral.map((valor, index) => <td key={index} data-dynamic-field={`${materia.nombre}, calificación general, bimestre ${index + 1}`}><CalificacionCelda valor={valor} /></td>)}</tr>}
    </tbody>
  </table>;
}

export function ScaleLegend() {
  return <p className={styles.leyendaEscala}>Escala de calificación para calificación general: {descripcionEscala.map(valor => valor.etiqueta).join(', ')}</p>;
}
