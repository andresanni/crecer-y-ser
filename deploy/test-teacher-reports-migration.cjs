const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn, execFileSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { default: PocketBase } = require('pocketbase');

const REPORT_COLLECTIONS = [
  'plantillas_informe',
  'items_plantilla_informe',
  'instancias_informe',
  'tokens_acceso_informe',
  'evaluaciones_informe',
  'respuestas_item_informe',
  'visados_informe',
  'emisiones_informe',
];

test('Esquema, reglas de acceso y seed de plantillas de informes en PocketBase temporal y pb_schema.json', { timeout: 60000 }, async () => {
  const schema = JSON.parse(fs.readFileSync(path.resolve('pb_schema.json'), 'utf8'));
  const schemaByName = new Map(schema.map((col) => [col.name, col]));

  for (const name of REPORT_COLLECTIONS) {
    const col = schemaByName.get(name);
    assert.ok(col, `La colección ${name} debe existir en pb_schema.json`);
    assert.equal(col.createRule, null);
    assert.equal(col.updateRule, null);
    assert.equal(col.deleteRule, null);
    if (name === 'emisiones_informe') {
      assert.equal(col.listRule, null);
      assert.equal(col.viewRule, null);
    } else {
      assert.equal(col.listRule, '@request.auth.id != ""');
      assert.equal(col.viewRule, '@request.auth.id != ""');
    }
  }

  const base = path.resolve('C:/pocketbase');
  const root = fs.mkdtempSync(path.join(base, 'reports-migration-test-'));
  const binary = path.join(base, 'pocketbase.exe');
  const hooks = path.join(root, 'empty-hooks');
  fs.mkdirSync(hooks);
  const args = [
    `--dir=${path.join(root, 'data')}`,
    `--migrationsDir=${path.resolve('pb_migrations')}`,
    `--hooksDir=${hooks}`,
    '--automigrate=false',
  ];
  const password = randomBytes(24).toString('hex');
  let server;

  try {
    execFileSync(binary, ['migrate', 'up', ...args], { windowsHide: true, stdio: 'pipe' });
    execFileSync(binary, ['migrate', 'down', '1', ...args], { windowsHide: true, stdio: 'pipe' });
    execFileSync(binary, ['migrate', 'up', ...args], { windowsHide: true, stdio: 'pipe' });
    execFileSync(binary, ['admin', 'create', 'reports-admin@example.local', password, ...args], {
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
      { windowsHide: true, stdio: 'ignore' }
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
    const authentication = await fetch(origin + '/api/admins/auth-with-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: 'reports-admin@example.local', password }),
    });
    assert.equal(authentication.status, 200);
    const administrator = await authentication.json();
    admin.authStore.save(administrator.token, administrator.admin);

    await admin.collection('users').create({
      email: 'reports-staff@example.local',
      password,
      passwordConfirm: password,
      name: 'Directivo de prueba',
    });

    const staff = new PocketBase(origin);
    staff.autoCancellation(false);
    await staff.collection('users').authWithPassword('reports-staff@example.local', password);

    const anonymous = new PocketBase(origin);
    anonymous.autoCancellation(false);

    const anonTemplates = await anonymous.collection('plantillas_informe').getList(1, 10);
    assert.equal(anonTemplates.totalItems, 0, 'Clientes anónimos no deben listar plantillas');

    const templates = await staff.collection('plantillas_informe').getFullList({
      sort: 'codigo',
      expand: 'materia_id',
    });
    assert.equal(templates.length, 8, 'Deben existir las 8 plantillas del catálogo');

    const expectedCounts = {
      CONDUCTA_ESTANDAR_26: 26,
      FINAL_ARTES_VISUALES_G2: 18,
      FINAL_ED_FISICA_G2: 24,
      FINAL_ED_FISICA_G4_5: 20,
      FINAL_ED_FISICA_G6_7: 22,
      FINAL_INGLES_BASE: 18,
      FINAL_MUSICA_BASE: 19,
      FINAL_TECNOLOGIA_BASE: 17,
    };

    for (const template of templates) {
      const items = await staff.collection('items_plantilla_informe').getFullList({
        filter: `plantilla_id = "${template.id}"`,
        sort: 'orden_visual',
      });
      assert.equal(
        items.length,
        expectedCounts[template.codigo],
        `Cantidad de ítems en ${template.codigo}`
      );
      assert.equal(template.permite_observaciones, true);

      if (template.codigo === 'CONDUCTA_ESTANDAR_26') {
        assert.equal(template.materia_id, '');
        assert.equal(template.requiere_desempeno_general, false);
        assert.equal(template.mostrar_leyenda_escala, false);
        assert.equal(template.escala_items.length, 3);
      } else {
        assert.equal(template.tipo_informe, 'CICLO_FINAL');
        assert.ok(template.materia_id.length > 0, `${template.codigo} debe vincularse a una materia especial`);
        assert.equal(template.requiere_desempeno_general, true);
      }

      if (template.codigo.startsWith('FINAL_ED_FISICA_')) {
        assert.equal(template.mostrar_leyenda_escala, true);
        assert.equal(template.escala_items.length, 4);
        const blocks = [...new Set(items.map((item) => item.bloque_nombre))];
        assert.deepEqual(blocks, ['Desplazamientos', 'Rolidos', 'Apoyos', 'Saltos']);
      }
      if (template.codigo === 'FINAL_ED_FISICA_G2') {
        assert.equal(template.grado_desde, 1);
        assert.equal(template.grado_hasta, 3);
      }
      if (template.codigo === 'FINAL_ED_FISICA_G4_5') {
        assert.equal(template.grado_desde, 4);
        assert.equal(template.grado_hasta, 5);
      }
      if (template.codigo === 'FINAL_ED_FISICA_G6_7') {
        assert.equal(template.grado_desde, 6);
        assert.equal(template.grado_hasta, 7);
      }
    }

    await assert.rejects(
      staff.collection('plantillas_informe').create({
        codigo: 'INTENTO_CLIENTE',
        tipo_informe: 'CICLO_FINAL',
        grado_desde: 1,
        grado_hasta: 7,
        titulo_tabla: 'No permitido',
        escala_items: [{ codigo: 'A', etiqueta: 'A' }],
      }),
      (error) => error.status === 403
    );

    await assert.rejects(
      staff.collection('emisiones_informe').getList(1, 10),
      (error) => error.status === 403
    );
  } finally {
    if (server) {
      server.kill();
      await new Promise((resolve) => server.once('exit', resolve));
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
});
