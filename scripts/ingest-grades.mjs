import fs from 'node:fs';
import path from 'node:path';

function parseCommandLineArguments() {
  const args = process.argv.slice(2);
  const options = {
    csvPath: '',
    cursoNombre: '',
    periodoNumero: 0,
    cicloAno: 2026,
    isDryRun: true,
    pbUrl: process.env.PB_URL || 'http://127.0.0.1:8090',
    adminEmail: process.env.PB_ADMIN_EMAIL || '',
    adminPassword: process.env.PB_ADMIN_PASSWORD || ''
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--csv' && args[i + 1]) {
      options.csvPath = args[++i];
    } else if (arg === '--curso' && args[i + 1]) {
      options.cursoNombre = args[++i];
    } else if ((arg === '--periodo' || arg === '--bimestre') && args[i + 1]) {
      options.periodoNumero = parseInt(args[++i], 10);
    } else if (arg === '--ciclo' && args[i + 1]) {
      options.cicloAno = parseInt(args[++i], 10);
    } else if (arg === '--execute') {
      options.isDryRun = false;
    } else if (arg === '--dry-run') {
      options.isDryRun = true;
    } else if ((arg === '--url' || arg === '--pb-url') && args[i + 1]) {
      options.pbUrl = args[++i];
    } else if (arg === '--email' && args[i + 1]) {
      options.adminEmail = args[++i];
    } else if (arg === '--password' && args[i + 1]) {
      options.adminPassword = args[++i];
    }
  }

  const isLocalPb = options.pbUrl.includes('127.0.0.1') || options.pbUrl.includes('localhost');
  if (isLocalPb && (!options.adminEmail || !options.adminPassword)) {
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

function parseCsv(content) {
  const cleanContent = content.replace(/^\uFEFF/, '');
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentToken = '';

  for (let i = 0; i < cleanContent.length; i++) {
    const char = cleanContent[i];
    const nextChar = cleanContent[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentToken += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentToken.trim());
      currentToken = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentToken.trim());
      if (row.some(field => field.length > 0)) {
        lines.push(row);
      }
      row = [];
      currentToken = '';
    } else {
      currentToken += char;
    }
  }

  if (currentToken.length > 0 || row.length > 0) {
    row.push(currentToken.trim());
    if (row.some(field => field.length > 0)) {
      lines.push(row);
    }
  }

  if (lines.length === 0) {
    return [];
  }

  const headers = lines[0].map(h => h.trim());
  return lines.slice(1).map((recordRow, rowIndex) => {
    const mapped = { __lineNumber: rowIndex + 2 };
    headers.forEach((header, index) => {
      mapped[header] = recordRow[index] ?? '';
    });
    return mapped;
  });
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
  return { token: data.token, adminId: data.admin?.id || 'admin' };
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

async function postRecord(pbUrl, token, collection, body) {
  const response = await fetch(`${pbUrl}/api/collections/${collection}/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error creando registro en ${collection}: ${response.status} - ${errorBody}`);
  }

  return await response.json();
}

async function patchRecord(pbUrl, token, collection, id, body) {
  const response = await fetch(`${pbUrl}/api/collections/${collection}/records/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error actualizando registro ${id} en ${collection}: ${response.status} - ${errorBody}`);
  }

  return await response.json();
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

