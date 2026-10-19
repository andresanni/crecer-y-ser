export type AttendanceMark = 'P' | 'A' | 'J' | 'E' | 'IT' | 'RA' | '---' | '';

export interface EventoColumna {
  dia: number;
  texto: string;
  observation?: string;
}

export interface StudentRecord {
  id: string;
  name: string;
  order?: number | null;
  withdrawalFromDay?: number;
  attendance: Readonly<Partial<Record<number, AttendanceMark>>>;
  totals: readonly [present: number, absent: number, late: number];
  grades: readonly string[];
  classroom: readonly string[];
  coexistence: readonly string[];
  observation: string;
}

export interface RegistroEscolarData {
  header: {
    month: string;
    workingDays: string | number;
    accumulatedWorkingDays: string | number;
    grade: string;
    section: string;
    shift: string;
    year: string | number;
  };
  students: readonly StudentRecord[];
  dailyTotals: Readonly<Partial<Record<number, number | string>>>;
  monthlyTotals: readonly [present: number, absent: number, late: number];
  weekends: readonly number[];
  blockedDays: readonly number[];
  noClassDays?: readonly number[];
  events: readonly EventoColumna[];
  observations: readonly string[];
  firstCycle?: boolean;
  ageDistribution?: {
    rows: readonly { edad: number; v: number; m: number; t: number }[];
    older?: { v: number; m: number; t: number };
  };
  footer?: Readonly<Record<string, string | number>>;
}

export interface RegistroEscolarProps {
  data: RegistroEscolarData;
  className?: string;
  showPresentMarks?: boolean;
  title?: string;
}
