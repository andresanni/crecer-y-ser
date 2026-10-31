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

function normalizeCourseName(name) {
  if (!name) return '';
  const trimmed = String(name).trim();
  const normalized = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');

  if (/^sala (?:de )?2 y 3(?: anos)?$/i.test(normalized)) {
    return 'Sala de 2 y 3 años';
  }
  if (/^sala (?:de )?4 y 5(?: anos)?$/i.test(normalized)) {
    return 'Sala de 4 y 5 años';
  }
  return trimmed;
}

function normalizeModalidadJornada(rawVal) {
  if (rawVal === undefined || rawVal === null) {
    return { value: '', isValid: true };
  }
  const trimmed = String(rawVal).trim();
  if (!trimmed) {
    return { value: '', isValid: true };
  }
  const normalized = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');

  if (['manana', 'turno manana', 'tm', 'simple'].includes(normalized)) {
    return { value: 'Mañana', isValid: true };
  }
  if (['jornada completa', 'completa', 'jc'].includes(normalized)) {
    return { value: 'Jornada Completa', isValid: true };
  }
  if (['tarde', 'turno tarde', 'tt'].includes(normalized)) {
    return { value: 'Tarde', isValid: true };
  }

  return { value: trimmed, isValid: false };
}

function hasAnyGuardian2Field(row) {
  const fields = [
    'responsable2_dni_tipo',
    'responsable2_dni_numero',
    'responsable2_dni_nnumero',
    'responsable2_apellidos',
    'responsable2_nombres',
    'responsable2_vinculo',
    'responsable2_nacionalidad',
    'responsable2_profesion',
    'responsable2_telefono',
    'responsable2_email'
  ];
  return fields.some(field => row[field] !== undefined && String(row[field]).trim().length > 0);
}