function buildScaleValueLookup(valoresEscala) {
  const lookup = new Map();

  for (const valor of valoresEscala) {
    const etiquetaNorm = valor.etiqueta.trim().toUpperCase();
    lookup.set(etiquetaNorm, valor.id);
    lookup.set(valor.id, valor.id);

    const pesoStr = String(valor.peso_numerico);
    lookup.set(`PESO_${pesoStr}`, valor.id);
  }

  const primaryShortcuts = {
    D: 'DESTACADO',
    DEST: 'DESTACADO',
    AV: 'AVANZADO',
    AL: 'ALCANZADO',
    A: 'ALCANZADO',
    EP: 'EN PROCESO',
    P: 'EN PROCESO',
    NA: 'NO ALCANZÓ LOS OBJETIVOS',
    NC: 'NO CORRESPONDE'
  };

  return function resolveValueId(rawInput) {
    if (!rawInput) return null;
    const clean = String(rawInput).trim().toUpperCase();

    if (lookup.has(clean)) {
      return lookup.get(clean);
    }

    const unaccented = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const [key, id] of lookup.entries()) {
      if (key.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === unaccented) {
        return id;
      }
    }

    if (primaryShortcuts[clean]) {
      const targetEtiqueta = primaryShortcuts[clean];
      const targetUnaccented = targetEtiqueta.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      for (const [key, id] of lookup.entries()) {
        if (key.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === targetUnaccented) {
          return id;
        }
      }
    }

    if (clean === 'NC' || clean === '-' || clean === 'NO CORRESPONDE') {
      for (const [key, id] of lookup.entries()) {
        if (key.includes('NO CORRESPONDE')) return id;
      }
      return '';
    }

    const numMatch = clean.match(/\b(10|[1-9])\b/) || clean.match(/(10|[1-9])/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      for (const valor of valoresEscala) {
        if (valor.peso_numerico === num) {
          return valor.id;
        }
        if (valor.etiqueta.includes(String(num))) {
          return valor.id;
        }
      }
    }

    return null;
  };
}

function parseBooleanValue(val) {
  if (typeof val === 'boolean') return val;
  const s = String(val || '').trim().toUpperCase();
  return s === 'SI' || s === 'S' || s === 'TRUE' || s === '1';
}

function parseAttendanceBounded(val, max, fallback = 0) {
  if (val === undefined || val === null || val === '') return fallback;
  let str = String(val).trim().replace(',', '.');
  let fraction = 0;
  if (str.includes('½')) {
    fraction = 0.5;
    str = str.replace('½', '').trim();
  } else if (str.includes('1/2')) {
    fraction = 0.5;
    str = str.replace('1/2', '').trim();
  }
  const base = str.length > 0 ? parseFloat(str) : 0;
  if (isNaN(base)) return null;
  const total = base + fraction;
  if (total < 0 || total > max) return null;
  return total;
}

function parseIntegerBounded(val, max, fallback = 0) {
  if (val === undefined || val === null || val === '') return fallback;
  const num = parseInt(String(val).trim(), 10);
  if (isNaN(num) || num < 0 || num > max) return null;
  return num;
}

