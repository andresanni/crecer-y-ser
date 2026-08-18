import type { CursoRecord } from '../../inscripciones/models/inscripcion.model';

// ==========================================
// 1. MATERIAS (Catálogo General)
// ==========================================
export interface MateriaRecord {
  id: string;
  created: string;
  updated: string;
  nombre: string;
}

export interface Materia {
  id: string;
  nombre: string;
  createdAt: string;
  updatedAt: string;
}

export const materiaAdapter = (record: MateriaRecord): Materia => ({
  id: record.id,
  nombre: record.nombre || '',
  createdAt: record.created,
  updatedAt: record.updated,
});

// ==========================================
// 2. PERIODOS (Bimestres por Ciclo Lectivo)
// ==========================================
export interface PeriodoRecord {
  id: string;
  created: string;
  updated: string;
  ciclo_id: string;
  nombre: string;
  numero_periodo: number;
  expand?: {
    ciclo_id?: {
      id: string;
      ano: number;
      actual: boolean;
    };
  };
}

export interface Periodo {
  id: string;
  cicloId: string;
  nombre: string;
  numeroPeriodo: number;
  cicloAno?: number;
  createdAt: string;
  updatedAt: string;
}

export const periodoAdapter = (record: PeriodoRecord): Periodo => ({
  id: record.id,
  cicloId: record.ciclo_id,
  nombre: record.nombre || '',
  numeroPeriodo: Number(record.numero_periodo) || 1,
  cicloAno: record.expand?.ciclo_id?.ano,
  createdAt: record.created,
  updatedAt: record.updated,
});

// ==========================================
// 3. CURSO_MATERIAS (Malla Curricular del Curso)
// ==========================================
export interface CursoMateriaRecord {
  id: string;
  created: string;
  updated: string;
  curso_id: string;
  materia_id: string;
  orden_visual: number;
  expand?: {
    curso_id?: CursoRecord;
    materia_id?: MateriaRecord;
  };
}

export interface CursoMateria {
  id: string;
  cursoId: string;
  materiaId: string;
  ordenVisual: number;
  materiaNombre: string;
  cursoNombre?: string;
  criteriosCount?: number;
  createdAt: string;
  updatedAt: string;
}

export const cursoMateriaAdapter = (record: CursoMateriaRecord): CursoMateria => ({
  id: record.id,
  cursoId: record.curso_id,
  materiaId: record.materia_id,
  ordenVisual: Number(record.orden_visual) || 0,
  materiaNombre: record.expand?.materia_id?.nombre || 'Materia sin nombre',
  cursoNombre: record.expand?.curso_id?.nombre || '',
  createdAt: record.created,
  updatedAt: record.updated,
});

// ==========================================
// 4. CRITERIOS_EVALUACION (5 Conceptos por Materia)
// ==========================================
export interface CriterioEvaluacionRecord {
  id: string;
  created: string;
  updated: string;
  curso_materia_id: string;
  nombre: string;
  orden_visual: number;
  expand?: {
    curso_materia_id?: CursoMateriaRecord;
  };
}

export interface CriterioEvaluacion {
  id: string;
  cursoMateriaId: string;
  nombre: string;
  ordenVisual: number;
  createdAt: string;
  updatedAt: string;
}

export const criterioEvaluacionAdapter = (record: CriterioEvaluacionRecord): CriterioEvaluacion => ({
  id: record.id,
  cursoMateriaId: record.curso_materia_id,
  nombre: record.nombre || '',
  ordenVisual: Number(record.orden_visual) || 1,
  createdAt: record.created,
  updatedAt: record.updated,
});

// Tipos auxiliares para formularios del constructor
export interface CriterioFormItem {
  id?: string;
  orden_visual: number;
  nombre: string;
}

// =========================================================================
// 5. MODELO DE EVALUACIÓN Y CALIFICACIONES (Estructura Boletín Oficial)
// =========================================================================

/**
 * Escala binaria para Proyecto Pedagógico Individual (Apoyo a la inclusión).
 * Universal para todas las materias y bimestres.
 */
export type PPIValor = 'SI' | 'NO';

/**
 * Evaluación de un criterio individual por alumno y período.
 */
export interface CalificacionCriterioItem {
  criterioId: string;
  criterioNombre: string;
  ordenVisual: number;
  valorEscalaId: string; // Relación con valores_escala (ej: S, MS, etc.)
  etiqueta?: string;
}

/**
 * Registro integral de evaluación por Materia, Bimestre y Alumno.
 * Refleja los 3 niveles del Documento de Evaluación:
 * 1. Hasta 5 Criterios Pedagógicos específicos.
 * 2. Indicador reglamentario universal PPI (Sí/No).
 * 3. Calificación General del Bimestre (Ingreso manual por docente).
 */
export interface EvaluacionMateriaBimestre {
  alumnoId: string;
  cursoMateriaId: string;
  periodoId: string;
  // Nivel 1: Criterios Pedagógicos (1 a 5)
  criterios: CalificacionCriterioItem[];
  // Nivel 2: Indicador Reglamentario Universal
  ppi: PPIValor;
  // Nivel 3: Calificación General Manual de Cierre de Bimestre
  calificacionGeneralValorId: string | null;
  calificacionGeneralEtiqueta?: string;
  observaciones?: string;
}
