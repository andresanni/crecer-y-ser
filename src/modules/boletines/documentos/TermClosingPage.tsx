import type { CierreBimestralDocumental } from './boletinDocument.model';
import { ValorCelda } from './DocumentCells';
import { ScaleLegend } from './EvaluationTable';
import styles from './BoletinDocument.module.css';

export function TermClosingPage({ cierre }: { cierre: CierreBimestralDocumental }) {
  const sinObservaciones = cierre.observaciones.estado === 'confirmado' && !cierre.observaciones.texto.trim();
  const asistencias = [
    { etiqueta: 'Asistencias', valor: cierre.asistencias },
    { etiqueta: 'Inasistencias', valor: cierre.inasistencias },
    { etiqueta: 'Llegadas tarde', valor: cierre.llegadasTarde },
  ];
  return <div className={styles.cierreBimestral}>
    <table className={styles.tablaCierre} aria-label={`Cierre del ${cierre.bimestre}° bimestre`}>
      <colgroup><col className={styles.colAsistencia} /><col /></colgroup>
      <thead>
        <tr><th colSpan={2}>{cierre.bimestre}° BIMESTRE</th></tr>
        <tr><th colSpan={2}>Control de asistencia</th></tr>
      </thead>
      <tbody>
        {asistencias.map(({ etiqueta, valor }) => <tr key={etiqueta}>
          <th scope="row">{etiqueta}</th>
          <td data-dynamic-field={`${etiqueta}, bimestre ${cierre.bimestre}`}><ValorCelda valor={valor} /></td>
        </tr>)}
        <tr><th colSpan={2} id={`observaciones-bimestre-${cierre.bimestre}`} className={styles.tituloObservaciones}>Observaciones</th></tr>
        <tr><td colSpan={2} headers={`observaciones-bimestre-${cierre.bimestre}`}>
          <div className={`${styles.observacionesCierre} ${sinObservaciones ? styles.observacionesVacias : ''}`} data-dynamic-field={`Observaciones, bimestre ${cierre.bimestre}`}>{sinObservaciones ? '---' : <ValorCelda valor={cierre.observaciones} />}</div>
        </td></tr>
      </tbody>
    </table>
    <div className={styles.firmasCierre} aria-label="Espacios de firma para completar en papel">
      {['Firma Maestro/a', 'Firma Director/a', 'Firma del Responsable', 'Firma Alumno/a'].map(etiqueta => <div key={etiqueta}>
        <div className={styles.espacioFirma} aria-hidden="true" />
        <p>{etiqueta}</p>
      </div>)}
    </div>
    <ScaleLegend />
  </div>;
}
