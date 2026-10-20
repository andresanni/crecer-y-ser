const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn, execFileSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { default: PocketBase } = require('pocketbase');

async function jsonRequest(origin, routePath, options = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  const response = await fetch(origin + routePath, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  let body = null;
  try {
    body = await response.json();
  } catch (_) {}
  return { status: response.status, body };
}

test('Flujo HTTP completo de Informes de Maestras: enlaces, carga progresiva, entrega atómica y revisión directiva', { timeout: 90000 }, async () => {
  const base = path.resolve('C:/pocketbase');
  const root = fs.mkdtempSync(path.join(base, 'reports-http-test-'));
  const binary = path.join(base, 'pocketbase.exe');
  const emptyHooks = path.join(root, 'empty-hooks');
  fs.mkdirSync(emptyHooks);

  const args = [
    `--dir=${path.join(root, 'data')}`,
    `--migrationsDir=${path.resolve('pb_migrations')}`,
    `--hooksDir=${emptyHooks}`,
    '--automigrate=false',
  ];
  const password = randomBytes(24).toString('hex');
  const teacherLinkKey = '0123456789abcdef0123456789abcdef';
  let server;

  try {
    execFileSync(binary, ['migrate', 'up', ...args], { windowsHide: true, stdio: 'pipe' });
    execFileSync(binary, ['admin', 'create', 'reports-http-admin@example.local', password, ...args], {
      windowsHide: true,
      stdio: 'pipe',
    });

    const socket = net.createServer();
    await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
    const port = socket.address().port;
    await new Promise((resolve) => socket.close(resolve));
    const origin = `http://127.0.0.1:${port}`;

    server = spawn(
      binary,
      [
        'serve',
        ...args.filter((arg) => !arg.startsWith('--hooksDir=')),
        `--hooksDir=${path.resolve('pb_hooks')}`,
        `--http=127.0.0.1:${port}`,
      ],
      {
        windowsHide: true,
        stdio: 'ignore',
        env: Object.assign({}, process.env, {
          CYS_TEACHER_LINK_KEY: teacherLinkKey,
          CYS_PDF_WORKER_KEY: 'worker-secret-test-key',
        }),
      }
    );

    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (
        await fetch(origin + '/api/health')
          .then((response) => response.ok)
          .catch(() => false)
      ) {
        ready = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.equal(ready, true, 'PocketBase temporal debe iniciar');

    const admin = new PocketBase(origin);
    admin.autoCancellation(false);
    const adminAuthRes = await jsonRequest(origin, '/api/admins/auth-with-password', {
      method: 'POST',
      body: { identity: 'reports-http-admin@example.local', password },
    });
    assert.equal(adminAuthRes.status, 200);
    admin.authStore.save(adminAuthRes.body.token, adminAuthRes.body.admin);

    await admin.collection('users').create({
      email: 'directora-informes@example.local',
      password,
      passwordConfirm: password,
      name: 'Myriam Adducci',
    });

    const staff = new PocketBase(origin);
    staff.autoCancellation(false);
    const staffAuth = await staff.collection('users').authWithPassword('directora-informes@example.local', password);
    const staffHeaders = { Authorization: `Bearer ${staffAuth.token}` };

    const cycle = await admin.collection('ciclos_lectivos').create({
      nombre: 'Ciclo Lectivo 2026',
      ano: 2026,
      activo: true,
    });

    const course2 = await admin.collection('cursos').create({
      nombre: '2° Grado',
      grado: '2°',
      division: 'A',
      turno: 'Mañana',
    });

    const course1 = await admin.collection('cursos').create({
      nombre: '1° Grado',
      grado: '1°',
      division: 'A',
      turno: 'Mañana',
    });

    const studentA = await admin.collection('alumnos').create({
      nombres: 'BAUTISTA',
      apellidos: 'ACOSTA',
      dni: '55111222',
    });

    const studentB = await admin.collection('alumnos').create({
      nombres: 'SOFIA',
      apellidos: 'BENITEZ',
      dni: '55333444',
    });

    const enrollmentA = await admin.collection('inscripciones').create({
      alumno_id: studentA.id,
      curso_id: course2.id,
      ciclo_id: cycle.id,
      estado: 'Regular',
      numero_orden: 1,
      cursada_estado: 'CONFIRMADA',
      bimestre_desde: 1,
      bimestre_hasta: 4,
      revision_cursada: 1,
    });

    const enrollmentB = await admin.collection('inscripciones').create({
      alumno_id: studentB.id,
      curso_id: course2.id,
      ciclo_id: cycle.id,
      estado: 'Regular',
      numero_orden: 2,
      cursada_estado: 'PENDIENTE',
      bimestre_desde: 1,
      bimestre_hasta: 4,
      revision_cursada: 0,
    });

    const edFisicaTemplate = await admin
      .collection('plantillas_informe')
      .getFirstListItem('codigo = "FINAL_ED_FISICA_G2"');
    await admin.collection('plantillas_informe').update(edFisicaTemplate.id, {
      grado_desde: 2,
      grado_hasta: 2,
    });

    const stagesRes = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/etapas/${cycle.id}/CICLO_FINAL`,
      { headers: staffHeaders }
    );
    assert.equal(stagesRes.status, 200);
    assert.equal(stagesRes.body.materiasEspeciales.length, 5);
    assert.equal(stagesRes.body.cursos.length, 2);
    assert.equal(stagesRes.body.celdas.length, 10);

    const edFisica = stagesRes.body.materiasEspeciales.find((m) => m.codigoEspecial === 'EDUCACION_FISICA');
    const artesVisuales = stagesRes.body.materiasEspeciales.find((m) => m.codigoEspecial === 'ARTES_VISUALES');
    assert.ok(edFisica);
    assert.ok(artesVisuales);

    const cellG2EdFisica = stagesRes.body.celdas.find(
      (c) => c.cursoId === course2.id && c.materiaId === edFisica.id
    );
    assert.equal(cellG2EdFisica.etapa, 'PENDIENTE_EMISION');
    assert.equal(cellG2EdFisica.plantillaCodigo, 'FINAL_ED_FISICA_G2');
    assert.equal(cellG2EdFisica.totalItems, 24);
    assert.equal(cellG2EdFisica.cursadasPendientes.length, 1);

    const cellG1EdFisica = stagesRes.body.celdas.find(
      (c) => c.cursoId === course1.id && c.materiaId === edFisica.id
    );
    assert.equal(cellG1EdFisica.etapa, 'PENDIENTE_CONFIGURACION');

    const unconfiguredIssue = await jsonRequest(origin, '/api/cys/enlaces-informes', {
      method: 'POST',
      headers: staffHeaders,
      body: {
        cicloId: cycle.id,
        tipoInforme: 'CICLO_FINAL',
        cursoId: course1.id,
        materiaId: edFisica.id,
        docenteNombre: 'MARIA FLORENCIA',
        docenteApellido: 'RODRIGUEZ',
      },
    });
    assert.equal(unconfiguredIssue.status, 400);

    const missingTeacherSurname = await jsonRequest(origin, '/api/cys/enlaces-informes', {
      method: 'POST',
      headers: staffHeaders,
      body: {
        cicloId: cycle.id,
        tipoInforme: 'CICLO_FINAL',
        cursoId: course2.id,
        materiaId: edFisica.id,
        docenteNombre: 'MARIA FLORENCIA',
        docenteApellido: '',
      },
    });
    assert.equal(missingTeacherSurname.status, 400);

    const issueRes = await jsonRequest(origin, '/api/cys/enlaces-informes', {
      method: 'POST',
      headers: staffHeaders,
      body: {
        cicloId: cycle.id,
        tipoInforme: 'CICLO_FINAL',
        cursoId: course2.id,
        materiaId: edFisica.id,
        docenteNombre: 'MARIA FLORENCIA',
        docenteApellido: 'RODRIGUEZ',
      },
    });
    assert.equal(issueRes.status, 201);
    assert.ok(issueRes.body.secreto.startsWith('cys_'));
    assert.equal(issueRes.body.instancia.estado, 'BORRADOR_DOCENTE');
    assert.equal(issueRes.body.instancia.docenteNombre, 'MARIA FLORENCIA');
    assert.equal(issueRes.body.instancia.docenteApellido, 'RODRIGUEZ');

    const tokenId1 = issueRes.body.enlace.id;
    const secret1 = issueRes.body.secreto;
    const instanciaId = issueRes.body.instancia.id;

    const recoverRes = await jsonRequest(
      origin,
      `/api/cys/enlaces-informes/${tokenId1}/recuperar`,
      { method: 'POST', headers: staffHeaders }
    );
    assert.equal(recoverRes.status, 200);
    assert.equal(recoverRes.body.secreto, secret1);

    const rotateRes = await jsonRequest(
      origin,
      `/api/cys/enlaces-informes/${tokenId1}/rotar`,
      { method: 'POST', headers: staffHeaders, body: {} }
    );
    assert.equal(rotateRes.status, 200);
    const secret2 = rotateRes.body.secreto;
    assert.notEqual(secret2, secret1);

    const oldTokenCtx = await jsonRequest(origin, '/api/cys/docente-informes/contexto', {
      headers: { 'X-CYS-Teacher-Token': secret1 },
    });
    assert.equal(oldTokenCtx.status, 401);

    const revokeRes = await jsonRequest(origin, `/api/cys/enlaces-informes/${tokenId1}`, {
      method: 'DELETE',
      headers: staffHeaders,
    });
    assert.equal(revokeRes.status, 200);
    assert.equal(revokeRes.body.eliminado, true);

    const stagesPaused = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/etapas/${cycle.id}/CICLO_FINAL`,
      { headers: staffHeaders }
    );
    const cellPaused = stagesPaused.body.celdas.find(
      (c) => c.cursoId === course2.id && c.materiaId === edFisica.id
    );
    assert.equal(cellPaused.etapa, 'CARGA_PAUSADA');

    const reissueRes = await jsonRequest(origin, '/api/cys/enlaces-informes', {
      method: 'POST',
      headers: staffHeaders,
      body: {
        cicloId: cycle.id,
        tipoInforme: 'CICLO_FINAL',
        cursoId: course2.id,
        materiaId: edFisica.id,
        docenteNombre: 'MARIA FLORENCIA',
        docenteApellido: 'RODRIGUEZ',
      },
    });
    assert.equal(reissueRes.status, 201);
    const activeSecret = reissueRes.body.secreto;
    const teacherHeaders = { 'X-CYS-Teacher-Token': activeSecret };

    const ctxRes = await jsonRequest(origin, '/api/cys/docente-informes/contexto', {
      headers: teacherHeaders,
    });
    assert.equal(ctxRes.status, 200);
    assert.equal(ctxRes.body.plantilla.codigo, 'FINAL_ED_FISICA_G2');
    assert.equal(ctxRes.body.plantilla.mostrarLeyendaEscala, true);
    assert.equal(ctxRes.body.items.length, 24);
    assert.equal(ctxRes.body.alumnos.length, 2);
    assert.equal(ctxRes.body.progreso.alumnosCompletos, 0);
    assert.equal(ctxRes.body.cursadasPendientes.length, 1);

    const items = ctxRes.body.items;

    const partialSaveRes = await jsonRequest(
      origin,
      `/api/cys/docente-informes/alumnos/${enrollmentA.id}`,
      {
        method: 'PUT',
        headers: teacherHeaders,
        body: {
          desempenoGeneralValor: '',
          respuestas: items.slice(0, 5).map((item) => ({
            itemId: item.id,
            valorCodigo: 'C',
          })),
        },
      }
    );
    assert.equal(partialSaveRes.status, 200);
    assert.equal(partialSaveRes.body.completo, false);
    assert.equal(partialSaveRes.body.itemsRespondidos, 5);

    const incompleteSubmit = await jsonRequest(origin, '/api/cys/docente-informes/enviar', {
      method: 'POST',
      headers: teacherHeaders,
      body: {},
    });
    assert.equal(incompleteSubmit.status, 422);
    assert.equal(incompleteSubmit.body.completa, false);
    assert.equal(incompleteSubmit.body.pendientes.length, 2);

    const fullSaveA = await jsonRequest(
      origin,
      `/api/cys/docente-informes/alumnos/${enrollmentA.id}`,
      {
        method: 'PUT',
        headers: teacherHeaders,
        body: {
          desempenoGeneralValor: 'ALCANZADO',
          respuestas: items.map((item, idx) => ({
            itemId: item.id,
            valorCodigo: idx % 2 === 0 ? 'D' : 'C',
          })),
        },
      }
    );
    assert.equal(fullSaveA.status, 200);
    assert.equal(fullSaveA.body.completo, true);

    const fullSaveB = await jsonRequest(
      origin,
      `/api/cys/docente-informes/alumnos/${enrollmentB.id}`,
      {
        method: 'PUT',
        headers: teacherHeaders,
        body: {
          desempenoGeneralValor: 'AVANZADO',
          respuestas: items.map((item) => ({
            itemId: item.id,
            valorCodigo: 'C',
          })),
        },
      }
    );
    assert.equal(fullSaveB.status, 200);
    assert.equal(fullSaveB.body.completo, true);

    const pendingScopeSubmit = await jsonRequest(origin, '/api/cys/docente-informes/enviar', {
      method: 'POST',
      headers: teacherHeaders,
      body: {},
    });
    assert.equal(pendingScopeSubmit.status, 422);
    assert.equal(pendingScopeSubmit.body.pendientes.length, 0);
    assert.equal(pendingScopeSubmit.body.cursadasPendientes.length, 1);

    const scopeReadB = await jsonRequest(
      origin,
      `/api/cys/directivo/inscripciones/${enrollmentB.id}/cursada`,
      { headers: staffHeaders }
    );
    assert.equal(scopeReadB.status, 200);

    const confirmScopeB = await jsonRequest(
      origin,
      `/api/cys/directivo/inscripciones/${enrollmentB.id}/cursada`,
      {
        method: 'PUT',
        headers: staffHeaders,
        body: {
          expectedRevision: scopeReadB.body.cursada.revision,
          expectedUpdated: scopeReadB.body.updated,
          desde: 1,
          hasta: 4,
          sinCursada: false,
          registrarBaja: false,
        },
      }
    );
    assert.equal(confirmScopeB.status, 200);

    const submitOk = await jsonRequest(origin, '/api/cys/docente-informes/enviar', {
      method: 'POST',
      headers: teacherHeaders,
      body: {},
    });
    assert.equal(submitOk.status, 200);
    assert.equal(submitOk.body.instancia.estado, 'CONTROL_DIRECTIVO');
    assert.equal(submitOk.body.totalAlumnos, 2);

    const revokedAfterSubmit = await jsonRequest(origin, '/api/cys/docente-informes/contexto', {
      headers: teacherHeaders,
    });
    assert.equal(revokedAfterSubmit.status, 401);

    const reviewRes1 = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/revision/${instanciaId}`,
      { headers: staffHeaders }
    );
    assert.equal(reviewRes1.status, 200);
    assert.equal(reviewRes1.body.etapa, 'REVISION_DIRECTIVA');
    assert.equal(reviewRes1.body.totalInformes, 2);
    assert.equal(reviewRes1.body.visados, 0);
    assert.equal(reviewRes1.body.alumnosSinIncorporar, 0);

    const studentC = await admin.collection('alumnos').create({
      nombres: 'VALENTINA',
      apellidos: 'CARRIZO',
      dni: '55666777',
    });
    const enrollmentC = await admin.collection('inscripciones').create({
      alumno_id: studentC.id,
      curso_id: course2.id,
      ciclo_id: cycle.id,
      estado: 'Regular',
      numero_orden: 3,
      cursada_estado: 'CONFIRMADA',
      bimestre_desde: 2,
      bimestre_hasta: 4,
      revision_cursada: 1,
    });

    const reviewWithMissing = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/revision/${instanciaId}`,
      { headers: staffHeaders }
    );
    assert.equal(reviewWithMissing.status, 200);
    assert.equal(reviewWithMissing.body.alumnosSinIncorporar, 1);

    const staleSync = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/${instanciaId}/sincronizar-matricula`,
      {
        method: 'POST',
        headers: staffHeaders,
        body: { expectedRevision: reviewWithMissing.body.instancia.revision + 99 },
      }
    );
    assert.equal(staleSync.status, 409);

    const syncOk = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/${instanciaId}/sincronizar-matricula`,
      {
        method: 'POST',
        headers: staffHeaders,
        body: { expectedRevision: reviewWithMissing.body.instancia.revision },
      }
    );
    assert.equal(syncOk.status, 200);
    assert.equal(syncOk.body.incorporados, 1);

    const updateTeacherRes = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/${instanciaId}/docente`,
      {
        method: 'PATCH',
        headers: staffHeaders,
        body: {
          docenteNombre: 'MARIA FLORENCIA',
          docenteApellido: 'RODRIGUEZ PEREZ',
          expectedRevision: syncOk.body.instancia.revision,
        },
      }
    );
    assert.equal(updateTeacherRes.status, 200);
    assert.equal(updateTeacherRes.body.instancia.docenteApellido, 'RODRIGUEZ PEREZ');

    let currentRevision = updateTeacherRes.body.instancia.revision;

    const incompleteApprovalC = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/${instanciaId}/alumnos/${enrollmentC.id}/visar`,
      {
        method: 'POST',
        headers: staffHeaders,
        body: { expectedRevision: currentRevision, expectedContentRevision: 0 },
      }
    );
    assert.equal(incompleteApprovalC.status, 400);

    const staffCompleteC = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/${instanciaId}/alumnos/${enrollmentC.id}`,
      {
        method: 'PUT',
        headers: staffHeaders,
        body: {
          expectedRevision: currentRevision,
          desempenoGeneralValor: 'AVANZADO',
          respuestas: items.map((item) => ({
            itemId: item.id,
            valorCodigo: 'D',
          })),
        },
      }
    );
    assert.equal(staffCompleteC.status, 200);
    assert.equal(staffCompleteC.body.visado.revisionContenido, 1);
    currentRevision = staffCompleteC.body.instancia.revision;

    for (const [enrId, contentRev] of [
      [enrollmentA.id, 0],
      [enrollmentB.id, 0],
      [enrollmentC.id, 1],
    ]) {
      const approveRes = await jsonRequest(
        origin,
        `/api/cys/directivo/informes/${instanciaId}/alumnos/${enrId}/visar`,
        {
          method: 'POST',
          headers: staffHeaders,
          body: { expectedRevision: currentRevision, expectedContentRevision: contentRev },
        }
      );
      assert.equal(approveRes.status, 200);
      assert.equal(approveRes.body.visado.estado, 'VISADO');
      currentRevision = approveRes.body.instancia.revision;
    }

    const reviewReady = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/revision/${instanciaId}`,
      { headers: staffHeaders }
    );
    assert.equal(reviewReady.status, 200);
    assert.equal(reviewReady.body.etapa, 'LISTO_PARA_PDF');
    assert.equal(reviewReady.body.visados, 3);
    assert.ok(reviewReady.body.informes.every((inf) => inf.elegibilidadPdf.elegibleParaPdf));

    const conflictStaffEdit = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/${instanciaId}/alumnos/${enrollmentA.id}`,
      {
        method: 'PUT',
        headers: staffHeaders,
        body: {
          expectedRevision: currentRevision - 1,
          desempenoGeneralValor: 'DESTACADO',
          respuestas: items.map((item) => ({ itemId: item.id, valorCodigo: 'D' })),
        },
      }
    );
    assert.equal(conflictStaffEdit.status, 409);

    const staffEditA = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/${instanciaId}/alumnos/${enrollmentA.id}`,
      {
        method: 'PUT',
        headers: staffHeaders,
        body: {
          expectedRevision: currentRevision,
          desempenoGeneralValor: 'DESTACADO',
          respuestas: items.map((item) => ({ itemId: item.id, valorCodigo: 'D' })),
        },
      }
    );
    assert.equal(staffEditA.status, 200);
    assert.equal(staffEditA.body.visado.estado, 'PENDIENTE_REVISION');
    assert.equal(staffEditA.body.visado.revisionContenido, 1);
    assert.equal(staffEditA.body.evaluacion.desempenoGeneralValor, 'DESTACADO');
    currentRevision = staffEditA.body.instancia.revision;

    const reapproveA = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/${instanciaId}/alumnos/${enrollmentA.id}/visar`,
      {
        method: 'POST',
        headers: staffHeaders,
        body: { expectedRevision: currentRevision, expectedContentRevision: 1 },
      }
    );
    assert.equal(reapproveA.status, 200);
    assert.equal(reapproveA.body.visado.estado, 'VISADO');
    currentRevision = reapproveA.body.instancia.revision;

    const revokeApprovalB = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/${instanciaId}/alumnos/${enrollmentB.id}/retirar-visado`,
      {
        method: 'POST',
        headers: staffHeaders,
        body: { expectedRevision: currentRevision, expectedContentRevision: 0 },
      }
    );
    assert.equal(revokeApprovalB.status, 200);
    assert.equal(revokeApprovalB.body.visado.estado, 'PENDIENTE_REVISION');
    currentRevision = revokeApprovalB.body.instancia.revision;

    const snapNotVisadoB = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/${instanciaId}/alumnos/${enrollmentB.id}/instantanea`,
      { headers: staffHeaders }
    );
    assert.equal(snapNotVisadoB.status, 422);

    const snapVisadoA = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/${instanciaId}/alumnos/${enrollmentA.id}/instantanea`,
      { headers: staffHeaders }
    );
    assert.equal(snapVisadoA.status, 200);
    assert.match(snapVisadoA.body.huella, /^[a-f0-9]{64}$/);
    assert.equal(snapVisadoA.body.datos.evaluacion.desempenoGeneralEtiqueta, 'Destacado');
    assert.equal(snapVisadoA.body.datos.docente.apellido, 'RODRIGUEZ PEREZ');
    assert.equal(snapVisadoA.body.datos.direccion.apellido, 'ADDUCCI');

    const versionHash = 'a'.repeat(64);
    const pdfBytes = Buffer.from('%PDF-1.4\n%Test informe PDF\n%%EOF\n', 'utf8');
    const archivoSha256 = 'b'.repeat(64);
    const form = new FormData();
    form.set('huella', snapVisadoA.body.huella);
    form.set('version', versionHash);
    form.set('archivoSha256', archivoSha256);
    form.set('archivo', new Blob([pdfBytes], { type: 'application/pdf' }), 'informe.pdf');

    const publishRes = await fetch(
      `${origin}/api/cys/directivo/informes/${instanciaId}/alumnos/${enrollmentA.id}/emisiones`,
      {
        method: 'POST',
        headers: Object.assign({}, staffHeaders, {
          'X-CYS-PDF-Worker': 'worker-secret-test-key',
        }),
        body: form,
      }
    );
    assert.equal(publishRes.status, 200);
    const publishedBody = await publishRes.json();
    assert.equal(publishedBody.created, true);
    assert.ok(publishedBody.id);

    const lookupRes = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/${instanciaId}/alumnos/${enrollmentA.id}/emisiones?version=${versionHash}`,
      { headers: staffHeaders }
    );
    assert.equal(lookupRes.status, 200);
    assert.equal(lookupRes.body.emision.id, publishedBody.id);
    assert.equal(lookupRes.body.emision.huella, snapVisadoA.body.huella);

    const downloadRes = await fetch(
      `${origin}/api/cys/directivo/emisiones-informe/${publishedBody.id}/archivo?download=1`,
      { headers: staffHeaders }
    );
    assert.equal(downloadRes.status, 200);
    assert.match(downloadRes.headers.get('content-type') || '', /application\/pdf/);

    const updateTeacherInvalidate = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/${instanciaId}/docente`,
      {
        method: 'PATCH',
        headers: staffHeaders,
        body: {
          docenteNombre: 'MARIA FLORENCIA',
          docenteApellido: 'RODRIGUEZ GOMEZ',
          expectedRevision: currentRevision,
        },
      }
    );
    assert.equal(updateTeacherInvalidate.status, 200);

    const downloadStaleRes = await fetch(
      `${origin}/api/cys/directivo/emisiones-informe/${publishedBody.id}/archivo?download=1`,
      { headers: staffHeaders }
    );
    assert.equal(downloadStaleRes.status, 409);

    const course4 = await admin.collection('cursos').create({
      nombre: '4.° Grado',
      grado: '4',
      division: 'A',
      turno: 'Mañana',
      ano: 2026,
    });
    const course6 = await admin.collection('cursos').create({
      nombre: '6.° Grado',
      grado: '6',
      division: 'A',
      turno: 'Mañana',
      ano: 2026,
    });
    const student4 = await admin.collection('alumnos').create({
      nombres: 'TOMAS',
      apellidos: 'PEREZ',
      dni_tipo: 'DNI',
      dni_numero: '50111222',
      fecha_nacimiento: '2016-03-10 00:00:00.000Z',
      genero: 'Masculino',
      domicilio: 'Calle 4',
      localidad: 'CABA',
      nacionalidad: 'Argentina',
      activo: true,
    });
    const enrollment4 = await admin.collection('inscripciones').create({
      alumno_id: student4.id,
      curso_id: course4.id,
      ciclo_id: cycle.id,
      estado: 'Regular',
      cursada_estado: 'CONFIRMADA',
      bimestre_desde: 1,
      bimestre_hasta: 4,
      revision_cursada: 1,
      numero_orden: 1,
    });

    const issueMulti = await jsonRequest(origin, '/api/cys/enlaces-informes', {
      method: 'POST',
      headers: staffHeaders,
      body: {
        cicloId: cycle.id,
        tipoInforme: 'CICLO_FINAL',
        cursoIds: [course6.id, course4.id],
        materiaId: edFisica.id,
        docenteNombre: 'GIMENA',
        docenteApellido: 'CRUZADO ZEVALLOS',
      },
    });
    assert.equal(issueMulti.status, 201);
    assert.equal(issueMulti.body.instancias.length, 2);
    assert.equal(issueMulti.body.enlace.cursoIds.length, 2);
    assert.equal(issueMulti.body.enlace.cursoIds[0], course4.id);
    assert.equal(issueMulti.body.enlace.cursoIds[1], course6.id);

    const inst4Id = issueMulti.body.instancias[0].id;
    const inst6Id = issueMulti.body.instancias[1].id;
    const multiTeacherHeaders = { 'X-CYS-Teacher-Token': issueMulti.body.secreto };

    const ctxCourse4 = await jsonRequest(origin, '/api/cys/docente-informes/contexto', {
      headers: multiTeacherHeaders,
    });
    assert.equal(ctxCourse4.status, 200);
    assert.equal(ctxCourse4.body.instancia.id, inst4Id);
    assert.equal(ctxCourse4.body.cursosAsignados.length, 2);
    assert.equal(ctxCourse4.body.plantilla.codigo, 'FINAL_ED_FISICA_G4_5');
    assert.equal(ctxCourse4.body.items.length, 20);
    assert.ok(
      ctxCourse4.body.plantilla.escalaDesempenoGeneral.some(
        (opt) => opt.codigo === 'ALCANZADO_6' && opt.etiqueta === 'Alcanzado 6'
      )
    );

    const ctxCourse6 = await jsonRequest(
      origin,
      `/api/cys/docente-informes/contexto?instanciaId=${inst6Id}`,
      { headers: multiTeacherHeaders }
    );
    assert.equal(ctxCourse6.status, 200);
    assert.equal(ctxCourse6.body.instancia.id, inst6Id);
    assert.equal(ctxCourse6.body.plantilla.codigo, 'FINAL_ED_FISICA_G6_7');
    assert.equal(ctxCourse6.body.items.length, 22);

    const saveStudent4 = await jsonRequest(
      origin,
      `/api/cys/docente-informes/alumnos/${enrollment4.id}`,
      {
        method: 'PUT',
        headers: multiTeacherHeaders,
        body: {
          desempenoGeneralValor: 'DESTACADO_10',
          observaciones: '',
          respuestas: ctxCourse4.body.items.map((item) => ({
            itemId: item.id,
            valorCodigo: 'C',
          })),
        },
      }
    );
    assert.equal(saveStudent4.status, 200);
    assert.equal(saveStudent4.body.completo, true);

    const submitCourse4 = await jsonRequest(origin, '/api/cys/docente-informes/enviar', {
      method: 'POST',
      headers: multiTeacherHeaders,
      body: { instanciaId: inst4Id },
    });
    assert.equal(submitCourse4.status, 200);
    assert.equal(submitCourse4.body.instancia.estado, 'CONTROL_DIRECTIVO');
    assert.equal(submitCourse4.body.cursosRestantes, 1);
    assert.equal(submitCourse4.body.siguienteInstanciaId, inst6Id);

    const ctxAfterSubmit4 = await jsonRequest(origin, '/api/cys/docente-informes/contexto', {
      headers: multiTeacherHeaders,
    });
    assert.equal(ctxAfterSubmit4.status, 200);
    assert.equal(ctxAfterSubmit4.body.instancia.id, inst6Id);
    assert.equal(ctxAfterSubmit4.body.cursosAsignados.length, 1);
  } finally {
    if (server) {
      server.kill();
      await new Promise((resolve) => server.once('exit', resolve));
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
});
