import { Alert, Button, Space } from 'antd';
import type { DocumentPreparation } from '../services/gradebookDataSource.service';

export function DocumentReadinessAlert({ preparation, disabled, onStudent, onSupport, onRefresh }: {
  preparation?: DocumentPreparation;
  disabled: boolean;
  onStudent: (section: 'alumno' | 'responsable' | 'vinculos') => void;
  onSupport: (term: number) => void;
  onRefresh: () => void;
}) {
  if (!preparation) return <Alert type="info" showIcon title="Preparación del PDF pendiente de comprobar" action={<Button onClick={onRefresh}>Actualizar</Button>} />;
  if (preparation.completa) return null;
  const issues = preparation.faltantes;
  const supportTerms = [...new Set(issues.filter(issue => issue.origen === 'apoyos' && issue.bimestre).map(issue => issue.bimestre!))];
  return <Alert type="warning" showIcon title="Faltan datos para el PDF" description={
    <Space orientation="vertical">
      <ul>{issues.map(issue => <li key={issue.campo}>{issue.mensaje}</li>)}</ul>
      <Space wrap>
        {issues.some(issue => issue.origen === 'alumno') && <Button disabled={disabled} onClick={() => onStudent('alumno')}>Completar ficha</Button>}
        {issues.some(issue => issue.origen === 'responsable') && <Button disabled={disabled} onClick={() => onStudent(issues.some(issue => issue.campo === 'responsable.vinculo') ? 'vinculos' : 'responsable')}>Revisar responsable</Button>}
        {supportTerms.map(term => <Button key={term} disabled={disabled} onClick={() => onSupport(term)}>Revisar apoyos · {term}.º bimestre</Button>)}
      </Space>
    </Space>
  } />;
}
