import type { BoletinDocumentData } from './boletinDocument.model';
import { cicloPedagogicoDelGrado, paginasBoletinDelGrado } from './boletinDocument.model';
import { portadaEstatica } from './boletinInstitutionalContent';
import { InstitutionalPage } from './InstitutionalPage';
import { FormativePage } from './FormativePage';
import { TermClosingPage } from './TermClosingPage';
import { AdministrativeHeader, AdministrativePage, AnnualSummaryPage } from './AnnualPages';
import { AcademicPage } from './AcademicPage';
import styles from './BoletinDocument.module.css';

function Portada({ data }: { data: BoletinDocumentData }) {
  return (
    <div className={styles.portada}>
      <img className={styles.escudoCiudad} src="/boletines/escudo-ciudad.png" alt="Escudo de la Ciudad de Buenos Aires" />
      <p className={styles.gobierno}>Gobierno de la Ciudad de Buenos Aires<br />Ministerio de Educación</p>
      <div className={styles.titulos}>
        <h1>{data.institucion.nivel}</h1>
        <p>Documento de Evaluación y Calificación</p>
        <small>CUE {data.institucion.cue}</small>
        <h2 data-derived-field="Ciclo pedagógico" title="Derivado del grado: 1.º a 3.º, primer ciclo; 4.º a 7.º, segundo ciclo">{cicloPedagogicoDelGrado(data.curso.grado)}</h2>
      </div>
      <img className={styles.logoPortada} src="/boletines/logo-historico.png" alt="Colegio Crecer y Ser" />
      <p className={styles.denominacion}>{data.institucion.denominacion} <strong>{data.institucion.distrito}</strong></p>
      <table className={styles.identidad} aria-label="Identificación del alumno">
        <tbody>
          <tr><th scope="row">Alumno/a:</th><td data-dynamic-field="Apellido, Nombre del alumno" title="Dinámico: apellido y nombre del alumno">{data.alumno.apellidos}, {data.alumno.nombres}</td></tr>
          <tr><th scope="row">DNI</th><td data-dynamic-field="DNI" title="Dinámico: DNI">{data.alumno.dni}</td></tr>
        </tbody>
      </table>
      <table className={styles.curso} aria-label="Curso del alumno">
        <thead><tr>{['GRADO', 'SECCIÓN', 'TURNO', 'JORNADA'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody><tr><td data-dynamic-field="Grado" title="Dinámico: grado">{data.curso.grado}°</td><td>{portadaEstatica.seccion}</td><td>{portadaEstatica.turno}</td><td>{portadaEstatica.jornada}</td></tr></tbody>
      </table>
      <table className={styles.responsable} aria-label="Responsable del alumno">
        <thead><tr><th colSpan={2} scope="colgroup">Apellidos y Nombres del responsable del Alumno/a</th></tr></thead>
        <tbody><tr><td data-dynamic-field="Apellido del responsable" title="Dinámico: apellido del responsable">{data.responsable.apellidos}</td><td data-dynamic-field="Nombre del responsable" title="Dinámico: nombre del responsable">{data.responsable.nombres}</td></tr></tbody>
      </table>
      <div className={styles.firmasPortada}>
        <p>Firma del responsable del Alumno/a</p>
        <img src="/boletines/escudo-colegio.png" alt="Escudo del colegio" />
      </div>
      <p className={styles.anoPortada}>Año {data.ano}</p>
    </div>
  );
}

export function BoletinDocument({ data }: { data: BoletinDocumentData }) {
  const paginasBoletin = paginasBoletinDelGrado(data.curso.grado);
  return (
    <main className={styles.documento}>
      {paginasBoletin.map((titulo, index) => (
        <section className={`${styles.pagina} ${index > 0 ? styles.paginaConPie : ''} ${index >= 2 ? styles.paginaEvaluativa : ''}`} id={`pagina-${index + 1}`} key={titulo} aria-label={`Página ${index + 1}: ${titulo}`}>
          {index === 0 ? <Portada data={data} /> : <>
            {index === 1 ? <InstitutionalPage grado={data.curso.grado} /> : <>{index === paginasBoletin.length - 1 ? <AdministrativeHeader /> : <header className={styles.encabezado}>
              <span><img src="/boletines/isotipo-historico.png" alt="" />Educamos para la Vida</span>
              <span>{data.curso.grado}° Grado · NIVEL PRIMARIO</span>
            </header>}
            {index === 2 ? <FormativePage data={data} /> : index >= 3 && index < paginasBoletin.length - 6 ? <AcademicPage grado={data.curso.grado} materias={data.materiasAcademicas.slice((index - 3) * 2, (index - 2) * 2)} /> : index >= paginasBoletin.length - 6 && index < paginasBoletin.length - 2 ? <TermClosingPage cierre={data.cierres[index - (paginasBoletin.length - 6)]} /> : index === paginasBoletin.length - 2 ? <AnnualSummaryPage cierre={data.cierreAnual} /> : <AdministrativePage registro={data.registroAdministrativo} />}</>}
            <footer className={styles.pie}>
              <img className={styles.placaPie} src="/boletines/escudo-colegio.png" alt="Escudo del colegio" />
              <img className={styles.logoPie} src="/boletines/logo-historico.png" alt="Crecer y Ser" />
              <span className={styles.republica}>República <img src="/boletines/escudo-argentina.png" alt="" /> Argentina</span>
              <strong className={styles.anoPie}>Año {data.ano}</strong>
            </footer>
          </>}
        </section>
      ))}
    </main>
  );
}
