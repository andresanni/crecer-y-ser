import React, { useMemo } from 'react';
import { Checkbox, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { getGradeColorConfig } from '../../alumnos/utils/gradeColors';
import {
  compareCursosInforme,
  isInicialCursoInforme,
  type CeldaEtapaInforme,
  type CursoInformeResumen,
} from '../models/informe.model';
import styles from './GradeSetSelector.module.css';

interface GradeSetSelectorProps {
  id?: string;
  value?: string[];
  onChange?: (nextIds: string[]) => void;
  cursos: CursoInformeResumen[];
  cellsByCourseId: Map<string, CeldaEtapaInforme>;
}

type GradeAvailabilityStatus = 'available' | 'linked' | 'delivered' | 'unconfigured';

interface GradeOptionItem {
  curso: CursoInformeResumen;
  status: GradeAvailabilityStatus;
  disabled: boolean;
  tooltip: string;
}

const isDeliveredStage = (etapa: CeldaEtapaInforme['etapa']) => (
  etapa === 'REVISION_DIRECTIVA' || etapa === 'LISTO_PARA_PDF'
);

export const GradeSetSelector: React.FC<GradeSetSelectorProps> = ({
  id,
  value = [],
  onChange,
  cursos,
  cellsByCourseId,
}) => {
  const sortedCursos = useMemo(
    () => [...cursos].sort(compareCursosInforme),
    [cursos],
  );

  const items = useMemo<GradeOptionItem[]>(() => (
    sortedCursos.map((curso) => {
      const cell = cellsByCourseId.get(curso.id);
      const hasActiveLink = Boolean(cell?.enlace);
      const delivered = cell ? isDeliveredStage(cell.etapa) : false;
      const unconfigured = !cell || cell.etapa === 'PENDIENTE_CONFIGURACION';

      const teacherLabel = [
        cell?.docenteApellido || cell?.enlace?.docenteApellido,
        cell?.docenteNombre || cell?.enlace?.docenteNombre,
      ]
        .filter(Boolean)
        .join(', ');

      if (delivered) {
        return {
          curso,
          status: 'delivered',
          disabled: true,
          tooltip: cell?.etapa === 'LISTO_PARA_PDF'
            ? 'Informe visado y listo para emitir PDF'
            : 'Informe ya entregado a Dirección',
        };
      }

      if (unconfigured) {
        return {
          curso,
          status: 'unconfigured',
          disabled: true,
          tooltip: 'Sin plantilla configurada para este grado',
        };
      }

      if (hasActiveLink) {
        return {
          curso,
          status: 'linked',
          disabled: true,
          tooltip: teacherLabel
            ? `Ya tiene enlace activo · ${teacherLabel}`
            : 'Ya tiene enlace activo',
        };
      }

      return {
        curso,
        status: 'available',
        disabled: false,
        tooltip: '',
      };
    })
  ), [cellsByCourseId, sortedCursos]);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const inicialItems = useMemo(
    () => items.filter((item) => isInicialCursoInforme(item.curso)),
    [items],
  );
  const primarioItems = useMemo(
    () => items.filter((item) => !isInicialCursoInforme(item.curso)),
    [items],
  );
  const hasBothLevels = inicialItems.length > 0 && primarioItems.length > 0;

  const handleGroupChange = (checkedValues: Array<string | number | boolean>) => {
    const checkedSet = new Set(checkedValues.map(String));
    const ordered = sortedCursos
      .filter((curso) => checkedSet.has(curso.id))
      .map((curso) => curso.id);
    onChange?.(ordered);
  };

  const renderItem = (item: GradeOptionItem) => {
    const { curso, status, disabled, tooltip } = item;
    const isInicial = isInicialCursoInforme(curso);
    const visual = getGradeColorConfig(curso.nombre);
    const displayName = isInicial ? visual.label : curso.nombre;

    if (disabled) {
      const lockedClassName = [
        styles.gradeItem,
        styles.gradeItemLocked,
        status === 'delivered'
          ? styles.gradeItemDelivered
          : status === 'linked'
            ? styles.gradeItemLinked
            : styles.gradeItemUnconfigured,
      ].join(' ');

      return (
        <Tooltip key={curso.id} title={tooltip}>
          <div className={lockedClassName} aria-disabled="true">
            <span className={styles.lockedIcon}>
              {status === 'delivered' ? (
                <CheckCircleOutlined />
              ) : status === 'linked' ? (
                <LinkOutlined />
              ) : (
                <ExclamationCircleOutlined />
              )}
            </span>
            <span className={styles.gradeName}>{displayName}</span>
            <span className={styles.gradeStatus}>
              {status === 'delivered'
                ? 'Entregado'
                : status === 'linked'
                  ? 'Con enlace'
                  : 'Sin plantilla'}
            </span>
          </div>
        </Tooltip>
      );
    }

    const isSelected = selectedSet.has(curso.id);
    return (
      <Checkbox
        key={curso.id}
        value={curso.id}
        className={[
          styles.gradeItem,
          styles.gradeItemSelectable,
          isSelected ? styles.gradeItemSelected : '',
        ].filter(Boolean).join(' ')}
      >
        <span className={styles.selectableContent}>
          <span className={styles.gradeName}>{displayName}</span>
          <span className={styles.gradeTurno}>{curso.turno}</span>
        </span>
      </Checkbox>
    );
  };

  return (
    <div id={id} tabIndex={-1} className={styles.wrapper}>
      <Checkbox.Group
        value={value}
        onChange={handleGroupChange}
        className={styles.checkboxGroup}
      >
        {inicialItems.length > 0 && (
          <div className={styles.levelGroup}>
            {hasBothLevels && <span className={styles.levelHeading}>Nivel Inicial</span>}
            <div className={styles.inicialRow}>
              {inicialItems.map(renderItem)}
            </div>
          </div>
        )}
        {primarioItems.length > 0 && (
          <div className={styles.levelGroup}>
            {hasBothLevels && <span className={styles.levelHeading}>Nivel Primario</span>}
            <div className={styles.gradeRow}>
              {primarioItems.map(renderItem)}
            </div>
          </div>
        )}
      </Checkbox.Group>
    </div>
  );
};
