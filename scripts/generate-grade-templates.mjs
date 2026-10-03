import fs from 'node:fs';
import path from 'node:path';

function parseCommandLineArguments() {
  const args = process.argv.slice(2);
  const options = {
    pbUrl: process.env.PB_URL || 'http://127.0.0.1:8090',
    adminEmail: process.env.PB_ADMIN_EMAIL || '',
    adminPassword: process.env.PB_ADMIN_PASSWORD || '',
    cicloAno: 2026,
    periodoNumero: 1,
    cursoNombre: '',
    outDir: './plantillas_notas'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--url' && args[i + 1]) {
      options.pbUrl = args[++i];
    } else if (arg === '--email' && args[i + 1]) {
      options.adminEmail = args[++i];
    } else if (arg === '--password' && args[i + 1]) {
      options.adminPassword = args[++i];
    } else if (arg === '--ciclo' && args[i + 1]) {
      options.cicloAno = parseInt(args[++i], 10);
    } else if (arg === '--periodo' && args[i + 1]) {
      options.periodoNumero = parseInt(args[++i], 10);
    } else if (arg === '--curso' && args[i + 1]) {
      options.cursoNombre = args[++i];
    } else if (arg === '--out-dir' && args[i + 1]) {
      options.outDir = args[++i];
    }
  }

  if (!options.adminEmail || !options.adminPassword) {
    const devCredentialsPath = 'C:\\pocketbase\\dev-credentials.txt';
    if (fs.existsSync(devCredentialsPath)) {
      const content = fs.readFileSync(devCredentialsPath, 'utf8');
      const emailMatch = content.match(/ADMIN_EMAIL=(.+)/);
      const passwordMatch = content.match(/ADMIN_PASSWORD=(.+)/);
      if (emailMatch && !options.adminEmail) {
        options.adminEmail = emailMatch[1].trim();
      }
      if (passwordMatch && !options.adminPassword) {
        options.adminPassword = passwordMatch[1].trim();
      }
    }
  }

  return options;
}

async function authenticateAdmin(pbUrl, email, password) {
  const response = await fetch(`${pbUrl}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Fallo de autenticación como admin en PocketBase: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  return data.token;
}

async function fetchAllRecords(pbUrl, token, collection, filter = '', sort = '', expand = '') {
  const items = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const params = new URLSearchParams({
      page: page.toString(),
      perPage: perPage.toString()
    });
    if (filter) params.append('filter', filter);
    if (sort) params.append('sort', sort);
    if (expand) params.append('expand', expand);

    const response = await fetch(`${pbUrl}/api/collections/${collection}/records?${params.toString()}`, {
      headers: { Authorization: token }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Error consultando colección ${collection}: ${response.status} - ${body}`);
    }

    const data = await response.json();
    items.push(...data.items);

    if (page >= data.totalPages) {
      break;
    }
    page++;
  }

  return items;
}

function isConductSubjectName(name) {
  const normalized = name.trim().toUpperCase();
  return (
    normalized.includes('TRABAJO EN EL AULA') ||
    normalized.includes('TRABAJO PERSONAL') ||
    normalized.includes('CONVIVENCIA') ||
    normalized.includes('CONDUCTA')
  );
}

