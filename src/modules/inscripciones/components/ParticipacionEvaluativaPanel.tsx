import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Space,
  Spin,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  LockOutlined,
  ReloadOutlined,
  SaveOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  cursadaService,
  type StudentEvaluationsSnapshot,
  type TipoInformeEvaluacion,
} from '../services/cursada.service';
import styles from './ParticipacionEvaluativaPanel.module.css';

const { Text } = Typography;

type BoletinTermKey = 'b1' | 'b2' | 'b3' | 'b4';

const BOLETIN_TERMS: Array<{ key: BoletinTermKey; number: number; label: string }> = [
  { key: 'b1', number: 1, label: '1.º Bimestre' },
  { key: 'b2', number: 2, label: '2.º Bimestre' },
  { key: 'b3', number: 3, label: '3.º Bimestre' },
  { key: 'b4', number: 4, label: '4.º Bimestre' },
];

const REPORT_TYPE_META: Record<TipoInformeEvaluacion, { title: string; subtitlePrimaria: string; subtitleInicial: string }> = {
  PRIMER_BIMESTRE: {
    title: 'Informe 1.er Bimestre',
    subtitlePrimaria: 'Maestra de grado — evaluación diagnóstica y seguimiento inicial.',
    subtitleInicial: '',
  },
  PRIMER_CUATRIMESTRE: {
    title: 'Informe 1.er Cuatrimestre',
    subtitlePrimaria: 'Maestra de grado — cierre del primer cuatrimestre.',
    subtitleInicial: '',
  },
  CICLO_FINAL: {
    title: 'Informe Ciclo Final',
    subtitlePrimaria: 'Aplica a todas las áreas especiales del curso.',
    subtitleInicial: 'Aplica a Educación Física, Inglés y Educación Musical.',
  },
};

function readApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const record = error as {
      response?: { message?: string };
      data?: { message?: string };
      message?: string;
    };
    const msg = record.response?.message || record.data?.message || record.message;
    if (msg && typeof msg === 'string') return msg;
  }
  return fallback;
}

interface ParticipacionEvaluativaPanelProps {
  inscripcionId: string;
  onSaved?: () => void;
}

export const ParticipacionEvaluativaPanel: React.FC<ParticipacionEvaluativaPanelProps> = ({
  inscripcionId,
  onSaved,
}) => {
  const [reloadCounter, setReloadCounter] = useState(0);

  return (
    <ParticipacionEvaluativaEditor
      key={`${inscripcionId}:${reloadCounter}`}
      inscripcionId={inscripcionId}
      onReload={() => setReloadCounter((prev) => prev + 1)}
      onSaved={onSaved}
    />
  );
};

interface ParticipacionEvaluativaEditorProps {
  inscripcionId: string;
  onReload: () => void;
  onSaved?: () => void;
}

