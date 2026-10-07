const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const net = require('node:net');

test('Cambios de escuela y registro administrativo: migración, gateway HTTP y persistencia', { timeout: 120000 }, async () => {
  const base = path.resolve('C:/pocketbase');
  const root = fs.mkdtempSync(path.join(base, 'transfer-records-test-'));
  const binary = path.join(base, 'pocketbase.exe');
  const emptyHooks = path.join(root, 'empty-hooks');
  fs.mkdirSync(emptyHooks);
  const common = [`--dir=${path.join(root, 'data')}`, `--migrationsDir=${path.resolve('pb_migrations')}`, `--hooksDir=${emptyHooks}`, '--automigrate=false'];
  const password = randomBytes(24).toString('hex');
  let processHandle;
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
    await create('users', { email: 'staff@example.local', password, passwordConfirm: password, name: 'Prueba' });
    const staff = await request('/api/collections/users/auth-with-password', 'POST', { identity: 'staff@example.local', password });
    const token = staff.body.token;
    const cycle = await create('ciclos_lectivos', { ano: 2026, actual: true });
    const level = await create('niveles', { nombre: 'Primario' });
    const scale = await create('escalas_calificacion', { nombre: 'Prueba' });
    await create('valores_escala', { escala_id: scale.id, etiqueta: 'Destacado', peso_numerico: 1, orden_visual: 1 });
    const course = await create('cursos', { nombre: '4°', nivel_id: level.id, escala_id: scale.id, turno: 'Mañana' });
    const student = await create('alumnos', { apellidos: 'Bompadre', nombres: 'Ambar Francesca', dni: '56178896', domicilio: 'Calle Ejemplo 123' });
    const guardian = await create('responsables', { apellidos: 'Bompadre', nombres: 'Lionel Fernando', dni_tipo: 'DNI', dni_numero: '33445566', telefono: '1144556677' });
    await create('alumno_responable', { alumno_id: student.id, responsable_id: guardian.id, vinculo: 'Padre' });
    const enrollment = await create('inscripciones', { alumno_id: student.id, curso_id: course.id, ciclo_id: cycle.id, estado: 'Regular', posee_apoyos: 'NO', promociono_con_acompanamiento: '-' });

    const initialScope = await request(`/api/cys/directivo/inscripciones/${enrollment.id}/cursada`, 'GET', null, token);
    assert.equal(initialScope.status, 200);
    assert.equal(initialScope.body.escuelaInicial, '');
    assert.deepEqual(initialScope.body.cambiosEscuela, []);

    const invalidDate = await request(`/api/cys/directivo/inscripciones/${enrollment.id}/cursada`, 'PUT', {
      expectedRevision: initialScope.body.cursada.revision,
      expectedUpdated: initialScope.body.updated,
      desde: 2,
      hasta: 4,
      sinCursada: false,
      registrarBaja: false,
      fechaEgreso: '',
      fechaIngresoInicial: 'fecha-invalida',
    }, token);
    assert.equal(invalidDate.status, 400);

    const savedScope = await request(`/api/cys/directivo/inscripciones/${enrollment.id}/cursada`, 'PUT', {
      expectedRevision: initialScope.body.cursada.revision,
      expectedUpdated: initialScope.body.updated,
      desde: 2,
      hasta: 4,
      sinCursada: false,
      registrarBaja: false,
      fechaEgreso: '',
      escuelaInicial: 'Escuela N° 18 D.E 13',
      fechaIngresoInicial: '2026-02-25',
      fechaEgresoInicial: '2026-05-15',
      cambiosEscuela: [
        { fecha: '2026-05-18', causa: 'Motivos particulares', escuelaDestino: 'Colegio Crecer y Ser' }
      ],
      cambioDomicilio: 'Nuevo Domicilio 456'
    }, token);
    assert.equal(savedScope.status, 200);
    assert.equal(savedScope.body.cursada.desde, 2);
    assert.equal(savedScope.body.cursada.hasta, 4);
    assert.equal(savedScope.body.escuelaInicial, 'Escuela N° 18 D.E 13');
    assert.equal(savedScope.body.fechaIngresoInicial.slice(0, 10), '2026-02-25');
    assert.equal(savedScope.body.fechaEgresoInicial.slice(0, 10), '2026-05-15');
    assert.equal(savedScope.body.cambiosEscuela.length, 1);
    assert.equal(savedScope.body.cambiosEscuela[0].causa, 'Motivos particulares');
    assert.equal(savedScope.body.cambioDomicilio, 'Nuevo Domicilio 456');

    const readAgain = await request(`/api/cys/directivo/inscripciones/${enrollment.id}/cursada`, 'GET', null, token);
    assert.equal(readAgain.status, 200);
    assert.equal(readAgain.body.escuelaInicial, 'Escuela N° 18 D.E 13');
    assert.equal(readAgain.body.cambiosEscuela[0].escuelaDestino, 'Colegio Crecer y Ser');
  } finally {
    if (processHandle) {
      processHandle.kill('SIGKILL');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
});