function slugifyMateria(nombre) {
  const normalized = nombre.trim().toUpperCase();
  if (normalized.includes('TRABAJO EN EL AULA')) return 'trabajo_aula';
  if (normalized.includes('CONVIVENCIA')) return 'convivencia';
  if (normalized.includes('LENGUAS ADICIONALES') || normalized.includes('INGL')) return 'ingles';
  if (normalized.includes('LENGUA')) return 'lengua';
  if (normalized.includes('MATEM')) return 'matematica';
  if (normalized.includes('CONOCIMIENTO DEL MUNDO')) return 'conocimiento_mundo';
  if (normalized.includes('CIENCIAS SOCIALES') || normalized.includes('SOCIALES')) return 'ciencias_sociales';
  if (normalized.includes('CIENCIAS NATURALES') || normalized.includes('NATURALES')) return 'ciencias_naturales';
  if (normalized.includes('TECNOLOG')) return 'tecnologia';
  if (normalized.includes('VISUALES') || normalized.includes('PLASTICA')) return 'artes_visuales';
  if (normalized.includes('MÚSICA') || normalized.includes('MUSICA')) return 'musica';
  if (normalized.includes('FÍSICA') || normalized.includes('FISICA')) return 'educacion_fisica';

  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function escapeCsvField(field) {
  const str = String(field ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function run() {
  const options = parseCommandLineArguments();
  if (!options.adminEmail || !options.adminPassword) {
    console.error('Error: Credenciales de administrador no suministradas ni encontradas en dev-credentials.txt.');
    process.exit(1);
  }

  const token = await authenticateAdmin(options.pbUrl, options.adminEmail, options.adminPassword);

  const ciclos = await fetchAllRecords(options.pbUrl, token, 'ciclos_lectivos', `ano = ${options.cicloAno}`);
  if (ciclos.length === 0) {
    console.error(`Error: No se encontró el ciclo lectivo ${options.cicloAno}.`);
    process.exit(1);
  }
  const ciclo = ciclos[0];

  const periodos = await fetchAllRecords(
    options.pbUrl,
    token,
    'periodos',
    `ciclo_id = "${ciclo.id}" && numero_periodo = ${options.periodoNumero}`
  );
  if (periodos.length === 0) {
    console.error(`Error: No se encontró el período número ${options.periodoNumero} para el ciclo ${options.cicloAno}.`);
    process.exit(1);
  }
  const periodo = periodos[0];

  let cursosFilter = '';
  if (options.cursoNombre) {
    cursosFilter = `nombre = "${options.cursoNombre}"`;
  }
  const cursos = await fetchAllRecords(options.pbUrl, token, 'cursos', cursosFilter, 'nombre');
  if (cursos.length === 0) {
    console.error(`Error: No se encontraron cursos que coincidan con la búsqueda.`);
    process.exit(1);
  }

  if (!fs.existsSync(options.outDir)) {
    fs.mkdirSync(options.outDir, { recursive: true });
  }

  for (const curso of cursos) {
    const cursoMaterias = await fetchAllRecords(
      options.pbUrl,
      token,
      'curso_materias',
      `curso_id = "${curso.id}" && ciclo_id = "${ciclo.id}"`,
      'orden_visual',
      'materia_id'
    );

    if (cursoMaterias.length === 0) {
      console.warn(`Aviso: El curso ${curso.nombre} no tiene materias asignadas en el ciclo ${options.cicloAno}.`);
      continue;
    }

    const inscripciones = await fetchAllRecords(
      options.pbUrl,
      token,
      'inscripciones',
      `curso_id = "${curso.id}" && ciclo_id = "${ciclo.id}" && estado != "Baja"`,
      'numero_orden',
      'alumno_id'
    );

    const headers = ['alumno_nombre'];

    if (options.periodoNumero === 1) {
      headers.push('posee_apoyos', 'cuales_apoyos');
    }

    for (const cm of cursoMaterias) {
      const materiaNombre = cm.expand?.materia_id?.nombre || 'materia';
      const slug = slugifyMateria(materiaNombre);
      const isConduct = isConductSubjectName(materiaNombre);

      if (!isConduct) {
        headers.push(`${slug}_ppi`);
      }

      for (let c = 1; c <= 5; c++) {
        headers.push(`${slug}_c${c}`);
      }

      if (!isConduct) {
        headers.push(`${slug}_gral`);
      }
    }

    headers.push('asistencias', 'inasistencias', 'llegadas_tarde', 'observaciones');

    const csvRows = [headers.map(escapeCsvField).join(',')];

    for (const inscripcion of inscripciones) {
      const alumno = inscripcion.expand?.alumno_id;
      const nombreCompleto = alumno ? `${alumno.apellidos}, ${alumno.nombres}`.trim() : '';
      const row = [nombreCompleto];

      if (options.periodoNumero === 1) {
        row.push(inscripcion.posee_apoyos || 'NO', inscripcion.cuales_apoyos || '');
      }

      for (const cm of cursoMaterias) {
        const materiaNombre = cm.expand?.materia_id?.nombre || 'materia';
        const isConduct = isConductSubjectName(materiaNombre);

        if (!isConduct) {
          row.push('NO');
        }

        for (let c = 1; c <= 5; c++) {
          row.push('');
        }

        if (!isConduct) {
          row.push('');
        }
      }

      row.push('0', '0', '0', '');
      csvRows.push(row.map(escapeCsvField).join(','));
    }

    const cleanGradeName = curso.nombre.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `notas_b${options.periodoNumero}_curso_${cleanGradeName}.csv`;
    const targetPath = path.join(options.outDir, fileName);

    fs.writeFileSync(targetPath, '\uFEFF' + csvRows.join('\r\n'), 'utf8');
    console.log(`Plantilla generada exitosamente: ${targetPath} (${inscripciones.length} alumnos, ${headers.length} columnas)`);
  }
}

run().catch((error) => {
  console.error('Error durante la generación de plantillas:', error);
  process.exit(1);
});
