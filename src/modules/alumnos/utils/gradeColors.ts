export type GradeNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type KindergartenRoomKey = 'sala_2_3' | 'sala_4_5';
export type CourseFilterKey = GradeNumber | KindergartenRoomKey;
export type SchoolLevelFilter = 'all' | 'inicial' | 'primario';

export interface CourseVisualConfig {
  gradeNumber: GradeNumber | null;
  roomKey?: KindergartenRoomKey | null;
  label: string;
  shortLabel: string;
  fullLabel: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  tagPreset: string;
}

export type GradeColorConfig = CourseVisualConfig;

export const GRADE_PALETTE: Record<GradeNumber, CourseVisualConfig> = {
  1: {
    gradeNumber: 1,
    roomKey: null,
    label: '1° Grado',
    shortLabel: '1°',
    fullLabel: '1° Grado',
    textColor: '#ea580c',
    bgColor: 'rgba(234, 88, 12, 0.10)',
    borderColor: 'rgba(234, 88, 12, 0.35)',
    tagPreset: 'volcano',
  },
  2: {
    gradeNumber: 2,
    roomKey: null,
    label: '2° Grado',
    shortLabel: '2°',
    fullLabel: '2° Grado',
    textColor: '#d97706',
    bgColor: 'rgba(217, 119, 6, 0.10)',
    borderColor: 'rgba(217, 119, 6, 0.35)',
    tagPreset: 'gold',
  },
  3: {
    gradeNumber: 3,
    roomKey: null,
    label: '3° Grado',
    shortLabel: '3°',
    fullLabel: '3° Grado',
    textColor: '#059669',
    bgColor: 'rgba(5, 150, 105, 0.10)',
    borderColor: 'rgba(5, 150, 105, 0.35)',
    tagPreset: 'green',
  },
  4: {
    gradeNumber: 4,
    roomKey: null,
    label: '4° Grado',
    shortLabel: '4°',
    fullLabel: '4° Grado',
    textColor: '#0d9488',
    bgColor: 'rgba(13, 148, 136, 0.10)',
    borderColor: 'rgba(13, 148, 136, 0.35)',
    tagPreset: 'cyan',
  },
  5: {
    gradeNumber: 5,
    roomKey: null,
    label: '5° Grado',
    shortLabel: '5°',
    fullLabel: '5° Grado',
    textColor: '#0284c7',
    bgColor: 'rgba(2, 132, 199, 0.10)',
    borderColor: 'rgba(2, 132, 199, 0.35)',
    tagPreset: 'blue',
  },
  6: {
    gradeNumber: 6,
    roomKey: null,
    label: '6° Grado',
    shortLabel: '6°',
    fullLabel: '6° Grado',
    textColor: '#4f46e5',
    bgColor: 'rgba(79, 70, 229, 0.10)',
    borderColor: 'rgba(79, 70, 229, 0.35)',
    tagPreset: 'geekblue',
  },
  7: {
    gradeNumber: 7,
    roomKey: null,
    label: '7° Grado',
    shortLabel: '7°',
    fullLabel: '7° Grado',
    textColor: '#9333ea',
    bgColor: 'rgba(147, 51, 234, 0.10)',
    borderColor: 'rgba(147, 51, 234, 0.35)',
    tagPreset: 'purple',
  },
};

export const KINDERGARTEN_PALETTE: Record<KindergartenRoomKey, CourseVisualConfig> = {
  sala_2_3: {
    gradeNumber: null,
    roomKey: 'sala_2_3',
    label: 'Sala 2 y 3',
    shortLabel: '2 y 3',
    fullLabel: 'Sala de 2 y 3 años',
    textColor: '#c2410c',
    bgColor: 'rgba(194, 65, 12, 0.12)',
    borderColor: 'rgba(194, 65, 12, 0.38)',
    tagPreset: 'orange',
  },
  sala_4_5: {
    gradeNumber: null,
    roomKey: 'sala_4_5',
    label: 'Sala 4 y 5',
    shortLabel: '4 y 5',
    fullLabel: 'Sala de 4 y 5 años',
    textColor: '#0f766e',
    bgColor: 'rgba(15, 118, 110, 0.12)',
    borderColor: 'rgba(15, 118, 110, 0.38)',
    tagPreset: 'cyan',
  },
};

