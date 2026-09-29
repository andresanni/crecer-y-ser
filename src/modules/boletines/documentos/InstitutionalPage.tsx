import { descripcionEscala, objetivosEscuela } from './boletinInstitutionalContent';
import styles from './BoletinDocument.module.css';
import type { GradoPrimario } from './boletinDocument.model';

export function InstitutionalPage({ grado }: { grado: GradoPrimario }) {
  const cantidadAprobadas = grado === 7 ? 3 : 4;
  return (
    <div className={styles.institucional}>
      <img className={styles.escudoCiudad} src="/boletines/escudo-ciudad.png" alt="Escudo de la Ciudad de Buenos Aires" />
      <p className={styles.cita}>La Ciudad reconoce y garantiza un sistema educativo inspirado en los principios de la libertad, la ética y la solidaridad, tendiente a un desarrollo integral de la persona en una sociedad justa y democrática&quot;. CONSTITUCIÓN DE LA CIUDAD DE BUENOS AIRES - Art. 23 - Cap. III</p>
      <div className={styles.objetivos}>
        <h2>Objetivos del Proyecto Escuela</h2>
        <p>La Escuela asume el compromiso de:</p>
        <ol>{objetivosEscuela.map(objetivo => <li key={objetivo}>{objetivo}</li>)}</ol>
      </div>
      <p className={styles.lema}>Educamos para la Vida</p>
      <table className={styles.escala} aria-label="Descripción de escala de calificación">
        <colgroup><col className={styles.colEtiqueta} /><col /><col className={styles.colResultado} /></colgroup>
        <thead><tr><th colSpan={3}>DESCRIPCIÓN DE ESCALA DE CALIFICACIÓN</th></tr></thead>
        <tbody>{descripcionEscala.map((valor, index) => <tr key={valor.etiqueta}>
          <th scope="row">{valor.etiqueta}</th>
          <td>{valor.descripcion}</td>
          {index === 0 && <td rowSpan={cantidadAprobadas} className={styles.aprobado}>Aprobado</td>}
          {index === cantidadAprobadas && <td rowSpan={descripcionEscala.length - cantidadAprobadas} className={styles.desaprobado}>Desaprobado</td>}
        </tr>)}</tbody>
      </table>
    </div>
  );
}
