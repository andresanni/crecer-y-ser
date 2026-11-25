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

test('Flujo HTTP completo de Informes Ciclo Final para Nivel Inicial (Sala 2 y 3 / Sala 4 y 5)', { timeout: 90000 }, async () => {
  const base = path.resolve('C:/pocketbase');
  const root = fs.mkdtempSync(path.join(base, 'reports-inicial-http-test-'));
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
    execFileSync(binary, ['admin', 'create', 'reports-inicial-admin@example.local', password, ...args], {
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
      },
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
      body: { identity: 'reports-inicial-admin@example.local', password },
    });
    assert.equal(adminAuthRes.status, 200);
    admin.authStore.save(adminAuthRes.body.token, adminAuthRes.body.admin);

    await admin.collection('users').create({
      email: 'directora-inicial@example.local',
      password,
      passwordConfirm: password,
      name: 'Directora Prueba',
    });

    const staff = new PocketBase(origin);
    staff.autoCancellation(false);
    const staffAuth = await staff.collection('users').authWithPassword('directora-inicial@example.local', password);
    const staffHeaders = { Authorization: `Bearer ${staffAuth.token}` };

    const cycle = await admin.collection('ciclos_lectivos').create({
      nombre: 'Ciclo Lectivo 2026',
      ano: 2026,
      activo: true,
    });

    const niveles = await admin.collection('niveles').getFullList();
    let nivelPrimario = niveles.find((n) => /primar/i.test(n.nombre));
    if (!nivelPrimario) {
      nivelPrimario = await admin.collection('niveles').create({ nombre: 'Primario' });
    }

    const cursos = await admin.collection('cursos').getFullList();
    const sala23 = cursos.find((c) => /sala.*2.*3/i.test(c.nombre));
    const sala45 = cursos.find((c) => /sala.*4.*5/i.test(c.nombre));
    assert.ok(sala23, 'Debe existir Sala de 2 y 3 años');
    assert.ok(sala45, 'Debe existir Sala de 4 y 5 años');

    const grado1 = await admin.collection('cursos').create({
      nombre: '1° Grado',
      grado: '1°',
      division: 'A',
      turno: 'Mañana',
      nivel_id: nivelPrimario.id,
      orden: 11,
    });

    const studentA = await admin.collection('alumnos').create({
      apellidos: 'Gomez',
      nombres: 'Lucia',
      estado: 'Regular',
    });
    const studentBaja = await admin.collection('alumnos').create({
      apellidos: 'Diaz',
      nombres: 'Sofia',
      estado: 'Baja',
    });
    const studentB = await admin.collection('alumnos').create({
      apellidos: 'Perez',
      nombres: 'Mateo',
      estado: 'Regular',
    });

    const enrollmentSala23 = await admin.collection('inscripciones').create({
      alumno_id: studentA.id,
      curso_id: sala23.id,
      ciclo_id: cycle.id,
      numero_orden: 1,
      estado: 'Regular',
      cursada_estado: 'PENDIENTE',
      modalidad_jornada: 'Mañana',
    });

    const enrollmentSala23Baja = await admin.collection('inscripciones').create({
      alumno_id: studentBaja.id,
      curso_id: sala23.id,
      ciclo_id: cycle.id,
      numero_orden: 2,
      estado: 'Baja',
      cursada_estado: 'PENDIENTE',
      fecha_egreso: '2026-08-15 00:00:00.000Z',
      modalidad_jornada: 'Mañana',
    });

    await admin.collection('inscripciones').create({
      alumno_id: studentB.id,
      curso_id: sala45.id,
      ciclo_id: cycle.id,
      numero_orden: 1,
      estado: 'Regular',
      cursada_estado: 'PENDIENTE',
      modalidad_jornada: 'Tarde',
    });

    const stagesFinal = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/etapas/${cycle.id}/CICLO_FINAL`,
      { headers: staffHeaders },
    );
    assert.equal(stagesFinal.status, 200);
    assert.equal(stagesFinal.body.cursos[0].id, sala23.id);
    assert.equal(stagesFinal.body.cursos[0].nivel, 'INICIAL');
    assert.equal(stagesFinal.body.cursos[0].turno, 'J.C');
    assert.equal(stagesFinal.body.cursos[0].grado, '2 y 3 años');
    assert.equal(stagesFinal.body.cursos[1].id, sala45.id);
    assert.equal(stagesFinal.body.cursos[1].nivel, 'INICIAL');
    assert.equal(stagesFinal.body.cursos[1].turno, 'J.C');
    assert.equal(stagesFinal.body.cursos[1].grado, '4 y 5 años');
    assert.equal(stagesFinal.body.cursos[2].id, grado1.id);
    assert.equal(stagesFinal.body.cursos[2].nivel, 'PRIMARIO');

    const subjects = stagesFinal.body.materiasEspeciales;
    const edFisica = subjects.find((s) => s.codigoEspecial === 'EDUCACION_FISICA');
    const ingles = subjects.find((s) => s.codigoEspecial === 'INGLES');
    const musica = subjects.find((s) => s.codigoEspecial === 'MUSICA');
    const artes = subjects.find((s) => s.codigoEspecial === 'ARTES_VISUALES');
    const tecnologia = subjects.find((s) => s.codigoEspecial === 'TECNOLOGIA');
    assert.ok(edFisica && ingles && musica && artes && tecnologia);

    const sala23EdCell = stagesFinal.body.celdas.find((c) => c.cursoId === sala23.id && c.materiaId === edFisica.id);
    const sala23InglesCell = stagesFinal.body.celdas.find((c) => c.cursoId === sala23.id && c.materiaId === ingles.id);
    const sala23MusicaCell = stagesFinal.body.celdas.find((c) => c.cursoId === sala23.id && c.materiaId === musica.id);
    assert.equal(sala23EdCell.plantillaCodigo, 'FINAL_ED_FISICA_INICIAL');
    assert.equal(sala23EdCell.totalItems, 24);
    assert.equal(sala23EdCell.cursadasPendientes.length, 0);
    assert.equal(sala23EdCell.inscripcionesEvaluables.length, 1);
    assert.equal(sala23EdCell.totalInscripcionesCurso, 2);

    const rosterPreview = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/curso-nomina/${cycle.id}/CICLO_FINAL/${sala23.id}?materiaId=${edFisica.id}`,
      { headers: staffHeaders },
    );
    assert.equal(rosterPreview.status, 200);
    assert.equal(rosterPreview.body.totalEvaluables, 1);
    assert.equal(rosterPreview.body.totalExcluidos, 1);
    assert.equal(rosterPreview.body.evaluables[0].inscripcionId, enrollmentSala23.id);
    assert.equal(rosterPreview.body.excluidos[0].inscripcionId, enrollmentSala23Baja.id);
    assert.equal(sala23InglesCell.plantillaCodigo, 'FINAL_INGLES_INICIAL');
    assert.equal(sala23InglesCell.totalItems, 18);
    assert.equal(sala23InglesCell.inscripcionesEvaluables.length, 1);
    assert.equal(sala23MusicaCell.plantillaCodigo, 'FINAL_MUSICA_INICIAL');
    assert.equal(sala23MusicaCell.totalItems, 16);
    assert.equal(sala23MusicaCell.inscripcionesEvaluables.length, 1);

    const evalInitial = await jsonRequest(
      origin,
      `/api/cys/directivo/inscripciones/${enrollmentSala23.id}/evaluaciones`,
      { headers: staffHeaders },
    );
    assert.equal(evalInitial.status, 200);
    assert.equal(evalInitial.body.esInicial, true);
    assert.equal(evalInitial.body.boletines, null);
    assert.equal(evalInitial.body.informes.length, 1);
    assert.equal(evalInitial.body.informes[0].tipoInforme, 'CICLO_FINAL');
    assert.equal(evalInitial.body.informes[0].evaluable, true);

    const evalBajaInitial = await jsonRequest(
      origin,
      `/api/cys/directivo/inscripciones/${enrollmentSala23Baja.id}/evaluaciones`,
      { headers: staffHeaders },
    );
    assert.equal(evalBajaInitial.status, 200);
    assert.equal(evalBajaInitial.body.informes[0].evaluable, false);

    const forbiddenEvalB1 = await jsonRequest(
      origin,
      `/api/cys/directivo/inscripciones/${enrollmentSala23.id}/evaluaciones`,
      {
        method: 'PUT',
        headers: staffHeaders,
        body: {
          expectedRevision: evalInitial.body.cursada.revision,
          expectedUpdated: evalInitial.body.updated,
          informes: [{ tipoInforme: 'PRIMER_BIMESTRE', evaluable: false }],
        },
      },
    );
    assert.equal(forbiddenEvalB1.status, 400);

    const forbiddenExcludeRegular = await jsonRequest(
      origin,
      `/api/cys/directivo/inscripciones/${enrollmentSala23.id}/evaluaciones`,
      {
        method: 'PUT',
        headers: staffHeaders,
        body: {
          expectedRevision: evalInitial.body.cursada.revision,
          expectedUpdated: evalInitial.body.updated,
          informes: [{ tipoInforme: 'CICLO_FINAL', evaluable: false }],
        },
      },
    );
    assert.equal(forbiddenExcludeRegular.status, 400);

    const excludeActive = await jsonRequest(
      origin,
      `/api/cys/directivo/inscripciones/${enrollmentSala23.id}/evaluaciones`,
      {
        method: 'PUT',
        headers: staffHeaders,
        body: {
          expectedRevision: evalInitial.body.cursada.revision,
          expectedUpdated: evalInitial.body.updated,
          esAltaTardia: true,
          informes: [{ tipoInforme: 'CICLO_FINAL', evaluable: false }],
        },
      },
    );
    assert.equal(excludeActive.status, 200);
    assert.equal(excludeActive.body.esAltaTardia, true);
    assert.equal(excludeActive.body.informes[0].evaluable, false);

    const includeBaja = await jsonRequest(
      origin,
      `/api/cys/directivo/inscripciones/${enrollmentSala23Baja.id}/evaluaciones`,
      {
        method: 'PUT',
        headers: staffHeaders,
        body: {
          expectedRevision: evalBajaInitial.body.cursada.revision,
          expectedUpdated: evalBajaInitial.body.updated,
          informes: [{ tipoInforme: 'CICLO_FINAL', evaluable: true }],
        },
      },
    );
    assert.equal(includeBaja.status, 200);
    assert.equal(includeBaja.body.informes[0].evaluable, true);

    const stagesAfterCascade = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/etapas/${cycle.id}/CICLO_FINAL`,
      { headers: staffHeaders },
    );
    for (const subj of [edFisica, ingles, musica]) {
      const cell = stagesAfterCascade.body.celdas.find((c) => c.cursoId === sala23.id && c.materiaId === subj.id);
      assert.deepEqual(cell.inscripcionesEvaluables, [enrollmentSala23Baja.id]);
      assert.equal(cell.ajustesNominaManuales, 2);
    }

    const restoreActive = await jsonRequest(
      origin,
      `/api/cys/directivo/inscripciones/${enrollmentSala23.id}/evaluaciones`,
      {
        method: 'PUT',
        headers: staffHeaders,
        body: {
          expectedRevision: excludeActive.body.cursada.revision,
          expectedUpdated: excludeActive.body.updated,
          esAltaTardia: false,
          informes: [{ tipoInforme: 'CICLO_FINAL', evaluable: true }],
        },
      },
    );
    assert.equal(restoreActive.status, 200);
    assert.equal(restoreActive.body.esAltaTardia, false);
    assert.equal(restoreActive.body.informes[0].esAjusteManual, false);

    const restoreBaja = await jsonRequest(
      origin,
      `/api/cys/directivo/inscripciones/${enrollmentSala23Baja.id}/evaluaciones`,
      {
        method: 'PUT',
        headers: staffHeaders,
        body: {
          expectedRevision: includeBaja.body.cursada.revision,
          expectedUpdated: includeBaja.body.updated,
          informes: [{ tipoInforme: 'CICLO_FINAL', evaluable: false }],
        },
      },
    );
    assert.equal(restoreBaja.status, 200);
    assert.equal(restoreBaja.body.informes[0].esAjusteManual, false);

    assert.equal(
      stagesFinal.body.celdas.some((c) => (c.cursoId === sala23.id || c.cursoId === sala45.id) && (c.materiaId === artes.id || c.materiaId === tecnologia.id)),
      false,
      'Jardín no debe tener celdas en Artes Visuales ni Tecnología',
    );

    for (const nonFinalType of ['PRIMER_CUATRIMESTRE', 'PRIMER_BIMESTRE']) {
      const nonFinalStages = await jsonRequest(
        origin,
        `/api/cys/directivo/informes/etapas/${cycle.id}/${nonFinalType}`,
        { headers: staffHeaders },
      );
      assert.equal(nonFinalStages.status, 200);
      assert.equal(
        nonFinalStages.body.cursos.some((c) => c.id === sala23.id || c.id === sala45.id),
        false,
        `Jardín no debe aparecer en ${nonFinalType}`,
      );
    }

    for (const forbiddenSubject of [artes, tecnologia]) {
      const forbiddenIssue = await jsonRequest(origin, '/api/cys/enlaces-informes', {
        method: 'POST',
        headers: staffHeaders,
        body: {
          cicloId: cycle.id,
          tipoInforme: 'CICLO_FINAL',
          cursoIds: [sala23.id],
          materiaId: forbiddenSubject.id,
          docenteNombre: 'Ana',
          docenteApellido: 'Prueba',
        },
      });
      assert.equal(forbiddenIssue.status, 400);
    }

    const forbiddenB1 = await jsonRequest(origin, '/api/cys/enlaces-informes', {
      method: 'POST',
      headers: staffHeaders,
      body: {
        cicloId: cycle.id,
        tipoInforme: 'PRIMER_BIMESTRE',
        cursoIds: [sala23.id],
        docenteNombre: 'Ana',
        docenteApellido: 'Prueba',
      },
    });
    assert.equal(forbiddenB1.status, 400);

    const mixedIssue = await jsonRequest(origin, '/api/cys/enlaces-informes', {
      method: 'POST',
      headers: staffHeaders,
      body: {
        cicloId: cycle.id,
        tipoInforme: 'CICLO_FINAL',
        cursoIds: [sala45.id, grado1.id, sala23.id],
        materiaId: edFisica.id,
        docenteNombre: 'Docente',
        docenteApellido: 'Inicial',
      },
    });
    assert.equal(mixedIssue.status, 201);
    assert.equal(mixedIssue.body.instancias.length, 3);
    assert.equal(mixedIssue.body.instancias[0].cursoId, sala23.id);
    assert.equal(mixedIssue.body.instancias[1].cursoId, sala45.id);
    assert.equal(mixedIssue.body.instancias[2].cursoId, grado1.id);

    const teacherHeaders = { 'X-CYS-Teacher-Token': mixedIssue.body.secreto };
    const ctxRes = await jsonRequest(origin, '/api/cys/docente-informes/contexto', { headers: teacherHeaders });
    assert.equal(ctxRes.status, 200);
    assert.equal(ctxRes.body.curso.id, sala23.id);
    assert.equal(ctxRes.body.curso.nivel, 'INICIAL');
    assert.equal(ctxRes.body.curso.grado, '2 y 3 años');
    assert.equal(ctxRes.body.curso.turno, 'J.C');
    assert.equal(ctxRes.body.plantilla.codigo, 'FINAL_ED_FISICA_INICIAL');
    assert.equal(ctxRes.body.plantilla.mostrarLeyendaEscala, false);
    assert.equal(ctxRes.body.items.length, 24);
    assert.equal(
      ctxRes.body.plantilla.escalaDesempenoGeneral.some((opt) => opt.codigo === 'ALCANZADO'),
      true,
    );
    assert.equal(
      ctxRes.body.plantilla.escalaDesempenoGeneral.some((opt) => opt.codigo === 'DESTACADO_10'),
      false,
    );

    const invalidScaleSave = await jsonRequest(
      origin,
      `/api/cys/docente-informes/alumnos/${enrollmentSala23.id}`,
      {
        method: 'PUT',
        headers: teacherHeaders,
        body: {
          desempenoGeneralValor: 'ALCANZADO',
          observaciones: '',
          respuestas: [{ itemId: ctxRes.body.items[0].id, valorCodigo: 'D' }],
        },
      },
    );
    assert.equal(invalidScaleSave.status, 400);

    const invalidGeneralSave = await jsonRequest(
      origin,
      `/api/cys/docente-informes/alumnos/${enrollmentSala23.id}`,
      {
        method: 'PUT',
        headers: teacherHeaders,
        body: {
          desempenoGeneralValor: 'ALCANZADO_7',
          observaciones: '',
          respuestas: [{ itemId: ctxRes.body.items[0].id, valorCodigo: 'ALCANZADO' }],
        },
      },
    );
    assert.equal(invalidGeneralSave.status, 400);

    const validResponses = ctxRes.body.items.map((item, idx) => ({
      itemId: item.id,
      valorCodigo: idx < 2 ? 'EN_PROCESO' : 'ALCANZADO',
    }));

    const saveOk = await jsonRequest(
      origin,
      `/api/cys/docente-informes/alumnos/${enrollmentSala23.id}`,
      {
        method: 'PUT',
        headers: teacherHeaders,
        body: {
          desempenoGeneralValor: 'AVANZADO',
          observaciones: 'Acompañamiento pedagógico en sala.',
          respuestas: validResponses,
        },
      },
    );
    assert.equal(saveOk.status, 200);
    assert.equal(saveOk.body.completo, true);

    const submitRes = await jsonRequest(origin, '/api/cys/docente-informes/enviar', {
      method: 'POST',
      headers: teacherHeaders,
      body: { instanciaId: ctxRes.body.instancia.id },
    });
    assert.equal(submitRes.status, 200);
    assert.equal(submitRes.body.cursosRestantes, 2);

    const reviewRes = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/revision/${ctxRes.body.instancia.id}`,
      { headers: staffHeaders },
    );
    assert.equal(reviewRes.status, 200);
    assert.equal(reviewRes.body.curso.nivel, 'INICIAL');
    assert.equal(reviewRes.body.curso.grado, '2 y 3 años');
    assert.equal(reviewRes.body.curso.turno, 'J.C');
    assert.equal(reviewRes.body.totalInformes, 1);
    assert.equal(reviewRes.body.alumnosExcluidos.length, 1);
    assert.equal(reviewRes.body.alumnosExcluidos[0].inscripcionId, enrollmentSala23Baja.id);
    const reviewedStudent = reviewRes.body.informes[0];
    assert.equal(reviewedStudent.semaforo.verde, 22);
    assert.equal(reviewedStudent.semaforo.amarillo, 2);
    assert.equal(reviewedStudent.semaforo.rojo, 0);
    assert.equal(
      reviewedStudent.disonancias.length,
      0,
      'Ed. Física Inicial usa escala de 3 niveles y no debe disparar disonancia de escala A-D por 2 amarillos',
    );

    const approveRes = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/${ctxRes.body.instancia.id}/alumnos/${enrollmentSala23.id}/visar`,
      {
        method: 'POST',
        headers: staffHeaders,
        body: {
          expectedRevision: reviewRes.body.instancia.revision,
          expectedContentRevision: reviewedStudent.revisionContenido,
        },
      },
    );
    assert.equal(approveRes.status, 200);

    const snapshotRes = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/${ctxRes.body.instancia.id}/alumnos/${enrollmentSala23.id}/instantanea`,
      { headers: staffHeaders },
    );
    assert.equal(snapshotRes.status, 200);
    assert.equal(snapshotRes.body.datos.curso.nivel, 'INICIAL');
    assert.equal(snapshotRes.body.datos.curso.grado, '2 y 3 años');
    assert.equal(snapshotRes.body.datos.curso.turno, 'J.C');
    assert.equal(snapshotRes.body.datos.plantilla.codigo, 'FINAL_ED_FISICA_INICIAL');
    assert.equal(snapshotRes.body.datos.items.length, 24);
    assert.equal(snapshotRes.body.datos.evaluacion.desempenoGeneralEtiqueta, 'Avanzado');
    assert.match(snapshotRes.body.huella, /^[a-f0-9]{64}$/);

    const evalDelivered = await jsonRequest(
      origin,
      `/api/cys/directivo/inscripciones/${enrollmentSala23.id}/evaluaciones`,
      { headers: staffHeaders },
    );
    assert.equal(evalDelivered.status, 200);
    assert.equal(evalDelivered.body.informes[0].bloqueadoPorEntrega, true);

    const blockDeliveredExclusion = await jsonRequest(
      origin,
      `/api/cys/directivo/inscripciones/${enrollmentSala23.id}/evaluaciones`,
      {
        method: 'PUT',
        headers: staffHeaders,
        body: {
          expectedRevision: evalDelivered.body.cursada.revision,
          expectedUpdated: evalDelivered.body.updated,
          esAltaTardia: true,
          informes: [{ tipoInforme: 'CICLO_FINAL', evaluable: false }],
        },
      },
    );
    assert.equal(blockDeliveredExclusion.status, 409);
    const afterBlockedExclusion = await jsonRequest(
      origin,
      `/api/cys/directivo/inscripciones/${enrollmentSala23.id}/evaluaciones`,
      { headers: staffHeaders },
    );
    assert.equal(afterBlockedExclusion.body.esAltaTardia, false);

    const evalBajaNow = await jsonRequest(
      origin,
      `/api/cys/directivo/inscripciones/${enrollmentSala23Baja.id}/evaluaciones`,
      { headers: staffHeaders },
    );
    const enableBajaAfterDelivery = await jsonRequest(
      origin,
      `/api/cys/directivo/inscripciones/${enrollmentSala23Baja.id}/evaluaciones`,
      {
        method: 'PUT',
        headers: staffHeaders,
        body: {
          expectedRevision: evalBajaNow.body.cursada.revision,
          expectedUpdated: evalBajaNow.body.updated,
          informes: [{ tipoInforme: 'CICLO_FINAL', evaluable: true }],
        },
      },
    );
    assert.equal(enableBajaAfterDelivery.status, 200);

    const reviewWithMissing = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/revision/${ctxRes.body.instancia.id}`,
      { headers: staffHeaders },
    );
    assert.equal(reviewWithMissing.status, 200);
    assert.equal(reviewWithMissing.body.alumnosSinIncorporar, 1);

    const syncAfterEnable = await jsonRequest(
      origin,
      `/api/cys/directivo/informes/${ctxRes.body.instancia.id}/sincronizar-matricula`,
      {
        method: 'POST',
        headers: staffHeaders,
        body: { expectedRevision: reviewWithMissing.body.instancia.revision },
      },
    );
    assert.equal(syncAfterEnable.status, 200);
    assert.equal(syncAfterEnable.body.incorporados, 1);
  } finally {
    if (server) {
      await new Promise((resolve) => {
        if (server.exitCode !== null) {
          resolve();
          return;
        }
        server.once('exit', resolve);
        server.kill();
      });
    }
    try {
      fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
    } catch (_) {}
  }
});
