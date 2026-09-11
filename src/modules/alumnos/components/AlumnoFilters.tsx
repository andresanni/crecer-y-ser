import { Button, Card, Input, Segmented, Select, Space, Tag, Tooltip, Typography } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { ALL_GRADES, GRADE_PALETTE, type GradeNumber } from '../utils/gradeColors';
import styles from './AlumnoFilters.module.css';

type EnrollmentFilter = 'REGULARES' | 'BAJAS' | 'TODOS';
interface AlumnoFiltersProps {
  counts: { regulares: number; bajas: number; total: number };
  status: EnrollmentFilter;
  onStatusChange: (value: EnrollmentFilter) => void;
  query: string;
  appliedQuery: string;
  onQueryChange: (value: string) => void;
  grade: GradeNumber | 'all';
  onGradeChange: (value: GradeNumber | 'all') => void;
  loading: boolean;
  onRefresh: () => void;
}

export const AlumnoFilters = ({ counts, status, onStatusChange, query, appliedQuery, onQueryChange, grade, onGradeChange, loading, onRefresh }: AlumnoFiltersProps) => (
  <Card classNames={{ body: styles.body }}>
    <div className={styles.toolbar}>
      <Segmented
        aria-label="Estado de inscripción"
        value={status}
        onChange={onStatusChange}
        options={[
          { value: 'REGULARES', label: <Space size={6}>Cursantes activos<Tag color="success">{counts.regulares}</Tag></Space> },
          { value: 'BAJAS', label: <Space size={6}>Bajas del ciclo<Tag color="error">{counts.bajas}</Tag></Space> },
          { value: 'TODOS', label: <Space size={6}>Todos<Tag>{counts.total}</Tag></Space> },
        ]}
      />
      <div className={styles.searchControls}>
        <Input.Search className={styles.search} aria-label="Buscar alumnos" placeholder="Buscar por nombre, apellido, DNI, legajo..." allowClear value={query} onChange={(event) => onQueryChange(event.target.value)} prefix={<SearchOutlined />} />
        <Select<GradeNumber | 'all'> className={styles.grade} aria-label="Filtrar por grado" value={grade} onChange={onGradeChange} options={[
          { value: 'all', label: 'Todos los grados' },
          ...ALL_GRADES.map((number) => ({ value: number, label: GRADE_PALETTE[number].label })),
        ]} />
        <Tooltip title="Actualizar lista"><Button icon={<ReloadOutlined />} loading={loading} onClick={onRefresh} aria-label="Actualizar lista" /></Tooltip>
      </div>
    </div>
    {(appliedQuery || grade !== 'all') && <div className={styles.activeFilters}>
      <Typography.Text type="secondary">Filtros activos:</Typography.Text>
      {appliedQuery && <Tag closable onClose={() => onQueryChange('')} color="blue">Búsqueda: “{appliedQuery}”</Tag>}
      {grade !== 'all' && <Tag closable onClose={() => onGradeChange('all')} color="orange">Grado: {GRADE_PALETTE[grade].label}</Tag>}
      <Button type="link" size="small" onClick={() => { onQueryChange(''); onGradeChange('all'); }}>Limpiar filtros</Button>
    </div>}
  </Card>
);