function normalizePersonName(val) {
  return (val || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeBirthDate(val) {
  if (!val) return '';
  const trimmed = String(val).trim();
  const match = trimmed.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return trimmed;
}

function buildStudentCompositeKey(apellidos, nombres, fechaNacimiento) {
  return `${normalizePersonName(apellidos)}|${normalizePersonName(nombres)}|${normalizeBirthDate(fechaNacimiento)}`;
}

function generateIngestionSummary(records) {
  const courseCounts = new Map();
  let morningCount = 0;
  let fullDayCount = 0;
  let afternoonCount = 0;
  let unspecifiedJornadaCount = 0;
  let twoGuardiansCount = 0;
  let oneGuardianCount = 0;
  let withoutDniCount = 0;
  let withoutLegajoCount = 0;
  let withoutDniOrLegajoCount = 0;

  for (const row of records) {
    const courseName = row.curso_nombre || 'Sin curso';
    courseCounts.set(courseName, (courseCounts.get(courseName) || 0) + 1);

    const rawJornada = row.modalidad_jornada ?? row.jornada;
    const normalizedJornada = normalizeModalidadJornada(rawJornada).value;
    if (normalizedJornada === 'Mañana') {
      morningCount++;
    } else if (normalizedJornada === 'Jornada Completa') {
      fullDayCount++;
    } else if (normalizedJornada === 'Tarde') {
      afternoonCount++;
    } else {
      unspecifiedJornadaCount++;
    }

    if (hasAnyGuardian2Field(row)) {
      twoGuardiansCount++;
    } else {
      oneGuardianCount++;
    }

    const hasDni = Boolean(row.alumno_dni && String(row.alumno_dni).trim());
    const hasLegajo = Boolean(row.alumno_legajo && String(row.alumno_legajo).trim());

    if (!hasDni) {
      withoutDniCount++;
    }
    if (!hasLegajo) {
      withoutLegajoCount++;
    }
    if (!hasDni || !hasLegajo) {
      withoutDniOrLegajoCount++;
    }
  }

  return {
    total: records.length,
    courseCounts,
    morningCount,
    fullDayCount,
    afternoonCount,
    unspecifiedJornadaCount,
    twoGuardiansCount,
    oneGuardianCount,
    withoutDniCount,
    withoutLegajoCount,
    withoutDniOrLegajoCount
  };
}

function printSummaryDetails(summary) {
  console.log(`Total de registros: ${summary.total}`);

  console.log('\nDesglose de alumnos por curso/sala:');
  for (const [course, count] of summary.courseCounts.entries()) {
    console.log(`  - ${course}: ${count}`);
  }

  console.log('\nModalidad de jornada:');
  console.log(`  - Turno Mañana: ${summary.morningCount}`);
  console.log(`  - Jornada Completa: ${summary.fullDayCount}`);
  if (summary.afternoonCount > 0) {
    console.log(`  - Turno Tarde: ${summary.afternoonCount}`);
  }
  if (summary.unspecifiedJornadaCount > 0) {
    console.log(`  - Sin especificar: ${summary.unspecifiedJornadaCount}`);
  }

  console.log('\nResponsables / Tutores:');
  console.log(`  - Alumnos con 2 tutores vinculados: ${summary.twoGuardiansCount}`);
  console.log(`  - Alumnos con 1 tutor vinculado: ${summary.oneGuardianCount}`);

  console.log('\nDocumentación y legajos:');
  console.log(`  - Alumnos sin DNI: ${summary.withoutDniCount}`);
  console.log(`  - Alumnos sin legajo: ${summary.withoutLegajoCount}`);
  console.log(`  - Alumnos sin legajo o sin DNI: ${summary.withoutDniOrLegajoCount}`);
}

const REQUIRED_HEADERS = [
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

function validateRow(row, rowIndex, cyclesMap, coursesMap, encounteredStudentDnis, encounteredCompositeKeys, warnings) {
  const errors = [];
  const line = row.__lineNumber || (rowIndex + 2);
  const compositeKey = buildStudentCompositeKey(row.alumno_apellidos, row.alumno_nombres, row.alumno_fecha_nacimiento);

  if (row.alumno_dni && String(row.alumno_dni).trim()) {
    const dni = String(row.alumno_dni).trim();
    if (encounteredStudentDnis.has(dni)) {
      errors.push(`Línea ${line}: 'alumno_dni' ${dni} está duplicado en el archivo (aparece antes en la línea ${encounteredStudentDnis.get(dni)}).`);
    } else {
      encounteredStudentDnis.set(dni, line);
    }
    if (encounteredCompositeKeys.has(compositeKey)) {
      errors.push(`Línea ${line}: Alumno con datos repetidos '${row.alumno_apellidos}, ${row.alumno_nombres}' (${row.alumno_fecha_nacimiento || 'sin fecha'}) (aparece antes en la línea ${encounteredCompositeKeys.get(compositeKey)}).`);
    } else {
      encounteredCompositeKeys.set(compositeKey, line);
    }
  } else {
    warnings.push(`Línea ${line}: 'alumno_dni' no especificado para "${row.alumno_apellidos}, ${row.alumno_nombres}". Se importará sin DNI para asignación posterior.`);
    if (encounteredCompositeKeys.has(compositeKey)) {
      errors.push(`Línea ${line}: Alumno sin DNI con datos repetidos '${row.alumno_apellidos}, ${row.alumno_nombres}' (${row.alumno_fecha_nacimiento || 'sin fecha'}) (aparece antes en la línea ${encounteredCompositeKeys.get(compositeKey)}).`);
    } else {
      encounteredCompositeKeys.set(compositeKey, line);
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

  const rawJornada = row.modalidad_jornada ?? row.jornada;
  const normalizedJornada = normalizeModalidadJornada(rawJornada);
  if (!normalizedJornada.isValid) {
    errors.push(`Línea ${line}: 'modalidad_jornada' ("${normalizedJornada.value}") inválido. Opciones admitidas: Mañana, Jornada Completa, Tarde o vacío.`);
  } else {
    row.modalidad_jornada = normalizedJornada.value;
  }

  const guardian1Dni = (row.responsable_dni_numero || row.responsable_dni_nnumero || '').trim();
  if (!guardian1Dni) {
    errors.push(`Línea ${line}: 'responsable_dni_numero' es obligatorio.`);
  }

  if (!row.responsable_apellidos || !row.responsable_apellidos.trim()) {
    errors.push(`Línea ${line}: 'responsable_apellidos' es obligatorio.`);
  }

  if (!row.responsable_nombres || !row.responsable_nombres.trim()) {
    errors.push(`Línea ${line}: 'responsable_nombres' es obligatorio.`);
  }

  if (hasAnyGuardian2Field(row)) {
    const guardian2Dni = (row.responsable2_dni_numero || row.responsable2_dni_nnumero || '').trim();
    if (!guardian2Dni) {
      errors.push(`Línea ${line}: Si se informa el segundo responsable, 'responsable2_dni_numero' es obligatorio.`);
    }

    if (!row.responsable2_apellidos || !row.responsable2_apellidos.trim()) {
      errors.push(`Línea ${line}: Si se informa el segundo responsable, 'responsable2_apellidos' es obligatorio.`);
    }

    if (!row.responsable2_nombres || !row.responsable2_nombres.trim()) {
      errors.push(`Línea ${line}: Si se informa el segundo responsable, 'responsable2_nombres' es obligatorio.`);
    }

    if (guardian2Dni && guardian1Dni && guardian2Dni === guardian1Dni) {
      errors.push(`Línea ${line}: El DNI del segundo responsable ("${guardian2Dni}") no puede ser idéntico al del primer responsable en la misma fila.`);
    }
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

async function patchRecord(url, token, collectionName, id, payload) {
  const targetUrl = `${url.replace(/\/+$/, '')}/api/collections/${collectionName}/records/${id}`;
  const response = await fetch(targetUrl, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fallo al actualizar registro en ${collectionName}: HTTP ${response.status} - ${errorText}`);
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
  cursos.forEach(c => {
    coursesMap.set(c.nombre.trim(), c);
    coursesMap.set(normalizeCourseName(c.nombre), c);
  });

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
  const encounteredCompositeKeys = new Map();
  const allValidationErrors = [];
  const allValidationWarnings = [];

  records.forEach((row, index) => {
    row.curso_nombre = normalizeCourseName(row.curso_nombre);
    const rowErrors = validateRow(
      row,
      index,
      cyclesMap,
      coursesMap,
      encounteredStudentDnis,
      encounteredCompositeKeys,
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

  const summary = generateIngestionSummary(records);

  if (options.isDryRun) {
    console.log('\n' + '='.repeat(70));
    console.log(' RESUMEN DEL DRY-RUN (SIMULACIÓN FINALIZADA CON ÉXITO)');
    console.log('='.repeat(70));
    printSummaryDetails(summary);
    console.log('\n' + '-'.repeat(70));
    console.log('Para ejecutar la inserción definitiva en PocketBase, ejecute el comando con el flag --execute:');
    console.log(`  node scripts/ingest-students.mjs --csv "${options.csvPath}" --execute`);
    return;
  }

  console.log('\n' + '='.repeat(70));
  console.log(' INICIANDO INSERCIÓN RELACIONAL EN POCKETBASE');
  console.log('='.repeat(70));

  const studentLookupMap = new Map();
  existingAlumnos.forEach(a => {
    if (a.dni && String(a.dni).trim()) {
      studentLookupMap.set(`dni:${String(a.dni).trim()}`, a);
    }
    const compositeKey = `composite:${buildStudentCompositeKey(a.apellidos, a.nombres, a.fecha_nacimiento)}`;
    studentLookupMap.set(compositeKey, a);
  });

  const guardiansByDni = new Map();
  existingResponsables.forEach(r => {
    const dniNum = r.dni_numero || r.dni;
    if (dniNum && String(dniNum).trim()) {
      guardiansByDni.set(String(dniNum).trim(), r);
    }
  });

  const existingLinkSet = new Set();
  existingLinks.forEach(l => {
    existingLinkSet.add(`${l.alumno_id}::${l.responsable_id}`);
  });

  const existingEnrollmentMap = new Map();
  existingEnrollments.forEach(e => {
    existingEnrollmentMap.set(`${e.alumno_id}::${e.curso_id}::${e.ciclo_id}`, e);
  });

  const stats = {
    guardiansCreated: 0,
    guardiansReused: 0,
    studentsCreated: 0,
    studentsReused: 0,
    linksCreated: 0,
    linksReused: 0,
    enrollmentsCreated: 0,
    enrollmentsUpdated: 0,
    enrollmentsSkipped: 0
  };

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const line = row.__lineNumber || (i + 2);
    const progress = `[${i + 1}/${records.length}]`;

    const guardian1Dni = (row.responsable_dni_numero || row.responsable_dni_nnumero || '').trim();
    let guardian1Id = '';

    if (guardiansByDni.has(guardian1Dni)) {
      guardian1Id = guardiansByDni.get(guardian1Dni).id;
      stats.guardiansReused++;
    } else {
      const guardian1Payload = {
        dni_tipo: (row.responsable_dni_tipo || 'DNI').trim(),
        dni_numero: guardian1Dni,
        apellidos: (row.responsable_apellidos || '').trim(),
        nombres: (row.responsable_nombres || '').trim(),
        nacionalidad: (row.responsable_nacionalidad || '').trim(),
        profesion: (row.responsable_profesion || '').trim(),
        telefono: (row.responsable_telefono || '').trim(),
        email: (row.responsable_email || '').trim()
      };
      const createdGuardian1 = await postRecord(options.pbUrl, token, 'responsables', guardian1Payload);
      guardian1Id = createdGuardian1.id;
      guardiansByDni.set(guardian1Dni, createdGuardian1);
      stats.guardiansCreated++;
    }

    const studentDni = (row.alumno_dni || '').trim();
    const compositeLookupKey = `composite:${buildStudentCompositeKey(row.alumno_apellidos, row.alumno_nombres, row.alumno_fecha_nacimiento)}`;
    const dniLookupKey = studentDni ? `dni:${studentDni}` : null;

    let studentRecord = null;
    if (dniLookupKey && studentLookupMap.has(dniLookupKey)) {
      studentRecord = studentLookupMap.get(dniLookupKey);
    } else if (studentLookupMap.has(compositeLookupKey)) {
      studentRecord = studentLookupMap.get(compositeLookupKey);
    }

    let studentId = '';
    if (studentRecord) {
      studentId = studentRecord.id;
      if (!studentRecord.dni && studentDni) {
        await patchRecord(options.pbUrl, token, 'alumnos', studentRecord.id, { dni: studentDni });
        studentRecord.dni = studentDni;
        studentLookupMap.set(`dni:${studentDni}`, studentRecord);
      }
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
      if (dniLookupKey) {
        studentLookupMap.set(dniLookupKey, createdStudent);
      }
      studentLookupMap.set(compositeLookupKey, createdStudent);
      stats.studentsCreated++;
    }

    const link1Key = `${studentId}::${guardian1Id}`;
    if (existingLinkSet.has(link1Key)) {
      stats.linksReused++;
    } else {
      const link1Payload = {
        alumno_id: studentId,
        responsable_id: guardian1Id,
        vinculo: (row.responsable_vinculo || 'Padre').trim()
      };
      await postRecord(options.pbUrl, token, 'alumno_responable', link1Payload);
      existingLinkSet.add(link1Key);
      stats.linksCreated++;
    }

    if (hasAnyGuardian2Field(row)) {
      const guardian2Dni = (row.responsable2_dni_numero || row.responsable2_dni_nnumero || '').trim();
      let guardian2Id = '';

      if (guardiansByDni.has(guardian2Dni)) {
        guardian2Id = guardiansByDni.get(guardian2Dni).id;
        stats.guardiansReused++;
      } else {
        const guardian2Payload = {
          dni_tipo: (row.responsable2_dni_tipo || 'DNI').trim(),
          dni_numero: guardian2Dni,
          apellidos: (row.responsable2_apellidos || '').trim(),
          nombres: (row.responsable2_nombres || '').trim(),
          nacionalidad: (row.responsable2_nacionalidad || '').trim(),
          profesion: (row.responsable2_profesion || '').trim(),
          telefono: (row.responsable2_telefono || '').trim(),
          email: (row.responsable2_email || '').trim()
        };
        const createdGuardian2 = await postRecord(options.pbUrl, token, 'responsables', guardian2Payload);
        guardian2Id = createdGuardian2.id;
        guardiansByDni.set(guardian2Dni, createdGuardian2);
        stats.guardiansCreated++;
      }

      const link2Key = `${studentId}::${guardian2Id}`;
      if (existingLinkSet.has(link2Key)) {
        stats.linksReused++;
      } else {
        const link2Payload = {
          alumno_id: studentId,
          responsable_id: guardian2Id,
          vinculo: (row.responsable2_vinculo || 'Madre').trim()
        };
        await postRecord(options.pbUrl, token, 'alumno_responable', link2Payload);
        existingLinkSet.add(link2Key);
        stats.linksCreated++;
      }
    }

    const courseRecord = coursesMap.get(row.curso_nombre.trim());
    const cycleRecord = cyclesMap.get(String(row.ciclo_ano).trim());

    const enrollmentKey = `${studentId}::${courseRecord.id}::${cycleRecord.id}`;
    const rawJornada = row.modalidad_jornada ?? row.jornada;
    const jornadaResult = normalizeModalidadJornada(rawJornada);
    const jornadaValue = jornadaResult.value;

    if (existingEnrollmentMap.has(enrollmentKey)) {
      const existingEnrollment = existingEnrollmentMap.get(enrollmentKey);
      const currentJornada = existingEnrollment.modalidad_jornada || '';
      const hasDifferentJornada = (jornadaValue || currentJornada) && currentJornada !== jornadaValue;

      if (hasDifferentJornada) {
        await patchRecord(options.pbUrl, token, 'inscripciones', existingEnrollment.id, {
          modalidad_jornada: jornadaValue
        });
        existingEnrollment.modalidad_jornada = jornadaValue;
        stats.enrollmentsUpdated++;
      } else {
        stats.enrollmentsSkipped++;
      }
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
        cuales_apoyos: (row.cuales_apoyos || '').trim(),
        modalidad_jornada: jornadaValue
      };
      const createdEnrollment = await postRecord(options.pbUrl, token, 'inscripciones', enrollmentPayload);
      existingEnrollmentMap.set(enrollmentKey, createdEnrollment);
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
  console.log(`- Inscripciones creadas:  ${stats.enrollmentsCreated} (actualizadas: ${stats.enrollmentsUpdated}, omitidas por ya existir: ${stats.enrollmentsSkipped})`);
  console.log('\n' + '-'.repeat(70));
  printSummaryDetails(summary);
}

main().catch(err => {
  console.error('\nERROR DURANTE LA EJECUCIÓN:');
  console.error(err.message || err);
  process.exit(1);
});