export const DEFAULT_GRADE_CONFIG: CourseVisualConfig = {
  gradeNumber: null,
  roomKey: null,
  label: 'Sin Grado',
  shortLabel: 'S/G',
  fullLabel: 'Sin Grado',
  textColor: '#64748b',
  bgColor: 'rgba(100, 116, 139, 0.10)',
  borderColor: 'rgba(100, 116, 139, 0.25)',
  tagPreset: 'default',
};

export const ALL_GRADES: GradeNumber[] = [1, 2, 3, 4, 5, 6, 7];

export const extractKindergartenRoomKey = (courseName?: string | null): KindergartenRoomKey | null => {
  if (!courseName) return null;
  const normalized = courseName.trim().toLowerCase();
  if (
    normalized === 'sala_2_3' ||
    (normalized.includes('sala') && normalized.includes('2') && normalized.includes('3')) ||
    /sala.*2.*3/i.test(normalized)
  ) {
    return 'sala_2_3';
  }
  if (
    normalized === 'sala_4_5' ||
    (normalized.includes('sala') && normalized.includes('4') && normalized.includes('5')) ||
    /sala.*4.*5/i.test(normalized)
  ) {
    return 'sala_4_5';
  }
  return null;
};

export const extractGradeNumber = (courseName?: string | null): GradeNumber | null => {
  if (!courseName) return null;
  const trimmed = courseName.trim();
  if (/sala/i.test(trimmed)) {
    return null;
  }
  const match = trimmed.match(/^(?:primaria\s*)?([1-7])\s*(?:°|º|er|ero|ro|do|to|mo|grado\b|$)/i);
  if (match) {
    const parsed = parseInt(match[1], 10);
    if (parsed >= 1 && parsed <= 7) {
      return parsed as GradeNumber;
    }
  }
  return null;
};

export const extractCourseFilterKey = (cursoNombre?: string | null): CourseFilterKey | null => {
  const roomKey = extractKindergartenRoomKey(cursoNombre);
  if (roomKey) return roomKey;
  return extractGradeNumber(cursoNombre);
};

export const isKindergartenCourse = (cursoNombre?: string | null, nivelNombre?: string | null): boolean => {
  if (nivelNombre && /inicial|jard[ií]n/i.test(nivelNombre)) {
    return true;
  }
  if (!cursoNombre) {
    return false;
  }
  return extractKindergartenRoomKey(cursoNombre) !== null || /sala/i.test(cursoNombre);
};

export const getCourseVisualConfig = (
  cursoNombre?: string | null,
  nivelNombre?: string | null
): CourseVisualConfig => {
  const roomKey = extractKindergartenRoomKey(cursoNombre);
  if (roomKey && KINDERGARTEN_PALETTE[roomKey]) {
    return KINDERGARTEN_PALETTE[roomKey];
  }
  if (isKindergartenCourse(cursoNombre, nivelNombre)) {
    return KINDERGARTEN_PALETTE.sala_2_3;
  }
  const gradeNum = extractGradeNumber(cursoNombre);
  if (gradeNum && GRADE_PALETTE[gradeNum]) {
    return GRADE_PALETTE[gradeNum];
  }
  return DEFAULT_GRADE_CONFIG;
};

export const getGradeColorConfig = (courseName?: string | null): CourseVisualConfig => {
  return getCourseVisualConfig(courseName);
};

const getCourseSortWeight = (courseName?: string | null): number => {
  const roomKey = extractKindergartenRoomKey(courseName);
  if (roomKey === 'sala_2_3') return 0;
  if (roomKey === 'sala_4_5') return 1;
  const gradeNum = extractGradeNumber(courseName);
  if (gradeNum !== null) return gradeNum + 1;
  return 999;
};

export const compareGrados = (courseA?: string | null, courseB?: string | null): number => {
  const weightA = getCourseSortWeight(courseA);
  const weightB = getCourseSortWeight(courseB);

  if (weightA !== weightB) {
    return weightA - weightB;
  }

  return (courseA || '').localeCompare(courseB || '', 'es', { sensitivity: 'base' });
};
