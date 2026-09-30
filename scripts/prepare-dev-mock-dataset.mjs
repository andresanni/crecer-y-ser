import fs from 'node:fs';
import path from 'node:path';

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const CREDENTIALS_PATH = process.env.CREDENTIALS_PATH || 'C:\\pocketbase\\dev-credentials.txt';

function readDevCredentials() {
  const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
  const values = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    values[key] = rest.join('=');
  }
  return values;
}

async function authenticateAdmin() {
  const creds = readDevCredentials();
  const response = await fetch(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: creds.ADMIN_EMAIL,
      password: creds.ADMIN_PASSWORD
    })
  });
  if (!response.ok) {
    throw new Error(`Error de autenticacion admin: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  return data.token;
}

async function request(endpoint, options = {}, token) {
  const url = `${POCKETBASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: token } : {}),
    ...options.headers
  };
  const response = await fetch(url, { ...options, headers });
  if (response.status === 204) return null;
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Fallo ${options.method || 'GET'} ${endpoint}: ${response.status} ${JSON.stringify(json)}`);
  }
  return json;
}

async function fetchAll(endpoint, token) {
  let page = 1;
  const perPage = 100;
  const items = [];
  while (true) {
    const data = await request(`${endpoint}?page=${page}&perPage=${perPage}`, { method: 'GET' }, token);
    items.push(...data.items);
    if (page >= data.totalPages) break;
    page += 1;
  }
  return items;
}

const COURSES_INFO = [
  { grade: '1°', birthYear: 2019 },
  { grade: '2°', birthYear: 2018 },
  { grade: '3°', birthYear: 2017 },
  { grade: '4°', birthYear: 2016 },
  { grade: '5°', birthYear: 2015 },
  { grade: '6°', birthYear: 2014 },
  { grade: '7°', birthYear: 2013 }
];

const MOCK_SURNAMES = [
  'Gómez', 'Fernández', 'Romero', 'Díaz', 'Álvarez', 'Torres', 'Ruiz', 'Ramírez',
  'Flores', 'Acosta', 'Benítez', 'Medina', 'Herrera', 'Aguirre', 'Pereyra', 'Gutiérrez',
  'Giménez', 'Molina', 'Silva', 'Castro', 'Rojas', 'Ortiz', 'Núñez', 'Luna',
  'Juárez', 'Cabrera', 'Ríos', 'Morales', 'Godoy', 'Moreno', 'Ferreyra', 'Domínguez',
  'Carrizo', 'Peralta', 'Castillo', 'Ledesma', 'Quiroga', 'Vega', 'Vera', 'Muñoz',
  'Ojeda', 'Ponce', 'Villalba', 'Cardozo', 'Navarro', 'Coronel', 'Vázquez', 'Ramos',
  'Bustos', 'Sosa', 'Mendoza', 'Franco', 'Figueroa', 'Rossi', 'Maldonado', 'Mansilla',
  'Barrios', 'Paz', 'Cruz', 'Valdez', 'Farías', 'Solís', 'Salvatierra', 'Correa',
  'Bravo', 'Santillán', 'Arce', 'Ibáñez', 'Soria', 'Paredes', 'Leiva', 'Galarza'
];

const MOCK_NAMES_M = [
  'Lucas', 'Mateo', 'Thiago', 'Joaquín', 'Santiago', 'Agustín', 'Benjamín', 'Tomás',
  'Lautaro', 'Felipe', 'Bautista', 'Nicolás', 'Ignacio', 'Facundo', 'Valentín', 'Santino',
  'Julián', 'Martín', 'Gabriel', 'Maximiliano', 'Manuel', 'Emiliano', 'Matías', 'Franco'
];

const MOCK_NAMES_F = [
  'Martina', 'Valentina', 'Emma', 'Mía', 'Catalina', 'Sofía', 'Lucía', 'Olivia',
  'Delfina', 'Elena', 'Emilia', 'Isabella', 'Alma', 'Victoria', 'Zoe', 'Camila',
  'Julieta', 'Renata', 'Paula', 'Abril', 'Clara', 'Bianca', 'Pilar', 'Florencia'
];

const GUARDIAN_NAMES_M = [
  'Carlos', 'Jorge', 'Alejandro', 'Mariano', 'Gonzalo', 'Hernán', 'Sebastián', 'Diego',
  'Pablo', 'Gustavo', 'Fernando', 'Rodrigo', 'Federico', 'Claudio', 'Esteban', 'Javier'
];

const GUARDIAN_NAMES_F = [
  'Mariana', 'Lorena', 'Silvina', 'Andrea', 'Natalia', 'Verónica', 'Carolina', 'Patricia',
  'Marcela', 'Gabriela', 'Romina', 'Cecilia', 'Valeria', 'Daniela', 'Claudia', 'Laura'
];

async function run() {
  const token = await authenticateAdmin();
  const allStudents = await fetchAll('/api/collections/alumnos/records', token);
  const allGuardians = await fetchAll('/api/collections/responsables/records', token);
  const allLinks = await fetchAll('/api/collections/alumno_responable/records', token);
  const allEnrollments = await fetchAll('/api/collections/inscripciones/records', token);
  const allCourses = await fetchAll('/api/collections/cursos/records', token);
  const allCycles = await fetchAll('/api/collections/ciclos_lectivos/records', token);

  const activeCycle = allCycles.find((c) => c.actual) || allCycles[0];
  if (!activeCycle) throw new Error('No se encontro un ciclo lectivo activo.');

  const realStudents = allStudents.filter((student) => {
    const isMockDni = student.dni && (student.dni.startsWith('9000') || student.dni === '12345667');
    const isMockNamed = student.apellidos.toLowerCase().includes('prueba') || student.nombres.toLowerCase().includes('prueba');
    const isSyntheticLegajo = student.numero_legajo && student.numero_legajo.startsWith('DEV-L-');
    return !isMockDni && !isMockNamed && !isSyntheticLegajo;
  });

  const realStudentIds = new Set(realStudents.map((s) => s.id));
  const realLinks = allLinks.filter((l) => realStudentIds.has(l.alumno_id));
  const realEnrollments = allEnrollments.filter((e) => realStudentIds.has(e.alumno_id));
  const linkedGuardianIds = new Set(realLinks.map((l) => l.responsable_id));
  const mockLinks = allLinks.filter((l) => !realStudentIds.has(l.alumno_id));
  const mockGuardianIds = new Set(mockLinks.map((l) => l.responsable_id));
  const exclusivelyRealGuardianIds = Array.from(linkedGuardianIds).filter((id) => !mockGuardianIds.has(id));

  for (const enrollment of realEnrollments) {
    await request(`/api/collections/inscripciones/records/${enrollment.id}`, { method: 'DELETE' }, token);
  }
  for (const link of realLinks) {
    await request(`/api/collections/alumno_responable/records/${link.id}`, { method: 'DELETE' }, token);
  }
  for (const guardianId of exclusivelyRealGuardianIds) {
    await request(`/api/collections/responsables/records/${guardianId}`, { method: 'DELETE' }, token);
  }
  for (const student of realStudents) {
    await request(`/api/collections/alumnos/records/${student.id}`, { method: 'DELETE' }, token);
  }

  const remainingStudents = await fetchAll('/api/collections/alumnos/records', token);
  const remainingEnrollments = await fetchAll('/api/collections/inscripciones/records', token);

  const courseMap = new Map();
  for (const course of allCourses) {
    courseMap.set(course.nombre.trim(), course);
  }

  let highestLegajoNumber = 17;
  for (const student of remainingStudents) {
    if (student.numero_legajo && student.numero_legajo.startsWith('DEV-L-')) {
      const num = parseInt(student.numero_legajo.replace('DEV-L-', ''), 10);
      if (!Number.isNaN(num) && num > highestLegajoNumber) {
        highestLegajoNumber = num;
      }
    }
  }

  let nextStudentNumber = highestLegajoNumber + 1;
  const targetPerGrade = 12;

  for (const courseInfo of COURSES_INFO) {
    const course = courseMap.get(courseInfo.grade);
    if (!course) throw new Error(`Curso no encontrado: ${courseInfo.grade}`);

    const existingEnrollmentsForCourse = remainingEnrollments
      .filter((e) => e.curso_id === course.id && e.ciclo_id === activeCycle.id)
      .sort((a, b) => (a.numero_orden || 0) - (b.numero_orden || 0));

    let currentOrder = 1;
    for (const enrollment of existingEnrollmentsForCourse) {
      if (enrollment.numero_orden !== currentOrder) {
        await request(`/api/collections/inscripciones/records/${enrollment.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ numero_orden: currentOrder })
        }, token);
      }
      currentOrder += 1;
    }

    const studentsNeeded = targetPerGrade - existingEnrollmentsForCourse.length;

    for (let i = 0; i < studentsNeeded; i += 1) {
      const studentIndex = nextStudentNumber;
      nextStudentNumber += 1;

      const isMale = studentIndex % 2 === 0;
      const surname = MOCK_SURNAMES[(studentIndex - 1) % MOCK_SURNAMES.length];
      const firstName = isMale
        ? MOCK_NAMES_M[(studentIndex - 1) % MOCK_NAMES_M.length]
        : MOCK_NAMES_F[(studentIndex - 1) % MOCK_NAMES_F.length];

      const emptyDniCases = studentIndex === 83 || studentIndex === 84;
      const dni = emptyDniCases ? '' : `9${String(studentIndex).padStart(7, '0')}`;
      const legajo = `DEV-L-${String(studentIndex).padStart(4, '0')}`;

      const birthMonth = String(((studentIndex * 3) % 12) + 1).padStart(2, '0');
      const birthDay = String(((studentIndex * 7) % 27) + 1).padStart(2, '0');
      const birthDate = `${courseInfo.birthYear}-${birthMonth}-${birthDay} 12:00:00.000Z`;

      const studentRecord = await request('/api/collections/alumnos/records', {
        method: 'POST',
        body: JSON.stringify({
          numero_legajo: legajo,
          dni,
          apellidos: surname,
          nombres: firstName,
          fecha_nacimiento: birthDate,
          sexo: isMale ? 'M' : 'F',
          nacionalidad: 'Argentina',
          domicilio: `Calle Falsa ${100 + studentIndex}`,
          localidad: 'General San Martín'
        })
      }, token);

      const guardianSurname = studentIndex % 3 === 0 ? MOCK_SURNAMES[(studentIndex + 5) % MOCK_SURNAMES.length] : surname;
      const guardianIsMale = studentIndex % 2 !== 0;
      const guardianName = guardianIsMale
        ? GUARDIAN_NAMES_M[(studentIndex - 1) % GUARDIAN_NAMES_M.length]
        : GUARDIAN_NAMES_F[(studentIndex - 1) % GUARDIAN_NAMES_F.length];

      const guardianRecord = await request('/api/collections/responsables/records', {
        method: 'POST',
        body: JSON.stringify({
          dni_tipo: 'DNI',
          dni_numero: `8${String(studentIndex).padStart(7, '0')}`,
          apellidos: guardianSurname,
          nombres: guardianName,
          nacionalidad: 'Argentina',
          profesion: 'Empleado/a',
          telefono: `11-${4000 + studentIndex}-${5000 + studentIndex}`,
          email: `tutor${studentIndex}@creceryser.local`
        })
      }, token);

      await request('/api/collections/alumno_responable/records', {
        method: 'POST',
        body: JSON.stringify({
          alumno_id: studentRecord.id,
          responsable_id: guardianRecord.id,
          vinculo: guardianIsMale ? 'Padre' : 'Madre'
        })
      }, token);

      const isBaja = studentIndex === 33 || studentIndex === 55 || studentIndex === 77;
      const isLibre = studentIndex === 82;
      const status = isBaja ? 'Baja' : isLibre ? 'Libre' : 'Regular';

      await request('/api/collections/inscripciones/records', {
        method: 'POST',
        body: JSON.stringify({
          alumno_id: studentRecord.id,
          curso_id: course.id,
          ciclo_id: activeCycle.id,
          numero_orden: currentOrder,
          numero_inscripcion: `DEV-I-${String(studentIndex).padStart(4, '0')}`,
          estado: status,
          fecha_ingreso: '2026-03-02 08:00:00.000Z',
          fecha_egreso: isBaja ? '2026-05-15 12:00:00.000Z' : '',
          promociono_con_acompanamiento: '-',
          posee_apoyos: '-'
        })
      }, token);

      currentOrder += 1;
    }
  }

  const finalStudents = await fetchAll('/api/collections/alumnos/records', token);
  const finalEnrollments = await fetchAll('/api/collections/inscripciones/records', token);
  const finalGuardians = await fetchAll('/api/collections/responsables/records', token);
  const finalLinks = await fetchAll('/api/collections/alumno_responable/records', token);

  const gradeCounts = {};
  for (const courseInfo of COURSES_INFO) {
    const course = courseMap.get(courseInfo.grade);
    const count = finalEnrollments.filter((e) => e.curso_id === course.id && e.ciclo_id === activeCycle.id).length;
    gradeCounts[courseInfo.grade] = count;
  }

  const statusCounts = {};
  for (const enrollment of finalEnrollments) {
    statusCounts[enrollment.estado] = (statusCounts[enrollment.estado] || 0) + 1;
  }

  const results = {
    realStudentsRemoved: realStudents.length,
    realEnrollmentsRemoved: realEnrollments.length,
    realLinksRemoved: realLinks.length,
    realGuardiansRemoved: exclusivelyRealGuardianIds.length,
    totalFinalStudents: finalStudents.length,
    totalFinalEnrollments: finalEnrollments.length,
    totalFinalGuardians: finalGuardians.length,
    totalFinalLinks: finalLinks.length,
    studentsPerGrade: gradeCounts,
    enrollmentStatusCounts: statusCounts
  };

  console.log(JSON.stringify(results, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
