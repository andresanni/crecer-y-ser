import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { chromium } from 'playwright-core';

const output = path.resolve('dist-render/attendance');
const geometry = JSON.parse(await fs.readFile('src/modules/asistencias/components/RegistroEscolar/reference-layout.json', 'utf8'));
assert.ok(Object.entries(geometry.cells).filter(([key]) => /^students\.\d+\.(name|observation)$/.test(key)).every(([, cell]) => cell.text === ''));
await fs.mkdir(output, { recursive: true });
const emptyCount = { v: 0, m: 0, t: 0 };
const movement = { otraEscuela: emptyCount, otraSeccion: emptyCount, otroTurno: emptyCount, otroGrado: emptyCount, total: emptyCount };
const fixture = {
  revision: 0, versionFuentes: 'synthetic-version',
  mesCalendario: { id: 'synthetic-month', cicloId: 'synthetic-cycle', mes: 9, ano: 2026, totalDiasHabiles: 21, diasHabilesAcumulados: 51 },
  curso: { id: 'synthetic-course', nombre: '1°', turno: 'Mañana' },
  materias: ['Lengua', 'Matemática', 'Conocimiento del Mundo', 'Tecnología, Diseño y Programación', 'Artes Visuales', 'Música', 'Inglés', 'Educación Física'].map((nombre, index) => ({ id: `subject-${index}`, cursoMateriaId: `subject-${index}`, nombre, ordenVisual: index })),
  eventos: [{ dia: 11, tipo: 'FERIADO', textoCeldaVertical: 'DÍA DEL MAESTRO', descripcionObservaciones: 'Día del Maestro' }],
  alumnos: Array.from({ length: 4 }, (_, index) => ({
    inscripcionId: `synthetic-enrollment-${index}`, alumnoId: `synthetic-student-${index}`, apellidoYNombre: `Estudiante sintético ${index + 1}, Nombre de prueba`,
    asistencias: index === 0 ? 19 : 20, inasistencias: index === 0 ? 2 : 1, llegadasTarde: index === 0 ? 1 : 0,
    marcasPorDia: { 1: index === 0 ? 'A' : 'P', 2: 'P', 3: 'P', 4: 'P', 7: index === 0 ? 'IT' : 'P', 8: 'P', 9: 'P', 10: 'P', 14: index === 0 ? 'E' : 'P', 15: 'P', 16: 'P', 17: 'P', 18: 'P', 21: 'P', 22: 'P', 23: 'P', 24: 'P', 25: 'P', 28: 'P', 29: 'P', 30: 'P' },
    observacion: index === 1 ? 'Res. 311/16' : '',
    calificacionesMaterias: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`subject-${i}`, 'Alcanzado'])),
    trabajoEnElAula: { 1: 'Avanzado', 2: 'Alcanzado', 3: 'Destacado', 4: 'En Proceso', 5: 'Alcanzado' },
    convivencia: { 1: 'Destacado', 2: 'Avanzado', 3: 'Alcanzado', 4: 'En Proceso', 5: 'Alcanzado' },
  })),
  inscripcion: { inscriptosPrimerDia: { v: 3, m: 1, t: 4 }, entradosPosteriormente: movement, salidosEnElMes: movement, quedanUltimoDia: { v: 3, m: 1, t: 4 } },
  edades: { filas: [{ edad: 6, v: 1, m: 0, t: 1 }, { edad: 7, v: 1, m: 1, t: 2 }, { edad: 8, v: 1, m: 0, t: 1 }], total: { v: 3, m: 1, t: 4 } },
  nacionalidad: { argentinos: { v: 3, m: 1, t: 4 }, extranjeros: emptyCount },
  asistenciaGeneral: { totAsistencia: 79, totInasistencia: 5, porcentajeAsistencia: 94, porcentajeInasistencia: 6, asistenciaMedia: 4 },
  observacionesDelMes: ['Día del Maestro', 'Una observación extensa de ejemplo que debe continuar en otra línea dentro del recuadro, sin invadir las celdas de convivencia ni superar el borde derecho de la hoja.'],
};
const virtualId = '\0attendance-presentation-test';
const server = await createServer({
  configFile: false,
  cacheDir: 'dist-render/attendance/.vite-presentation',
  server: { host: '127.0.0.1', port: 5188, strictPort: true },
  plugins: [react(), {
    name: 'attendance-presentation-test',
    resolveId(id) { if (id === 'attendance-presentation-test') return virtualId; },
    load(id) {
      if (id !== virtualId) return;
      return `
        import React from 'react';
        import { createRoot } from 'react-dom/client';
        import { Modal, App as AntApp } from 'antd';
        import { CargaAsistenciaMatrix } from '/src/modules/asistencias/components/CargaAsistenciaMatrix.tsx';
        import { AperturaMesModal } from '/src/modules/asistencias/components/AperturaMesModal.tsx';
        import { RegistroEscolar } from '/src/modules/asistencias/components/RegistroEscolar/RegistroEscolar.tsx';
        import { adaptarRegistroEscolar } from '/src/modules/asistencias/components/RegistroEscolar/registroEscolarAdapter.ts';
        import '/src/index.css';
        import '/src/modules/boletines/documentos/BoletinDocument.module.css';
        const root = createRoot(document.getElementById('root'));
        window.closeRegistro = () => root.render(React.createElement('main', null, 'Application shell'));
        window.fixture = ${JSON.stringify(fixture)};
        window.renderCarga = () => root.render(React.createElement(AntApp, null, React.createElement(CargaAsistenciaMatrix, {
          registro: {...window.fixture, observacionesAdicionales: ''},
          onRecargar: () => {},
          onCambiosPendientes: value => { window.pendingAttendance = value; }
        })));
        window.renderCalendar = () => root.render(React.createElement(AntApp, null, React.createElement(AperturaMesModal, {
          open: true, onClose: () => {}, cicloId: 'synthetic-cycle', ano: 2026, mes: 9,
        })));
        window.adaptar = adaptarRegistroEscolar;
        window.renderRegistro = (record) => {
          window.presentation = adaptarRegistroEscolar(record);
          root.render(React.createElement(React.Fragment, null,
            React.createElement('div', {id:'application-shell'}, 'Application shell'),
            React.createElement(Modal, {open:true, width:'95vw', title:'Registro oficial', footer:'Print controls', styles:{body:{padding:0, maxHeight:'calc(88vh - 110px)', overflow:'auto'}}},
              React.createElement(RegistroEscolar, {data:window.presentation}))));
        };
        window.renderRegistro(window.fixture);
      `;
    },
    configureServer(vite) {
      vite.middlewares.use('/__attendance-test', async (_req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.end(await vite.transformIndexHtml('/__attendance-test', '<html><head><meta charset="UTF-8"></head><body style="margin:0"><div id="root"></div><script type="module" src="/@id/attendance-presentation-test"></script></body></html>'));
      });
    },
  }],
});
await server.listen();
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5188/__attendance-test', { waitUntil: 'networkidle' });
  await page.locator('svg[role="img"]').waitFor();
  assert.equal(await page.locator('[data-student-id]').count(), 4);
  assert.equal(await page.locator('[data-field="header.month"]').textContent(), 'SEPTIEMBRE');
  assert.equal(await page.locator('[data-event-day]').count(), 1);
  assert.equal(await page.locator('[data-event-day="11"]').textContent(), 'DÍA DEL MAESTRO');
  assert.equal(await page.locator('[data-day-rows="1"]').count(), 1);
  assert.equal(await page.locator('[data-day-rows="14"]').count(), 1);
  assert.equal(await page.locator('[data-day-rows="25"]').count(), 1);
  assert.equal(await page.locator('[data-day-rows="11"]').count(), 0);
  assert.equal(await page.locator('[data-weekend="5"]').count(), 1);
  assert.equal(await page.locator('[data-weekend="2"]').count(), 0);
  assert.equal(await page.locator('[data-field="students.0.classroom.0"]').textContent(), 'AV');
  assert.equal(await page.locator('[data-field="students.0.coexistence.0"]').textContent(), 'DE');
  assert.equal(await page.locator('[data-age]').count(), 3);
  assert.equal(await page.locator('[data-field="footer.t1139"]').textContent(), '3');
  assert.equal(await page.locator('[data-field="footer.t1140"]').textContent(), '1');
  assert.equal(await page.locator('[data-field="footer.t1141"]').textContent(), '4');
  assert.equal(await page.locator('[data-field="legend.4"]').textContent(), 'NO ALCANZÓ LOS OBJETIVOS');
  assert.equal(await page.locator('[data-assessment-column="world"]').count(), 1);
  assert.equal(await page.locator('[data-assessment-column="social"]').count(), 0);
  const worldWidth = await page.locator('[data-assessment-column="world"]').evaluate(el => Number(el.dataset.columnRight) - Number(el.dataset.columnLeft));
  assert.equal(worldWidth, 13);
  assert.equal(await page.locator('[data-observations] text').first().textContent(), '11. Día del Maestro');
  const monthBounds = await page.locator('[data-field="header.month"]').evaluate(el => { const b = el.getBBox(); return {x:b.x, right:b.x+b.width}; });
  assert.ok(monthBounds.x >= 74.01 && monthBounds.right <= 140.03);
  const observationBounds = await page.locator('[data-observations] text').evaluateAll(elements => elements.map(el => { const b=el.getBBox(); return {x:b.x, right:b.x+b.width}; }));
  assert.ok(observationBounds.length > 2);
  assert.ok(observationBounds.every(b => b.x >= 870 && b.right < 985));
  await page.locator('svg[role="img"]').screenshot({ path: path.join(output, 'september-screen.png') });
  await page.emulateMedia({media:'print'});
  const printBounds = await page.locator('.ant-modal-body').boundingBox();
  assert.equal(printBounds.x, 0);
  assert.equal(printBounds.y, 0);
  await page.pdf({ path: path.join(output, 'september-a4.pdf'), preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
  await page.emulateMedia({media:'screen'});
  const months = await page.evaluate(() => Array.from({length:12}, (_,i) => window.adaptar({...window.fixture, mesCalendario:{...window.fixture.mesCalendario, mes:i+1}, eventos:[]}).header.month));
  assert.equal(new Set(months).size, 12);
  await page.evaluate(() => window.renderRegistro({ ...window.fixture, curso:{...window.fixture.curso, nombre:'4°'}, materias:window.fixture.materias.map((m,i)=>({...m,nombre:i===2?'Ciencias Sociales':m.nombre})), alumnos:window.fixture.alumnos.map(a=>({...a,calificacionesMaterias:{'subject-0':'Alcanzado 7'},trabajoEnElAula:{1:'Avanzado 9'}})) }));
  await page.waitForFunction(() => document.querySelector('[data-field="students.0.grades.0"]')?.textContent === 'AL7');
  assert.equal(await page.locator('[data-field="students.0.classroom.0"]').textContent(), 'AV9');
  assert.equal(await page.locator('[data-assessment-column="world"]').count(), 0);
  assert.equal(await page.locator('[data-assessment-column="social"]').count(), 1);
  assert.equal(await page.locator('[data-assessment-column="natural"]').count(), 1);
  await page.evaluate(() => {
    const subjects = ['Lengua','Matemática','Ciencias Sociales','Ciencias Naturales','Tecnología, Diseño y Programación','Artes Visuales','Música','Inglés','Educación Física'];
    window.secondCycleFixture = {
      ...window.fixture, curso:{...window.fixture.curso,nombre:'4°'}, mesCalendario:{...window.fixture.mesCalendario,mes:5},
      materias:subjects.map((nombre,index)=>({id:'second-'+index,cursoMateriaId:'second-'+index,nombre,ordenVisual:index})),
      eventos:[{dia:1,tipo:'FERIADO',textoCeldaVertical:'DÍA DEL TRABAJADOR',descripcionObservaciones:'Día del Trabajador'}],
      observacionesDelMes:['Día del Trabajador','4. Alta de ejemplo','27. Baja de ejemplo'],
      alumnos:window.fixture.alumnos.map(a=>({...a,observacion:'Res. 311/16 - ALTA 4/5 - BAJA 27/5',calificacionesMaterias:Object.fromEntries(subjects.map((_,index)=>['second-'+index,index%2?'Alcanzado 7':'Destacado 10'])),trabajoEnElAula:{1:'Avanzado 9',2:'Destacado 10',3:'Alcanzado 7',4:'Avanzado 8',5:'Alcanzado 6'}})),
      edades:{filas:Array.from({length:10},(_,index)=>({edad:8+index,v:1,m:0,t:1})),total:{v:10,m:0,t:10}},
    };
    window.renderRegistro(window.secondCycleFixture);
  });
  await page.waitForFunction(() => document.querySelectorAll('[data-age]').length === 10);
  assert.equal(await page.locator('[data-field="students.0.grades.0"]').textContent(), 'DE10');
  assert.equal(await page.locator('[data-field="students.0.grades.1"]').textContent(), 'AL7');
  assert.equal(await page.locator('[data-field="students.0.classroom.1"]').textContent(), 'DE10');
  assert.equal(await page.locator('[data-field="legend.2"]').textContent(), 'ALCANZADO 7 - 6');
  assert.equal(await page.locator('[data-observations] text').first().textContent(), '1. Día del Trabajador');
  assert.equal(await page.locator('[data-age="17"]').count(), 1);
  assert.equal(await page.locator('[data-field="footer.t1141"]').textContent(), '10');
  const observationsCell = page.locator('[data-field="students.0.observation"]');
  assert.equal((await observationsCell.textContent()).replace(/\s/g,''), 'Res.311/16-ALTA4/5-BAJA27/5');
  const bounds = await observationsCell.evaluate(el=>{const b=el.getBBox();return{x:b.x,right:b.x+b.width,y:b.y,bottom:b.y+b.height}});
  const observationsStart = await page.locator('[data-assessment-column="coexistence-4"]').evaluate(el=>Number(el.dataset.columnRight));
  assert.ok(bounds.x >= observationsStart && bounds.right <= 990.213);
  assert.ok(bounds.y >= 147.068 && bounds.bottom <= 147.068+9.797);
  const lastAgeBounds = await page.locator('[data-age="17"]').evaluate(el=>{const b=el.getBBox();return b.y+b.height});
  assert.ok(lastAgeBounds < 518.5);
  await page.locator('svg[role="img"]').screenshot({path:path.join(output,'second-cycle-screen.png')});
  await page.emulateMedia({media:'print'});
  await page.pdf({path:path.join(output,'second-cycle-a4.pdf'),preferCSSPageSize:true,printBackground:true});
  await page.emulateMedia({media:'screen'});
  await page.evaluate(()=>window.renderRegistro({...window.fixture,curso:{...window.fixture.curso,nombre:'3°'},mesCalendario:{...window.fixture.mesCalendario,mes:7},eventos:[{dia:9,tipo:'FERIADO',textoCeldaVertical:'DÍA DE LA INDEPENDENCIA',descripcionObservaciones:'Día de la Independencia'}],observacionesDelMes:['Día de la Independencia','10. Día no laborable'],alumnos:window.fixture.alumnos.map(a=>({...a,observacion:'Res. 311/16 - ALTA 4/7 - BAJA 27/7'}))}));
  await page.waitForFunction(()=>document.querySelector('[data-field="header.month"]')?.textContent==='JULIO');
  assert.equal(await page.locator('[data-assessment-column="world"]').count(),1);
  assert.equal(await page.locator('[data-field="students.0.grades.2"]').textContent(),'AL');
  assert.equal(await page.locator('[data-observations] text').first().textContent(),'9. Día de la Independencia');
  assert.equal(await page.locator('[data-observations] text').nth(1).textContent(),'10. Día no laborable');
  await page.locator('svg[role="img"]').screenshot({path:path.join(output,'first-cycle-screen.png')});
  await page.emulateMedia({media:'print'});
  await page.pdf({path:path.join(output,'first-cycle-a4.pdf'),preferCSSPageSize:true,printBackground:true});
  await page.emulateMedia({media:'screen'});
  await page.evaluate(() => window.renderRegistro({...window.fixture, alumnos:Array.from({length:24}, (_,i)=>({...window.fixture.alumnos[0], inscripcionId:'synthetic-enrollment-'+i, alumnoId:'synthetic-'+i, apellidoYNombre:'Alumno sintético '+(i+1)}))}));
  await page.waitForFunction(() => document.querySelectorAll('[data-student-id]').length === 24);
  const last = await page.locator('[data-field="students.23.name"]').evaluate(el => { const b=el.getBBox(); return b.y+b.height; });
  assert.ok(last < 352.8);
  await page.emulateMedia({media:'print'});
  await page.pdf({ path: path.join(output, 'twenty-four-a4.pdf'), preferCSSPageSize: true, printBackground: true });
  await page.emulateMedia({media:'screen'});
  await page.locator('svg[role="img"]').screenshot({ path: path.join(output, 'twenty-four-screen.png') });
  const { PDFDocument } = await import('pdf-lib');
  for (const file of ['september-a4.pdf', 'twenty-four-a4.pdf', 'first-cycle-a4.pdf', 'second-cycle-a4.pdf']) {
    const pdf = await PDFDocument.load(await fs.readFile(path.join(output, file)));
    assert.equal(pdf.getPageCount(), 1);
    const size = pdf.getPage(0).getSize();
    assert.ok(Math.abs(size.width - 841.89) < 0.1 && Math.abs(size.height - 595.28) < 0.5);
  }
  assert.deepEqual(errors, []);
  await page.emulateMedia({media:'screen'});
  await page.evaluate(() => window.renderRegistro({...window.fixture, alumnos:window.fixture.alumnos.map((student, index) => ({...student,
    numeroOrden: [3, 9, 11, 15][index], bajaDesdeDia: index === 1 ? 1 : index === 2 ? 21 : undefined,
  }))}));
  await page.locator('[data-withdrawal-from="1"]').waitFor({state:'attached'});
  assert.equal(await page.locator('[data-field="students.1.order"]').textContent(), '9');
  assert.equal(await page.locator('[data-withdrawal-from="21"]').count(), 1);
  assert.equal(await page.locator('[data-field="students.1.attendance.7"]').count(), 0);
  const withdrawalLine = await page.locator('[data-withdrawal-from="1"]').evaluate(el => ({start: Number(el.getAttribute('x1')), end: Number(el.getAttribute('x2'))}));
  assert.ok(withdrawalLine.start < 148 && withdrawalLine.end > 515);
  await page.locator('svg[role="img"]').screenshot({path:path.join(output,'withdrawals-screen.png')});
  await page.evaluate(() => window.closeRegistro());
  await page.waitForFunction(() => !document.querySelector('svg[role="img"]'));
  assert.equal(await page.locator('style[media="print"]').count(), 0);
  await page.emulateMedia({media:'print'});
  assert.equal(await page.locator('#root').isVisible(), true);
  await page.emulateMedia({media:'screen'});
  await page.setViewportSize({width:1536,height:1000});
  await page.evaluate(() => {
    document.body.style.padding = '16px';
    window.fixture.mesCalendario.mes = 7;
    window.fixture.alumnos = window.fixture.alumnos.map((student,index)=>({...student,apellidoYNombre:'Estudiante sintético '+(index+1),observacion:''}));
    window.fixture.eventos = [{dia:9,tipo:'FERIADO',textoCeldaVertical:'DÍA DE LA INDEPENDENCIA',descripcionObservaciones:'Día de la Independencia'}, {dia:10,tipo:'ASUETO',textoCeldaVertical:'DÍA NO LABORABLE CON FINES TURÍSTICOS',descripcionObservaciones:'Día no laborable con fines turísticos'}, ...Array.from({length:12},(_,i)=>({dia:20+i,tipo:'RECESO',textoCeldaVertical:'RECESO ESCOLAR INVERNAL',descripcionObservaciones:'Receso escolar invernal'}))];
    window.renderCarga();
  });
  await page.locator('td[tabindex="0"]').first().waitFor();
  assert.equal(await page.locator('table').first().evaluate(table => table.parentElement.scrollWidth <= table.parentElement.clientWidth), true);
  const rowHeights = await page.locator('table tbody tr').evaluateAll(rows => rows.map(row => row.getBoundingClientRect().height));
  assert.ok(rowHeights.every(height => height <= 40), JSON.stringify(rowHeights));
  assert.equal(await page.getByRole('button',{name:/Calendario/}).count(),0);
  assert.equal(await page.getByRole('button',{name:/Imprimir/}).count(),0);
  await page.locator('table').first().screenshot({path:path.join(output,'attendance-grid-31-days.png')});
  await page.setViewportSize({width:900,height:1000});
  assert.equal(await page.locator('table').first().evaluate(table => table.parentElement.scrollWidth > table.parentElement.clientWidth), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.setViewportSize({width:1536,height:1000});
  await page.evaluate(() => {window.fixture.mesCalendario.mes = 9; window.fixture.eventos = [{dia:11,tipo:'FERIADO',textoCeldaVertical:'DÍA DEL MAESTRO',descripcionObservaciones:'Día del Maestro'}]; window.renderCarga();});
  const editable = page.locator('td[tabindex="0"]').nth(1);
  await editable.waitFor();
  assert.equal(await editable.textContent(), 'P');
  await editable.click();
  await page.getByRole('button', {name:'Llegada Tarde (IT)', exact:true}).click();
  await page.getByRole('button', {name:'Llegada Tarde (IT)', exact:true}).waitFor({state:'hidden'});
  assert.equal(await editable.textContent(), 'IT');
  assert.equal(await editable.evaluate(cell => cell === document.activeElement), true);
  await editable.click();
  await page.getByRole('button', {name:'Llegada Tarde (IT)', exact:true}).click();
  await page.getByRole('button', {name:'Llegada Tarde (IT)', exact:true}).waitFor({state:'hidden'});
  await editable.press('p');
  await page.waitForFunction(() => window.pendingAttendance === false);
  await editable.focus();
  await page.keyboard.press('a');
  await page.waitForFunction(() => window.pendingAttendance === true);
  assert.equal(await page.getByRole('button', {name:/Imprimir/}).count(), 0);
  await page.keyboard.press('p');
  await page.waitForFunction(() => window.pendingAttendance === false);
  assert.equal(await page.getByRole('button', {name:'Guardar cambios'}).isDisabled(), true);
  await page.locator('textarea').fill('Nota pendiente');
  await page.waitForFunction(() => window.pendingAttendance === true);
  await page.getByRole('button', {name:'Descartar cambios'}).click();
  await page.waitForFunction(() => window.pendingAttendance === false);
  assert.equal(await page.locator('textarea').inputValue(), '');
  assert.equal(await page.getByRole('button', {name:/Imprimir/}).count(), 0);
  await page.route('**/api/cys/directivo/asistencias/**', route => route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ code: 409, message: 'Conflicto sintético', data: {} }) }));
  await editable.focus();
  await page.keyboard.press('a');
  await page.getByRole('button', {name:'Guardar cambios'}).click();
  await page.getByText('Es necesario volver a cargar el registro').waitFor();
  assert.equal(await editable.textContent(), 'A');
  assert.equal(await page.getByRole('button', {name:'Guardar cambios'}).isDisabled(), true);
  assert.equal(await page.getByRole('button', {name:'Cargar versión guardada'}).count(), 1);
  const listResponse = JSON.stringify({ page: 1, perPage: 500, totalItems: 0, totalPages: 0, items: [] });
  await page.route('**/api/collections/periodos/records**', route => route.fulfill({status:200,contentType:'application/json',body:listResponse}));
  await page.route('**/api/collections/meses_calendario/records**', route => route.fulfill({status:200,contentType:'application/json',body:listResponse}));
  await page.route('**/api/cys/directivo/calendario/**', route => route.fulfill({status:route.request().method()==='GET'?200:409,contentType:'application/json',body:JSON.stringify(
    route.request().method()==='GET'?{revision:0,versionFuentes:'synthetic-version',ano:2026,mes:null,meses:[],eventos:[]}:{code:409,message:'Conflicto sintético',data:{}})}));
  await page.evaluate(() => window.renderCalendar());
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.includes('Guardar Configuración') && !button.disabled));
  await page.getByPlaceholder('Texto celda (ej. DÍA DEL MAESTRO)').fill('ASUETO LOCAL');
  await page.getByRole('button', {name:'Guardar Configuración'}).click();
  await page.getByText('Es necesario volver a cargar el calendario').waitFor();
  assert.equal(await page.getByPlaceholder('Texto celda (ej. DÍA DEL MAESTRO)').inputValue(), 'ASUETO LOCAL');
  assert.equal(await page.getByRole('button', {name:'Guardar Configuración'}).isDisabled(), true);
  assert.deepEqual(errors, []);
  console.log('OK: both cycles, AL/AL7/DE10 grades, all ages, 24 students, real order numbers, withdrawal lines, four single-page A4 PDFs, pending edits and conflicts preserved for attendance/calendar, no browser errors.');
} finally {
  await browser.close();
  await server.close();
}
