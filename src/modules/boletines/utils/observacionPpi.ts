const PPI_OBSERVATION_PREFIX =
  'Los contenidos a trabajar en las áreas con PPI corresponden, según el Diseño Curricular vigente, a ';
const PPI_OBSERVATION_SUFFIX =
  ' grado, con las adecuaciones correspondientes. Referencia: discriminados en el PPI.';

export const extractMaxGradeNumber = (cursoNombre?: string): number => {
  const match = /^([1-7])\s*[°º]?/.exec(String(cursoNombre || '').trim());
  return match ? Number(match[1]) : 7;
};

export const formatPpiObservationText = (grades: number[]): string => {
  const uniqueSorted = [...new Set(grades.filter((g) => Number.isInteger(g) && g >= 1 && g <= 7))].sort(
    (a, b) => a - b,
  );
  if (uniqueSorted.length === 0) return '';
  const labels = uniqueSorted.map((g) => `${g}°`);
  const joined = labels.length === 1
    ? labels[0]
    : `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`;
  return `${PPI_OBSERVATION_PREFIX}${joined}${PPI_OBSERVATION_SUFFIX}`;
};

export const parsePpiObservationGrades = (text: string): number[] | null => {
  const normalized = String(text || '').trim().replace(/\s+/g, ' ');
  if (!normalized) return null;
  const match = /^Los contenidos a trabajar en las áreas con PPI corresponden,?\s*según el Diseño Curricular vigente,?\s*a\s+(.+?)\s+grado,\s*con las adecuaciones correspondientes\.\s*Referencia:\s*discriminados en el PPI\.?$/i.exec(
    normalized,
  );
  if (!match) return null;
  const gradesPart = match[1];
  const found = [...gradesPart.matchAll(/([1-7])\s*[°º]/g)].map((m) => Number(m[1]));
  if (found.length === 0) return null;
  return [...new Set(found)].sort((a, b) => a - b);
};
