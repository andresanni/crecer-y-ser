const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const net = require('node:net');
const { chromium } = require('playwright-core');

test('Preparación documental HTTP y corrección contextual en PocketBase sintético aislado', { timeout: 180000 }, async () => {
  const base = path.resolve('C:/pocketbase');
  const root = fs.mkdtempSync(path.join(base, 'document-readiness-test-'));
  const binary = path.join(base, 'pocketbase.exe');
  const emptyHooks = path.join(root, 'empty-hooks');
  fs.mkdirSync(emptyHooks);
  const common = [`--dir=${path.join(root, 'data')}`, `--migrationsDir=${path.resolve('pb_migrations')}`, `--hooksDir=${emptyHooks}`, '--automigrate=false'];
  const password = randomBytes(24).toString('hex');
  let processHandle;
  let browser;
  let vite;
  let page;
  try {
    execFileSync(binary, ['migrate', 'up', ...common], { windowsHide: true, stdio: 'pipe' });
    execFileSync(binary, ['admin', 'create', 'test@example.local', password, ...common], { windowsHide: true, stdio: 'pipe' });
    const socket = net.createServer();
    await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
    const port = socket.address().port;
    await new Promise(resolve => socket.close(resolve));
    const origin = `http://127.0.0.1:${port}`;
    processHandle = spawn(binary, ['serve', ...common.filter(arg => !arg.startsWith('--hooksDir')), `--hooksDir=${path.resolve('pb_hooks')}`, `--http=127.0.0.1:${port}`], { windowsHide: true, stdio: 'ignore' });
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
    const approvals = [];
    for (let n = 1; n <= 4; n++) {
      const period = await create('periodos', { ciclo_id: cycle.id, nombre: `${n}° Bimestre`, numero_periodo: n });
      periods.push(period);
      const workflow = await create('instancias_carga_boletin', { curso_id: course.id, periodo_id: period.id, estado: 'CONTROL_DIRECTIVO', revision: 1 });
      approvals.push(await create('visados_boletin', { instancia_id: workflow.id, inscripcion_id: enrollment.id, estado: 'VISADO', revision_contenido: 1, revision_visada: 1, generacion_visado: 1 }));
      const evaluation = await create('evaluaciones_materia', { inscripcion_id: enrollment.id, periodo_id: period.id, curso_materia_id: material.id, calificacion_general_id: note.id, ppi: false });
      for (const criterion of criteria) await create('evaluaciones_criterios', { evaluacion_materia_id: evaluation.id, criterio_id: criterion.id, valor_escala_id: note.id });
      await create('cierres_periodo_alumno', { inscripcion_id: enrollment.id, periodo_id: period.id, asistencias: 0, inasistencias: 0, llegadas_tarde: 0 });
    }
    const reviewUrl = `/api/cys/directivo/revision/${course.id}/${periods[0].id}`;
    const snapshot = n => request(`/api/cys/directivo/boletines/${enrollment.id}/instantanea?periodoId=${periods[n - 1].id}`, 'GET', null, token);
    assert.equal((await request(reviewUrl)).status, 401);
    assert.equal((await snapshot(1)).status, 200);
    const duplicateLink = await create('alumno_responable', { alumno_id: student.id, responsable_id: guardian.id, vinculo: 'Padre' });
    assert.equal((await snapshot(1)).status, 200);
    const secondGuardian = await create('responsables', { apellidos: 'Otro', nombres: 'Tutor' });
    await patch('alumno_responable', duplicateLink.id, { responsable_id: secondGuardian.id });
    assert.equal((await snapshot(1)).body.codigo, 'TUTOR_UNICO_REQUERIDO');
    assert.equal((await request(reviewUrl, 'GET', null, token)).body.boletines[0].preparacionDocumental.faltantes[0].campo, 'responsable.vinculo');
    await request(`/api/collections/alumno_responable/records/${duplicateLink.id}`, 'DELETE', null, admin.body.token);
    await request(`/api/collections/alumno_responable/records/${guardianLink.id}`, 'DELETE', null, admin.body.token);
    assert.equal((await snapshot(1)).body.codigo, 'TUTOR_UNICO_REQUERIDO');
    await create('alumno_responable', { alumno_id: student.id, responsable_id: guardian.id, vinculo: 'Padre' });
    assert.equal((await snapshot(4)).body.faltantes[0].campo, 'apoyos.promocionoConAcompanamiento');
    await patch('alumnos', student.id, { dni: ' ' });
    assert.equal((await snapshot(1)).body.codigo, 'DATOS_DOCUMENTALES_INCOMPLETOS');
    await patch('visados_boletin', approvals[0].id, { estado: 'PENDIENTE_REVISION' });
    let review = await request(reviewUrl, 'GET', null, token);
    assert.equal(review.body.boletines[0].preparacionDocumental.completa, false);
    assert.equal(review.body.boletines[0].elegibilidadPdf.elegiblePorVisados, false);
    await patch('visados_boletin', approvals[0].id, { estado: 'VISADO' });
    await patch('alumnos', student.id, { dni: '00000001' });
    await patch('inscripciones', enrollment.id, { posee_apoyos: 'SI', cuales_apoyos: '---' });
    assert.equal((await snapshot(2)).body.faltantes[0].campo, 'apoyos.cualesApoyos');
    await patch('inscripciones', enrollment.id, { posee_apoyos: '-' });
    review = await request(reviewUrl, 'GET', null, token);
    assert.equal(review.body.boletines[0].preparacionDocumental.faltantes[0].bimestre, 1);
    const { createServer } = await import('vite');
    const react = (await import('@vitejs/plugin-react')).default;
    const entry = 'virtual:readiness-test';
    vite = await createServer({ configFile: false, cacheDir: 'node_modules/.cache/test-readiness', logLevel: 'error',
      define: { 'import.meta.env.VITE_POCKETBASE_URL': JSON.stringify(origin) },
      server: { host: '127.0.0.1', port: 0 },
      plugins: [{ name: 'readiness-test', resolveId: id => id === '/__readiness-test' ? entry : undefined,
        load: id => id === entry ? `
          import React from 'react'; import { createRoot } from 'react-dom/client';
          import { BrowserRouter, Routes, Route } from 'react-router-dom'; import { App } from 'antd';
          import pb from '/src/core/pocketbase.ts'; import { useAppStore } from '/src/store/appStore.ts';
          import { CargaNotasPage } from '/src/modules/boletines/components/CargaNotasPage.tsx';
          import { AlumnoList } from '/src/modules/alumnos/components/AlumnoList.tsx';
          import '/src/index.css';
          pb.authStore.save(${JSON.stringify(token)}, ${JSON.stringify(staff.body.record)});
          useAppStore.setState({ cicloActual: ${JSON.stringify(cycle)} });
          createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode, null,
          React.createElement(App, null, React.createElement(BrowserRouter, null, React.createElement(Routes, null,
          React.createElement(Route, { path: '/app/boletines/calificaciones', element: React.createElement(CargaNotasPage) }),
          React.createElement(Route, { path: '/app/alumnos', element: React.createElement(AlumnoList) }))))));
        ` : undefined,
        configureServer: server => { server.middlewares.use(async (req, res, next) => {
          if (!req.url.startsWith('/app/')) return next();
          res.setHeader('Content-Type', 'text/html');
          res.end(await server.transformIndexHtml(req.url, '<div id="root"></div><script type="module" src="/__readiness-test"></script>'));
        }); },
      }, react()],
    });
    await vite.listen();
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const url = `http://127.0.0.1:${vite.httpServer.address().port}/app/boletines/calificaciones?curso=${course.id}&periodo=${periods[1].id}&inscripcion=${enrollment.id}`;
    await page.goto(url);
    await page.getByText('Faltan datos para el PDF', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Descargar PDF', exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: 'Revisar apoyos · 1.º bimestre', exact: true }).click();
    await page.waitForURL(value => value.searchParams.get('periodo') === periods[0].id);
    await page.locator('#integracion-escolar').getByRole('button', { name: /Editar/ }).click();
    await page.locator('#integracion-escolar').getByRole('button', { name: /Guardar/ }).click();
    await page.waitForFunction(() => !document.body.textContent.includes('Faltan datos para el PDF'));
    await page.getByRole('button', { name: 'Volver al boletín de origen', exact: true }).click();
    await page.waitForURL(value => value.searchParams.get('periodo') === periods[1].id);
    assert.equal(new URL(page.url()).searchParams.get('inscripcion'), enrollment.id);
    const current = await request(`/api/collections/inscripciones/records/${enrollment.id}`, 'GET', null, token);
    assert.equal(current.body.posee_apoyos, 'NO');
    assert.equal((await snapshot(2)).status, 422);
    await page.getByRole('button', { name: /Editar/ }).last().click();
    await page.getByRole('spinbutton').first().fill('3');
    await patch('alumnos', student.id, { dni: '' });
    await page.getByRole('button', { name: 'Completar ficha', exact: true }).waitFor();
    assert.equal(await page.getByRole('spinbutton').first().inputValue(), '3');
    assert.equal(await page.getByRole('button', { name: 'Completar ficha', exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: /Descartar/ }).click();
    await page.getByRole('button', { name: 'Descartar cambios', exact: true }).click();
    await page.getByRole('button', { name: 'Completar ficha', exact: true }).waitFor();
    await page.screenshot({ path: path.join(base, 'document-readiness-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: 'Completar ficha', exact: true }).click();
    await page.waitForURL('**/app/alumnos?**');
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.waitForURL(value => value.pathname === '/app/boletines/calificaciones');
    assert.equal(new URL(page.url()).searchParams.get('inscripcion'), enrollment.id);
    assert.equal(new URL(page.url()).searchParams.get('periodo'), periods[1].id);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Completar ficha', exact: true }).waitFor();
    await page.screenshot({ path: path.join(base, 'document-readiness-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: 'Completar ficha', exact: true }).click();
    await page.locator('#alumnoForm_dni').fill('00000001');
    await page.getByRole('button', { name: /Guardar cambios/ }).click();
    await page.waitForURL(value => value.pathname === '/app/boletines/calificaciones');
    const repaired = await request(reviewUrl, 'GET', null, token);
    assert.equal(repaired.body.boletines[0].preparacionDocumental.completa, true);
    assert.equal((await request(`/api/collections/alumnos/records/${student.id}`, 'GET', null, token)).body.dni, '00000001');
    assert.deepEqual(errors, []);
  } catch (error) {
    if (page) process.stderr.write((await page.locator('body').innerText()).slice(0, 5000) + '\n');
    throw error;
  } finally {
    await browser?.close();
    await vite?.close();
    if (processHandle && processHandle.exitCode === null) { processHandle.kill(); await new Promise(resolve => processHandle.once('exit', resolve)); }
    const resolved = fs.realpathSync(root);
    assert.equal(path.dirname(resolved).toLowerCase(), base.toLowerCase());
    assert.ok(path.basename(resolved).startsWith('document-readiness-test-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});
