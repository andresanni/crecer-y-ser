import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Empty,
  Modal,
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
  EditOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  LinkOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { SectionLayout } from '../../../shared/components/SectionLayout';
import ui from '../../../shared/styles/ui.module.css';
import { useAppStore } from '../../../store/appStore';
import { getGradeColorConfig } from '../../alumnos/utils/gradeColors';
import { CursadaModal } from '../../inscripciones/components/CursadaModal';
import {
  TIPOS_INFORME_META,
  type CeldaEtapaInforme,
  type EtapasInformeData,
  type TipoInforme,
} from '../models/informe.model';
import { informesService } from '../services/informes.service';
import { useInformesRealtime } from '../hooks/useInformesRealtime';
import { GestorEnlacesInformesModal } from './GestorEnlacesInformesModal';
import { EditarDocenteInformeModal } from './EditarDocenteInformeModal';
import styles from './TableroInformesPage.module.css';

const { Text } = Typography;

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

  const [data, setData] = useState<EtapasInformeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [selectedMateriaId, setSelectedMateriaId] = useState<string | null>(null);

  const [gestorOpen, setGestorOpen] = useState(false);
  const [modalCursoId, setModalCursoId] = useState<string | null>(null);
  const [modalMateriaId, setModalMateriaId] = useState<string | null>(null);

  const [editingTeacherCell, setEditingTeacherCell] = useState<CeldaEtapaInforme | null>(null);
  const [pendingCourseId, setPendingCourseId] = useState<string | null>(null);
  const [scopeInscripcionId, setScopeInscripcionId] = useState<string | null>(null);

  const cicloId = cicloActual?.id;
  const refreshRef = useRef<() => void>(() => undefined);

  const fetchEtapas = useCallback(async () => {
    if (!cicloId) return;
    setLoading(true);
    try {
      const res = await informesService.getEtapas(cicloId, tipoInforme);
      setData(res);
      setLoadError(false);
      setSelectedMateriaId((prev) => (
        prev && res.materiasEspeciales.some((m) => m.id === prev)
          ? prev
          : res.materiasEspeciales[0]?.id ?? null
      ));
    } catch (err) {
      console.error(err);
      setLoadError(true);
      message.error('No se pudo cargar el estado de los informes');
    } finally {
      setLoading(false);
    }
  }, [cicloId, message, tipoInforme]);

  useEffect(() => {
    refreshRef.current = () => {
      void fetchEtapas();
    };
  }, [fetchEtapas]);

  useEffect(() => {
    if (!cicloId) return;
    let active = true;
    const loadInitial = async () => {
      setLoading(true);
      try {
        const res = await informesService.getEtapas(cicloId, tipoInforme);
        if (!active) return;
        setData(res);
        setLoadError(false);
        setSelectedMateriaId((prev) => (
          prev && res.materiasEspeciales.some((m) => m.id === prev)
            ? prev
            : res.materiasEspeciales[0]?.id ?? null
        ));
      } catch (err) {
        if (!active) return;
        console.error(err);
        setLoadError(true);
        message.error('No se pudo cargar el estado de los informes');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadInitial();
    return () => {
      active = false;
    };
  }, [cicloId, message, tipoInforme]);

  const handleRealtimeChange = useCallback(() => {
    refreshRef.current();
  }, []);

  useInformesRealtime(handleRealtimeChange);

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
        materiaNombre: materia?.nombre || null,
      };
    });
  }, [cursosById, data, materiasById, selectedMateriaId]);

  const pendingCourseScopes = useMemo(() => {
    if (!pendingCourseId || !data) return [];
    const cell = data.celdas.find((c) => c.cursoId === pendingCourseId);
    return cell?.cursadasPendientes || [];
  }, [data, pendingCourseId]);

  const columns: ColumnsType<TableroRow> = [
    {
      title: 'GRADO',
      dataIndex: 'cursoNombre',
      key: 'grado',
      width: '13%',
      className: styles.gradeColumn,
      render: (cursoNombre: string) => {
        const gradeConfig = getGradeColorConfig(cursoNombre);
        return (
          <Tag
            style={{
              backgroundColor: 'var(--cys-color-primary-bg)',
              color: 'var(--cys-color-primary-text)',
              border: '1px solid var(--cys-color-primary-border)',
              fontWeight: 800,
              fontSize: 14,
              padding: '3px 10px',
              borderRadius: 7,
              margin: 0,
            }}
          >
            {gradeConfig.shortLabel}
          </Tag>
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
            {!!row.cursadasPendientes?.length && (
              <Button
                size="small"
                style={{ marginBottom: 4 }}
                onClick={() => setPendingCourseId(row.cursoId)}
              >
                {row.cursadasPendientes.length} cursada(s) por confirmar
              </Button>
            )}
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
          <Tooltip title="Actualizar estado de los informes">
            <Badge dot={false}>
              <Button
                icon={<ReloadOutlined />}
                loading={loading}
                onClick={() => void fetchEtapas()}
                aria-label="Actualizar estado de los informes"
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
                  onClick={() => setSelectedMateriaId(mat.id)}
                >
                  {mat.nombre}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {!data && loading ? (
        <Card style={{ textAlign: 'center', padding: 80, borderRadius: 16 }}>
          <Spin size="large" description="Calculando estado de los informes..." />
        </Card>
      ) : !data && loadError ? (
        <Alert
          type="error"
          showIcon
          title="No se pudo cargar el tablero de informes"
          action={<Button onClick={() => void fetchEtapas()}>Reintentar</Button>}
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
          onChanged={() => void fetchEtapas()}
        />
      )}

      <EditarDocenteInformeModal
        open={Boolean(editingTeacherCell)}
        instanciaId={editingTeacherCell?.instanciaId || null}
        docenteNombreInicial={editingTeacherCell?.docenteNombre || ''}
        docenteApellidoInicial={editingTeacherCell?.docenteApellido || ''}
        expectedRevision={editingTeacherCell?.revision}
        onClose={() => setEditingTeacherCell(null)}
        onSaved={() => void fetchEtapas()}
      />

      <Modal
        open={Boolean(pendingCourseId) && !scopeInscripcionId}
        title="Cursadas por confirmar"
        onCancel={() => setPendingCourseId(null)}
        footer={null}
      >
        <Alert
          type="warning"
          showIcon
          title="Confirmá los bimestres evaluables antes de las entregas definitivas."
          style={{ marginBottom: 12 }}
        />
        <Table
          rowKey="inscripcionId"
          size="small"
          dataSource={pendingCourseScopes}
          pagination={false}
          columns={[
            { title: 'Alumno', dataIndex: 'nombreCompleto' },
            {
              title: 'Cursada',
              render: (_, row) => (
                <Button onClick={() => setScopeInscripcionId(row.inscripcionId)}>
                  Confirmar
                </Button>
              ),
            },
          ]}
        />
      </Modal>

      {scopeInscripcionId && (
        <CursadaModal
          key={scopeInscripcionId}
          inscripcionId={scopeInscripcionId}
          onClose={() => setScopeInscripcionId(null)}
          onSuccess={() => void fetchEtapas()}
        />
      )}
    </SectionLayout>
  );
};
