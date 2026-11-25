import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  InputNumber,
  Result,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  SaveOutlined,
  SendOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  asistenciasB4Service,
  AttendanceLinkDeniedError,
  AttendanceSubmitIncompleteError,
} from '../services/asistenciasB4.service';
import type {
  AlumnoAsistenciaB4Row,
  CursoAsistenciaB4Snapshot,
} from '../models/asistenciasB4.model';
import styles from './CargaAsistenciasB4PublicaPage.module.css';

interface RowDraft {
  asistencias: number | null;
  inasistencias: number | null;
  llegadasTarde: number | null;
}

export const CargaAsistenciasB4PublicaPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const [token] = useState(() => asistenciasB4Service.readTokenFromLocation());
  const [snapshot, setSnapshot] = useState<CursoAsistenciaB4Snapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(
    token ? null : 'No se proporcionó ningún enlace de acceso.',
  );
  const [submitted, setSubmitted] = useState<{ totalAlumnos: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [modifiedIds, setModifiedIds] = useState<Record<string, boolean>>({});

  const hydrate = useCallback((data: CursoAsistenciaB4Snapshot) => {
    setSnapshot(data);
    const next: Record<string, RowDraft> = {};
    for (const row of data.alumnos) {
      next[row.inscripcionId] = {
        asistencias: row.asistencias,
        inasistencias: row.inasistencias,
        llegadasTarde: row.llegadasTarde,
      };
    }
    setDrafts(next);
    setModifiedIds({});
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    asistenciasB4Service.getTeacherContext(token)
      .then((data) => {
        if (active) {
          hydrate(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error(err);
        setError(
          err instanceof AttendanceLinkDeniedError
            ? 'Este enlace ya no es válido, fue reemplazado o las asistencias ya fueron entregadas.'
            : 'No pudimos cargar el formulario de asistencias. Intentá nuevamente.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, hydrate]);

  const handleFieldChange = (
    inscripcionId: string,
    field: keyof RowDraft,
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

  const dirtyIds = Object.keys(modifiedIds).filter((id) => modifiedIds[id]);
  const hasChanges = dirtyIds.length > 0;

  const isRowComplete = (inscripcionId: string) => {
    const item = drafts[inscripcionId];
    return (
      item !== undefined
      && item.asistencias !== null && item.asistencias !== undefined
      && item.inasistencias !== null && item.inasistencias !== undefined
      && item.llegadasTarde !== null && item.llegadasTarde !== undefined
    );
  };

  const allComplete = Boolean(
    snapshot && snapshot.alumnos.length > 0 && snapshot.alumnos.every((a) => isRowComplete(a.inscripcionId)),
  );

  const handleSave = async (): Promise<boolean> => {
    if (!token || !snapshot || !hasChanges) return true;
    const filas = [];
    for (const inscripcionId of dirtyIds) {
      const item = drafts[inscripcionId];
      if (!isRowComplete(inscripcionId)) {
        const studentName = snapshot.alumnos.find((a) => a.inscripcionId === inscripcionId)?.nombreCompleto || 'un alumno';
        message.warning(`Completá los tres campos numéricos para ${studentName} (0 es un valor válido).`);
        return false;
      }
      filas.push({
        inscripcionId,
        asistencias: item.asistencias as number,
        inasistencias: item.inasistencias as number,
        llegadasTarde: item.llegadasTarde as number,
      });
    }

    try {
      setSaving(true);
      const updated = await asistenciasB4Service.saveTeacherRows(token, filas);
      hydrate(updated);
      message.success('Borrador guardado correctamente.');
      return true;
    } catch (err) {
      if (err instanceof AttendanceLinkDeniedError) {
        setError('El enlace ya no está vigente.');
      } else {
        console.error(err);
        message.error('No se pudo guardar el borrador.');
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = () => {
    if (!token || !snapshot) return;
    if (hasChanges) {
      message.warning('Guardá los cambios pendientes antes de enviar.');
      return;
    }
    modal.confirm({
      title: '¿Enviar asistencias finales a Dirección?',
      content: `Se entregarán las asistencias finales de ${snapshot.curso.nombre} (${snapshot.totalAlumnos} alumnos). Una vez enviadas, este enlace quedará cerrado.`,
      okText: 'Confirmar y enviar',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          setSubmitting(true);
          const result = await asistenciasB4Service.submitTeacher(token);
          setSubmitted(result);
        } catch (err) {
          if (err instanceof AttendanceSubmitIncompleteError) {
            message.warning(`Faltan completar ${err.detail.pendientes.length} alumno(s) antes de enviar.`);
          } else if (err instanceof AttendanceLinkDeniedError) {
            setError('El enlace ya no está vigente.');
          } else {
            console.error(err);
            message.error('No se pudieron enviar las asistencias.');
          }
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <Card>
          <Spin description="Validando enlace de asistencias..." />
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={styles.pageContainer}>
        <Card>
          <Result
            status="success"
            title="Asistencias finales enviadas"
            subTitle={`Se entregaron correctamente las asistencias de ${submitted.totalAlumnos} alumnos a Dirección. Ya podés cerrar esta ventana.`}
          />
        </Card>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className={styles.pageContainer}>
        <Card>
          <Result
            status="warning"
            title="Enlace no disponible"
            subTitle={error || 'El enlace solicitado no es válido.'}
          />
        </Card>
      </div>
    );
  }

  const loadedCount = snapshot.alumnos.filter((a) => isRowComplete(a.inscripcionId)).length;

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
          {isRowComplete(row.inscripcionId) && !modifiedIds[row.inscripcionId] && (
            <CheckCircleOutlined style={{ color: 'var(--cys-color-success-text)' }} />
          )}
          {modifiedIds[row.inscripcionId] && <Tag color="purple">Sin guardar</Tag>}
        </Space>
      ),
    },
    {
      title: 'Asistencias',
      key: 'asistencias',
      width: 140,
      render: (_, row) => (
        <InputNumber
          min={0}
          max={180}
          precision={0}
          placeholder="0"
          value={drafts[row.inscripcionId]?.asistencias ?? null}
          onChange={(v) => handleFieldChange(row.inscripcionId, 'asistencias', v)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Inasistencias',
      key: 'inasistencias',
      width: 140,
      render: (_, row) => (
        <InputNumber
          min={0}
          max={180}
          precision={0}
          placeholder="0"
          value={drafts[row.inscripcionId]?.inasistencias ?? null}
          onChange={(v) => handleFieldChange(row.inscripcionId, 'inasistencias', v)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Llegadas tarde',
      key: 'llegadasTarde',
      width: 150,
      render: (_, row) => (
        <InputNumber
          min={0}
          max={180}
          precision={0}
          placeholder="0"
          value={drafts[row.inscripcionId]?.llegadasTarde ?? null}
          onChange={(v) => handleFieldChange(row.inscripcionId, 'llegadasTarde', v)}
          style={{ width: '100%' }}
        />
      ),
    },
  ];

  return (
    <div className={styles.pageContainer}>
      <Card className={styles.publicHeaderCard}>
        <div className={styles.headerRow}>
          <div className={styles.brandGroup}>
            <img src="/escudo-circular.png" alt="Escudo Crecer y Ser" className={styles.schoolLogo} />
            <div>
              <Typography.Title level={4} className={styles.headerTitle}>
                Asistencias Finales · {snapshot.curso.nombre}
              </Typography.Title>
              <div className={styles.headerSubtitle}>
                {snapshot.periodo.nombre} · Docente: {snapshot.docenteNombre || 'Docente de grado'}
              </div>
            </div>
          </div>
          <Tag color="blue" style={{ fontWeight: 700, fontSize: 13, padding: '4px 10px' }}>
            {loadedCount} / {snapshot.totalAlumnos} completos
          </Tag>
        </div>
      </Card>

      <div className={styles.summaryBar}>
        <Alert
          type="info"
          showIcon
          title="Completá Asistencias, Inasistencias y Llegadas tarde para cada alumno (0 es un valor válido). Podés guardar avances parciales y enviar cuando estén todos completos."
          style={{ width: '100%' }}
        />
      </div>

      <div className={styles.desktopTable}>
        <Card styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="inscripcionId"
            size="middle"
            pagination={false}
            dataSource={snapshot.alumnos}
            columns={columns}
          />
        </Card>
      </div>

      <div className={styles.mobileCards}>
        {snapshot.alumnos.map((row) => (
          <Card key={row.inscripcionId} size="small" className={styles.studentCard}>
            <Space size={8} wrap>
              {row.numeroOrden !== null && (
                <Typography.Text type="secondary">#{row.numeroOrden}</Typography.Text>
              )}
              <Typography.Text strong>{row.nombreCompleto}</Typography.Text>
              {modifiedIds[row.inscripcionId] && <Tag color="purple">Sin guardar</Tag>}
            </Space>
            <div className={styles.studentCardInputs}>
              <div>
                <span className={styles.fieldLabel}>ASIST.</span>
                <InputNumber
                  min={0}
                  max={180}
                  precision={0}
                  placeholder="0"
                  value={drafts[row.inscripcionId]?.asistencias ?? null}
                  onChange={(v) => handleFieldChange(row.inscripcionId, 'asistencias', v)}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <span className={styles.fieldLabel}>INASIST.</span>
                <InputNumber
                  min={0}
                  max={180}
                  precision={0}
                  placeholder="0"
                  value={drafts[row.inscripcionId]?.inasistencias ?? null}
                  onChange={(v) => handleFieldChange(row.inscripcionId, 'inasistencias', v)}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <span className={styles.fieldLabel}>TARDES</span>
                <InputNumber
                  min={0}
                  max={180}
                  precision={0}
                  placeholder="0"
                  value={drafts[row.inscripcionId]?.llegadasTarde ?? null}
                  onChange={(v) => handleFieldChange(row.inscripcionId, 'llegadasTarde', v)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className={styles.floatingDock}>
        <Typography.Text strong>
          {hasChanges
            ? `${dirtyIds.length} alumno(s) con cambios sin guardar`
            : allComplete
              ? 'Todos los alumnos están completos y listos para enviar'
              : `Completados: ${loadedCount} de ${snapshot.totalAlumnos}`}
        </Typography.Text>
        <Space wrap>
          <Button
            icon={<SaveOutlined />}
            type={hasChanges ? 'primary' : 'default'}
            disabled={!hasChanges}
            loading={saving}
            onClick={() => void handleSave()}
          >
            Guardar borrador
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            disabled={!allComplete || hasChanges || saving}
            loading={submitting}
            onClick={handleSubmit}
          >
            Enviar asistencias
          </Button>
        </Space>
      </div>
    </div>
  );
};
