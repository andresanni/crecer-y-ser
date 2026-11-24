import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Empty,
  Progress,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  LinkOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  RightOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { CourseRosterExpandPanel } from '../../../shared/components/CourseRosterExpandPanel';
import { SectionLayout } from '../../../shared/components/SectionLayout';
import ui from '../../../shared/styles/ui.module.css';
import { useAppStore } from '../../../store/appStore';
import { getGradeColorConfig } from '../../alumnos/utils/gradeColors';
import {
  formatMateriaNombreUI,
  isInicialCursoInforme,
  TIPOS_INFORME_META,
  type CeldaEtapaInforme,
  type TipoInforme,
} from '../models/informe.model';
import { informesService } from '../services/informes.service';
import { useInformesRealtime } from '../hooks/useInformesRealtime';
import {
  buildInformesDashboardKey,
  useInformesDashboardStore,
} from '../store/informesDashboardStore';
import { GestorEnlacesInformesModal } from './GestorEnlacesInformesModal';
import { EditarDocenteInformeModal } from './EditarDocenteInformeModal';
import styles from './TableroInformesPage.module.css';

const { Text } = Typography;
const REALTIME_REFRESH_DELAY_MS = 400;
const REALTIME_REFRESH_MAX_WAIT_MS = 1500;
const FOCUS_REVALIDATE_THROTTLE_MS = 5000;

interface TableroInformesPageProps {
  tipoInforme: TipoInforme;
  onBackToSelection: () => void;
  onOpenInstancia: (instanciaId: string) => void;
}

interface TableroRow extends CeldaEtapaInforme {
  rowKey: string;
  cursoNombre: string;
  cursoTurno: string;
  materiaNombre: string | null;
}

