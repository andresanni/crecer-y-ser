import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  InputNumber,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { SectionLayout } from '../../../shared/components/SectionLayout';
import {
  asistenciasB4Service,
  AttendanceRevisionConflictError,
} from '../services/asistenciasB4.service';
import type {
  AlumnoAsistenciaB4Row,
  CursoAsistenciaB4Snapshot,
} from '../models/asistenciasB4.model';

interface DraftValues {
  asistencias: number | null;
  inasistencias: number | null;
  llegadasTarde: number | null;
}

interface RevisionAsistenciasB4PageProps {
  cursoId: string;
  periodoId: string;
  onBack: () => void;
}

export const RevisionAsistenciasB4Page: React.FC<RevisionAsistenciasB4PageProps> = ({
  cursoId,
  periodoId,
  onBack,
}) => {
  const { message } = App.useApp();
  const [snapshot, setSnapshot] = useState<CursoAsistenciaB4Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, DraftValues>>({});
  const [modifiedIds, setModifiedIds] = useState<Record<string, boolean>>({});

  const hydrateFromSnapshot = useCallback((data: CursoAsistenciaB4Snapshot) => {
    setSnapshot(data);
    const nextDrafts: Record<string, DraftValues> = {};
    for (const row of data.alumnos) {
      nextDrafts[row.inscripcionId] = {
        asistencias: row.asistencias,
        inasistencias: row.inasistencias,
        llegadasTarde: row.llegadasTarde,
      };
    }
    setDrafts(nextDrafts);
    setModifiedIds({});
    setConflict(false);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await asistenciasB4Service.getStaffCourse(cursoId, periodoId);
      hydrateFromSnapshot(data);
    } catch (error) {
      console.error(error);
      message.error('No se pudieron cargar las asistencias finales del curso.');
    } finally {
      setLoading(false);
    }
  }, [cursoId, periodoId, hydrateFromSnapshot, message]);

  useEffect(() => {
    let active = true;
    asistenciasB4Service.getStaffCourse(cursoId, periodoId)
      .then((data) => {
        if (active) hydrateFromSnapshot(data);
      })
      .catch((error) => {
        if (!active) return;
        console.error(error);
        message.error('No se pudieron cargar las asistencias finales del curso.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cursoId, periodoId, hydrateFromSnapshot, message]);

  const isEditable = snapshot?.instancia?.estado === 'CONTROL_DIRECTIVO';
  const dirtyIds = Object.keys(modifiedIds).filter((id) => modifiedIds[id]);
  const hasChanges = dirtyIds.length > 0;

  const handleFieldChange = (
    inscripcionId: string,
    field: keyof DraftValues,
    value: number | null,
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [inscripcionId]: {
        asistencias: prev[inscripcionId]?.asistencias ?? null,
        inasistencias: prev[inscripcionId]?.inasistencias ?? null,
        llegadasTarde: prev[inscripcionId]?.llegadasTarde ?? null,
        [field]: value,
      },
    }));
    setModifiedIds((prev) => ({ ...prev, [inscripcionId]: true }));
  };

  const handleSave = async () => {
    if (!snapshot?.instancia || !hasChanges) return;
    const filas = [];
    for (const inscripcionId of dirtyIds) {
      const item = drafts[inscripcionId];
      if (
        item?.asistencias === null || item?.asistencias === undefined
        || item?.inasistencias === null || item?.inasistencias === undefined
        || item?.llegadasTarde === null || item?.llegadasTarde === undefined
      ) {
        const studentName = snapshot.alumnos.find((a) => a.inscripcionId === inscripcionId)?.nombreCompleto || 'un alumno';
        message.warning(`Completá los tres valores numéricos para ${studentName} antes de guardar.`);
        return;
      }
      filas.push({
        inscripcionId,
        asistencias: item.asistencias,
        inasistencias: item.inasistencias,
        llegadasTarde: item.llegadasTarde,
      });
    }

    try {
      setSaving(true);
      const updated = await asistenciasB4Service.saveStaffCourse(
        cursoId,
        periodoId,
        snapshot.instancia.revision,
        filas,
      );
      hydrateFromSnapshot(updated);
      message.success('Asistencias finales guardadas correctamente (los visados académicos se mantienen intactos).');
    } catch (error) {
      if (error instanceof AttendanceRevisionConflictError) {
        setConflict(true);
        message.error('Otra sesión modificó las asistencias. Recargá para ver la versión actual.');
      } else {
        console.error(error);
        message.error('No se pudieron guardar los cambios.');
      }
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<AlumnoAsistenciaB4Row> = [
    {
      title: 'Alumno',
      key: 'alumno',
      render: (_, row) => (
        <Space size={8}>
          {row.numeroOrden !== null && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              #{row.numeroOrden}
            </Typography.Text>
          )}
          <Typography.Text strong>{row.nombreCompleto}</Typography.Text>
          {modifiedIds[row.inscripcionId] && <Tag color="purple">Modificado</Tag>}
        </Space>
      ),
    },
    {
      title: 'Asistencias',
      key: 'asistencias',
      width: 140,
      render: (_, row) => {
        const val = drafts[row.inscripcionId]?.asistencias ?? null;
        return isEditable ? (
          <InputNumber
            min={0}
            max={180}
            precision={0}
            value={val}
            onChange={(v) => handleFieldChange(row.inscripcionId, 'asistencias', v)}
            style={{ width: '100%' }}
          />
        ) : (
          <Typography.Text>{val ?? '—'}</Typography.Text>
        );
      },
    },
    {
      title: 'Inasistencias',
      key: 'inasistencias',
      width: 140,
      render: (_, row) => {
        const val = drafts[row.inscripcionId]?.inasistencias ?? null;
        return isEditable ? (
          <InputNumber
            min={0}
            max={180}
            precision={0}
            value={val}
            onChange={(v) => handleFieldChange(row.inscripcionId, 'inasistencias', v)}
            style={{ width: '100%' }}
          />
        ) : (
          <Typography.Text>{val ?? '—'}</Typography.Text>
        );
      },
    },
    {
      title: 'Llegadas tarde',
      key: 'llegadasTarde',
      width: 150,
      render: (_, row) => {
        const val = drafts[row.inscripcionId]?.llegadasTarde ?? null;
        return isEditable ? (
          <InputNumber
            min={0}
            max={180}
            precision={0}
            value={val}
            onChange={(v) => handleFieldChange(row.inscripcionId, 'llegadasTarde', v)}
            style={{ width: '100%' }}
          />
        ) : (
          <Typography.Text>{val ?? '—'}</Typography.Text>
        );
      },
    },
  ];

  return (
    <SectionLayout
      title={snapshot ? `Asistencias finales · ${snapshot.curso.nombre}` : 'Asistencias finales'}
      icon={<CheckCircleOutlined />}
      actions={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            Volver al tablero
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => void loadData()} loading={loading}>
            Actualizar
          </Button>
          {isEditable && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              disabled={!hasChanges || conflict}
              loading={saving}
              onClick={() => void handleSave()}
            >
              Guardar cambios ({dirtyIds.length})
            </Button>
          )}
        </Space>
      }
    >
      {loading && !snapshot ? (
        <Card>
          <Spin description="Cargando asistencias finales..." />
        </Card>
      ) : snapshot ? (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          {conflict && (
            <Alert
              type="error"
              showIcon
              title="Conflicto de edición"
              description="Otra sesión actualizó estas asistencias. Hacé clic en Actualizar para recargar antes de guardar."
              action={
                <Button size="small" onClick={() => void loadData()}>
                  Recargar
                </Button>
              }
            />
          )}
          {!isEditable && (
            <Alert
              type="info"
              showIcon
              title="Carga docente en curso"
              description="Las asistencias finales de este curso todavía no fueron entregadas por la docente. Cuando se entreguen, Dirección podrá revisarlas y corregirlas aquí."
            />
          )}
          <Card>
            <Table
              rowKey="inscripcionId"
              size="middle"
              pagination={false}
              dataSource={snapshot.alumnos}
              columns={columns}
              scroll={{ x: 640 }}
            />
          </Card>
        </Space>
      ) : null}
    </SectionLayout>
  );
};