async function run() {
  const options = parseCommandLineArguments();
  if (!options.csvPath) {
    console.error('Error: Debe especificar la ruta del CSV con --csv <ruta>.');
    process.exit(1);
  }

  if (!fs.existsSync(options.csvPath)) {
    console.error(`Error: No se encontró el archivo CSV en: ${options.csvPath}`);
    process.exit(1);
  }

  if (!options.adminEmail || !options.adminPassword) {
    console.error('Error: Credenciales de administrador no suministradas ni encontradas en dev-credentials.txt.');
    process.exit(1);
  }

  const { token, adminId } = await authenticateAdmin(options.pbUrl, options.adminEmail, options.adminPassword);

  const ciclos = await fetchAllRecords(options.pbUrl, token, 'ciclos_lectivos', `ano = ${options.cicloAno}`);
  if (ciclos.length === 0) {
    console.error(`Error: No se encontró el ciclo lectivo ${options.cicloAno}.`);
    process.exit(1);
  }
  const ciclo = ciclos[0];

  let periodoNumero = options.periodoNumero;
  if (!periodoNumero) {
    const match = path.basename(options.csvPath).match(/_b([1-4])_/i);
    if (match) {
      periodoNumero = parseInt(match[1], 10);
    } else {
      periodoNumero = 1;
    }
  }

  const periodos = await fetchAllRecords(
    options.pbUrl,
    token,
    'periodos',
    `ciclo_id = "${ciclo.id}" && numero_periodo = ${periodoNumero}`
  );
  if (periodos.length === 0) {
    console.error(`Error: No se encontró el período número ${periodoNumero} para el ciclo ${options.cicloAno}.`);
    process.exit(1);
  }
  const periodo = periodos[0];

  let cursoNombre = options.cursoNombre;
  if (!cursoNombre) {
    const match = path.basename(options.csvPath).match(/curso_([0-9]+)/i);
    if (match) {
      cursoNombre = `${match[1]}°`;
    }
  }

  let cursosFilter = '';
  if (cursoNombre) {
    cursosFilter = `nombre = "${cursoNombre}"`;
  }
  const cursos = await fetchAllRecords(options.pbUrl, token, 'cursos', cursosFilter, 'nombre');
  if (cursos.length === 0) {
    console.error(`Error: No se encontró el curso ${cursoNombre || ''}.`);
    process.exit(1);
  }
  const curso = cursos[0];

  console.log(`\n============================================================`);
  console.log(` PROCESANDO INGESTA DE CALIFICACIONES`);
  console.log(`============================================================`);
  console.log(`- Servidor PocketBase: ${options.pbUrl}`);
  console.log(`- Archivo CSV: ${options.csvPath}`);
  console.log(`- Ciclo Lectivo: ${ciclo.ano}`);
  console.log(`- Período: ${periodo.nombre} (ID: ${periodo.id})`);
  console.log(`- Curso: ${curso.nombre} (ID: ${curso.id})`);
  console.log(`- Modo de ejecución: ${options.isDryRun ? 'DRY-RUN (Simulación sin escrituras)' : 'EXECUTE (Inserción real en BBDD)'}`);
  console.log(`------------------------------------------------------------\n`);

  const cursoMaterias = await fetchAllRecords(
    options.pbUrl,
    token,
    'curso_materias',
    `curso_id = "${curso.id}" && ciclo_id = "${ciclo.id}"`,
    'orden_visual',
    'materia_id'
  );

  if (cursoMaterias.length === 0) {
    console.error(`Error: El curso ${curso.nombre} no tiene materias asignadas.`);
    process.exit(1);
  }

  const materiasInfo = [];
  for (const cm of cursoMaterias) {
    const nombre = cm.expand?.materia_id?.nombre || '';
    const slug = slugifyMateria(nombre);
    const isConduct = isConductSubjectName(nombre);

    const criterios = await fetchAllRecords(
      options.pbUrl,
      token,
      'criterios_evaluacion',
      `curso_materia_id = "${cm.id}"`,
      'orden_visual'
    );

    materiasInfo.push({
      cursoMateriaId: cm.id,
      nombre,
      slug,
      isConduct,
      criterios
    });
  }

  const valoresEscala = await fetchAllRecords(
    options.pbUrl,
    token,
    'valores_escala',
    `escala_id = "${curso.escala_id}"`,
    'orden_visual'
  );
  const resolveValueId = buildScaleValueLookup(valoresEscala);

  const inscripciones = await fetchAllRecords(
    options.pbUrl,
    token,
    'inscripciones',
    `curso_id = "${curso.id}" && ciclo_id = "${ciclo.id}"`,
    'numero_orden',
    'alumno_id'
  );

  function normalizePersonName(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\bvilla\b/g, 'villca')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  const inscripcionesByDni = new Map();
  const inscripcionesByName = new Map();

  for (const inscripcion of inscripciones) {
    const alumno = inscripcion.expand?.alumno_id;
    if (alumno?.dni) {
      inscripcionesByDni.set(alumno.dni.trim(), inscripcion);
    }
    if (alumno) {
      const apellidosNombres = normalizePersonName(`${alumno.apellidos} ${alumno.nombres}`);
      const nombresApellidos = normalizePersonName(`${alumno.nombres} ${alumno.apellidos}`);
      inscripcionesByName.set(apellidosNombres, inscripcion);
      inscripcionesByName.set(nombresApellidos, inscripcion);
    }
  }

  const csvContent = fs.readFileSync(options.csvPath, 'utf8');
  const rows = parseCsv(csvContent);

  if (rows.length === 0) {
    console.error('Error: El archivo CSV no contiene filas de datos.');
    process.exit(1);
  }

  const validationErrors = [];
  const parsedRecords = [];

  for (const row of rows) {
    const lineNum = row.__lineNumber;
    const dni = String(row.alumno_dni || '').trim();
    const rawNombre = String(row.alumno_nombre || '').trim();

    let inscripcion = null;
    if (dni && inscripcionesByDni.has(dni)) {
      inscripcion = inscripcionesByDni.get(dni);
    } else if (rawNombre) {
      const normalizedQuery = normalizePersonName(rawNombre);
      if (inscripcionesByName.has(normalizedQuery)) {
        inscripcion = inscripcionesByName.get(normalizedQuery);
      } else {
        const queryTokens = normalizedQuery.split(' ').filter(t => t.length > 1);
        const matches = [];
        for (const ins of inscripciones) {
          const alumno = ins.expand?.alumno_id;
          if (!alumno) continue;
          const fullName = normalizePersonName(`${alumno.apellidos} ${alumno.nombres}`);
          if (queryTokens.every(tok => fullName.includes(tok))) {
            matches.push(ins);
          }
        }
        if (matches.length === 1) {
          inscripcion = matches[0];
        }
      }
    }

    if (!inscripcion) {
      const idInfo = dni ? `DNI ${dni}` : `Nombre '${rawNombre}'`;
      validationErrors.push(`Línea ${lineNum}: ${idInfo} no corresponde a una inscripción activa de ${curso.nombre}.`);
      continue;
    }

    const asistencias = parseAttendanceBounded(row.asistencias, 180, 0);
    const inasistencias = parseAttendanceBounded(row.inasistencias, 180, 0);
    const llegadasTarde = parseIntegerBounded(row.llegadas_tarde, 180, 0);

    if (asistencias === null) validationErrors.push(`Línea ${lineNum} (${dni}): 'asistencias' no es un número válido entre 0 y 180.`);
    if (inasistencias === null) validationErrors.push(`Línea ${lineNum} (${dni}): 'inasistencias' no es un número válido entre 0 y 180.`);
    if (llegadasTarde === null) validationErrors.push(`Línea ${lineNum} (${dni}): 'llegadas_tarde' no es un entero válido entre 0 y 180.`);

    const observaciones = String(row.observaciones || '').trim().slice(0, 300);

    let poseeApoyos = 'NO';
    let cualesApoyos = '';
    if (periodoNumero === 1) {
      const rawApoyos = String(row.posee_apoyos || '').trim().toUpperCase();
      if (rawApoyos === 'SI' || rawApoyos === 'S') {
        poseeApoyos = 'SI';
        cualesApoyos = String(row.cuales_apoyos || '').trim();
        if (!cualesApoyos) {
          validationErrors.push(`Línea ${lineNum} (${dni}): 'posee_apoyos' es SI pero 'cuales_apoyos' está vacío.`);
        }
      } else {
        poseeApoyos = 'NO';
      }
    }

    const evaluacionesParsed = [];

    for (const mat of materiasInfo) {
      const ppi = !mat.isConduct ? parseBooleanValue(row[`${mat.slug}_ppi`]) : false;
      let calificacionGeneralId = '';

      if (!mat.isConduct) {
        const rawGral = row[`${mat.slug}_gral`];
        calificacionGeneralId = resolveValueId(rawGral);
        if (!calificacionGeneralId) {
          validationErrors.push(`Línea ${lineNum} (${dni}): Materia ${mat.nombre} requiere calificación general válida. Recibido: '${rawGral}'.`);
        }
      }

      const criteriosValues = [];
      for (let i = 0; i < mat.criterios.length; i++) {
        const criterioIndex = i + 1;
        const colKey = `${mat.slug}_c${criterioIndex}`;
        const rawVal = row[colKey];
        const valId = resolveValueId(rawVal);

        if (valId === null) {
          validationErrors.push(`Línea ${lineNum} (${dni}): Criterio ${colKey} (${mat.nombre}) requiere un valor válido. Recibido: '${rawVal}'.`);
        } else {
          criteriosValues.push({
            criterioId: mat.criterios[i].id,
            valorEscalaId: valId
          });
        }
      }

      evaluacionesParsed.push({
        cursoMateriaId: mat.cursoMateriaId,
        materiaNombre: mat.nombre,
        ppi,
        calificacionGeneralId,
        criterios: criteriosValues
      });
    }

    parsedRecords.push({
      lineNum,
      inscripcionId: inscripcion.id,
      dni,
      alumnoNombre: row.alumno_nombre || '',
      cierre: {
        asistencias,
        inasistencias,
        llegadasTarde,
        observaciones
      },
      apoyos: {
        poseeApoyos,
        cualesApoyos
      },
      evaluaciones: evaluacionesParsed
    });
  }

  if (validationErrors.length > 0) {
    console.error(`\n❌ Se encontraron ${validationErrors.length} errores de validación:\n`);
    validationErrors.slice(0, 20).forEach(err => console.error(`  - ${err}`));
    if (validationErrors.length > 20) {
      console.error(`  ... y ${validationErrors.length - 20} errores más.`);
    }
    console.error('\nPor favor corrija estos errores en la hoja de cálculo antes de proceder.');
    process.exit(1);
  }

  console.log(`✔ Validación completada sin errores: ${parsedRecords.length} alumnos validados para ${curso.nombre}.\n`);

  if (options.isDryRun) {
    console.log('--- REPORTE DE SIMULACIÓN (DRY-RUN) ---');
    parsedRecords.forEach(rec => {
      console.log(`✔ Alumno DNI ${rec.dni} (${rec.alumnoNombre}):`);
      console.log(`  - Cierre: ${rec.cierre.asistencias} Asist, ${rec.cierre.inasistencias} Inasist, ${rec.cierre.llegadasTarde} Tard.`);
      if (periodoNumero === 1) {
        console.log(`  - Apoyos: ${rec.apoyos.poseeApoyos} ${rec.apoyos.cualesApoyos ? `(${rec.apoyos.cualesApoyos})` : ''}`);
      }
      console.log(`  - Materias: ${rec.evaluaciones.length} completas.`);
    });
    console.log('\nSimulación finalizada exitosamente. Para persistir en la base de datos ejecute con --execute.\n');
    return;
  }

  console.log('Iniciando escritura en PocketBase...');

  let evaluacionesCreadas = 0;
  let evaluacionesActualizadas = 0;
  let criteriosPersistidos = 0;
  let cierresPersistidos = 0;

  for (const rec of parsedRecords) {
    if (periodoNumero === 1) {
      await patchRecord(options.pbUrl, token, 'inscripciones', rec.inscripcionId, {
        posee_apoyos: rec.apoyos.poseeApoyos,
        cuales_apoyos: rec.apoyos.cualesApoyos
      });
    }

    const existingCierre = await fetchAllRecords(
      options.pbUrl,
      token,
      'cierres_periodo_alumno',
      `inscripcion_id = "${rec.inscripcionId}" && periodo_id = "${periodo.id}"`
    );

    const cierrePayload = {
      inscripcion_id: rec.inscripcionId,
      periodo_id: periodo.id,
      asistencias: rec.cierre.asistencias,
      inasistencias: rec.cierre.inasistencias,
      llegadas_tarde: rec.cierre.llegadas_tarde ?? rec.cierre.llegadasTarde,
      observaciones: rec.cierre.observaciones
    };

    if (existingCierre.length > 0) {
      await patchRecord(options.pbUrl, token, 'cierres_periodo_alumno', existingCierre[0].id, cierrePayload);
    } else {
      await postRecord(options.pbUrl, token, 'cierres_periodo_alumno', cierrePayload);
    }
    cierresPersistidos++;

    for (const evalItem of rec.evaluaciones) {
      const existingEval = await fetchAllRecords(
        options.pbUrl,
        token,
        'evaluaciones_materia',
        `inscripcion_id = "${rec.inscripcionId}" && curso_materia_id = "${evalItem.cursoMateriaId}" && periodo_id = "${periodo.id}"`
      );

      let evalRecordId = '';
      const evalPayload = {
        inscripcion_id: rec.inscripcionId,
        curso_materia_id: evalItem.cursoMateriaId,
        periodo_id: periodo.id,
        ppi: evalItem.ppi,
        calificacion_general_id: evalItem.calificacionGeneralId || ''
      };

      if (existingEval.length > 0) {
        evalRecordId = existingEval[0].id;
        await patchRecord(options.pbUrl, token, 'evaluaciones_materia', evalRecordId, evalPayload);
        evaluacionesActualizadas++;
      } else {
        const created = await postRecord(options.pbUrl, token, 'evaluaciones_materia', evalPayload);
        evalRecordId = created.id;
        evaluacionesCreadas++;
      }

      const existingCrit = await fetchAllRecords(
        options.pbUrl,
        token,
        'evaluaciones_criterios',
        `evaluacion_materia_id = "${evalRecordId}"`
      );
      const critMap = new Map();
      existingCrit.forEach(c => critMap.set(c.criterio_id, c.id));

      for (const crit of evalItem.criterios) {
        if (critMap.has(crit.criterioId)) {
          const critRecordId = critMap.get(crit.criterioId);
          await patchRecord(options.pbUrl, token, 'evaluaciones_criterios', critRecordId, {
            valor_escala_id: crit.valorEscalaId
          });
        } else {
          await postRecord(options.pbUrl, token, 'evaluaciones_criterios', {
            evaluacion_materia_id: evalRecordId,
            criterio_id: crit.criterioId,
            valor_escala_id: crit.valorEscalaId
          });
        }
        criteriosPersistidos++;
      }
    }
  }

  console.log(`\n✔ Datos académicos persistidos:`);
  console.log(`  - Evaluaciones de materias: ${evaluacionesCreadas} creadas, ${evaluacionesActualizadas} actualizadas.`);
  console.log(`  - Evaluaciones de criterios: ${criteriosPersistidos} persistidas.`);
  console.log(`  - Cierres de período: ${cierresPersistidos} persistidos.`);

  const existingWorkflow = await fetchAllRecords(
    options.pbUrl,
    token,
    'instancias_carga_boletin',
    `curso_id = "${curso.id}" && periodo_id = "${periodo.id}"`
  );

  let workflowId = '';
  const nowIso = new Date().toISOString();

  if (existingWorkflow.length > 0) {
    workflowId = existingWorkflow[0].id;
    await patchRecord(options.pbUrl, token, 'instancias_carga_boletin', workflowId, {
      estado: 'CONTROL_DIRECTIVO',
      revision: (existingWorkflow[0].revision || 1) + 1,
      enviado_at: existingWorkflow[0].enviado_at || nowIso,
      enviado_por: existingWorkflow[0].enviado_por || 'Carga histórica masiva'
    });
  } else {
    const createdWorkflow = await postRecord(options.pbUrl, token, 'instancias_carga_boletin', {
      curso_id: curso.id,
      periodo_id: periodo.id,
      estado: 'CONTROL_DIRECTIVO',
      revision: 1,
      enviado_at: nowIso,
      enviado_por: 'Carga histórica masiva'
    });
    workflowId = createdWorkflow.id;
  }

  const existingUsers = await fetchAllRecords(options.pbUrl, token, 'users', '', 'created');
  const staffUserId = existingUsers.length > 0 ? existingUsers[0].id : '';

  const existingVisados = await fetchAllRecords(
    options.pbUrl,
    token,
    'visados_boletin',
    `instancia_id = "${workflowId}"`
  );
  const visadosByInscripcion = new Map();
  existingVisados.forEach(v => visadosByInscripcion.set(v.inscripcion_id, v));

  let visadosCreados = 0;
  let visadosActualizados = 0;

  const inscripcionesToVisa = inscripciones.filter(i => {
    return parsedRecords.some(r => r.inscripcionId === i.id) || i.estado !== 'Baja';
  });

  for (const inscripcion of inscripcionesToVisa) {
    if (visadosByInscripcion.has(inscripcion.id)) {
      const visado = visadosByInscripcion.get(inscripcion.id);
      const rev = Math.max(1, Number(visado.revision_contenido) || 1);
      await patchRecord(options.pbUrl, token, 'visados_boletin', visado.id, {
        estado: 'VISADO',
        generacion_visado: Math.max(1, (visado.generacion_visado || 0) + 1),
        revision_contenido: rev,
        revision_visada: rev,
        visado_at: visado.visado_at || nowIso,
        visado_por: visado.visado_por || staffUserId
      });
      visadosActualizados++;
    } else {
      await postRecord(options.pbUrl, token, 'visados_boletin', {
        instancia_id: workflowId,
        inscripcion_id: inscripcion.id,
        estado: 'VISADO',
        generacion_visado: 1,
        revision_contenido: 1,
        revision_visada: 1,
        visado_at: nowIso,
        visado_por: staffUserId
      });
      visadosCreados++;
    }
  }

  console.log(`\n✔ Workflow y visados consolidados:`);
  console.log(`  - Instancia: CONTROL_DIRECTIVO (ID: ${workflowId}).`);
  console.log(`  - Visados: ${visadosCreados} creados, ${visadosActualizados} actualizados como VISADO.`);
  console.log(`\n🎉 PROCESO FINALIZADO EXITOSAMENTE PARA ${curso.nombre} - ${periodo.nombre}.\n`);
}

run().catch((error) => {
  console.error('\n❌ Error durante la ejecución del proceso:', error);
  process.exit(1);
});
