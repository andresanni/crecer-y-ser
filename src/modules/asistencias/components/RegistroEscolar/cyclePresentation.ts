import type { RegistroEscolarData } from './types';

export const EVALUATION_LEFT = 551.919;
export const EVALUATION_RIGHT = 990.213;
export const EVALUATION_TOP = 73.806;
export const EVALUATION_HEADER_BOTTOM = 147.068;
export const EVALUATION_BOTTOM = 374.096;

export interface EvaluationColumn {
  key: string;
  field: 'grades' | 'classroom' | 'coexistence';
  index: number;
  labels: readonly string[];
  left: number;
  right: number;
}

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase().replace(/\s+/g, ' ');

export function displayAssessment(value: string, firstCycle: boolean): string {
  const label = normalize(value);
  const compact = label.match(/^(DE|AV|AL|EP|NA)(?:\s*-?\s*(10|[1-9]))?(?=$|\s*-)/);
  const concept = compact?.[1] ?? (label.startsWith('DESTACADO') ? 'DE'
    : label.startsWith('AVANZADO') ? 'AV' : label.startsWith('ALCANZADO') ? 'AL'
    : label.startsWith('EN PROCESO') ? 'EP' : label.startsWith('NO ALCANZO') ? 'NA' : undefined);
  if (!concept) return value;
  const number = compact?.[2] ?? label.match(/\b(10|[1-9])\b/)?.[1];
  return firstCycle || !number ? concept : `${concept}${number}`;
}

export function evaluationColumns(firstCycle: boolean): EvaluationColumn[] {
  const definitions: { key: string; field: EvaluationColumn['field']; index: number; labels: string[]; width: number }[] = [];
  const subjects = [
    { key: 'language', labels: ['LENGUA'], index: 0, narrow: 13, wide: 19 },
    { key: 'mathematics', labels: ['MATEMÁTICA'], index: 1, narrow: 13, wide: 19 },
    ...(firstCycle
      ? [{ key: 'world', labels: ['CONOCIMIENTO DEL MUNDO'], index: 2, narrow: 13, wide: 19 }]
      : [{ key: 'social', labels: ['Ciencias Sociales'], index: 2, narrow: 13, wide: 19 }, { key: 'natural', labels: ['Ciencias Naturales'], index: 3, narrow: 13, wide: 19 }]),
    { key: 'technology', labels: ['TECNOLOGÍA, DISEÑO Y', 'PROGRAMACIÓN'], index: 4, narrow: 18, wide: 22 },
    { key: 'visual-arts', labels: ['ED. ARTÍSTICA - ARTES', 'VISUALES'], index: 5, narrow: 18, wide: 22 },
    { key: 'music', labels: ['ED. ARTÍSTICA -', 'MÚSICA'], index: 6, narrow: 18, wide: 21 },
    { key: 'english', labels: ['LENGUA ADICIONAL -', 'INGLÉS'], index: 7, narrow: 18, wide: 21 },
    { key: 'physical-education', labels: ['EDUCACIÓN FÍSICA'], index: 8, narrow: 13, wide: 19 },
  ];
  for (const subject of subjects) definitions.push({ ...subject, field: 'grades', width: firstCycle ? subject.narrow : subject.wide });
  const classroom = [
    ['Se organiza para', 'realizar tareas (1)'], ['Expresa sus ideas (2)'], ['Asume tareas (3)'],
    ['Manifiesta interés', 'por aprender (4)'], ['Reconoce sus logros', '(5)'],
  ];
  const coexistence = [
    ['Participa de la', 'construcción de', 'acuerdos (1)'], ['Utiliza estrategias', 'comunicacionales (2)'],
    ['Resuelve conflictos', '(3)'], ['Colabora en tareas', 'grupales (4)'],
    ['Contribuye al clima', 'escolar de bienestar', '(5)'],
  ];
  for (const [field, labelsList, widths] of [['classroom', classroom, [16, 13, 13, 16, 16]], ['coexistence', coexistence, [18, 16, 16, 16, 18]]] as const) {
    labelsList.forEach((labels, index) => definitions.push({ key: `${field}-${index}`, field, index, labels: [...labels], width: firstCycle ? widths[index] : 19 }));
  }
  let left = EVALUATION_LEFT;
  return definitions.map(({ width, ...column }) => {
    const positioned = { ...column, left, right: left + width };
    left += width;
    return positioned;
  });
}

export function observationsWithDays(data: RegistroEscolarData): string[] {
  const used = new Set<number>();
  return data.observations.map(observation => {
    if (/^\s*\d/.test(observation)) return observation;
    const match = data.events.findIndex((event, index) => !used.has(index)
      && normalize(event.observation || event.texto) === normalize(observation));
    if (match < 0) return observation;
    used.add(match);
    return `${data.events[match].dia}. ${observation}`;
  });
}
