import type { BoletinDocumentData } from './boletinDocument.model';
import { ValorCelda } from './DocumentCells';
import { EvaluationTable, ScaleLegend } from './EvaluationTable';
import styles from './BoletinDocument.module.css';

export function FormativePage({ data }: { data: BoletinDocumentData }) {
  return <div className={`${styles.formativa} ${data.curso.grado <= 3 ? styles.primerCiclo : styles.segundoCiclo}`}>
    <div className={styles.integracion}>
      <h2>Cuadro de informe sobre dispositivos de apoyo e integración escolar</h2>
      <table aria-label="Apoyos e integración escolar">
        <colgroup><col className={styles.colApoyoPregunta} /><col className={styles.colApoyoRespuesta} /><col className={styles.colApoyoCuales} /><col /></colgroup>
        <tbody>
          <tr><th scope="row">¿Promocionó con acompañamiento?</th><td data-dynamic-field="Promoción con acompañamiento"><ValorCelda valor={data.integracion.promocionoConAcompanamiento} /></td><td className={styles.celdaSinCampo} colSpan={2} /></tr>
          <tr><th scope="row">¿Posee apoyos / acompañamiento?</th><td data-dynamic-field="Posee apoyos"><ValorCelda valor={data.integracion.poseeApoyos} /></td><th scope="row">¿Cuáles?</th><td data-dynamic-field="Detalle de apoyos"><ValorCelda valor={data.integracion.cualesApoyos} /></td></tr>
        </tbody>
      </table>
    </div>
    <div className={styles.materiasFormativas}>{data.materiasFormativas.map(materia => <EvaluationTable key={materia.id} tipo="formativa" materia={materia} />)}</div>
    <ScaleLegend />
  </div>;
}
