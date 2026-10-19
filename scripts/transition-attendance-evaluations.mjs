import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const origin = 'http://127.0.0.1:8090';
const root = 'C:/pocketbase';

async function request(route, token = '', method = 'GET', body) {
  const url = new URL(route, origin);
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${method} ${route}: HTTP ${response.status} - ${errorText}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function list(name, token, filter = '') {
  const items = [];
  for (let page = 1; ; page++) {
    const url = `/api/collections/${name}/records?perPage=500&page=${page}${filter ? `&filter=${encodeURIComponent(filter)}` : ''}`;
    const result = await request(url, token);
    items.push(...result.items);
    if (page >= result.totalPages) return items;
  }
}

async function getAdminToken() {
  const credPath = path.join(root, 'dev-credentials.txt');
  assert.ok(fs.existsSync(credPath), `No se encontró dev-credentials.txt en ${root}`);
  const credentials = Object.fromEntries(
    fs.readFileSync(credPath, 'utf8')
      .split(/\r?\n/)
      .filter(line => line.includes('='))
      .map(line => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1).trim()];
      })
  );
  const adminAuth = await request('/api/admins/auth-with-password', '', 'POST', {
    identity: credentials.ADMIN_EMAIL,
    password: credentials.ADMIN_PASSWORD,
  });
  return adminAuth.token;
}

async function main() {
  const action = process.argv[2] || 'status';
  if (!['status', 'deliver', 'approve', 'reset'].includes(action)) {
    console.error('Uso: node scripts/transition-attendance-evaluations.mjs [status | deliver | approve | reset]');
    process.exit(1);
  }

  const token = await getAdminToken();
  const cycle = (await list('ciclos_lectivos', token, 'actual = true'))[0];
  assert.ok(cycle, 'No se encontró ciclo lectivo activo.');

  const periods = await list('periodos', token, `ciclo_id = "${cycle.id}"`);
  const courses = await list('cursos', token);
  const targetCourses = courses.filter(c => ['3°', '4°'].includes(c.nombre));

  for (const course of targetCourses) {
    console.log(`\n=== Curso: ${course.nombre} ===`);
    const enrollments = await list('inscripciones', token, `curso_id = "${course.id}" && ciclo_id = "${cycle.id}" && estado != "Baja"`);

    for (const period of periods.filter(p => p.numero_periodo <= 2)) {
      console.log(`\n  Periodo: ${period.nombre} (Bimestre ${period.numero_periodo})`);
      const instances = await list('instancias_carga_boletin', token, `curso_id = "${course.id}" && periodo_id = "${period.id}"`);
      const evaluations = await list('evaluaciones_materia', token, `periodo_id = "${period.id}"`);
      const courseEvals = evaluations.filter(ev => enrollments.some(e => e.id === ev.inscripcion_id));

      let instance = instances[0];
      if (!instance && action !== 'status') {
        instance = await request('/api/collections/instancias_carga_boletin/records', token, 'POST', {
          curso_id: course.id,
          periodo_id: period.id,
          estado: 'BORRADOR_DOCENTE',
          revision: 1,
        });
      }

      const instanceId = instance?.id;
      let visados = instanceId ? await list('visados_boletin', token, `instancia_id = "${instanceId}"`) : [];
      const visadosOk = visados.filter(v => v.estado === 'VISADO' && v.revision_visada === v.revision_contenido);

      console.log(`  - Instancia Estado: ${instance?.estado || 'SIN INSTANCIA'}`);
      console.log(`  - Evaluaciones cargadas: ${courseEvals.length}`);
      console.log(`  - Alumnos inscriptos: ${enrollments.length}`);
      console.log(`  - Visados aprobados: ${visadosOk.length} / ${enrollments.length}`);

      if (action === 'deliver') {
        if (instance.estado !== 'CONTROL_DIRECTIVO') {
          await request(`/api/collections/instancias_carga_boletin/records/${instance.id}`, token, 'PATCH', {
            estado: 'CONTROL_DIRECTIVO',
            revision: (instance.revision || 0) + 1,
            enviado_at: new Date().toISOString(),
            enviado_por: 'Docente de Grado',
          });
        }
        for (const insc of enrollments) {
          const existingCierre = await list('cierres_periodo_alumno', token, `inscripcion_id = "${insc.id}" && periodo_id = "${period.id}"`);
          if (existingCierre.length === 0) {
            await request('/api/collections/cierres_periodo_alumno/records', token, 'POST', {
              inscripcion_id: insc.id,
              periodo_id: period.id,
              dias_asistidos: 20,
              dias_injustificados: 0,
              dias_justificados: 0,
              dias_totales: 20,
            });
          }
          const existingVisado = visados.find(v => v.inscripcion_id === insc.id);
          if (!existingVisado) {
            await request('/api/collections/visados_boletin/records', token, 'POST', {
              instancia_id: instance.id,
              inscripcion_id: insc.id,
              estado: 'PENDIENTE_REVISION',
              revision_contenido: 1,
              revision_visada: null,
            });
          }
        }
        console.log(`    -> Entregado a CONTROL_DIRECTIVO con visados pendientes de revisión.`);
      } else if (action === 'approve') {
        if (!instance) continue;
        if (instance.estado !== 'CONTROL_DIRECTIVO') {
          await request(`/api/collections/instancias_carga_boletin/records/${instance.id}`, token, 'PATCH', {
            estado: 'CONTROL_DIRECTIVO',
          });
        }
        for (const insc of enrollments) {
          const existingVisado = visados.find(v => v.inscripcion_id === insc.id);
          if (existingVisado) {
            await request(`/api/collections/visados_boletin/records/${existingVisado.id}`, token, 'PATCH', {
              estado: 'VISADO',
              revision_visada: existingVisado.revision_contenido,
              visado_at: new Date().toISOString(),
            });
          } else {
            await request('/api/collections/visados_boletin/records', token, 'POST', {
              instancia_id: instance.id,
              inscripcion_id: insc.id,
              estado: 'VISADO',
              revision_contenido: 1,
              revision_visada: 1,
              visado_at: new Date().toISOString(),
            });
          }
        }
        console.log(`    -> Todos los alumnos quedaron con VISADO directivo aprobado.`);
      } else if (action === 'reset') {
        if (!instance) continue;
        await request(`/api/collections/instancias_carga_boletin/records/${instance.id}`, token, 'PATCH', {
          estado: 'BORRADOR_DOCENTE',
        });
        for (const v of visados) {
          await request(`/api/collections/visados_boletin/records/${v.id}`, token, 'DELETE');
        }
        console.log(`    -> Revertido a BORRADOR_DOCENTE y visados eliminados.`);
      }
    }
  }

  console.log(`\nAcción "${action}" completada exitosamente.\n`);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
