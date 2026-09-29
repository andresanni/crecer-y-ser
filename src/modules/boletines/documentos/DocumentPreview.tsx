import { useState } from 'react';
import { BoletinDocument } from './BoletinDocument';
import { paginasBoletinDelGrado } from './boletinDocument.model';
import type { BoletinDocumentData, GradoPrimario } from './boletinDocument.model';
import { crearMateriasAcademicasDeMuestra, crearMateriasFormativasDeMuestra } from './boletinDocument.fixture';
import { crearMuestraCurricular, anoMallaDeRevision } from './curriculumPreview';
import './preview.css';
import { institucionBoletin } from './boletinInstitutionalContent';

const muestra: BoletinDocumentData = {
  institucion: institucionBoletin,
  alumno: { apellidos: 'Apellido de Ejemplo', nombres: 'Estudiante', dni: '00.000.000' },
  responsable: { apellidos: 'Familia de Ejemplo', nombres: 'Responsable' },
  curso: { grado: 1 },
  ano: 2026,
  cierreAnual: {
    sintesis: { estado: 'futuro' },
    permaneceEn: { estado: 'futuro' },
    promovidoA: { estado: 'futuro' },
  },
  registroAdministrativo: {
    escuelaInicial: { estado: 'futuro' },
    fechaIngreso: { estado: 'futuro' },
    fechaEgreso: { estado: 'futuro' },
    cambiosEscuela: [
      { fecha: { estado: 'futuro' }, causa: { estado: 'futuro' }, escuelaDestino: { estado: 'futuro' } },
      { fecha: { estado: 'futuro' }, causa: { estado: 'futuro' }, escuelaDestino: { estado: 'futuro' } },
      { fecha: { estado: 'futuro' }, causa: { estado: 'futuro' }, escuelaDestino: { estado: 'futuro' } },
      { fecha: { estado: 'futuro' }, causa: { estado: 'futuro' }, escuelaDestino: { estado: 'futuro' } },
    ],
    domicilio: { estado: 'futuro' },
    telefono: { estado: 'futuro' },
    cambioDomicilio: { estado: 'futuro' },
  },
  cierres: [{
    bimestre: 1,
    asistencias: { estado: 'confirmado', texto: '42' },
    inasistencias: { estado: 'confirmado', texto: '3' },
    llegadasTarde: { estado: 'confirmado', texto: '0' },
    observaciones: { estado: 'confirmado', texto: 'Durante este bimestre participó con interés en las propuestas del aula y mostró avances en la organización de sus tareas.\nSe continuará acompañando su autonomía y el trabajo con sus compañeros.' },
  }, {
    bimestre: 2,
    asistencias: { estado: 'confirmado', texto: '40' },
    inasistencias: { estado: 'confirmado', texto: '2' },
    llegadasTarde: { estado: 'confirmado', texto: '1' },
    observaciones: { estado: 'confirmado', texto: 'Participó activamente en las actividades grupales y avanzó en la resolución autónoma de las tareas.' },
  }, {
    bimestre: 3,
    asistencias: { estado: 'futuro' },
    inasistencias: { estado: 'futuro' },
    llegadasTarde: { estado: 'futuro' },
    observaciones: { estado: 'futuro' },
  }, {
    bimestre: 4,
    asistencias: { estado: 'futuro' },
    inasistencias: { estado: 'futuro' },
    llegadasTarde: { estado: 'futuro' },
    observaciones: { estado: 'futuro' },
  }],
  integracion: {
    promocionoConAcompanamiento: { estado: 'futuro' },
    poseeApoyos: { estado: 'confirmado', texto: 'NO' },
    cualesApoyos: { estado: 'confirmado', texto: '---' },
  },
  materiasFormativas: crearMateriasFormativasDeMuestra(1),
  materiasAcademicas: crearMateriasAcademicasDeMuestra(1),
};

export function DocumentPreview() {
  const [resaltar, setResaltar] = useState(false);
  const [grado, setGrado] = useState<GradoPrimario>(() => {
    const valor = Number(new URLSearchParams(window.location.search).get('grado'));
    return (Number.isInteger(valor) && valor >= 1 && valor <= 7 ? valor : 1) as GradoPrimario;
  });
  const paginasBoletin = paginasBoletinDelGrado(grado);
  return <div className={resaltar ? 'preview-dynamic' : undefined}>
    <nav className="preview-toolbar" aria-label="Revisión de la plantilla">
      <div><strong>Plantilla de boletín</strong><small>A4 · Datos ficticios · Malla local 2026 · Siete grados · Tablas en Lato</small></div>
      <label>Página <select defaultValue="1" onChange={event => document.getElementById(`pagina-${event.target.value}`)?.scrollIntoView()}>
        {paginasBoletin.map((titulo, index) => <option key={titulo} value={index + 1}>{index + 1}. {titulo}</option>)}
      </select></label>
      <label>Grado de revisión <select value={grado} onChange={event => {
        const siguiente = Number(event.target.value) as GradoPrimario;
        setGrado(siguiente);
        const url = new URL(window.location.href);
        url.searchParams.set('grado', String(siguiente));
        window.history.replaceState(null, '', url);
      }}>
        {[1, 2, 3, 4, 5, 6, 7].map(numero => <option value={numero} key={numero}>{numero}°</option>)}
      </select></label>
      <label><input type="checkbox" checked={resaltar} onChange={event => setResaltar(event.target.checked)} /> Resaltar campos dinámicos</label>
      <button type="button" onClick={() => window.print()}>Imprimir muestra</button>
    </nav>
    <BoletinDocument data={{ ...muestra, curso: { grado }, ano: anoMallaDeRevision, ...crearMuestraCurricular(grado) }} />
  </div>;
}