const ParticipacionEvaluativaEditor: React.FC<ParticipacionEvaluativaEditorProps> = ({
  inscripcionId,
  onReload,
  onSaved,
}) => {
  const { message } = App.useApp();
  const [snapshot, setSnapshot] = useState<StudentEvaluationsSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [boletinesDraft, setBoletinesDraft] = useState<{
    b1: boolean;
    b2: boolean;
    b3: boolean;
    b4: boolean;
  } | null>(null);
  const [informesDraft, setInformesDraft] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    cursadaService
      .getEvaluations(inscripcionId)
      .then((data) => {
        if (!active) return;
        setSnapshot(data);
        setBoletinesDraft(
          data.boletines
            ? {
                b1: data.boletines.b1,
                b2: data.boletines.b2,
                b3: data.boletines.b3,
                b4: data.boletines.b4,
              }
            : null,
        );
        const nextInformes: Record<string, boolean> = {};
        data.informes.forEach((item) => {
          nextInformes[item.tipoInforme] = item.evaluable;
        });
        setInformesDraft(nextInformes);
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(readApiErrorMessage(error, 'No se pudo cargar la participación evaluativa del alumno.'));
      });

    return () => {
      active = false;
    };
  }, [inscripcionId]);

  const activeBoletinTerms = useMemo(() => {
    if (!boletinesDraft) return [];
    const list: number[] = [];
    if (boletinesDraft.b1) list.push(1);
    if (boletinesDraft.b2) list.push(2);
    if (boletinesDraft.b3) list.push(3);
    if (boletinesDraft.b4) list.push(4);
    return list;
  }, [boletinesDraft]);

  const isConsecutiveRangeValid = useMemo(() => {
    if (activeBoletinTerms.length === 0) return true;
    const min = activeBoletinTerms[0];
    const max = activeBoletinTerms[activeBoletinTerms.length - 1];
    return max - min + 1 === activeBoletinTerms.length;
  }, [activeBoletinTerms]);

  const isDirty = useMemo(() => {
    if (!snapshot) return false;
    if (snapshot.boletines && boletinesDraft) {
      if (
        snapshot.boletines.b1 !== boletinesDraft.b1 ||
        snapshot.boletines.b2 !== boletinesDraft.b2 ||
        snapshot.boletines.b3 !== boletinesDraft.b3 ||
        snapshot.boletines.b4 !== boletinesDraft.b4
      ) {
        return true;
      }
    }
    return snapshot.informes.some((item) => informesDraft[item.tipoInforme] !== item.evaluable);
  }, [snapshot, boletinesDraft, informesDraft]);

  const handleReset = () => {
    if (!snapshot) return;
    setSaveError(null);
    setBoletinesDraft(
      snapshot.boletines
        ? {
            b1: snapshot.boletines.b1,
            b2: snapshot.boletines.b2,
            b3: snapshot.boletines.b3,
            b4: snapshot.boletines.b4,
          }
        : null,
    );
    const nextInformes: Record<string, boolean> = {};
    snapshot.informes.forEach((item) => {
      nextInformes[item.tipoInforme] = item.evaluable;
    });
    setInformesDraft(nextInformes);
  };

  const handleSave = async () => {
    if (!snapshot || !isConsecutiveRangeValid) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await cursadaService.saveEvaluations(snapshot, {
        ...(snapshot.boletines && boletinesDraft ? { boletines: boletinesDraft } : {}),
        informes: snapshot.informes.map((item) => ({
          tipoInforme: item.tipoInforme,
          evaluable: Boolean(informesDraft[item.tipoInforme]),
        })),
      });
      setSnapshot(updated);
      setBoletinesDraft(
        updated.boletines
          ? {
              b1: updated.boletines.b1,
              b2: updated.boletines.b2,
              b3: updated.boletines.b3,
              b4: updated.boletines.b4,
            }
          : null,
      );
      const nextInformes: Record<string, boolean> = {};
      updated.informes.forEach((item) => {
        nextInformes[item.tipoInforme] = item.evaluable;
      });
      setInformesDraft(nextInformes);
      message.success('Participación evaluativa guardada.');
      onSaved?.();
    } catch (error) {
      setSaveError(readApiErrorMessage(error, 'No se pudieron guardar los cambios.'));
    } finally {
      setSaving(false);
    }
  };

  if (!snapshot && !loadError) {
    return (
      <div className={styles.centeredState}>
        <Spin description="Cargando participación en evaluaciones..." />
      </div>
    );
  }

  if (loadError || !snapshot) {
    return (
      <Alert
        type="error"
        showIcon
        message="No se pudo cargar la configuración de evaluaciones"
        description={loadError}
        action={
          <Button size="small" icon={<ReloadOutlined />} onClick={onReload}>
            Reintentar
          </Button>
        }
      />
    );
  }

  const blockedTerms = new Set(snapshot.boletines?.bimestresBloqueados ?? []);
  const statusColor =
    snapshot.estadoAdministrativo === 'Baja'
      ? 'error'
      : snapshot.estadoAdministrativo === 'Libre'
      ? 'warning'
      : 'success';

  const boletinSummary =
    activeBoletinTerms.length === 0
      ? 'El alumno no figura como evaluable en ningún bimestre de boletines.'
      : isConsecutiveRangeValid
      ? `Evaluable en boletines del ${activeBoletinTerms[0]}.º al ${activeBoletinTerms[activeBoletinTerms.length - 1]}.º bimestre.`
      : 'Seleccioná un rango consecutivo de bimestres.';

  return (
    <div className={styles.container}>
      <div className={styles.contextBar}>
        <div className={styles.contextMeta}>
          <Text strong>{snapshot.curso}</Text>
          <Tag color="blue">Ciclo {snapshot.ciclo}</Tag>
          <Tag color={statusColor}>{snapshot.estadoAdministrativo}</Tag>
          {snapshot.fechaIngreso && (
            <Text type="secondary">
              Ingreso: {dayjs(snapshot.fechaIngreso).format('DD/MM/YYYY')}
            </Text>
          )}
          {snapshot.fechaEgreso && (
            <Text type="danger">
              Egreso: {dayjs(snapshot.fechaEgreso).format('DD/MM/YYYY')}
            </Text>
          )}
        </div>
        <Text type="secondary">
          Control manual por alumno
        </Text>
      </div>

      {saveError && (
        <Alert
          type="error"
          showIcon
          message={saveError}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={onReload}>
              Recargar
            </Button>
          }
        />
      )}

      {!snapshot.esInicial && snapshot.boletines && boletinesDraft && (
        <Card
          size="small"
          className="detail-sub-card"
          title={
            <div className={styles.cardHeader}>
              <span>Boletines de Primaria</span>
              <Tag color={activeBoletinTerms.length > 0 ? 'blue' : 'default'}>
                {activeBoletinTerms.length === 0
                  ? 'No evaluable'
                  : activeBoletinTerms.length === 4
                  ? 'Año completo'
                  : `${activeBoletinTerms.length} bimestre${activeBoletinTerms.length === 1 ? '' : 's'}`}
              </Tag>
            </div>
          }
        >
          <Text type="secondary" className={styles.cardDescription}>
            Indicá en qué bimestres participa el alumno en la planilla de boletines. Quienes figuren en NO no se contabilizan en el curso y aparecen griseados al final de la revisión directiva.
          </Text>

          <div className={styles.termGrid}>
            {BOLETIN_TERMS.map((term) => {
              const checked = boletinesDraft[term.key];
              const locked = blockedTerms.has(term.number);
              return (
                <div
                  key={term.key}
                  className={`${styles.termTile} ${checked ? styles.termTileActive : ''}`}
                >
                  <div className={styles.termTileHeader}>
                    <span className={styles.termLabel}>{term.label}</span>
                    {locked && (
                      <Tooltip title="Este bimestre ya registra notas, cierres o entregas y no puede desactivarse.">
                        <LockOutlined className={styles.lockIcon} />
                      </Tooltip>
                    )}
                  </div>
                  <div className={styles.termFooter}>
                    <Text type={checked ? undefined : 'secondary'}>
                      {checked ? 'Evaluable' : 'Excluido'}
                    </Text>
                    <Switch
                      checked={checked}
                      disabled={saving || (locked && checked)}
                      checkedChildren="SÍ"
                      unCheckedChildren="NO"
                      aria-label={`Boletín ${term.label}`}
                      onChange={(value) => {
                        setSaveError(null);
                        setBoletinesDraft((prev) =>
                          prev ? { ...prev, [term.key]: value } : prev,
                        );
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {!isConsecutiveRangeValid && (
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 10 }}
              message="En boletines los bimestres activos deben ser consecutivos (por ejemplo: 1.º a 3.º o 2.º a 4.º)."
            />
          )}

          <Text type="secondary" className={styles.summaryText}>
            {boletinSummary}
          </Text>
        </Card>
      )}

      <Card
        size="small"
        className="detail-sub-card"
        title={
          <div className={styles.cardHeader}>
            <span>
              {snapshot.esInicial
                ? 'Informes de Maestras (Nivel Inicial)'
                : 'Informes de Maestras'}
            </span>
            <Tag color="geekblue">
              {snapshot.esInicial
                ? 'Aplica a las 3 áreas especiales'
                : 'Aplica a todas las materias de cada instancia'}
            </Tag>
          </div>
        }
      >
        <Text type="secondary" className={styles.cardDescription}>
          {snapshot.esInicial
            ? 'Activá o desactivá la participación del alumno en el informe de Ciclo Final. La elección impacta automáticamente en Educación Física, Inglés y Educación Musical.'
            : 'Elegí en qué instancias de informes participa el alumno. Cada decisión se aplica automáticamente a todas las materias asociadas a esa instancia.'}
        </Text>

        <div className={styles.reportList}>
          {snapshot.informes.map((item) => {
            const meta = REPORT_TYPE_META[item.tipoInforme];
            const checked = Boolean(informesDraft[item.tipoInforme]);
            const subtitle = snapshot.esInicial ? meta.subtitleInicial : meta.subtitlePrimaria;
            const lockTooltip = `Ya figura en la entrega de ${item.materiasEntregadas.join(', ')}.`;

            return (
              <div
                key={item.tipoInforme}
                className={`${styles.reportRow} ${checked ? styles.reportRowActive : ''}`}
              >
                <div className={styles.reportInfo}>
                  <div className={styles.reportTitleRow}>
                    <Text strong>{meta.title}</Text>
                    {item.bloqueadoPorEntrega && (
                      <Tooltip title={lockTooltip}>
                        <Tag icon={<LockOutlined />} color="processing">
                          Entregado
                        </Tag>
                      </Tooltip>
                    )}
                    {item.tieneBorrador && !checked && (
                      <Tag color="warning">Con borrador previo</Tag>
                    )}
                  </div>
                  {subtitle && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {subtitle}
                    </Text>
                  )}
                </div>
                <div className={styles.reportControls}>
                  <Text type={checked ? undefined : 'secondary'}>
                    {checked ? 'Evaluable' : 'Excluido'}
                  </Text>
                  <Switch
                    checked={checked}
                    disabled={saving || (item.bloqueadoPorEntrega && checked)}
                    checkedChildren="SÍ"
                    unCheckedChildren="NO"
                    aria-label={meta.title}
                    onChange={(value) => {
                      setSaveError(null);
                      setInformesDraft((prev) => ({
                        ...prev,
                        [item.tipoInforme]: value,
                      }));
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className={styles.actionBar}>
        <div>
          {isDirty ? (
            <Tag color="gold">Cambios sin guardar</Tag>
          ) : (
            <Space size={6}>
              <CheckCircleOutlined style={{ color: 'var(--cys-color-success-text)' }} />
              <Text type="secondary">Participación al día</Text>
            </Space>
          )}
        </div>
        <Space>
          <Button
            icon={<UndoOutlined />}
            disabled={!isDirty || saving}
            onClick={handleReset}
          >
            Descartar
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            disabled={!isDirty || !isConsecutiveRangeValid}
            onClick={() => void handleSave()}
          >
            Guardar cambios
          </Button>
        </Space>
      </div>
    </div>
  );
};
