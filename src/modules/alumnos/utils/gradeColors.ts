export type GradeNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface GradeColorConfig {
  gradeNumber: GradeNumber | null;
  label: string;
  shortLabel: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  tagPreset: string;
}

export const GRADE_PALETTE: Record<GradeNumber, GradeColorConfig> = {
  1: {
    gradeNumber: 1,
    label: '1° Grado',
    shortLabel: '1°',
    textColor: '#ea580c',
    bgColor: 'rgba(234, 88, 12, 0.10)',
    borderColor: 'rgba(234, 88, 12, 0.35)',
    tagPreset: 'volcano',
  },
  2: {
    gradeNumber: 2,
    label: '2° Grado',
    shortLabel: '2°',
    textColor: '#d97706',
    bgColor: 'rgba(217, 119, 6, 0.10)',
    borderColor: 'rgba(217, 119, 6, 0.35)',
    tagPreset: 'gold',
  },
  3: {
    gradeNumber: 3,
    label: '3° Grado',
    shortLabel: '3°',
    textColor: '#059669',
    bgColor: 'rgba(5, 150, 105, 0.10)',
    borderColor: 'rgba(5, 150, 105, 0.35)',
    tagPreset: 'green',
  },
  4: {
    gradeNumber: 4,
    label: '4° Grado',
    shortLabel: '4°',
    textColor: '#0d9488',
    bgColor: 'rgba(13, 148, 136, 0.10)',
    borderColor: 'rgba(13, 148, 136, 0.35)',
    tagPreset: 'cyan',
  },
  5: {
    gradeNumber: 5,
    label: '5° Grado',
    shortLabel: '5°',
    textColor: '#0284c7',
    bgColor: 'rgba(2, 132, 199, 0.10)',
    borderColor: 'rgba(2, 132, 199, 0.35)',
    tagPreset: 'blue',
  },
  6: {
    gradeNumber: 6,
    label: '6° Grado',
    shortLabel: '6°',
    textColor: '#4f46e5',
    bgColor: 'rgba(79, 70, 229, 0.10)',
    borderColor: 'rgba(79, 70, 229, 0.35)',
    tagPreset: 'geekblue',
  },
  7: {
    gradeNumber: 7,
    label: '7° Grado',
    shortLabel: '7°',
    textColor: '#9333ea',
    bgColor: 'rgba(147, 51, 234, 0.10)',
    borderColor: 'rgba(147, 51, 234, 0.35)',
    tagPreset: 'purple',
  },
};

export const DEFAULT_GRADE_CONFIG: GradeColorConfig = {
  gradeNumber: null,
  label: 'Sin Grado',
  shortLabel: 'S/G',
  textColor: '#64748b',
  bgColor: 'rgba(100, 116, 139, 0.10)',
  borderColor: 'rgba(100, 116, 139, 0.25)',
  tagPreset: 'default',
};

export const ALL_GRADES: GradeNumber[] = [1, 2, 3, 4, 5, 6, 7];




export const extractGradeNumber = (courseName?: string | null): GradeNumber | null => {
  if (!courseName) return null;
  const normalized = courseName.trim().toLowerCase();


  if (/\b(1°|1ro|1er|1ero|primero?|primer)\b/i.test(normalized) || /^1[^\d]/.test(normalized) || normalized === '1') {
    return 1;
  }
  if (/\b(2°|2do|segundo?)\b/i.test(normalized) || /^2[^\d]/.test(normalized) || normalized === '2') {
    return 2;
  }
  if (/\b(3°|3ro|3er|3ero|tercero?|tercer)\b/i.test(normalized) || /^3[^\d]/.test(normalized) || normalized === '3') {
    return 3;
  }
  if (/\b(4°|4to|cuarto?)\b/i.test(normalized) || /^4[^\d]/.test(normalized) || normalized === '4') {
    return 4;
  }
  if (/\b(5°|5to|quinto?)\b/i.test(normalized) || /^5[^\d]/.test(normalized) || normalized === '5') {
    return 5;
  }
  if (/\b(6°|6to|sexto?)\b/i.test(normalized) || /^6[^\d]/.test(normalized) || normalized === '6') {
    return 6;
  }
  if (/\b(7°|7mo|s[eé]ptimo?)\b/i.test(normalized) || /^7[^\d]/.test(normalized) || normalized === '7') {
    return 7;
  }


  const match = normalized.match(/[1-7]/);
  if (match) {
    const parsed = parseInt(match[0], 10);
    if (parsed >= 1 && parsed <= 7) {
      return parsed as GradeNumber;
    }
  }

  return null;
};




export const getGradeColorConfig = (courseName?: string | null): GradeColorConfig => {
  const gradeNum = extractGradeNumber(courseName);
  if (gradeNum && GRADE_PALETTE[gradeNum]) {
    return GRADE_PALETTE[gradeNum];
  }
  return DEFAULT_GRADE_CONFIG;
};




export const compareGrados = (courseA?: string | null, courseB?: string | null): number => {
  const numA = extractGradeNumber(courseA);
  const numB = extractGradeNumber(courseB);

  if (numA !== null && numB !== null) {
    if (numA !== numB) return numA - numB;
    return (courseA || '').localeCompare(courseB || '');
  }

  if (numA !== null) return -1;
  if (numB !== null) return 1;

  return (courseA || '').localeCompare(courseB || '');
};
