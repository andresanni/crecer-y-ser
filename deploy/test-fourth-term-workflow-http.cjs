const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const net = require('node:net');

test('Flujo integral de 4.° bimestre: Tiempo 1 (notas + síntesis + PPI), Tiempo 2 (asistencias finales) e instantánea PDF', { timeout: 120000 }, async () => {
  const base = path.resolve('C:/pocketbase');
  const root = fs.mkdtempSync(path.join(base, 'fourth-term-test-'));
  const binary = path.join(base, 'pocketbase.exe');
  const emptyHooks = path.join(root, 'empty-hooks');
  fs.mkdirSync(emptyHooks);
  const common = [
    `--dir=${path.join(root, 'data')}`,
    `--migrationsDir=${path.resolve('pb_migrations')}`,
    `--hooksDir=${emptyHooks}`,
    '--automigrate=false',
  ];
  const password = randomBytes(24).toString('hex');
  const linkKey = randomBytes(16).toString('hex');
  let processHandle;

  try {
    execFileSync(binary, ['migrate', 'up', ...common], { windowsHide: true, stdio: 'pipe' });
    execFileSync(binary, ['admin', 'create', 'test@example.local', password, ...common], { windowsHide: true, stdio: 'pipe' });

    const socket = net.createServer();
    await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
    const port = socket.address().port;
    await new Promise((resolve) => socket.close(resolve));
    const origin = `http://127.0.0.1:${port}`;

    processHandle = spawn(
      binary,
      ['serve', ...common.filter((arg) => !arg.startsWith('--hooksDir')), `--hooksDir=${path.resolve('pb_hooks')}`, `--http=127.0.0.1:${port}`],
      {
        windowsHide: true,
        stdio: 'ignore',
        env: { ...process.env, CYS_TEACHER_LINK_KEY: linkKey },
      },
    );

    for (let attempt = 0; attempt < 100; attempt++) {
      if (await fetch(`${origin}/api/health`).then((r) => r.ok).catch(() => false)) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const request = async (url, method = 'GET', body, headers = {}) => {
      const response = await fetch(origin + url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        ...(body !== undefined && body !== null ? { body: JSON.stringify(body) } : {}),
      });
      return { status: response.status, body: await response.json().catch(() => null) };
    };

    const admin = await request('/api/admins/auth-with-password', 'POST', { identity: 'test@example.local', password });
    assert.equal(admin.status, 200);
    const adminHeaders = { Authorization: admin.body.token };

    const create = async (collection, body) => {
      const res = await request(`/api/collections/${collection}/records`, 'POST', body, adminHeaders);
      assert.equal(res.status, 200, `${collection}: ${JSON.stringify(res.body)}`);
      return res.body;
    };

    await create('users', { email: 'staff@example.local', password, passwordConfirm: password, name: 'Dirección' });
    const staff = await request('/api/collections/users/auth-with-password', 'POST', { identity: 'staff@example.local', password });
    const staffHeaders = { Authorization: staff.body.token };

    const cycle = await create('ciclos_lectivos', { ano: 2026, actual: true });
    const level = await create('niveles', { nombre: 'Primario' });
    const scale = await create('escalas_calificacion', { nombre: 'Escala 2do Ciclo' });
    const noteOk = await create('valores_escala', { escala_id: scale.id, etiqueta: 'Avanzado 9', peso_numerico: 9, orden_visual: 2 });
    const noteNc = await create('valores_escala', { escala_id: scale.id, etiqueta: 'No Corresponde', peso_numerico: 0, orden_visual: 1 });
    const course = await create('cursos', { nombre: '6°', nivel_id: level.id, escala_id: scale.id, turno: 'Mañana', orden: 16 });
    const subject = await create('materias', { nombre: 'Lengua' });
    const material = await create('curso_materias', { curso_id: course.id, ciclo_id: cycle.id, materia_id: subject.id, orden_visual: 1 });
    const criteria = [];
    for (let n = 1; n <= 5; n++) {
      criteria.push(await create('criterios_evaluacion', { curso_materia_id: material.id, nombre: `Criterio ${n}`, orden_visual: n }));
    }

    const student = await create('alumnos', { apellidos: 'Pérez', nombres: 'Lucía', dni: '45000001', fecha_nacimiento: '2015-05-10 00:00:00.000Z' });
    const guardian = await create('responsables', { apellidos: 'Pérez', nombres: 'Ana', dni_tipo: 'DNI', dni_numero: '25000001' });
    await create('alumno_responable', { alumno_id: student.id, responsable_id: guardian.id, vinculo: 'Madre' });
    const enrollment = await create('inscripciones', {
      alumno_id: student.id,
      curso_id: course.id,
      ciclo_id: cycle.id,
      estado: 'Regular',
      cursada_estado: 'CONFIRMADA',
      bimestre_desde: 1,
      bimestre_hasta: 4,
      posee_apoyos: 'SI',
      cuales_apoyos: 'DIL',
      promociono_con_acompanamiento: '-',
    });

    const periods = [];
    for (let n = 1; n <= 4; n++) {
      const period = await create('periodos', { ciclo_id: cycle.id, nombre: `${n}° Bimestre`, numero_periodo: n });
      periods.push(period);
      if (n < 4) {
        const wf = await create('instancias_carga_boletin', { curso_id: course.id, periodo_id: period.id, estado: 'CONTROL_DIRECTIVO', revision: 1 });
        await create('visados_boletin', { instancia_id: wf.id, inscripcion_id: enrollment.id, estado: 'VISADO', revision_contenido: 1, revision_visada: 1, generacion_visado: 1 });
        const ev = await create('evaluaciones_materia', { inscripcion_id: enrollment.id, periodo_id: period.id, curso_materia_id: material.id, calificacion_general_id: noteOk.id, ppi: false });
        for (const criterion of criteria) {
          await create('evaluaciones_criterios', { evaluacion_materia_id: ev.id, criterio_id: criterion.id, valor_escala_id: noteOk.id });
        }
        await create('cierres_periodo_alumno', { inscripcion_id: enrollment.id, periodo_id: period.id, asistencias: 30, inasistencias: 1, llegadas_tarde: 0, observaciones: '' });
      }
    }

    const p1 = periods[0];
    const p4 = periods[3];

    const gradeLinkRes = await request('/api/cys/enlaces-docentes', 'POST', { cursoId: course.id, periodoId: p4.id, docenteNombre: 'Docente B4' }, staffHeaders);
    assert.equal(gradeLinkRes.status, 201);
    const gradeHeaders = { 'X-CYS-Teacher-Token': gradeLinkRes.body.secreto };

    const badSynth = await request(`/api/cys/docente/alumnos/${enrollment.id}`, 'PUT', {
      materias: [{
        cursoMateriaId: material.id,
        ppi: true,
        calificacionGeneralId: noteOk.id,
        criterios: criteria.map((c) => ({ criterioId: c.id, valorEscalaId: noteOk.id })),
      }],
      cierre: { sintesisConceptualId: noteNc.id, observaciones: '' },
    }, gradeHeaders);
    assert.equal(badSynth.status, 400);

    const ppiObs = 'Los contenidos a trabajar en las áreas con PPI corresponden, según el Diseño Curricular vigente, a 5° y 6° grado, con las adecuaciones correspondientes. Referencia: discriminados en el PPI.';
    const saveB4 = await request(`/api/cys/docente/alumnos/${enrollment.id}`, 'PUT', {
      materias: [{
        cursoMateriaId: material.id,
        ppi: true,
        calificacionGeneralId: noteOk.id,
        criterios: criteria.map((c) => ({ criterioId: c.id, valorEscalaId: noteOk.id })),
      }],
      cierre: { sintesisConceptualId: noteOk.id, observaciones: ppiObs },
    }, gradeHeaders);
    assert.equal(saveB4.status, 200);
    assert.equal(saveB4.body.cierre.sintesisConceptualId, noteOk.id);
    assert.equal(saveB4.body.cierre.observaciones, ppiObs);

    const submitB4 = await request('/api/cys/docente/enviar', 'POST', {}, gradeHeaders);
    assert.equal(submitB4.status, 200);
    assert.equal(submitB4.body.instancia.estado, 'CONTROL_DIRECTIVO');

    const reviewBefore = await request(`/api/cys/directivo/revision/${course.id}/${p4.id}`, 'GET', null, staffHeaders);
    assert.equal(reviewBefore.status, 200);
    const approveRes = await request(`/api/cys/directivo/boletines/${enrollment.id}/visar`, 'POST', {
      periodoId: p4.id,
      expectedRevision: reviewBefore.body.instancia.revision,
      expectedContentRevision: reviewBefore.body.boletines[0].revisionContenido,
    }, staffHeaders);
    assert.equal(approveRes.status, 200);

    const reviewAfterApprove = await request(`/api/cys/directivo/revision/${course.id}/${p4.id}`, 'GET', null, staffHeaders);
    assert.equal(reviewAfterApprove.body.boletines[0].estado, 'VISADO');
    assert.equal(reviewAfterApprove.body.boletines[0].preparacionDocumental.completa, false);
    assert.equal(reviewAfterApprove.body.boletines[0].preparacionDocumental.faltantes[0].campo, 'asistenciasB4');

    const snapBlocked = await request(`/api/cys/directivo/boletines/${enrollment.id}/instantanea?periodoId=${p4.id}`, 'GET', null, staffHeaders);
    assert.equal(snapBlocked.status, 422);
    assert.equal(snapBlocked.body.codigo, 'DATOS_DOCUMENTALES_INCOMPLETOS');

    const badTermLink = await request('/api/cys/directivo/asistencias-b4/enlaces', 'POST', { cursoId: course.id, periodoId: p1.id, docenteNombre: 'Docente B1' }, staffHeaders);
    assert.equal(badTermLink.status, 400);

    const attLink = await request('/api/cys/directivo/asistencias-b4/enlaces', 'POST', { cursoId: course.id, periodoId: p4.id, docenteNombre: 'Docente Asist' }, staffHeaders);
    assert.equal(attLink.status, 201);
    const recovered = await request(`/api/cys/directivo/asistencias-b4/enlaces/${attLink.body.enlace.id}/recuperar`, 'POST', {}, staffHeaders);
    assert.equal(recovered.status, 200);
    assert.equal(recovered.body.secreto, attLink.body.secreto);

    const rotated = await request(`/api/cys/directivo/asistencias-b4/enlaces/${attLink.body.enlace.id}/rotar`, 'POST', {}, staffHeaders);
    assert.equal(rotated.status, 200);
    const oldCheck = await request('/api/cys/docente/asistencias-b4/contexto', 'GET', null, { 'X-CYS-Attendance-Token': attLink.body.secreto });
    assert.equal(oldCheck.status, 401);

    const attHeaders = { 'X-CYS-Attendance-Token': rotated.body.secreto };
    const ctx = await request('/api/cys/docente/asistencias-b4/contexto', 'GET', null, attHeaders);
    assert.equal(ctx.status, 200);
    assert.equal(ctx.body.totalAlumnos, 1);

    const emptySubmit = await request('/api/cys/docente/asistencias-b4/enviar', 'POST', {}, attHeaders);
    assert.equal(emptySubmit.status, 422);

    const saveAtt = await request('/api/cys/docente/asistencias-b4/guardar', 'PUT', {
      filas: [{ inscripcionId: enrollment.id, asistencias: 38, inasistencias: 2, llegadasTarde: 1 }],
    }, attHeaders);
    assert.equal(saveAtt.status, 200);
    assert.equal(saveAtt.body.alumnosCargados, 1);

    const submitAtt = await request('/api/cys/docente/asistencias-b4/enviar', 'POST', {}, attHeaders);
    assert.equal(submitAtt.status, 200);
    assert.equal(submitAtt.body.instancia.estado, 'CONTROL_DIRECTIVO');

    const reuseAfterSubmit = await request('/api/cys/docente/asistencias-b4/contexto', 'GET', null, attHeaders);
    assert.equal(reuseAfterSubmit.status, 401);

    const staffCourse = await request(`/api/cys/directivo/asistencias-b4/curso/${course.id}/${p4.id}`, 'GET', null, staffHeaders);
    assert.equal(staffCourse.status, 200);
    const staleEdit = await request(`/api/cys/directivo/asistencias-b4/curso/${course.id}/${p4.id}`, 'PUT', {
      expectedRevision: 0,
      filas: [{ inscripcionId: enrollment.id, asistencias: 39, inasistencias: 1, llegadasTarde: 1 }],
    }, staffHeaders);
    assert.equal(staleEdit.status, 409);

    const validEdit = await request(`/api/cys/directivo/asistencias-b4/curso/${course.id}/${p4.id}`, 'PUT', {
      expectedRevision: staffCourse.body.instancia.revision,
      filas: [{ inscripcionId: enrollment.id, asistencias: 39, inasistencias: 1, llegadasTarde: 1 }],
    }, staffHeaders);
    assert.equal(validEdit.status, 200);

    const reviewFinal = await request(`/api/cys/directivo/revision/${course.id}/${p4.id}`, 'GET', null, staffHeaders);
    assert.equal(reviewFinal.body.boletines[0].estado, 'VISADO');
    assert.equal(reviewFinal.body.boletines[0].preparacionDocumental.completa, true);

    const snapOk = await request(`/api/cys/directivo/boletines/${enrollment.id}/instantanea?periodoId=${p4.id}`, 'GET', null, staffHeaders);
    assert.equal(snapOk.status, 200);
    assert.equal(snapOk.body.datos.apoyos.promocionoConAcompanamiento, 'NO');
    const b4Period = snapOk.body.datos.periodos.find((p) => p.bimestre === 4);
    assert.equal(b4Period.cierre.asistencias, 39);
    assert.equal(b4Period.cierre.inasistencias, 1);
    assert.equal(b4Period.cierre.llegadasTarde, 1);
    assert.equal(b4Period.cierre.sintesisConceptualId, noteOk.id);
    assert.equal(b4Period.cierre.observaciones, ppiObs);
    assert.equal(snapOk.body.datos.pendientesDeIntegracion.length, 0);
  } finally {
    if (processHandle) processHandle.kill();
    await new Promise((resolve) => setTimeout(resolve, 300));
    fs.rmSync(root, { recursive: true, force: true });
  }
});
