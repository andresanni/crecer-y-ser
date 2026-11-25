import React, { useMemo } from 'react';
import { Checkbox, Space, Switch, Typography } from 'antd';
import { extractMaxGradeNumber, formatPpiObservationText } from '../utils/observacionPpi';

interface ObservacionPpiSelectorProps {
  value: string;
  cursoNombre?: string;
  enabled: boolean;
  selectedGrades: number[];
  onChange: (next: { enabled: boolean; grades: number[]; text: string }) => void;
}

export const ObservacionPpiSelector: React.FC<ObservacionPpiSelectorProps> = ({
  cursoNombre,
  enabled,
  selectedGrades,
  onChange,
}) => {
  const maxGrade = useMemo(() => extractMaxGradeNumber(cursoNombre), [cursoNombre]);
  const gradeOptions = useMemo(
    () => Array.from({ length: maxGrade }, (_, idx) => idx + 1),
    [maxGrade],
  );
  const previewText = useMemo(
    () => (enabled ? formatPpiObservationText(selectedGrades) : ''),
    [enabled, selectedGrades],
  );

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({ enabled: false, grades: [], text: '' });
      return;
    }
    const defaultGrades = selectedGrades.length > 0 ? selectedGrades : [maxGrade];
    onChange({
      enabled: true,
      grades: defaultGrades,
      text: formatPpiObservationText(defaultGrades),
    });
  };

  const handleGradesChange = (values: Array<string | number>) => {
    const numericGrades = values
      .map((item) => Number(item))
      .filter((g) => Number.isInteger(g) && g >= 1 && g <= maxGrade)
      .sort((a, b) => a - b);
    onChange({
      enabled: true,
      grades: numericGrades,
      text: formatPpiObservationText(numericGrades),
    });
  };

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Switch checked={enabled} onChange={handleToggle} />
        <Typography.Text strong style={{ fontSize: 13 }}>
          Incluir observación de adecuación curricular (PPI)
        </Typography.Text>
      </div>

      {enabled && (
        <div
          style={{
            background: 'var(--cys-color-fill-quaternary)',
            border: '1px solid var(--cys-color-border-secondary)',
            borderRadius: 10,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div>
            <Typography.Text
              strong
              style={{ display: 'block', fontSize: 12, marginBottom: 8, color: 'var(--cys-color-text-secondary)' }}
            >
              Seleccioná los grados a los que corresponden los contenidos adecuados (hasta {maxGrade}° inclusive):
            </Typography.Text>
            <Checkbox.Group
              value={selectedGrades}
              onChange={handleGradesChange}
              options={gradeOptions.map((grade) => ({
                label: `${grade}° grado`,
                value: grade,
              }))}
            />
          </div>

          {selectedGrades.length === 0 ? (
            <Typography.Text type="danger" style={{ fontSize: 12.5 }}>
              Seleccioná al menos un grado para incluir la observación o desactivá la opción.
            </Typography.Text>
          ) : (
            <div
              style={{
                background: 'var(--cys-color-bg-container)',
                border: '1px solid var(--cys-color-border)',
                borderRadius: 8,
                padding: '10px 12px',
              }}
            >
              <Typography.Text
                style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--cys-color-text-secondary)', marginBottom: 4 }}
              >
                TEXTO QUE FIGURARÁ EN EL BOLETÍN
              </Typography.Text>
              <Typography.Paragraph style={{ margin: 0, fontSize: 13 }}>
                {previewText}
              </Typography.Paragraph>
            </div>
          )}
        </div>
      )}
    </Space>
  );
};
