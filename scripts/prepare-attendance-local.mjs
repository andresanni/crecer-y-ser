import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const origin = 'http://127.0.0.1:8090';
const root = 'C:/pocketbase';
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const operational = ['emisiones_boletin', 'visados_boletin', 'evaluaciones_criterios', 'evaluaciones_materia', 'cierres_periodo_alumno', 'asistencias_diarias', 'registros_asistencia_curso', 'tokens_acceso_docente', 'instancias_carga_boletin', 'alumno_responable', 'inscripciones', 'alumnos', 'responsables'];
const catalogs = ['ciclos_lectivos', 'niveles', 'cursos', 'periodos', 'materias', 'curso_materias', 'criterios_evaluacion', 'escalas_calificacion', 'valores_escala', 'meses_calendario', 'eventos_calendario'];

function parseCsv(content) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  content = content.replace(/^\uFEFF/, '');
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '"') {
      if (quoted && content[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((char === '\r' || char === '\n') && !quoted) {
      if (char === '\r' && content[i + 1] === '\n') i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = '';
    } else cell += char;
  }
  assert.ok(!quoted, 'CSV con comillas sin cerrar.');
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift();
  assert.ok(headers && new Set(headers).size === headers.length, 'Encabezados inválidos.');
  return rows.map((values, index) => {
    assert.equal(values.length, headers.length, `Cantidad de columnas inválida en fila ${index + 2}.`);
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
}

function date(value, required = false) {
  if (!value && !required) return '';
  const normalized = value.replaceAll('/', '-');
  assert.match(normalized, /^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida.');
  assert.equal(new Date(normalized).toISOString().slice(0, 10), normalized, 'Fecha inexistente.');
  return normalized + ' 00:00:00.000Z';
}

function verifyLocalProcess() {
  assert.equal(process.platform, 'win32', 'Sólo admite la instalación local Windows.');
  const output = execFileSync('powershell.exe', ['-NoProfile', '-Command', "Get-CimInstance Win32_Process -Filter \"name='pocketbase.exe'\" | Select-Object ProcessId,ExecutablePath,CommandLine | ConvertTo-Json -Compress"], { encoding: 'utf8', windowsHide: true });
  const processes = JSON.parse(output);
  const candidates = (Array.isArray(processes) ? processes : [processes]).filter(item => item.CommandLine?.includes('--http=127.0.0.1:8090'));
  assert.equal(candidates.length, 1, 'No se encontró una única instancia local esperada.');
  const command = candidates[0].CommandLine.toLowerCase().replaceAll('"', '').replaceAll('/', '\\');
  for (const expected of [`${root}/pocketbase.exe`, `--dir=${root}/pb_data`, `--hooksDir=${repository}/pb_hooks`, `--migrationsDir=${repository}/pb_migrations`]) {
    assert.ok(command.includes(expected.toLowerCase().replaceAll('/', '\\')), 'El proceso no utiliza las rutas locales esperadas.');
  }
  assert.ok(!command.includes('duckdns') && !command.includes('ssh'), 'Proceso inesperado.');
  const listeners = execFileSync('powershell.exe', ['-NoProfile', '-Command', 'Get-NetTCPConnection -LocalPort 8090 -State Listen | Select-Object LocalAddress,OwningProcess | ConvertTo-Json -Compress'], { encoding: 'utf8', windowsHide: true });
  const parsed = JSON.parse(listeners);
  for (const listener of Array.isArray(parsed) ? parsed : [parsed]) {
    assert.equal(listener.LocalAddress, '127.0.0.1');
    assert.equal(listener.OwningProcess, candidates[0].ProcessId);
  }
}

async function request(route, token = '', method = 'GET', body, teacher = '') {
  assert.ok(route.startsWith('/api/') && !route.includes('://'), 'Ruta fuera de la API local.');
  const url = new URL(route, origin);
  assert.equal(url.origin, origin);
  const response = await fetch(url, {
    method, redirect: 'error',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}), ...(teacher ? { 'X-CYS-Teacher-Token': teacher } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) throw new Error(`${method} ${route.split('?')[0]}: HTTP ${response.status}`);
  if (response.status === 204) return null;
  return response.json();
}

async function list(name, token) {
  const items = [];
  for (let page = 1; ; page++) {
    const result = await request(`/api/collections/${name}/records?perPage=500&page=${page}`, token);
    items.push(...result.items);
    if (page >= result.totalPages) return items;
  }
}

function unique(items, predicate, message) {
  const matches = items.filter(predicate);
  assert.equal(matches.length, 1, message);
  return matches[0];
}

function gradePlan(row, term, config, data) {
  return config.materials.map((material, subjectIndex) => {
    const subject = data.materias.find(item => item.id === material.materia_id);
    const conduct = /TRABAJO EN EL AULA|TRABAJO PERSONAL|CONVIVENCIA|CONDUCTA/i.test(subject.nombre);
    const value = config.values[(Number(row.numero_orden) + term + subjectIndex - 2) % config.values.length];
    return {
      cursoMateriaId: material.id, ppi: false,
      calificacionGeneralId: conduct ? '' : value.id,
      criterios: data.criterios_evaluacion.filter(item => item.curso_materia_id === material.id).sort((a, b) => a.orden_visual - b.orden_visual).map(item => ({ criterioId: item.id, valorEscalaId: value.id })),
    };
  });
}

async function main() {
  const args = process.argv.slice(2);
  const csvIndex = args.indexOf('--csv');
  assert.ok(csvIndex >= 0 && args[csvIndex + 1], 'Uso: node scripts/prepare-attendance-local.mjs --csv <archivo externo> [--execute]');
  assert.ok(args.every((arg, index) => ['--csv', '--execute', '--dry-run'].includes(arg) || index === csvIndex + 1), 'Opción no admitida. No acepta URL ni credenciales externas.');
  const csvPath = path.resolve(args[csvIndex + 1]);
  assert.ok(!csvPath.toLowerCase().startsWith(repository.toLowerCase() + path.sep), 'El CSV real debe permanecer fuera del repositorio.');
  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  assert.ok(rows.length > 0);
  const execute = args.includes('--execute');
  assert.ok(!(execute && args.includes('--dry-run')), 'Modos incompatibles.');
  verifyLocalProcess();
  const credentials = Object.fromEntries(fs.readFileSync(path.join(root, 'dev-credentials.txt'), 'utf8').split(/\r?\n/).filter(line => line.includes('=')).map(line => {
    const index = line.indexOf('=');
    return [line.slice(0, index), line.slice(index + 1).trim()];
  }));
  const admin = await request('/api/admins/auth-with-password', '', 'POST', { identity: credentials.ADMIN_EMAIL, password: credentials.ADMIN_PASSWORD });
  const staff = await request('/api/collections/users/auth-with-password', '', 'POST', { identity: credentials.APP_EMAIL, password: credentials.APP_PASSWORD });
  const schema = await request('/api/collections?perPage=500', admin.token);
  const expectedSchema = JSON.parse(fs.readFileSync(path.join(repository, 'pb_schema.json'), 'utf8'));
  for (const name of [...catalogs, ...operational]) {
    const actual = unique(schema.items, item => item.name === name, `Falta colección ${name}.`);
    for (const field of expectedSchema.find(item => item.name === name).schema) assert.ok(actual.schema.some(item => item.name === field.name && item.type === field.type), `Esquema local desactualizado: ${name}.${field.name}`);
  }
  const data = {};
  for (const name of catalogs) data[name] = await list(name, admin.token);
  const configs = new Map();
  const dnis = new Set(), orders = new Set(), guardians = new Map();
  for (const [index, row] of rows.entries()) {
    const line = index + 2;
    assert.ok(['3°', '4°'].includes(row.curso_nombre) && row.ciclo_ano === '2026', `Curso o ciclo fuera del alcance en fila ${line}.`);
    assert.ok(row.estado_inscripcion === 'Regular' && !row.fecha_egreso, `Esta preparación admite cursada anual regular; fila ${line}.`);
    for (const field of ['alumno_dni', 'alumno_apellidos', 'alumno_nombres', 'alumno_sexo', 'alumno_nacionalidad', 'responsable_dni_numero', 'responsable_apellidos', 'responsable_nombres']) assert.ok(row[field], `Falta ${field} en fila ${line}.`);
    assert.ok(['Masculino', 'Femenino', 'No binario', 'Otro'].includes(row.alumno_sexo));
    assert.ok(!dnis.has(row.alumno_dni), `DNI repetido en fila ${line}.`); dnis.add(row.alumno_dni);
    assert.ok(Number.isInteger(Number(row.numero_orden)) && Number(row.numero_orden) > 0);
    const order = `${row.curso_nombre}:${row.numero_orden}`;
    assert.ok(!orders.has(order), `Orden repetido en fila ${line}.`); orders.add(order);
    date(row.alumno_fecha_nacimiento, true); date(row.fecha_ingreso, true); date(row.fecha_inscripcion, true);
    assert.ok(row.fecha_ingreso.replaceAll('/', '-') <= '2026-05-31', 'La prueba de ambos bimestres requiere ingreso dentro del primer bimestre.');
    for (const field of ['posee_apoyos', 'promociono_con_acompanamiento']) assert.ok(['', '-', 'NO', 'SI'].includes(row[field]));
    assert.ok(row.posee_apoyos !== 'SI' || row.cuales_apoyos);
    const guardianData = Object.fromEntries(Object.entries(row).filter(([key]) => key.startsWith('responsable_')));
    const prior = guardians.get(row.responsable_dni_numero);
    if (prior) assert.deepEqual(prior, guardianData, `Responsable inconsistente en fila ${line}.`);
    guardians.set(row.responsable_dni_numero, guardianData);
    if (!configs.has(row.curso_nombre)) {
      const course = unique(data.cursos, item => item.nombre === row.curso_nombre, 'Curso ambiguo.');
      const cycle = unique(data.ciclos_lectivos, item => item.ano === 2026, 'Ciclo ambiguo.');
      const materials = data.curso_materias.filter(item => item.curso_id === course.id && item.ciclo_id === cycle.id).sort((a, b) => a.orden_visual - b.orden_visual);
      assert.equal(materials.length, row.curso_nombre === '3°' ? 10 : 11, 'Malla incompleta.');
      for (const material of materials) assert.equal(data.criterios_evaluacion.filter(item => item.curso_materia_id === material.id).length, 5, 'Criterios incompletos.');
      const values = data.valores_escala.filter(item => item.escala_id === course.escala_id && !/no corresponde/i.test(item.etiqueta)).sort((a, b) => a.orden_visual - b.orden_visual);
      assert.equal(values.length, row.curso_nombre === '3°' ? 5 : 10, 'Escala incompleta.');
      const periods = [1, 2].map(term => unique(data.periodos, item => item.ciclo_id === cycle.id && item.numero_periodo === term, 'Bimestre inexistente o ambiguo.'));
      configs.set(row.curso_nombre, { course, cycle, materials, values, periods });
    }
  }
  assert.equal(configs.size, 2, 'Se requieren ambos grados.');
  const before = {};
  for (const name of operational) before[name] = (await list(name, admin.token)).length;
  console.log(JSON.stringify({ origin, mode: execute ? 'EXECUTE' : 'DRY_RUN', courses: [...configs.keys()].map(course => ({ course, students: rows.filter(row => row.curso_nombre === course).length })), guardians: guardians.size, cleanup: before }, null, 2));
  if (!execute) return;
  verifyLocalProcess();
  const settings = await request('/api/settings', admin.token);
  assert.ok(!settings.backups?.s3?.enabled, 'El respaldo debe almacenarse exclusivamente en disco local.');
  const backupName = `attendance-reset-${Date.now()}.zip`;
  await request('/api/backups', admin.token, 'POST', { name: backupName });
  const backups = await request('/api/backups', admin.token);
  assert.ok(backups.some(item => item.key === backupName), 'No se confirmó el respaldo.');
  const backupPath = path.join(root, 'pb_data', 'backups', backupName);
  assert.ok(fs.statSync(backupPath).size > 0, 'Respaldo local vacío.');
  console.log(`Respaldo local confirmado: ${backupPath}`);
  for (const name of operational) {
    for (const record of await list(name, admin.token)) await request(`/api/collections/${name}/records/${record.id}`, admin.token, 'DELETE');
  }
  for (const name of operational) assert.equal((await list(name, admin.token)).length, 0, `Limpieza incompleta: ${name}`);
  const createdGuardians = new Map(), enrollments = [];
  const create = (name, body) => request(`/api/collections/${name}/records`, admin.token, 'POST', body);
  for (const row of rows) {
    let guardian = createdGuardians.get(row.responsable_dni_numero);
    if (!guardian) {
      guardian = await create('responsables', Object.fromEntries(['dni_tipo', 'dni_numero', 'apellidos', 'nombres', 'telefono', 'email', 'nacionalidad', 'profesion'].map(field => [field, row[`responsable_${field}`] || ''])));
      createdGuardians.set(row.responsable_dni_numero, guardian);
    }
    const student = await create('alumnos', {
      ...Object.fromEntries(['dni', 'apellidos', 'nombres', 'sexo', 'nacionalidad', 'domicilio', 'localidad', 'usuario_acadeu', 'clave_acadeu'].map(field => [field, row[`alumno_${field}`] || ''])),
      numero_legajo: row.alumno_legajo || '', fecha_nacimiento: date(row.alumno_fecha_nacimiento),
    });
    await create('alumno_responable', { alumno_id: student.id, responsable_id: guardian.id, vinculo: row.responsable_vinculo || 'Padre' });
    const config = configs.get(row.curso_nombre);
    const enrollment = await create('inscripciones', {
      alumno_id: student.id, curso_id: config.course.id, ciclo_id: config.cycle.id,
      numero_orden: Number(row.numero_orden), numero_inscripcion: row.numero_inscripcion || '',
      fecha_ingreso: date(row.fecha_ingreso), fecha_inscripcion: date(row.fecha_inscripcion), estado: 'Regular',
      promociono_con_acompanamiento: row.promociono_con_acompanamiento || '', posee_apoyos: row.posee_apoyos || '', cuales_apoyos: row.cuales_apoyos || '',
    });
    const route = `/api/cys/directivo/inscripciones/${enrollment.id}/cursada`;
    const snapshot = await request(route, staff.token);
    await request(route, staff.token, 'PUT', { expectedRevision: snapshot.cursada.revision, expectedUpdated: snapshot.updated, desde: 1, hasta: 4, sinCursada: false });
    enrollments.push({ row, enrollment });
  }
  for (const [course, config] of configs) {
    for (const period of config.periods) {
      const link = await request('/api/cys/enlaces-docentes', staff.token, 'POST', { cursoId: config.course.id, periodoId: period.id, docenteNombre: 'Prueba local de registro de asistencia' });
      try {
        for (const { row, enrollment } of enrollments.filter(item => item.row.curso_nombre === course)) {
          const materias = gradePlan(row, period.numero_periodo, config, data);
          const body = { materias };
          if (period.numero_periodo === 1) body.apoyos = { poseeApoyos: row.posee_apoyos === 'SI' ? 'SI' : 'NO', cualesApoyos: row.cuales_apoyos || '' };
          const result = await request(`/api/cys/docente/alumnos/${enrollment.id}`, '', 'PUT', body, link.secreto);
          assert.equal(result.cierre, null);
          for (const expected of materias) {
            const saved = result.evaluaciones.find(item => item.cursoMateriaId === expected.cursoMateriaId);
            assert.equal(saved.calificacionGeneralId || '', expected.calificacionGeneralId);
            assert.deepEqual(saved.criterios.sort((a, b) => a.criterioId.localeCompare(b.criterioId)), expected.criterios.toSorted((a, b) => a.criterioId.localeCompare(b.criterioId)));
          }
        }
      } finally {
        await request(`/api/collections/tokens_acceso_docente/records/${link.enlace.id}`, staff.token, 'DELETE');
      }
      console.log(`Notas verificadas: ${course}, bimestre ${period.numero_periodo}.`);
    }
  }
  for (const name of catalogs) assert.deepEqual(await list(name, admin.token), data[name], `Catálogo modificado: ${name}`);
  const final = {};
  for (const name of operational) final[name] = (await list(name, admin.token)).length;
  assert.equal(final.alumnos, rows.length);
  assert.equal(final.inscripciones, rows.length);
  assert.equal(final.responsables, guardians.size);
  assert.equal(final.alumno_responable, rows.length);
  const expectedEvaluations = rows.reduce((sum, row) => sum + configs.get(row.curso_nombre).materials.length * 2, 0);
  assert.equal(final.evaluaciones_materia, expectedEvaluations);
  assert.equal(final.evaluaciones_criterios, expectedEvaluations * 5);
  for (const name of ['asistencias_diarias', 'registros_asistencia_curso', 'cierres_periodo_alumno', 'tokens_acceso_docente', 'visados_boletin', 'emisiones_boletin']) assert.equal(final[name], 0);
  const finalEnrollments = await list('inscripciones', admin.token);
  assert.ok(finalEnrollments.every(item => item.cursada_estado === 'CONFIRMADA' && item.bimestre_desde === 1 && item.bimestre_hasta === 4));
  const report = { origin, completedAt: new Date().toISOString(), backupPath, final, formula: 'valor[(numero_orden + bimestre + indice_materia - 2) % cantidad_valores]; catálogo por orden_visual, sin No corresponde; criterios iguales a la nota de materia; PPI false', courses: [...configs].map(([name, config]) => ({ name, students: rows.filter(row => row.curso_nombre === name).length, subjects: config.materials.map(item => data.materias.find(subject => subject.id === item.materia_id).nombre), values: config.values.map(item => item.etiqueta) })) };
  fs.mkdirSync(path.join(root, 'audits'), { recursive: true });
  const reportPath = path.join(root, 'audits', `attendance-local-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, reportPath }, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
