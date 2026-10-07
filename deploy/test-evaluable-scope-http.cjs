const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { randomBytes, createHash } = require('node:crypto');
const net = require('node:net');
const { chromium } = require('playwright-core');

test('Cursada evaluable: migración, permisos, baja, entrega, concurrencia y UI aislados', { timeout: 180000 }, async () => {
  const base = path.resolve('C:/pocketbase');
  const root = fs.mkdtempSync(path.join(base, 'evaluable-scope-test-'));
  const binary = path.join(base, 'pocketbase.exe');
  const emptyHooks = path.join(root, 'empty-hooks');
  fs.mkdirSync(emptyHooks);
  const common = [`--dir=${path.join(root, 'data')}`, `--migrationsDir=${path.resolve('pb_migrations')}`, `--hooksDir=${emptyHooks}`, '--automigrate=false'];
  const password = randomBytes(24).toString('hex');
  let processHandle;
  let browser;
  let vite;
  let page;
  let serverOutput = '';
  try {
    execFileSync(binary, ['migrate', 'up', ...common], { windowsHide: true, stdio: 'pipe' });
    execFileSync(binary, ['admin', 'create', 'test@example.local', password, ...common], { windowsHide: true, stdio: 'pipe' });
    const socket = net.createServer();
    await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
    const port = socket.address().port;
    await new Promise(resolve => socket.close(resolve));
    const origin = `http://127.0.0.1:${port}`;
    processHandle = spawn(binary, ['serve', ...common.filter(arg => !arg.startsWith('--hooksDir')), `--hooksDir=${path.resolve('pb_hooks')}`, `--http=127.0.0.1:${port}`], { windowsHide: true, stdio: 'pipe' });
    processHandle.stdout.on('data', chunk => { serverOutput += chunk; });
    processHandle.stderr.on('data', chunk => { serverOutput += chunk; });
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await fetch(origin + '/api/health').then(response => response.ok).catch(() => false)) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const request = async (url, method = 'GET', body, token) => {
      const response = await fetch(origin + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, body: await response.json().catch(() => null) };
    };
    const admin = await request('/api/admins/auth-with-password', 'POST', { identity: 'test@example.local', password });
    assert.equal(admin.status, 200);
    const create = async (collection, body) => {
      const response = await request(`/api/collections/${collection}/records`, 'POST', body, admin.body.token);
      assert.equal(response.status, 200, `${collection}: ${JSON.stringify(response.body)}`);
      return response.body;
    };
    const patch = async (collection, id, body) => {
      const response = await request(`/api/collections/${collection}/records/${id}`, 'PATCH', body, admin.body.token);
      assert.equal(response.status, 200);
    };
    await create('users', { email: 'staff@example.local', password, passwordConfirm: password, name: 'Prueba' });
    const staff = await request('/api/collections/users/auth-with-password', 'POST', { identity: 'staff@example.local', password });
    const token = staff.body.token;
    const cycle = await create('ciclos_lectivos', { ano: 2026, actual: true });
    const level = await create('niveles', { nombre: 'Primario' });
    const scale = await create('escalas_calificacion', { nombre: 'Prueba' });
    const note = await create('valores_escala', { escala_id: scale.id, etiqueta: 'Destacado', peso_numerico: 1, orden_visual: 1 });
    const course = await create('cursos', { nombre: '1°', nivel_id: level.id, escala_id: scale.id, turno: 'Mañana' });
    const subject = await create('materias', { nombre: 'Lengua' });
    const material = await create('curso_materias', { curso_id: course.id, ciclo_id: cycle.id, materia_id: subject.id, orden_visual: 1 });
    const criteria = [];
    for (let n = 1; n <= 5; n++) criteria.push(await create('criterios_evaluacion', { curso_materia_id: material.id, nombre: `Criterio de prueba ${n}`, orden_visual: n }));
    const student = await create('alumnos', { apellidos: 'Sintético', nombres: 'Alumno', dni: '00000001', fecha_nacimiento: '2020-01-01 00:00:00.000Z' });
    const guardian = await create('responsables', { apellidos: 'Sintético', nombres: 'Tutor', dni_tipo: 'DNI', dni_numero: '00000002' });
    const guardianLink = await create('alumno_responable', { alumno_id: student.id, responsable_id: guardian.id, vinculo: 'Padre' });
    const enrollment = await create('inscripciones', { alumno_id: student.id, curso_id: course.id, ciclo_id: cycle.id, estado: 'Regular', posee_apoyos: 'NO', promociono_con_acompanamiento: '-' });

    const periods = [];
    const workflows = [];
    const secrets = [];
    for (let n = 1; n <= 4; n++) {
      const period = await create('periodos', { ciclo_id: cycle.id, nombre: n + '° Bimestre', numero_periodo: n });
      periods.push(period);
      workflows.push(await create('instancias_carga_boletin', { curso_id: course.id, periodo_id: period.id, estado: 'BORRADOR_DOCENTE', revision: 1 }));
      const secret = randomBytes(24).toString('hex');
      secrets.push(secret);
      await create('tokens_acceso_docente', { curso_id: course.id, periodo_id: period.id, docente_nombre: 'Docente sintética', token: createHash('sha256').update(secret).digest('hex'), token_hash: createHash('sha256').update(secret).digest('hex') });
    }
    const teacher = async (n, route, method = 'GET', body) => {
      const response = await fetch(origin + '/api/cys/docente/' + route, { method, headers: { 'Content-Type': 'application/json', 'X-CYS-Teacher-Token': secrets[n - 1] }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, body: await response.json() };
    };
    const scopeUrl = id => '/api/cys/directivo/inscripciones/' + id + '/cursada';
    const readScope = async id => (await request(scopeUrl(id), 'GET', null, token)).body;
    const saveScope = async (id, values, old) => {
      const current = old || await readScope(id);
      return request(scopeUrl(id), 'PUT', { expectedRevision: current.cursada.revision, expectedUpdated: current.updated, desde: 1, hasta: 4, sinCursada: false, registrarBaja: false, fechaEgreso: '', ...values }, token);
    };
    const fill = async (id, n) => {
      const evaluation = await create('evaluaciones_materia', { inscripcion_id: id, periodo_id: periods[n - 1].id, curso_materia_id: material.id, calificacion_general_id: note.id });
      for (const criterion of criteria) await create('evaluaciones_criterios', { evaluacion_materia_id: evaluation.id, criterio_id: criterion.id, valor_escala_id: note.id });
      await create('cierres_periodo_alumno', { inscripcion_id: id, periodo_id: periods[n - 1].id, asistencias: 2 });
    };
    assert.equal((await request(scopeUrl(enrollment.id))).status, 401);
    assert.equal((await readScope(enrollment.id)).cursada.estado, 'PENDIENTE');
    await fill(enrollment.id, 1);
    await fill(enrollment.id, 2);
    const oldBaja = await create('inscripciones', { alumno_id: student.id, curso_id: course.id, ciclo_id: cycle.id, estado: 'Baja' });
    const blocked = await teacher(1, 'enviar', 'POST', {});
    assert.equal(blocked.status, 422);
    assert.equal(blocked.body.cursadasPendientes.length, 2);
    assert.equal((await teacher(1, 'contexto')).body.alumnos.length, 1);
    const old = await readScope(enrollment.id);
    assert.equal((await saveScope(enrollment.id, { desde: 3, hasta: 2 })).status, 400);
    assert.equal((await saveScope(enrollment.id, { sinCursada: true })).status, 409);
    assert.equal((await saveScope(enrollment.id, { hasta: 1 })).status, 409);
    const withdrawal = await saveScope(enrollment.id, { hasta: 2, registrarBaja: true, fechaEgreso: '2026-06-01', cambiosEscuela: [{ fecha: '2026-06-01', causa: 'Mudanza', escuelaDestino: 'Colegio San Martín' }] });
    assert.equal(withdrawal.status, 200, JSON.stringify(withdrawal.body));
    assert.equal(withdrawal.body.estadoAdministrativo, 'Baja');
    assert.equal((await saveScope(enrollment.id, { hasta: 2 }, old)).status, 409);
    assert.equal((await teacher(1, 'enviar', 'POST', {})).body.cursadasPendientes.length, 1);
    assert.equal((await saveScope(oldBaja.id, { sinCursada: true })).status, 200);
    const late = await create('inscripciones', { alumno_id: student.id, curso_id: course.id, ciclo_id: cycle.id, estado: 'Regular' });
    assert.equal((await saveScope(late.id, { desde: 2, hasta: 4, escuelaInicial: 'Escuela N° 18 D.E 13', cambiosEscuela: [{ fecha: '2026-05-18', causa: 'Motivos particulares', escuelaDestino: 'Colegio Crecer y Ser' }] })).status, 200);
    assert.equal((await teacher(1, 'contexto')).body.alumnos.length, 1);
    assert.equal((await teacher(2, 'contexto')).body.alumnos.length, 2);
    assert.equal((await teacher(3, 'contexto')).body.alumnos.length, 1);
    assert.equal((await teacher(1, 'alumnos/' + late.id)).status, 403);
    assert.equal((await teacher(3, 'alumnos/' + enrollment.id, 'PUT', { cierre: { asistencias: 0, inasistencias: 0, llegadasTarde: 0, observaciones: '' } })).status, 403);
    const recordUrl = '/api/collections/inscripciones/records/' + enrollment.id;
    for (const values of [{ 'bimestre_hasta+': 1 }, { 'revision_cursada+': 1 }, { bimestre_hasta: 4 }, { revision_cursada: 0 }, { cursada_estado: 'PENDIENTE' }, { estado: 'Regular' }, { curso_id: '' }]) {
      assert.equal((await request(recordUrl, 'PATCH', values, token)).status, 404);
    }
    assert.equal((await request('/api/collections/inscripciones/records/' + late.id, 'PATCH', { estado: 'Baja' }, token)).status, 404);
    assert.equal((await request('/api/collections/inscripciones/records', 'POST', { alumno_id: student.id, curso_id: course.id, ciclo_id: cycle.id, cursada_estado: 'CONFIRMADA', bimestre_desde: 1, bimestre_hasta: 4 }, token)).status, 400);
    assert.equal((await request(recordUrl, 'PATCH', { numero_orden: 3 }, token)).status, 200);
    assert.equal((await teacher(1, 'alumnos/' + enrollment.id)).status, 200);
    assert.equal((await teacher(1, 'enviar', 'POST', {})).status, 200);
    assert.equal((await teacher(1, 'contexto')).status, 401);
    assert.equal((await teacher(2, 'enviar', 'POST', {})).status, 422);
    assert.equal((await teacher(2, 'alumnos/' + late.id)).body.bimestreApoyos, 2);
    await fill(late.id, 2);
    assert.equal((await teacher(2, 'enviar', 'POST', {})).status, 200);
    const approve = async (n, id) => {
      const review = (await request('/api/cys/directivo/revision/' + course.id + '/' + periods[n - 1].id, 'GET', null, token)).body;
      const row = review.boletines.find(row => row.inscripcionId === id);
      const result = await request('/api/cys/directivo/boletines/' + id + '/visar', 'POST', { periodoId: periods[n - 1].id, expectedRevision: review.instancia.revision, expectedContentRevision: row.revisionContenido }, token);
      assert.equal(result.status, 200, JSON.stringify(result.body));
    };
    await approve(1, enrollment.id);
    await approve(2, enrollment.id);
    await approve(2, late.id);
    const snapshot = (n, id = enrollment.id) => request('/api/cys/directivo/boletines/' + id + '/instantanea?periodoId=' + periods[n - 1].id, 'GET', null, token);
    const beforePdf = await snapshot(2);
    assert.equal(beforePdf.status, 200, JSON.stringify(beforePdf.body));
    assert.deepEqual(beforePdf.body.datos.cursada, { estado: 'CONFIRMADA', desde: 1, hasta: 2, revision: 1 });
    assert.equal((await snapshot(3)).status, 403);
    const lateSnapshot = await snapshot(2, late.id);
    assert.equal(lateSnapshot.status, 200, JSON.stringify(lateSnapshot.body));
    assert.deepEqual(lateSnapshot.body.datos.periodos.map(p => p.bimestre), [2]);
    assert.deepEqual(lateSnapshot.body.datos.dependencias.map(p => p.bimestre), [2]);
    assert.equal(lateSnapshot.body.datos.apoyos.poseeApoyos, 'NO');
    assert.equal((await saveScope(enrollment.id, { hasta: 1 })).status, 409);
    const emission = await create('emisiones_boletin', { inscripcion_id: enrollment.id, periodo_id: periods[1].id, corte: 2, estado: 'DISPONIBLE', huella: beforePdf.body.huella, version: 'a'.repeat(64), instantanea: beforePdf.body.datos });
    assert.equal((await saveScope(enrollment.id, { hasta: 2 })).status, 200);
    const invalidated = (await request('/api/collections/emisiones_boletin/records/' + emission.id, 'GET', null, admin.body.token)).body;
    assert.equal(invalidated.estado, 'INVALIDADO');
    assert.equal(invalidated.instantanea, null);
    assert.notEqual((await snapshot(2)).body.huella, beforePdf.body.huella);
    const stages = (await request('/api/cys/directivo/etapas/' + periods[2].id, 'GET', null, token)).body;
    assert.deepEqual(stages.cursos.find(row => row.cursoId === course.id).inscripcionesEvaluables, [late.id]);
    const restored = await create('inscripciones', { id: 'restoredlate001', alumno_id: student.id, curso_id: course.id, ciclo_id: cycle.id, estado: 'Regular' });
    assert.equal((await saveScope(restored.id, { desde: 2, hasta: 4 })).status, 200);
    const reviewAt = async n => (await request('/api/cys/directivo/revision/' + course.id + '/' + periods[n - 1].id, 'GET', null, token)).body;
    assert.equal((await reviewAt(1)).alumnosSinIncorporar, 0);
    const secondReview = await reviewAt(2);
    assert.equal(secondReview.alumnosSinIncorporar, 1);
    const approvalsBeforeRestore = secondReview.boletines.map(row => ({ id: row.inscripcionId, estado: row.estado, generacion: row.generacionVisado }));
    const incorporated = await request('/api/cys/directivo/revision/' + course.id + '/' + periods[1].id + '/sincronizar-matricula', 'POST', { expectedRevision: secondReview.instancia.revision }, token);
    assert.equal(incorporated.status, 200);
    assert.equal(incorporated.body.incorporados, 1);
    const afterRestore = await reviewAt(2);
    assert.deepEqual(afterRestore.boletines.filter(row => row.inscripcionId !== restored.id).map(row => ({ id: row.inscripcionId, estado: row.estado, generacion: row.generacionVisado })), approvalsBeforeRestore);
    assert.equal(afterRestore.boletines.find(row => row.inscripcionId === restored.id).estado, 'PENDIENTE_REVISION');
    assert.equal((await reviewAt(1)).boletines.some(row => row.inscripcionId === restored.id), false);
    assert.equal((await saveScope(restored.id, { sinCursada: true })).status, 409);
    assert.equal((await saveScope(oldBaja.id, { desde: 1, hasta: 2 })).status, 200);
    const firstReview = await reviewAt(1);
    assert.equal(firstReview.alumnosSinIncorporar, 1);
    assert.equal(firstReview.boletines.find(row => row.inscripcionId === enrollment.id).estado, 'VISADO');
    const sameTerm = await create('inscripciones', { alumno_id: student.id, curso_id: course.id, ciclo_id: cycle.id, estado: 'Regular' });
    assert.equal((await saveScope(sameTerm.id, { desde: 3, hasta: 3, registrarBaja: true, fechaEgreso: '2026-09-01' })).status, 200);
    assert.equal((await teacher(3, 'contexto')).body.alumnos.length, 3);
    assert.equal((await teacher(4, 'contexto')).body.alumnos.length, 2);
    const pendingUi = await create('inscripciones', { alumno_id: student.id, curso_id: course.id, ciclo_id: cycle.id, estado: 'Regular' });
    const { createServer } = await import('vite');
    const react = (await import('@vitejs/plugin-react')).default;
    const entry = 'virtual:scope-test';
    vite = await createServer({ configFile: false, cacheDir: 'node_modules/.cache/test-readiness', logLevel: 'error',
      define: { 'import.meta.env.VITE_POCKETBASE_URL': JSON.stringify(origin) },
      server: { host: '127.0.0.1', port: 0 },
      plugins: [{ name: 'scope-test', resolveId: id => id === '/__scope-test' ? entry : undefined,
        load: id => id === entry ? `
          import React from 'react'; import { createRoot } from 'react-dom/client';
          import { BrowserRouter, Routes, Route } from 'react-router-dom'; import { App } from 'antd';
          import pb from '/src/core/pocketbase.ts'; import { useAppStore } from '/src/store/appStore.ts';
          import { CargaNotasPage } from '/src/modules/boletines/components/CargaNotasPage.tsx';
          import { AlumnoList } from '/src/modules/alumnos/components/AlumnoList.tsx';
          import { CursadaModal } from '/src/modules/inscripciones/components/CursadaModal.tsx';
          function BajaTest() { const [open, setOpen] = React.useState(true); return open ? React.createElement(CursadaModal, { inscripcionId: ${JSON.stringify(pendingUi.id)}, registrarBaja: true, onClose: () => setOpen(false), onSuccess: () => {} }) : React.createElement('p', null, 'Baja guardada'); }
          import '/src/index.css';
          pb.authStore.save(${JSON.stringify(token)}, ${JSON.stringify(staff.body.record)});
          useAppStore.setState({ cicloActual: ${JSON.stringify(cycle)} });
          createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode, null,
          React.createElement(App, null, React.createElement(BrowserRouter, null, React.createElement(Routes, null,
          React.createElement(Route, { path: '/app/boletines/calificaciones', element: React.createElement(CargaNotasPage) }),
          React.createElement(Route, { path: '/app/baja', element: React.createElement(BajaTest) }),
          React.createElement(Route, { path: '/app/alumnos', element: React.createElement(AlumnoList) }))))));
        ` : undefined,
        configureServer: server => { server.middlewares.use(async (req, res, next) => {
          if (!req.url.startsWith('/app/')) return next();
          res.setHeader('Content-Type', 'text/html');
          res.end(await server.transformIndexHtml(req.url, '<div id="root"></div><script type="module" src="/__scope-test"></script>'));
        }); },
      }, react()],
    });
    await vite.listen();
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    const url = 'http://127.0.0.1:' + vite.httpServer.address().port + '/app/boletines/calificaciones?periodo=' + periods[2].id;
    await page.goto(url);
    await page.getByRole('button', { name: '1 cursadas por confirmar', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await page.getByLabel('Primer bimestre evaluable').click();
    await page.getByText('3.º bimestre', { exact: true }).click();
    await page.locator('.ant-select-dropdown:visible').waitFor({ state: 'hidden' });
    await page.getByLabel('Último bimestre evaluable').click();
    await page.locator('.ant-select-dropdown:visible').getByText('4.º bimestre', { exact: true }).click();
    await page.getByRole('heading', { name: 'Bimestres evaluables', exact: true }).click();
    await page.locator('.ant-select-dropdown:visible').waitFor({ state: 'hidden' });
    await page.screenshot({ path: path.join(base, 'evaluable-scope-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(base, 'evaluable-scope-mobile.png') });
    await page.getByRole('button', { name: 'Confirmar cursada', exact: true }).click();
    await page.waitForFunction(() => !document.body.textContent.includes('Primer bimestre evaluable'));
    const confirmed = await readScope(pendingUi.id);
    assert.equal(confirmed.cursada.desde, 3);
    assert.equal(confirmed.cursada.hasta, 4);
    await page.goto('http://127.0.0.1:' + vite.httpServer.address().port + '/app/baja');
    await page.getByLabel('Fecha administrativa de baja').waitFor();
    await patch('inscripciones', pendingUi.id, { numero_orden: 9 });
    await page.getByRole('button', { name: /Registrar baja$/ }).click();
    await page.getByText('La matrícula cambió. Volvé a cargar la cursada antes de guardar.', { exact: true }).waitFor();
    assert.equal((await readScope(pendingUi.id)).estadoAdministrativo, 'Regular');
    await page.getByRole('button', { name: 'Volver a cargar', exact: true }).click();
    await page.getByText('Sintético, Alumno · 1° · 2026', { exact: true }).waitFor({ state: 'attached' });
    await page.getByLabel('Último bimestre evaluable').click();
    await page.locator('.ant-select-dropdown:visible').getByText('3.º bimestre', { exact: true }).click();
    await page.locator('.ant-select-dropdown:visible').waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: /Registrar baja$/ }).click();
    await page.getByText('Baja guardada', { exact: true }).waitFor();
    const uiBaja = await readScope(pendingUi.id);
    assert.equal(uiBaja.estadoAdministrativo, 'Baja');
    assert.equal(uiBaja.cursada.hasta, 3);
    await patch('inscripciones', late.id, { posee_apoyos: '-' });
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto('http://127.0.0.1:' + vite.httpServer.address().port + '/app/boletines/calificaciones?curso=' + course.id + '&periodo=' + periods[1].id + '&inscripcion=' + late.id);
    await page.getByRole('button', { name: 'Revisar apoyos · 2.º bimestre', exact: true }).waitFor();
    await page.locator('#integracion-escolar').getByRole('button', { name: /Editar/ }).click();
    await page.locator('#integracion-escolar').getByRole('button', { name: /Guardar/ }).click();
    await page.waitForFunction(() => !document.body.textContent.includes('Faltan datos para el PDF'));
    assert.equal((await request('/api/collections/inscripciones/records/' + late.id, 'GET', null, token)).body.posee_apoyos, 'NO');
    assert.equal((await snapshot(2, late.id)).status, 422);
    await approve(2, late.id);
    assert.equal((await snapshot(2, late.id)).status, 200);

    assert.deepEqual(errors, []);
    if (process.env.CYS_EXPORT_SCOPE_SCHEMA === '1') {
      const collections = (await request('/api/collections?perPage=500', 'GET', null, admin.body.token)).body.items;
      const schema = JSON.parse(fs.readFileSync('pb_schema.json', 'utf8'));
      const collection = collections.find(item => item.name === 'inscripciones');
      delete collection.created; delete collection.updated;
      const index = schema.findIndex(item => item.name === 'inscripciones');
      schema[index] = collection;
      fs.writeFileSync('pb_schema.json', JSON.stringify(schema, null, 2) + '\n');
    }
  } catch (error) {
    await new Promise(resolve => setTimeout(resolve, 100));
    process.stderr.write(serverOutput.split('\n').filter(line => /error|Error|└/i.test(line)).slice(-10).join('\n') + '\n');
    if (page) await page.screenshot({ path: path.join(base, 'evaluable-scope-failure.png') });
    if (page) process.stderr.write((await page.locator('body').innerText()).slice(0, 5000) + '\n');
    throw error;
  } finally {
    await browser?.close();
    await vite?.close();
    if (processHandle && processHandle.exitCode === null) { processHandle.kill(); await new Promise(resolve => processHandle.once('exit', resolve)); }
    const resolved = fs.realpathSync(root);
    assert.equal(path.dirname(resolved).toLowerCase(), base.toLowerCase());
    assert.ok(path.basename(resolved).startsWith('evaluable-scope-test-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});
