import fs from 'node:fs';

function parseCommandLineArguments() {
  const args = process.argv.slice(2);
  const options = {
    pbUrl: process.env.PB_URL || 'http://127.0.0.1:8090',
    adminEmail: process.env.PB_ADMIN_EMAIL || '',
    adminPassword: process.env.PB_ADMIN_PASSWORD || '',
    confirm: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--url' && args[i + 1]) {
      options.pbUrl = args[++i];
    } else if (arg === '--email' && args[i + 1]) {
      options.adminEmail = args[++i];
    } else if (arg === '--password' && args[i + 1]) {
      options.adminPassword = args[++i];
    } else if (arg === '--confirm') {
      options.confirm = true;
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

function assertLocalEnvironmentOnly(url) {
  const parsed = new URL(url);
  const isLocal =
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === 'localhost' ||
    parsed.hostname === '::1';

  if (!isLocal) {
    throw new Error(`Operación abortada por seguridad: Este script solo puede ejecutarse en loopback local. URL detectada: ${url}`);
  }
}

async function authenticateAdmin(pbUrl, email, password) {
  const response = await fetch(`${pbUrl}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Fallo de autenticación como admin: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  return data.token;
}

async function fetchAllRecordIds(pbUrl, token, collection) {
  const ids = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const params = new URLSearchParams({
      page: page.toString(),
      perPage: perPage.toString(),
      fields: 'id'
    });

    const response = await fetch(`${pbUrl}/api/collections/${collection}/records?${params.toString()}`, {
      headers: { Authorization: token }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Error consultando colección ${collection}: ${response.status} - ${body}`);
    }

    const data = await response.json();
    for (const item of data.items) {
      ids.push(item.id);
    }

    if (page >= data.totalPages) {
      break;
    }
    page++;
  }

  return ids;
}

async function deleteRecord(pbUrl, token, collection, id) {
  const response = await fetch(`${pbUrl}/api/collections/${collection}/records/${id}`, {
    method: 'DELETE',
    headers: { Authorization: token }
  });

  if (!response.ok && response.status !== 404) {
    const body = await response.text();
    throw new Error(`Error eliminando registro ${id} de ${collection}: ${response.status} - ${body}`);
  }
}

async function cleanCollection(pbUrl, token, collectionName) {
  const ids = await fetchAllRecordIds(pbUrl, token, collectionName);
  if (ids.length === 0) {
    console.log(`- ${collectionName}: 0 registros (ya limpia)`);
    return 0;
  }

  for (const id of ids) {
    await deleteRecord(pbUrl, token, collectionName, id);
  }

  console.log(`✔ ${collectionName}: ${ids.length} registros eliminados.`);
  return ids.length;
}

async function run() {
  const options = parseCommandLineArguments();
  assertLocalEnvironmentOnly(options.pbUrl);

  if (!options.confirm) {
    console.log('\n============================================================');
    console.log(' MODO SEGURO: LIMPIEZA DE DATOS MOCKS EN DESARROLLO LOCAL');
    console.log('============================================================');
    console.log(`URL objetivo: ${options.pbUrl}`);
    console.log('Para ejecutar la limpieza real pase el flag --confirm.');
    console.log('============================================================\n');
    return;
  }

  if (!options.adminEmail || !options.adminPassword) {
    console.error('Error: Credenciales de administrador requeridas.');
    process.exit(1);
  }

  const token = await authenticateAdmin(options.pbUrl, options.adminEmail, options.adminPassword);

  console.log('\nIniciando limpieza ordenada de colecciones operativas en dev local...\n');

  const collectionsToClean = [
    'emisiones_boletin',
    'visados_boletin',
    'instancias_carga_boletin',
    'tokens_acceso_docente',
    'cierres_periodo_alumno',
    'evaluaciones_criterios',
    'evaluaciones_materia',
    'alumno_responable',
    'inscripciones',
    'alumnos',
    'responsables'
  ];

  let totalDeleted = 0;
  for (const coll of collectionsToClean) {
    const count = await cleanCollection(options.pbUrl, token, coll);
    totalDeleted += count;
  }

  console.log(`\n🎉 Limpieza completada exitosamente. Total de registros eliminados: ${totalDeleted}.`);
  console.log('La estructura curricular, escalas, cursos, ciclos y usuarios institucionales permanecen intactos.\n');
}

run().catch((error) => {
  console.error('\n❌ Error durante la limpieza:', error);
  process.exit(1);
});
