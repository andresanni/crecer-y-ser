import fs from 'node:fs';
import path from 'node:path';

function parseCommandLineArguments() {
  const args = process.argv.slice(2);
  const options = {
    csvPath: '',
    isDryRun: true,
    pbUrl: process.env.PB_URL || 'http://127.0.0.1:8090',
    adminEmail: process.env.PB_ADMIN_EMAIL || '',
    adminPassword: process.env.PB_ADMIN_PASSWORD || ''
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--csv' && args[i + 1]) {
      options.csvPath = args[++i];
    } else if (arg === '--execute') {
      options.isDryRun = false;
    } else if (arg === '--dry-run') {
      options.isDryRun = true;
    } else if (arg === '--url' && args[i + 1]) {
      options.pbUrl = args[++i];
    } else if (arg === '--email' && args[i + 1]) {
      options.adminEmail = args[++i];
    } else if (arg === '--password' && args[i + 1]) {
      options.adminPassword = args[++i];
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

function parseCsv(content) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentToken = '';

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

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

  const rawHeaders = lines[0].map(h => h.trim());
  return lines.slice(1).map((recordRow, rowIndex) => {
    const mapped = { __lineNumber: rowIndex + 2 };
    rawHeaders.forEach((header, index) => {
      mapped[header] = recordRow[index] ?? '';
    });
    return mapped;
  });
}

const REQUIRED_HEADERS = [
  'alumno_dni',
  'alumno_apellidos',
  'alumno_nombres',
  'alumno_fecha_nacimiento',
  'alumno_sexo',
  'ciclo_ano',
  'curso_nombre',
  'numero_orden',
  'fecha_ingreso',
  'fecha_inscripcion',
  'estado_inscripcion',
  'responsable_dni_tipo',
  'responsable_dni_numero',
  'responsable_apellidos',
  'responsable_nombres'
];

const ISO_DATE_PATTERN = /^\d{4}[-/]\d{2}[-/]\d{2}$/;
const VALID_SEXO_VALUES = new Set(['Femenino', 'Masculino', 'No binario', 'Otro']);
const VALID_ESTADO_VALUES = new Set(['Regular', 'Baja', 'Libre']);
const VALID_FLAG_VALUES = new Set(['SI', 'NO', '-', '']);

function validateRow(row, rowIndex, cyclesMap, coursesMap, encounteredStudentDnis, encounteredNameKeys, warnings) {
  const errors = [];
  const line = row.__lineNumber || (rowIndex + 2);

  if (row.alumno_dni && row.alumno_dni.trim()) {
    const dni = row.alumno_dni.trim();
    if (encounteredStudentDnis.has(dni)) {
      errors.push(`Línea ${line}: 'alumno_dni' ${dni} está duplicado en el archivo (aparece antes en la línea ${encounteredStudentDnis.get(dni)}).`);
    } else {
      encounteredStudentDnis.set(dni, line);
    }
  } else {
    warnings.push(`Línea ${line}: 'alumno_dni' no especificado para "${row.alumno_apellidos}, ${row.alumno_nombres}". Se importará sin DNI para asignación posterior.`);
    const nameKey = `${(row.alumno_apellidos || '').trim().toLowerCase()}::${(row.alumno_nombres || '').trim().toLowerCase()}`;
    if (encounteredNameKeys.has(nameKey)) {
      errors.push(`Línea ${line}: Alumno sin DNI con nombre repetido '${row.alumno_apellidos}, ${row.alumno_nombres}' (aparece antes en la línea ${encounteredNameKeys.get(nameKey)}).`);
    } else {
      encounteredNameKeys.set(nameKey, line);
    }
  }

  if (!row.alumno_apellidos || !row.alumno_apellidos.trim()) {
    errors.push(`Línea ${line}: 'alumno_apellidos' es obligatorio.`);
  }

  if (!row.alumno_nombres || !row.alumno_nombres.trim()) {
    errors.push(`Línea ${line}: 'alumno_nombres' es obligatorio.`);
  }

  if (row.alumno_fecha_nacimiento && row.alumno_fecha_nacimiento.trim()) {
    const dateVal = row.alumno_fecha_nacimiento.trim();
    if (!ISO_DATE_PATTERN.test(dateVal)) {
      errors.push(`Línea ${line}: 'alumno_fecha_nacimiento' ("${dateVal}") debe tener formato YYYY-MM-DD o YYYY/MM/DD.`);
    }
  }

  if (row.alumno_sexo && row.alumno_sexo.trim()) {
    const sexoVal = row.alumno_sexo.trim();
    if (!VALID_SEXO_VALUES.has(sexoVal)) {
      errors.push(`Línea ${line}: 'alumno_sexo' ("${sexoVal}") inválido. Opciones admitidas: Femenino, Masculino, No binario, Otro.`);
    }
  }

  if (!row.ciclo_ano || !row.ciclo_ano.trim()) {
    errors.push(`Línea ${line}: 'ciclo_ano' es obligatorio.`);
  } else {
    const yearKey = String(row.ciclo_ano).trim();
    if (!cyclesMap.has(yearKey)) {
      errors.push(`Línea ${line}: 'ciclo_ano' ${yearKey} no existe en la base de datos.`);
    }
  }

  if (!row.curso_nombre || !row.curso_nombre.trim()) {
    errors.push(`Línea ${line}: 'curso_nombre' es obligatorio.`);
  } else {
    const courseKey = row.curso_nombre.trim();
    if (!coursesMap.has(courseKey)) {
      errors.push(`Línea ${line}: 'curso_nombre' "${courseKey}" no existe en la colección de cursos.`);
    }
  }

  const estado = (row.estado_inscripcion || 'Regular').trim();
  if (!VALID_ESTADO_VALUES.has(estado)) {
    errors.push(`Línea ${line}: 'estado_inscripcion' ("${estado}") inválido. Opciones admitidas: Regular, Baja, Libre.`);
  }

  if (estado === 'Baja') {
    if (!row.fecha_egreso || !row.fecha_egreso.trim()) {
      errors.push(`Línea ${line}: Cuando 'estado_inscripcion' es Baja, 'fecha_egreso' es obligatoria (YYYY-MM-DD o YYYY/MM/DD).`);
    } else if (!ISO_DATE_PATTERN.test(row.fecha_egreso.trim())) {
      errors.push(`Línea ${line}: 'fecha_egreso' ("${row.fecha_egreso.trim()}") debe tener formato YYYY-MM-DD o YYYY/MM/DD.`);
    }
  }

  ['fecha_ingreso', 'fecha_inscripcion'].forEach(field => {
    if (row[field] && row[field].trim()) {
      const val = row[field].trim();
      if (!ISO_DATE_PATTERN.test(val)) {
        errors.push(`Línea ${line}: '${field}' ("${val}") debe tener formato YYYY-MM-DD o YYYY/MM/DD.`);
      }
    }
  });

  const guardianDni = (row.responsable_dni_numero || row.responsable_dni_nnumero || '').trim();
  if (!guardianDni) {
    errors.push(`Línea ${line}: 'responsable_dni_numero' es obligatorio.`);
  }

  if (!row.responsable_apellidos || !row.responsable_apellidos.trim()) {
    errors.push(`Línea ${line}: 'responsable_apellidos' es obligatorio.`);
  }

  if (!row.responsable_nombres || !row.responsable_nombres.trim()) {
    errors.push(`Línea ${line}: 'responsable_nombres' es obligatorio.`);
  }

  ['promociono_con_acompanamiento', 'posee_apoyos'].forEach(field => {
    if (row[field] && row[field].trim()) {
      const val = row[field].trim();
      if (!VALID_FLAG_VALUES.has(val)) {
        errors.push(`Línea ${line}: '${field}' ("${val}") debe ser 'SI', 'NO', '-' o vacío.`);
      }
    }
  });

  return errors;
}

function formatDateForPocketBase(val) {
  if (!val || !val.trim()) return '';
  const trimmed = val.trim();
  if (ISO_DATE_PATTERN.test(trimmed)) {
    const normalized = trimmed.replace(/\//g, '-');
    return `${normalized} 00:00:00.000Z`;
  }
  return trimmed;
}

async function authenticatePocketBase(url, email, password) {
  const authUrl = `${url.replace(/\/+$/, '')}/api/admins/auth-with-password`;
  const response = await fetch(authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error de autenticación Admin en ${authUrl}: HTTP ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  return data.token;
}

async function fetchCollectionRecords(url, token, collectionName, filter = '') {
  let page = 1;
  const perPage = 200;
  const items = [];

  while (true) {
    const queryParams = new URLSearchParams({
      page: String(page),
      perPage: String(perPage)
    });
    if (filter) {
      queryParams.append('filter', filter);
    }

    const targetUrl = `${url.replace(/\/+$/, '')}/api/collections/${collectionName}/records?${queryParams.toString()}`;
    const response = await fetch(targetUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Error consultando ${collectionName}: HTTP ${response.status} - ${body}`);
    }

    const data = await response.json();
    items.push(...(data.items || []));

    if (page >= data.totalPages || (data.items || []).length === 0) {
      break;
    }
    page++;
  }

  return items;
}

async function postRecord(url, token, collectionName, payload) {
  const targetUrl = `${url.replace(/\/+$/, '')}/api/collections/${collectionName}/records`;
  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fallo al crear registro en ${collectionName}: HTTP ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function main() {
  const options = parseCommandLineArguments();

  if (!options.csvPath) {
    console.error('Uso: node scripts/ingest-students.mjs --csv <ruta_al_archivo.csv> [--dry-run | --execute] [--url <pb_url>] [--email <admin_email>] [--password <admin_password>]');
    process.exit(1);
  }

  const resolvedCsvPath = path.resolve(options.csvPath);
  if (!fs.existsSync(resolvedCsvPath)) {
    console.error(`No se encontró el archivo CSV en la ruta especificada: ${resolvedCsvPath}`);
    process.exit(1);
  }

  console.log('='.repeat(70));
  console.log(' PIPELINE DE INGESTA DE ESTUDIANTES Y CURSADA');
  console.log('='.repeat(70));
  console.log(`Archivo CSV:    ${resolvedCsvPath}`);
  console.log(`Modo:           ${options.isDryRun ? 'DRY-RUN (Simulación sin escrituras)' : 'EXECUTE (Inserción real en base de datos)'}`);
  console.log(`PocketBase URL: ${options.pbUrl}`);
  console.log(`Admin Email:    ${options.adminEmail}`);

  console.log('\nAutenticando contra PocketBase...');
  const token = await authenticatePocketBase(options.pbUrl, options.adminEmail, options.adminPassword);
  console.log('Autenticación exitosa.');

  console.log('\nCargando catálogos del sistema (ciclos, cursos, alumnos y responsables existentes)...');
  const [ciclos, cursos, existingAlumnos, existingResponsables, existingLinks, existingEnrollments] = await Promise.all([
    fetchCollectionRecords(options.pbUrl, token, 'ciclos_lectivos'),
    fetchCollectionRecords(options.pbUrl, token, 'cursos'),
    fetchCollectionRecords(options.pbUrl, token, 'alumnos'),
    fetchCollectionRecords(options.pbUrl, token, 'responsables'),
    fetchCollectionRecords(options.pbUrl, token, 'alumno_responable'),
    fetchCollectionRecords(options.pbUrl, token, 'inscripciones')
  ]);

  const cyclesMap = new Map();
  ciclos.forEach(c => cyclesMap.set(String(c.ano), c));

  const coursesMap = new Map();
  cursos.forEach(c => coursesMap.set(c.nombre.trim(), c));

  console.log(`- Ciclos encontrados: ${ciclos.length} (${ciclos.map(c => c.ano).join(', ')})`);
  console.log(`- Cursos encontrados: ${cursos.length} (${cursos.map(c => c.nombre).join(', ')})`);
  console.log(`- Alumnos existentes en BBDD: ${existingAlumnos.length}`);
  console.log(`- Responsables existentes en BBDD: ${existingResponsables.length}`);

  const csvContent = fs.readFileSync(resolvedCsvPath, 'utf8');
  const records = parseCsv(csvContent);
  console.log(`\nFilas detectadas en el CSV: ${records.length}`);

  if (records.length === 0) {
    console.error('El archivo CSV está vacío.');
    process.exit(1);
  }

  const rawHeaders = Object.keys(records[0]).filter(k => !k.startsWith('__'));
  console.log('Verificando encabezados obligatorios...');
  const missingHeaders = REQUIRED_HEADERS.filter(required => {
    if (required === 'responsable_dni_numero') {
      return !rawHeaders.includes('responsable_dni_numero') && !rawHeaders.includes('responsable_dni_nnumero');
    }
    return !rawHeaders.includes(required);
  });

  if (missingHeaders.length > 0) {
    console.error(`\nERROR: Faltan las siguientes columnas en el CSV:\n- ${missingHeaders.join('\n- ')}`);
    process.exit(1);
  }

  console.log('Ejecutando validación exhaustiva de filas...');
  const encounteredStudentDnis = new Map();
  const encounteredNameKeys = new Map();
  const allValidationErrors = [];
  const allValidationWarnings = [];

  records.forEach((row, index) => {
    const rowErrors = validateRow(
      row,
      index,
      cyclesMap,
      coursesMap,
      encounteredStudentDnis,
      encounteredNameKeys,
      allValidationWarnings
    );
    if (rowErrors.length > 0) {
      allValidationErrors.push(...rowErrors);
    }
  });

  if (allValidationWarnings.length > 0) {
    console.log('\n' + '-'.repeat(70));
    console.log(` AVISOS DE DATOS (${allValidationWarnings.length}):`);
    console.log('-'.repeat(70));
    allValidationWarnings.forEach(w => console.log(`  [*] ${w}`));
  }

  if (allValidationErrors.length > 0) {
    console.error('\n' + '!'.repeat(70));
    console.error(` SE DETECTARON ${allValidationErrors.length} ERRORES DE VALIDACIÓN EN EL CSV:`);
    console.error('!'.repeat(70));
    allValidationErrors.forEach(err => console.error(`  [!] ${err}`));
    console.error('\nPor favor corrija los datos en la hoja maestra y vuelva a intentar.');
    process.exit(1);
  }

  console.log('Todas las filas cumplen estrictamente los contratos de datos y relaciones.');

  if (options.isDryRun) {
    console.log('\n' + '='.repeat(70));
    console.log(' RESUMEN DEL DRY-RUN (SIMULACIÓN FINALIZADA CON ÉXITO)');
    console.log('='.repeat(70));
    console.log(`Total de registros listos para ingestar: ${records.length}`);
    console.log('Para ejecutar la inserción definitiva en PocketBase, ejecute el comando con el flag --execute:');
    console.log(`  node scripts/ingest-students.mjs --csv "${options.csvPath}" --execute`);
    return;
  }

  console.log('\n' + '='.repeat(70));
  console.log(' INICIANDO INSERCIÓN RELACIONAL EN POCKETBASE');
  console.log('='.repeat(70));

  const studentLookupMap = new Map();
  existingAlumnos.forEach(a => {
    if (a.dni) {
      studentLookupMap.set(`dni:${String(a.dni).trim()}`, a);
    }
    const nameKey = `name:${(a.apellidos || '').trim().toLowerCase()}::${(a.nombres || '').trim().toLowerCase()}`;
    studentLookupMap.set(nameKey, a);
  });

  const guardianDniToRecordMap = new Map();
  existingResponsables.forEach(r => {
    const dniNum = r.dni_numero || r.dni;
    if (dniNum) guardianDniToRecordMap.set(String(dniNum).trim(), r);
  });

  const existingLinkSet = new Set();
  existingLinks.forEach(l => {
    existingLinkSet.add(`${l.alumno_id}::${l.responsable_id}`);
  });

  const existingEnrollmentSet = new Set();
  existingEnrollments.forEach(e => {
    existingEnrollmentSet.add(`${e.alumno_id}::${e.curso_id}::${e.ciclo_id}`);
  });

  const stats = {
    guardiansCreated: 0,
    guardiansReused: 0,
    studentsCreated: 0,
    studentsReused: 0,
    linksCreated: 0,
    linksReused: 0,
    enrollmentsCreated: 0,
    enrollmentsSkipped: 0
  };

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const line = row.__lineNumber || (i + 2);
    const progress = `[${i + 1}/${records.length}]`;

    const guardianDni = (row.responsable_dni_numero || row.responsable_dni_nnumero || '').trim();
    let guardianId = '';

    if (guardianDniToRecordMap.has(guardianDni)) {
      guardianId = guardianDniToRecordMap.get(guardianDni).id;
      stats.guardiansReused++;
    } else {
      const guardianPayload = {
        dni_tipo: (row.responsable_dni_tipo || 'DNI').trim(),
        dni_numero: guardianDni,
        apellidos: (row.responsable_apellidos || '').trim(),
        nombres: (row.responsable_nombres || '').trim(),
        nacionalidad: (row.responsable_nacionalidad || '').trim(),
        profesion: (row.responsable_profesion || '').trim(),
        telefono: (row.responsable_telefono || '').trim(),
        email: (row.responsable_email || '').trim()
      };
      const createdGuardian = await postRecord(options.pbUrl, token, 'responsables', guardianPayload);
      guardianId = createdGuardian.id;
      guardianDniToRecordMap.set(guardianDni, createdGuardian);
      stats.guardiansCreated++;
    }

    const studentDni = (row.alumno_dni || '').trim();
    const lookupKey = studentDni
      ? `dni:${studentDni}`
      : `name:${(row.alumno_apellidos || '').trim().toLowerCase()}::${(row.alumno_nombres || '').trim().toLowerCase()}`;
    let studentId = '';

    if (studentLookupMap.has(lookupKey)) {
      studentId = studentLookupMap.get(lookupKey).id;
      stats.studentsReused++;
    } else {
      const studentPayload = {
        dni: studentDni,
        apellidos: (row.alumno_apellidos || '').trim(),
        nombres: (row.alumno_nombres || '').trim(),
        numero_legajo: (row.alumno_legajo || '').trim(),
        fecha_nacimiento: formatDateForPocketBase(row.alumno_fecha_nacimiento),
        sexo: (row.alumno_sexo || '').trim(),
        nacionalidad: (row.alumno_nacionalidad || '').trim(),
        domicilio: (row.alumno_domicilio || '').trim(),
        localidad: (row.alumno_localidad || '').trim(),
        usuario_acadeu: (row.alumno_usuario_acadeu || '').trim(),
        clave_acadeu: (row.alumno_clave_acadeu || '').trim()
      };
      const createdStudent = await postRecord(options.pbUrl, token, 'alumnos', studentPayload);
      studentId = createdStudent.id;
      studentLookupMap.set(lookupKey, createdStudent);
      if (studentDni) {
        studentLookupMap.set(`name:${(row.alumno_apellidos || '').trim().toLowerCase()}::${(row.alumno_nombres || '').trim().toLowerCase()}`, createdStudent);
      }
      stats.studentsCreated++;
    }

    const linkKey = `${studentId}::${guardianId}`;
    if (existingLinkSet.has(linkKey)) {
      stats.linksReused++;
    } else {
      const linkPayload = {
        alumno_id: studentId,
        responsable_id: guardianId,
        vinculo: (row.responsable_vinculo || 'Padre').trim()
      };
      await postRecord(options.pbUrl, token, 'alumno_responable', linkPayload);
      existingLinkSet.add(linkKey);
      stats.linksCreated++;
    }

    const courseRecord = coursesMap.get(row.curso_nombre.trim());
    const cycleRecord = cyclesMap.get(String(row.ciclo_ano).trim());

    const enrollmentKey = `${studentId}::${courseRecord.id}::${cycleRecord.id}`;
    if (existingEnrollmentSet.has(enrollmentKey)) {
      stats.enrollmentsSkipped++;
    } else {
      const enrollmentPayload = {
        alumno_id: studentId,
        curso_id: courseRecord.id,
        ciclo_id: cycleRecord.id,
        numero_orden: row.numero_orden ? parseInt(row.numero_orden, 10) : null,
        numero_inscripcion: (row.numero_inscripcion || '').trim(),
        fecha_ingreso: formatDateForPocketBase(row.fecha_ingreso),
        fecha_inscripcion: formatDateForPocketBase(row.fecha_inscripcion),
        fecha_egreso: formatDateForPocketBase(row.fecha_egreso),
        estado: (row.estado_inscripcion || 'Regular').trim(),
        promociono_con_acompanamiento: (row.promociono_con_acompanamiento || '').trim(),
        posee_apoyos: (row.posee_apoyos || '').trim(),
        cuales_apoyos: (row.cuales_apoyos || '').trim()
      };
      await postRecord(options.pbUrl, token, 'inscripciones', enrollmentPayload);
      existingEnrollmentSet.add(enrollmentKey);
      stats.enrollmentsCreated++;
    }

    console.log(`${progress} Línea ${line}: ${row.alumno_apellidos}, ${row.alumno_nombres} (${courseRecord.nombre}) -> OK`);
  }

  console.log('\n' + '='.repeat(70));
  console.log(' INGESTA COMPLETADA EXITOSAMENTE');
  console.log('='.repeat(70));
  console.log(`- Alumnos creados:        ${stats.studentsCreated} (reutilizados existentes: ${stats.studentsReused})`);
  console.log(`- Responsables creados:   ${stats.guardiansCreated} (reutilizados existentes: ${stats.guardiansReused})`);
  console.log(`- Vínculos creados:       ${stats.linksCreated} (existentes previos: ${stats.linksReused})`);
  console.log(`- Inscripciones creadas:  ${stats.enrollmentsCreated} (omitidas por ya existir: ${stats.enrollmentsSkipped})`);
}

main().catch(err => {
  console.error('\nERROR DURANTE LA EJECUCIÓN:');
  console.error(err.message || err);
  process.exit(1);
});
