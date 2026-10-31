import { Button, Card, Input, Segmented, Select, Space, Tag, Tooltip, Typography } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  ALL_GRADES,
  GRADE_PALETTE,
  KINDERGARTEN_PALETTE,
  type CourseFilterKey,
  type GradeNumber,
  type SchoolLevelFilter,
} from '../utils/gradeColors';
import styles from './AlumnoFilters.module.css';

type EnrollmentFilter = 'REGULARES' | 'BAJAS' | 'TODOS';

interface AlumnoFiltersProps {
  counts: { regulares: number; bajas: number; total: number };
  status: EnrollmentFilter;
  onStatusChange: (value: EnrollmentFilter) => void;
  query: string;
  appliedQuery: string;
  onQueryChange: (value: string) => void;
  level: SchoolLevelFilter;
  onLevelChange: (value: SchoolLevelFilter) => void;
  courseKey: CourseFilterKey | 'all';
  onCourseKeyChange: (value: CourseFilterKey | 'all') => void;
  grade?: GradeNumber | 'all';
  onGradeChange?: (value: GradeNumber | 'all') => void;
  loading: boolean;
  onRefresh: () => void;
}

export const AlumnoFilters = ({
  counts,
  status,
  onStatusChange,
  query,
  appliedQuery,
  onQueryChange,
  level,
  onLevelChange,
  courseKey,
  onCourseKeyChange,
  loading,
  onRefresh,
}: AlumnoFiltersProps) => {
  const handleLevelChange = (newLevel: SchoolLevelFilter) => {
    onLevelChange(newLevel);
    if (newLevel === 'inicial' && typeof courseKey === 'number') {
      onCourseKeyChange('all');
    } else if (newLevel === 'primario' && (courseKey === 'sala_2_3' || courseKey === 'sala_4_5')) {
      onCourseKeyChange('all');
    }
  };

  const courseOptions = [
    {
      value: 'all',
      label:
        level === 'inicial'
          ? 'Todas las salas'
          : level === 'primario'
          ? 'Todos los grados'
          : 'Todos los cursos',
    },
    ...(level === 'inicial' || level === 'all'
      ? [
          { value: 'sala_2_3', label: KINDERGARTEN_PALETTE.sala_2_3.fullLabel },
          { value: 'sala_4_5', label: KINDERGARTEN_PALETTE.sala_4_5.fullLabel },
        ]
      : []),
    ...(level === 'primario' || level === 'all'
      ? ALL_GRADES.map((number) => ({
          value: number,
          label: GRADE_PALETTE[number].label,
        }))
      : []),
  ];

  const getCourseFilterLabel = (key: CourseFilterKey): string => {
    if (key === 'sala_2_3') return KINDERGARTEN_PALETTE.sala_2_3.label;
    if (key === 'sala_4_5') return KINDERGARTEN_PALETTE.sala_4_5.label;
    return GRADE_PALETTE[key].label;
  };

  return (
    <Card classNames={{ body: styles.body }}>
      <div className={styles.toolbar}>
        <Segmented
          aria-label="Estado de inscripción"
          value={status}
          onChange={onStatusChange}
          options={[
            {
              value: 'REGULARES',
              label: (
                <Space size={6}>
                  Cursantes activos<Tag color="success">{counts.regulares}</Tag>
                </Space>
              ),
            },
            {
              value: 'BAJAS',
              label: (
                <Space size={6}>
                  Bajas del ciclo<Tag color="error">{counts.bajas}</Tag>
                </Space>
              ),
            },
            {
              value: 'TODOS',
              label: (
                <Space size={6}>
                  Todos<Tag>{counts.total}</Tag>
                </Space>
              ),
            },
          ]}
        />
        <div className={styles.searchControls}>
          <Segmented
            aria-label="Filtrar por nivel"
            value={level}
            onChange={(val) => handleLevelChange(val as SchoolLevelFilter)}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'inicial', label: 'Inicial' },
              { value: 'primario', label: 'Primario' },
            ]}
          />
          <Input.Search
            className={styles.search}
            aria-label="Buscar alumnos"
            placeholder="Buscar por nombre, apellido, DNI, legajo..."
            allowClear
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            prefix={<SearchOutlined />}
          />
          <Select<CourseFilterKey | 'all'>
            className={styles.grade}
            style={{ minWidth: 195 }}
            aria-label="Filtrar por curso o sala"
            value={courseKey}
            onChange={onCourseKeyChange}
            options={courseOptions}
          />
          <Tooltip title="Actualizar lista">
            <Button
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={onRefresh}
              aria-label="Actualizar lista"
            />
          </Tooltip>
        </div>
      </div>
      {(appliedQuery || courseKey !== 'all' || level !== 'all') && (
        <div className={styles.activeFilters}>
          <Typography.Text type="secondary">Filtros activos:</Typography.Text>
          {appliedQuery && (
            <Tag closable onClose={() => onQueryChange('')} color="blue">
              Búsqueda: “{appliedQuery}”
            </Tag>
          )}
          {level !== 'all' && (
            <Tag closable onClose={() => handleLevelChange('all')} color="purple">
              Nivel: {level === 'inicial' ? 'Inicial' : 'Primario'}
            </Tag>
          )}
          {courseKey !== 'all' && (
            <Tag closable onClose={() => onCourseKeyChange('all')} color="orange">
              Curso: {getCourseFilterLabel(courseKey)}
            </Tag>
          )}
          <Button
            type="link"
            size="small"
            onClick={() => {
              onQueryChange('');
              handleLevelChange('all');
              onCourseKeyChange('all');
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      )}
    </Card>
  );
};
