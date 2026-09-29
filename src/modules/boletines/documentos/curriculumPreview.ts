import malla from './mallaCurricular.preview.json';
import type { BoletinDocumentData, GradoPrimario } from './boletinDocument.model';
import { crearMateriasAcademicasDeMuestra, crearMateriasFormativasDeMuestra } from './boletinDocument.fixture';

export const anoMallaDeRevision = malla.ano;

export function crearMuestraCurricular(grado: GradoPrimario): Pick<BoletinDocumentData, 'materiasFormativas' | 'materiasAcademicas'> {
  const configuracion = malla.grados.find(item => item.grado === grado);
  if (!configuracion) throw new Error(`Falta la malla de revisión de ${grado}°.`);
  const formativas = crearMateriasFormativasDeMuestra(grado);
  const academicas = crearMateriasAcademicasDeMuestra(grado);
  const base = [...formativas, ...academicas];
  if (base.length !== configuracion.materias.length) throw new Error('La malla no coincide con la composición de revisión.');
  const materias = configuracion.materias.map((materia, index) => ({
    ...base[index],
    id: `grado-${grado}-materia-${materia.orden}`,
    nombre: materia.nombre.toLocaleUpperCase('es-AR'),
    criterios: materia.conceptos.map((texto, criterioIndex) => ({
      id: `grado-${grado}-materia-${materia.orden}-concepto-${criterioIndex + 1}`,
      texto,
      bimestres: base[index].criterios[criterioIndex].bimestres,
    })),
  }));
  return {
    materiasFormativas: materias.slice(0, 2),
    materiasAcademicas: materias.slice(2).map((materia, index) => ({ ...academicas[index], ...materia })),
  };
}
