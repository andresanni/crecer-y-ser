import type { CierreAnualDocumental, RegistroAdministrativoDocumental, ValorDocumental } from './boletinDocument.model';
import { ValorCelda } from './DocumentCells';
import styles from './BoletinDocument.module.css';

function CampoAnual({ titulo, valor, extenso = false }: { titulo: string; valor: ValorDocumental; extenso?: boolean }) {
  const esGuiones = valor.estado === 'futuro'
    || valor.estado === 'sinDato'
    || (valor.estado === 'confirmado' && (!valor.texto || !valor.texto.trim() || valor.texto.trim() === '---'));
  const className = extenso
    ? `${styles.sintesisAnual} ${esGuiones ? styles.observacionesVacias : ''}`
    : styles.valorAnual;
  return <table className={styles.tablaAnual} aria-label={titulo}>
    <thead><tr><th scope="col">{titulo}</th></tr></thead>
    <tbody><tr><td><div className={className} data-dynamic-field={titulo}>{esGuiones && extenso ? '---' : <ValorCelda valor={valor} />}</div></td></tr></tbody>
  </table>;
}

export function AnnualSummaryPage({ cierre }: { cierre: CierreAnualDocumental }) {
  return <div className={styles.resumenAnual}>
    <CampoAnual titulo="Síntesis Conceptual" valor={cierre.sintesis} extenso />
    <CampoAnual titulo="Permanece en" valor={cierre.permaneceEn} />
    <CampoAnual titulo="Promovido/a a:" valor={cierre.promovidoA} />
    <div className={styles.firmaAnual} aria-label="Firma y sello de la directora para completar en papel">
      <div aria-hidden="true" />
      <p>FIRMA Y SELLO DIRECTORA</p>
    </div>
  </div>;
}

export function AdministrativeHeader() {
  return <header className={styles.encabezadoAdministrativo}>
    <span>República <img src="/boletines/escudo-argentina.png" alt="Escudo de la República Argentina" /> Argentina</span>
    <strong>EDUCACIÓN OFICIAL A-1134</strong>
  </header>;
}

export function AdministrativePage({ registro }: { registro: RegistroAdministrativoDocumental }) {
  return <div className={styles.registroAnual}>
    <table className={styles.tablaAnual} aria-label="Escuela de inicio del año">
      <thead><tr>{['Escuela en la que inició el año', 'Fecha de ingreso', 'Fecha de egreso'].map(titulo => <th key={titulo} scope="col">{titulo}</th>)}</tr></thead>
      <tbody><tr>{[registro.escuelaInicial, registro.fechaIngreso, registro.fechaEgreso].map((valor, index) => <td key={index} data-dynamic-field={['Escuela inicial', 'Fecha de ingreso', 'Fecha de egreso'][index]}><ValorCelda valor={valor} /></td>)}</tr></tbody>
    </table>
    <table className={styles.tablaAnual} aria-label="Cambios de Escuela">
      <thead><tr><th colSpan={4}>Cambios de Escuela</th></tr><tr>{['Fechas', 'Causas', 'Pasa a la Escuela', 'Firma Directora'].map(titulo => <th key={titulo} scope="col">{titulo}</th>)}</tr></thead>
      <tbody>{registro.cambiosEscuela.map((cambio, index) => <tr key={index}>
        <td data-dynamic-field={`Cambio de escuela ${index + 1}: fecha`}><ValorCelda valor={cambio.fecha} /></td>
        <td data-dynamic-field={`Cambio de escuela ${index + 1}: causa`}><ValorCelda valor={cambio.causa} /></td>
        <td data-dynamic-field={`Cambio de escuela ${index + 1}: destino`}><ValorCelda valor={cambio.escuelaDestino} /></td>
        <td aria-label="Firma de la directora en papel" />
      </tr>)}</tbody>
    </table>
    <div className={styles.contactoAnual}>
      <CampoAnual titulo="Domicilio del Alumno/a" valor={registro.domicilio} />
      <CampoAnual titulo="Teléfono del Alumno/a" valor={registro.telefono} />
    </div>
    <CampoAnual titulo="Cambio de domicilio del Alumno/a" valor={registro.cambioDomicilio} />
  </div>;
}
