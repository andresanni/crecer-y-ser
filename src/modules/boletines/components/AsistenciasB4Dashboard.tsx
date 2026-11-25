import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Progress,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  LinkOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getGradeColorConfig } from '../../alumnos/utils/gradeColors';
import { asistenciasB4Service } from '../services/asistenciasB4.service';
import type { CursoAsistenciaB4Etapa } from '../models/asistenciasB4.model';
import { GestorEnlacesAsistenciasB4Modal } from './GestorEnlacesAsistenciasB4Modal';

interface AsistenciasB4DashboardProps {
  periodoId: string;
  onOpenCourse: (cursoId: string) => void;
  refreshSignal?: number;
  openModalSignal?: number;
  onLoadingChange?: (loading: boolean) => void;
}

export const AsistenciasB4Dashboard: React.FC<AsistenciasB4DashboardProps> = ({
  periodoId,
  onOpenCourse,
  refreshSignal = 0,
  openModalSignal = 0,
  onLoadingChange,
}) => {
  const { message } = App.useApp();
  const [cursos, setCursos] = useState<CursoAsistenciaB4Etapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCursoId, setSelectedCursoId] = useState<string | null>(null);

  const loadStages = useCallback(async () => {
    try {
      setLoading(true);
      onLoadingChange?.(true);
      setLoadError(false);
      const data = await asistenciasB4Service.getStages(periodoId);
      setCursos(data);
    } catch (error) {
      console.error(error);
      setLoadError(true);
      message.error('No se pudo cargar el seguimiento de asistencias finales.');
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }, [periodoId, message, onLoadingChange]);

  useEffect(() => {
    let active = true;
    onLoadingChange?.(true);
    asistenciasB4Service.getStages(periodoId)
      .then((data) => {
        if (!active) return;
        setCursos(data);
        setLoadError(false);
      })
      .catch((error) => {
        if (!active) return;
        console.error(error);
        setLoadError(true);
        message.error('No se pudo cargar el seguimiento de asistencias finales.');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          onLoadingChange?.(false);
        }
      });
    return () => {
      active = false;
    };
  }, [periodoId, refreshSignal, message, onLoadingChange]);

  const lastHandledModalSignalRef = useRef(openModalSignal);

  useEffect(() => {
    if (openModalSignal <= lastHandledModalSignalRef.current) return;
    lastHandledModalSignalRef.current = openModalSignal;
    const timer = setTimeout(() => {
      setSelectedCursoId(null);
      setModalOpen(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [openModalSignal]);

  const columns: ColumnsType<CursoAsistenciaB4Etapa> = [
    {
      title: 'GRADO',
      dataIndex: 'cursoNombre',
      key: 'cursoNombre',
      width: '16%',
      render: (name: string) => {
        const cfg = getGradeColorConfig(name);
        return (
          <Tag
            style={{
              backgroundColor: cfg.bgColor,
              color: cfg.textColor,
              borderColor: cfg.borderColor,
              fontWeight: 700,
              fontSize: 13,
              padding: '3px 10px',
              borderRadius: 8,
            }}
          >
            {name}
          </Tag>
        );
      },
    },
    {
      title: 'CARGA DE ASISTENCIAS',
      key: 'avance',
      width: '28%',
      render: (_, row) => (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Typography.Text strong style={{ fontSize: 12.5 }}>
              {row.alumnosCargados} / {row.totalAlumnos} alumnos
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {row.porcentaje}%
            </Typography.Text>
          </div>
          <Progress
            percent={row.porcentaje}
            showInfo={false}
            size="small"
            strokeColor={row.etapa === 'COMPLETADO' ? 'var(--cys-color-success-text)' : 'var(--cys-color-primary-text)'}
          />
        </div>
      ),
    },
    {
      title: 'ESTADO',
      key: 'estado',
      width: '20%',
      render: (_, row) => {
        if (row.etapa === 'COMPLETADO') {
          return <Tag color="success" icon={<CheckCircleOutlined />}>Completado</Tag>;
        }
        if (row.etapa === 'CONTROL_DIRECTIVO') {
          return <Tag color="processing" icon={<EyeOutlined />}>Faltan alumnos</Tag>;
        }
        if (row.etapa === 'CARGA_DOCENTE') {
          return <Tag color="warning" icon={<ClockCircleOutlined />}>En carga</Tag>;
        }
        if (row.etapa === 'CARGA_PAUSADA') {
          return <Tag color="warning" icon={<PauseCircleOutlined />}>Pausada</Tag>;
        }
        return <Tag color="error" icon={<ExclamationCircleOutlined />}>Sin enlace</Tag>;
      },
    },
    {
      title: 'DOCENTE',
      key: 'docente',
      width: '18%',
      render: (_, row) => row.tokenDocente ? (
        <Space size={6}>
          <LinkOutlined style={{ color: 'var(--cys-color-primary-text)' }} />
          <Typography.Text strong>{row.tokenDocente.docenteNombre}</Typography.Text>
        </Space>
      ) : row.instancia?.enviadoPor ? (
        <Typography.Text type="secondary">{row.instancia.enviadoPor}</Typography.Text>
      ) : (
        <Typography.Text type="secondary">—</Typography.Text>
      ),
    },
    {
      title: 'ACCIONES',
      key: 'acciones',
      width: '18%',
      align: 'right',
      render: (_, row) => {
        const delivered = row.etapa === 'COMPLETADO' || row.etapa === 'CONTROL_DIRECTIVO';
        if (delivered) {
          return (
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => onOpenCourse(row.cursoId)}
            >
              Ver / editar
            </Button>
          );
        }
        return (
          <Button
            type={row.tokenDocente ? 'default' : 'primary'}
            icon={<LinkOutlined />}
            onClick={() => {
              setSelectedCursoId(row.cursoId);
              setModalOpen(true);
            }}
          >
            {row.tokenDocente ? 'Gestionar' : row.etapa === 'CARGA_PAUSADA' ? 'Reanudar' : 'Generar enlace'}
          </Button>
        );
      },
    },
  ];

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Text type="secondary">
        Carga independiente de Asistencias, Inasistencias y Llegadas tarde de 4.° bimestre. Completar o corregir estos valores no retira los visados académicos.
      </Typography.Text>

      {loadError ? (
        <Alert
          type="error"
          showIcon
          title="No pudimos cargar las asistencias finales"
          action={<Button size="small" onClick={() => void loadStages()}>Reintentar</Button>}
        />
      ) : loading && cursos.length === 0 ? (
        <Card>
          <Spin description="Cargando cursos..." />
        </Card>
      ) : (
        <Card styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="cursoId"
            pagination={false}
            dataSource={cursos}
            columns={columns}
            scroll={{ x: 760 }}
          />
        </Card>
      )}

      <GestorEnlacesAsistenciasB4Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        periodoId={periodoId}
        cursos={cursos}
        activeCursoId={selectedCursoId}
        onChanged={() => void loadStages()}
      />
    </Space>
  );
};
