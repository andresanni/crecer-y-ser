import React from 'react';
import { Space, Switch, Typography } from 'antd';

const INFORME_PPI_OBSERVATION_TEXT =
  'Su situación de alumno se encuentra respaldada por un PPI que enmarca adaptaciones curriculares y de recursos, los cuales tienen como finalidad respetar los tiempos y favorecer los procesos de comprensión y ejecución de tareas.';

const normalizeText = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').replace(/\.$/, '').toLowerCase();

const isPpiObservationActive = (value: string): boolean => {
  const normalized = normalizeText(value);
  return Boolean(normalized) && normalized === normalizeText(INFORME_PPI_OBSERVATION_TEXT);
};

interface ObservacionPpiInformeToggleProps {
  value: string;
  onChange: (nextText: string) => void;
}

export const ObservacionPpiInformeToggle: React.FC<ObservacionPpiInformeToggleProps> = ({
  value,
  onChange,
}) => {
  const enabled = isPpiObservationActive(value);

  const handleToggle = (checked: boolean) => {
    onChange(checked ? INFORME_PPI_OBSERVATION_TEXT : '');
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
          }}
        >
          <div
            style={{
              background: 'var(--cys-color-bg-container)',
              border: '1px solid var(--cys-color-border)',
              borderRadius: 8,
              padding: '10px 12px',
            }}
          >
            <Typography.Text
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--cys-color-text-secondary)',
                marginBottom: 4,
              }}
            >
              TEXTO QUE FIGURARÁ EN EL INFORME
            </Typography.Text>
            <Typography.Paragraph style={{ margin: 0, fontSize: 13 }}>
              {INFORME_PPI_OBSERVATION_TEXT}
            </Typography.Paragraph>
          </div>
        </div>
      )}
    </Space>
  );
};