export const TableroInformesPage: React.FC<TableroInformesPageProps> = ({
  tipoInforme,
  onBackToSelection,
  onOpenInstancia,
}) => {
  const { message } = App.useApp();
  const { cicloActual } = useAppStore();
  const meta = TIPOS_INFORME_META[tipoInforme];

  const cicloId = cicloActual?.id;
  const cacheKey = cicloId ? buildInformesDashboardKey(cicloId, tipoInforme) : null;
  const snapshot = useInformesDashboardStore((state) => (
    cacheKey ? state.snapshotsByKey[cacheKey] : undefined
  ));
  const beginRefresh = useInformesDashboardStore((state) => state.beginRefresh);
  const receiveEtapas = useInformesDashboardStore((state) => state.receiveEtapas);
  const setSelectedMateria = useInformesDashboardStore((state) => state.setSelectedMateria);

  const data = snapshot?.etapas ?? null;
  const selectedMateriaId = useMemo(() => {
    if (!data) return snapshot?.selectedMateriaId ?? null;
    if (
      snapshot?.selectedMateriaId &&
      data.materiasEspeciales.some((m) => m.id === snapshot.selectedMateriaId)
    ) {
      return snapshot.selectedMateriaId;
    }
    return data.materiasEspeciales[0]?.id ?? null;
  }, [data, snapshot?.selectedMateriaId]);

  const [syncStatus, setSyncStatus] = useState<'idle' | 'pending' | 'refreshing'>(() => (
    !cicloId || data ? 'idle' : 'refreshing'
  ));
  const effectiveSyncStatus = cicloId ? syncStatus : 'idle';
  const [loadError, setLoadError] = useState(false);

  const [gestorOpen, setGestorOpen] = useState(false);
  const [modalCursoId, setModalCursoId] = useState<string | null>(null);
  const [modalMateriaId, setModalMateriaId] = useState<string | null>(null);

  const [editingTeacherCell, setEditingTeacherCell] = useState<CeldaEtapaInforme | null>(null);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  const toggleExpandedRow = useCallback((rowKey: string) => {
    setExpandedRowKeys((prev) => (
      prev.includes(rowKey) ? prev.filter((k) => k !== rowKey) : [...prev, rowKey]
    ));
  }, []);

  const refreshDashboard = useRef<(immediate?: boolean) => void>(() => undefined);

  useEffect(() => {
    if (!cicloId || !cacheKey) return;

    let active = true;
    let inFlight = false;
    let dirty = false;
    let immediateAfterFlight = false;
    let pendingSince = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastFocusRevalidateAt = 0;

    const run = async () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
      pendingSince = 0;
      inFlight = true;
      setSyncStatus('refreshing');
      const requestSeq = beginRefresh(cacheKey);

      try {
        const res = await informesService.getEtapas(cicloId, tipoInforme);
        if (!active) return;
        receiveEtapas(cacheKey, requestSeq, res);
        setLoadError(false);
      } catch (err) {
        if (!active) return;
        console.error(err);
        const hasCache = Boolean(
          useInformesDashboardStore.getState().snapshotsByKey[cacheKey]?.etapas,
        );
        if (!hasCache) {
          setLoadError(true);
        }
        message.error('No se pudo cargar el estado de los informes');
      } finally {
        inFlight = false;
        if (active) {
          if (dirty) {
            const immediate = immediateAfterFlight;
            dirty = false;
            immediateAfterFlight = false;
            schedule(immediate);
          } else {
            setSyncStatus('idle');
          }
        }
      }
    };

    const schedule = (immediate = false) => {
      if (!active) return;
      if (inFlight) {
        dirty = true;
        immediateAfterFlight ||= immediate;
        if (!pendingSince) pendingSince = Date.now();
        return;
      }
      if (timer) clearTimeout(timer);
      timer = undefined;
      if (immediate) {
        void run();
        return;
      }
      if (!pendingSince) pendingSince = Date.now();
      const remaining = REALTIME_REFRESH_MAX_WAIT_MS - (Date.now() - pendingSince);
      setSyncStatus('pending');
      timer = setTimeout(() => void run(), Math.min(REALTIME_REFRESH_DELAY_MS, Math.max(0, remaining)));
    };

    const revalidateOnReturn = () => {
      if (!active || document.visibilityState !== 'visible') return;
      const now = Date.now();
      const lastSynced = useInformesDashboardStore.getState().snapshotsByKey[cacheKey]?.lastSyncedAt || 0;
      if (now - lastSynced < FOCUS_REVALIDATE_THROTTLE_MS) return;
      if (now - lastFocusRevalidateAt < FOCUS_REVALIDATE_THROTTLE_MS) return;
      lastFocusRevalidateAt = now;
      schedule(true);
    };

    refreshDashboard.current = schedule;
    window.addEventListener('focus', revalidateOnReturn);
    document.addEventListener('visibilitychange', revalidateOnReturn);
    void run();

    return () => {
      active = false;
      window.removeEventListener('focus', revalidateOnReturn);
      document.removeEventListener('visibilitychange', revalidateOnReturn);
      if (timer) clearTimeout(timer);
      refreshDashboard.current = () => undefined;
    };
  }, [beginRefresh, cacheKey, cicloId, message, receiveEtapas, tipoInforme]);

  const handleRealtimeChange = useCallback(() => {
    refreshDashboard.current(false);
  }, []);

  useInformesRealtime(handleRealtimeChange, { debounceMs: 0, listenFocus: false });

  const cursosById = useMemo(
    () => new Map((data?.cursos || []).map((c) => [c.id, c])),
    [data?.cursos],
  );
  const materiasById = useMemo(
    () => new Map((data?.materiasEspeciales || []).map((m) => [m.id, m])),
    [data?.materiasEspeciales],
  );

  const filteredRows = useMemo<TableroRow[]>(() => {
    if (!data) return [];
    const cells = data.requiereMateriaEspecial
      ? data.celdas.filter((c) => c.materiaId === selectedMateriaId)
      : data.celdas;

    return cells.map((cell) => {
      const curso = cursosById.get(cell.cursoId);
      const materia = cell.materiaId ? materiasById.get(cell.materiaId) : undefined;
      return {
        ...cell,
        rowKey: `${cell.cursoId}:${cell.materiaId || 'grado'}`,
        cursoNombre: curso?.nombre || 'Curso',
        cursoTurno: curso?.turno || '',
        materiaNombre: formatMateriaNombreUI(materia?.nombre) || null,
      };
    });
  }, [cursosById, data, materiasById, selectedMateriaId]);

  const hasInicialRows = useMemo(
    () =>
      filteredRows.some((row) => {
        const curso = cursosById.get(row.cursoId);
        return isInicialCursoInforme(curso || { nombre: row.cursoNombre });
      }),
    [cursosById, filteredRows],
  );

  const columns: ColumnsType<TableroRow> = [
    {
      title: hasInicialRows ? 'SALA / GRADO' : 'GRADO',
      dataIndex: 'cursoNombre',
      key: 'grado',
      width: '15%',
      className: styles.gradeColumn,
      render: (cursoNombre: string, row) => {
        const gradeConfig = getGradeColorConfig(cursoNombre);
        const isKindergarten = Boolean(gradeConfig.roomKey);
        const isExpanded = expandedRowKeys.includes(row.rowKey);
        return (
          <Tooltip title={isExpanded ? 'Ocultar nómina de alumnos' : 'Ver nómina de alumnos del curso'}>
            <button
              type="button"
              className={styles.courseExpandTrigger}
              onClick={() => toggleExpandedRow(row.rowKey)}
              aria-expanded={isExpanded}
              aria-label={`Ver nómina de ${cursoNombre}`}
            >
              <span className={styles.courseExpandChevron} aria-hidden="true">
                {isExpanded ? <DownOutlined /> : <RightOutlined />}
              </span>
              <Tag
                style={{
                  backgroundColor: isKindergarten ? gradeConfig.bgColor : 'var(--cys-color-primary-bg)',
                  color: isKindergarten ? gradeConfig.textColor : 'var(--cys-color-primary-text)',
                  border: `1px solid ${isKindergarten ? gradeConfig.borderColor : 'var(--cys-color-primary-border)'}`,
                  fontWeight: 800,
                  fontSize: isKindergarten ? 13 : 14,
                  padding: '3px 10px',
                  borderRadius: 7,
                  margin: 0,
                }}
              >
                {isKindergarten ? gradeConfig.label : gradeConfig.shortLabel}
              </Tag>
            </button>
          </Tooltip>
        );
      },
    },
    {
      title: 'LLENADO',
      key: 'llenado',
      width: '22%',
      render: (_, row) => {
        const totalAlumnos = row.inscripcionesEvaluables.length;
        const pct = totalAlumnos > 0 ? Math.round((row.alumnosCompletos / totalAlumnos) * 100) : 0;
        const isComplete = totalAlumnos > 0 && row.alumnosCompletos === totalAlumnos;
        const isInProgress = row.alumnosCompletos > 0 && !isComplete;
        return (
          <div className={styles.progressCell}>
            <div className={styles.progressMeta}>
              <Text strong style={{ fontSize: 12.5 }}>
                {row.alumnosCompletos} de {totalAlumnos} alumnos
              </Text>
              <Text
                strong
                style={{
                  fontSize: 12.5,
                  color: isComplete
                    ? 'var(--cys-color-success-text)'
                    : isInProgress
                      ? 'var(--cys-color-warning-text)'
                      : 'var(--cys-color-text-description)',
                }}
              >
                {pct}%
              </Text>
            </div>
            <Progress
              percent={pct}
              showInfo={false}
              strokeColor={isComplete ? '#10b981' : isInProgress ? '#f59e0b' : '#cbd5e1'}
              size="small"
            />
          </div>
        );
      },
    },
    {
      title: 'REVISIÓN',
      key: 'revision',
      width: '20%',
      render: (_, row) => {
        const delivered = row.etapa === 'REVISION_DIRECTIVA' || row.etapa === 'LISTO_PARA_PDF';
        if (!delivered) {
          return <Text type="secondary">No habilitada · espera la entrega</Text>;
        }
        const pct = row.totalInformes > 0 ? Math.round((row.visados / row.totalInformes) * 100) : 0;
        return (
          <div className={styles.progressCell}>
            <div className={styles.progressMeta}>
              <Text strong style={{ fontSize: 12.5 }}>
                {row.visados} de {row.totalInformes} visados
              </Text>
              <Text strong style={{ fontSize: 12.5 }}>{pct}%</Text>
            </div>
            <Progress
              percent={pct}
              showInfo={false}
              strokeColor={
                row.etapa === 'LISTO_PARA_PDF'
                  ? 'var(--cys-color-success-text)'
                  : 'var(--cys-color-primary-text)'
              }
              size="small"
            />
          </div>
        );
      },
    },
    {
      title: 'ESTADO',
      key: 'estado',
      width: '15%',
      render: (_, row) => {
        if (row.etapa === 'LISTO_PARA_PDF') {
          return <Tag color="success" icon={<CheckCircleOutlined />}>Listo para PDF</Tag>;
        }
        if (row.etapa === 'REVISION_DIRECTIVA') {
          return <Tag color="processing" icon={<EyeOutlined />}>En revisión</Tag>;
        }
        if (row.etapa === 'CARGA_DOCENTE') {
          return <Tag color="warning" icon={<ClockCircleOutlined />}>En carga</Tag>;
        }
        if (row.etapa === 'CARGA_PAUSADA') {
          return <Tag color="warning" icon={<PauseCircleOutlined />}>Pausada</Tag>;
        }
        if (row.etapa === 'PENDIENTE_CONFIGURACION') {
          return <Tag color="default" icon={<ExclamationCircleOutlined />}>Sin plantilla</Tag>;
        }
        return <Tag color="error" icon={<ExclamationCircleOutlined />}>Sin enlace</Tag>;
      },
    },
    {
      title: 'DOCENTE',
      key: 'docente',
      width: '17%',
      render: (_, row) => {
        if (!row.docenteNombre && !row.docenteApellido) {
          return <Text type="secondary">—</Text>;
        }
        const fullName = `${row.docenteApellido || ''}, ${row.docenteNombre || ''}`.replace(/^,\s*|,\s*$/g, '');
        return (
          <Space size={6}>
            <Text strong>{fullName}</Text>
            {row.instanciaId && (
              <Tooltip title="Editar nombre y apellido de la docente">
                <Button
                  size="small"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => setEditingTeacherCell(row)}
                  aria-label={`Editar docente ${fullName}`}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: 'ACCIONES',
      key: 'acciones',
      width: '15%',
      render: (_, row) => {
        const delivered = row.etapa === 'REVISION_DIRECTIVA' || row.etapa === 'LISTO_PARA_PDF';
        if (delivered && row.instanciaId) {
          return (
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => onOpenInstancia(row.instanciaId!)}
              className={styles.actionButton}
            >
              Abrir informe
            </Button>
          );
        }
        if (row.etapa === 'PENDIENTE_CONFIGURACION') {
          return (
            <Button disabled className={styles.actionButton}>
              Sin plantilla
            </Button>
          );
        }
        const hasActiveLink = Boolean(row.enlace);
        const isPaused = row.etapa === 'CARGA_PAUSADA';
        return (
          <Button
            type={hasActiveLink ? 'default' : 'primary'}
            icon={<LinkOutlined />}
            onClick={() => {
              setModalCursoId(row.cursoId);
              setModalMateriaId(row.materiaId);
              setGestorOpen(true);
            }}
            className={styles.actionButton}
          >
            {hasActiveLink ? 'Gestionar' : isPaused ? 'Reanudar' : 'Generar'}
          </Button>
        );
      },
    },
  ];

  return (
    <SectionLayout
      title="Informes"
      icon={<FileTextOutlined />}
      actions={
        <Space size="middle" wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={onBackToSelection}>
            Cambiar instancia
          </Button>
          <Button
            icon={<LinkOutlined className={ui.primary} />}
            onClick={() => {
              setModalCursoId(null);
              setModalMateriaId(selectedMateriaId);
              setGestorOpen(true);
            }}
            style={{ borderRadius: 8, fontWeight: 600 }}
          >
            Gestor de Enlaces Mágicos
          </Button>
          <Tooltip title={effectiveSyncStatus === 'pending' ? 'Hay cambios pendientes · actualizar ahora' : 'Actualizar estado de los informes'}>
            <Badge dot={effectiveSyncStatus === 'pending'}>
              <Button
                icon={<ReloadOutlined />}
                loading={effectiveSyncStatus === 'refreshing'}
                onClick={() => refreshDashboard.current(true)}
                aria-label={effectiveSyncStatus === 'pending' ? 'Actualizar ahora: hay cambios pendientes' : 'Actualizar estado de los informes'}
              />
            </Badge>
          </Tooltip>
        </Space>
      }
    >
      <div className={styles.instanceBanner}>
        <div className={styles.instanceIdentity}>
          <span className={styles.instanceIconBox} aria-hidden="true">
            <FileTextOutlined />
          </span>
          <div className={styles.instanceTextGroup}>
            <Typography.Title level={4} className={styles.instanceTitle}>
              {meta.titulo}
            </Typography.Title>
          </div>
        </div>
      </div>

      {data && data.requiereMateriaEspecial && (
        <Card className={styles.filterCard} styles={{ body: { padding: '14px 18px' } }}>
          <div className={styles.filterRow}>
            <Space size={8}>
              <BookOutlined style={{ color: 'var(--cys-color-primary-text)' }} />
              <Text strong>Asignatura:</Text>
            </Space>

            <div className={styles.pillsRow}>
              {data.materiasEspeciales.map((mat) => (
                <Button
                  key={mat.id}
                  size="small"
                  type={selectedMateriaId === mat.id ? 'primary' : 'default'}
                  onClick={() => {
                    if (cacheKey) {
                      setSelectedMateria(cacheKey, mat.id);
                    }
                  }}
                >
                  {formatMateriaNombreUI(mat.nombre)}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {!data && effectiveSyncStatus === 'refreshing' ? (
        <Card style={{ textAlign: 'center', padding: 80, borderRadius: 16 }}>
          <Spin size="large" description="Calculando estado de los informes..." />
        </Card>
      ) : !data && loadError ? (
        <Alert
          type="error"
          showIcon
          title="No se pudo cargar el tablero de informes"
          action={<Button onClick={() => refreshDashboard.current(true)}>Reintentar</Button>}
        />
      ) : filteredRows.length === 0 ? (
        <Card className={ui.loadingPanel}>
          <Empty description="No hay registros para la vista seleccionada." />
        </Card>
      ) : (
        <Card className="students-card">
          <Table
            className="students-table"
            columns={columns}
            dataSource={filteredRows}
            rowKey="rowKey"
            pagination={false}
            tableLayout="fixed"
            scroll={{ x: 980 }}
            expandable={{
              expandedRowKeys,
              showExpandColumn: false,
              expandedRowRender: (row) => (
                cicloId ? (
                  <CourseRosterExpandPanel
                    cacheKey={`${row.rowKey}:${snapshot?.lastSyncedAt ?? 0}`}
                    fetchRoster={() =>
                      informesService.getCursoNomina(cicloId, tipoInforme, row.cursoId, row.materiaId)
                    }
                  />
                ) : null
              ),
            }}
          />
        </Card>
      )}

      {data && cicloActual && (
        <GestorEnlacesInformesModal
          open={gestorOpen}
          onClose={() => setGestorOpen(false)}
          cicloId={cicloActual.id}
          tipoInforme={tipoInforme}
          cursos={data.cursos}
          materiasEspeciales={data.materiasEspeciales}
          celdas={data.celdas}
          activeCursoId={modalCursoId}
          activeMateriaId={modalMateriaId}
          onChanged={() => refreshDashboard.current(true)}
        />
      )}

      <EditarDocenteInformeModal
        open={Boolean(editingTeacherCell)}
        instanciaId={editingTeacherCell?.instanciaId || null}
        docenteNombreInicial={editingTeacherCell?.docenteNombre || ''}
        docenteApellidoInicial={editingTeacherCell?.docenteApellido || ''}
        expectedRevision={editingTeacherCell?.revision}
        onClose={() => setEditingTeacherCell(null)}
        onSaved={() => refreshDashboard.current(true)}
      />
    </SectionLayout>
  );
};
