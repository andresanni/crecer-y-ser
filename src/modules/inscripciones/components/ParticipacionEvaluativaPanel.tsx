import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  DatePicker,
  Input,
  Row,
  Space,
  Spin,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  cursadaService,
  type StudentAdministrativeData,
  type StudentEvaluationsSnapshot,
  type TipoInformeEvaluacion,
} from '../services/cursada.service';
import type { CambioEscuelaItem } from '../models/inscripcion.model';
import ui from '../../../shared/styles/ui.module.css';
import styles from './ParticipacionEvaluativaPanel.module.css';

const { Text } = Typography;

type BoletinTermKey = 'b1' | 'b2' | 'b3' | 'b4';

const BOLETIN_TERMS: Array<{ key: BoletinTermKey; number: number; label: string }> = [
  { key: 'b1', number: 1, label: '1.º Bimestre' },
  { key: 'b2', number: 2, label: '2.º Bimestre' },
  { key: 'b3', number: 3, label: '3.º Bimestre' },
  { key: 'b4', number: 4, label: '4.º Bimestre' },
];

const REPORT_TYPE_META: Record<
  TipoInformeEvaluacion,
  { title: string; subtitlePrimaria: string; subtitleInicial: string }
> = {
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

function normalizeAdminData(source?: StudentAdministrativeData): StudentAdministrativeData {
  return {
    escuelaInicial: source?.escuelaInicial || '',
    fechaIngresoInicial: source?.fechaIngresoInicial ? source.fechaIngresoInicial.slice(0, 10) : '',
    fechaEgresoInicial: source?.fechaEgresoInicial ? source.fechaEgresoInicial.slice(0, 10) : '',
    cambiosEscuela: Array.isArray(source?.cambiosEscuela)
      ? source.cambiosEscuela.map((item) => ({
          fecha: item.fecha ? item.fecha.slice(0, 10) : '',
          causa: item.causa || '',
          escuelaDestino: item.escuelaDestino || '',
        }))
      : [],
    cambioDomicilio: source?.cambioDomicilio || '',
  };
}

function serializeAdminData(data: StudentAdministrativeData): string {
  return JSON.stringify({
    escuelaInicial: data.escuelaInicial.trim(),
    fechaIngresoInicial: data.fechaIngresoInicial,
    fechaEgresoInicial: data.fechaEgresoInicial,
    cambiosEscuela: data.cambiosEscuela
      .map((item) => ({
        fecha: item.fecha.trim(),
        causa: item.causa.trim(),
        escuelaDestino: item.escuelaDestino.trim(),
      }))
      .filter((item) => item.fecha || item.causa || item.escuelaDestino),
    cambioDomicilio: data.cambioDomicilio.trim(),
  });
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
  const [altaTardiaDraft, setAltaTardiaDraft] = useState(false);
  const [fechaEgresoDraft, setFechaEgresoDraft] = useState('');
  const [boletinesDraft, setBoletinesDraft] = useState<{
    b1: boolean;
    b2: boolean;
    b3: boolean;
    b4: boolean;
  } | null>(null);
  const [informesDraft, setInformesDraft] = useState<Record<string, boolean>>({});
  const [adminDraft, setAdminDraft] = useState<StudentAdministrativeData>(() => normalizeAdminData());
  const [adminExpandedKeys, setAdminExpandedKeys] = useState<string[] | null>(null);

  const hydrateFromSnapshot = (data: StudentEvaluationsSnapshot) => {
    setSnapshot(data);
    setAltaTardiaDraft(Boolean(data.esAltaTardia));
    setFechaEgresoDraft(data.fechaEgreso ? data.fechaEgreso.slice(0, 10) : '');
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
    setAdminDraft(normalizeAdminData(data.datosAdministrativos));
  };

  useEffect(() => {
    let active = true;
    cursadaService
      .getEvaluations(inscripcionId)
      .then((data) => {
        if (!active) return;
        hydrateFromSnapshot(data);
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

  const esBaja = Boolean(snapshot?.esBaja);
  const canEditInstances = altaTardiaDraft || esBaja;
  const isSinCursada = Boolean(!snapshot?.esInicial && boletinesDraft && activeBoletinTerms.length === 0);

  const coupledValidationError = useMemo(() => {
    if (!snapshot) return null;
    if (!snapshot.esInicial && boletinesDraft) {
      if (!isConsecutiveRangeValid) {
        return 'En boletines los bimestres activos deben ser consecutivos (por ejemplo: 1.º a 3.º o 2.º a 4.º).';
      }
      if (!altaTardiaDraft && !esBaja && activeBoletinTerms.length !== 4) {
        return 'En un alumno regular sin Alta Tardía ni Baja, todos los bimestres de boletines deben permanecer activos.';
      }
      if (!altaTardiaDraft && activeBoletinTerms.length > 0 && activeBoletinTerms[0] > 1) {
        return 'Para excluir bimestres iniciales (empezar después del 1.º bimestre), el alumno debe estar marcado como Alta Tardía.';
      }
      if (!esBaja && (activeBoletinTerms.length === 0 || activeBoletinTerms[activeBoletinTerms.length - 1] < 4)) {
        return 'Para excluir bimestres finales o marcar sin cursada, primero debés registrar la Baja del alumno.';
      }
    }
    if (!altaTardiaDraft && !esBaja && snapshot.informes.some((item) => !informesDraft[item.tipoInforme])) {
      return 'En un alumno regular sin Alta Tardía ni Baja, todos los informes deben permanecer activos.';
    }
    if (esBaja && snapshot.fechaEgreso && !fechaEgresoDraft) {
      return 'Indicá una fecha administrativa de baja válida.';
    }
    return null;
  }, [
    snapshot,
    boletinesDraft,
    isConsecutiveRangeValid,
    altaTardiaDraft,
    esBaja,
    activeBoletinTerms,
    informesDraft,
    fechaEgresoDraft,
  ]);

  const disableTurningOffAltaTardia = useMemo(() => {
    if (!snapshot || !altaTardiaDraft) return false;
    const hasExcludedStartTerm =
      !snapshot.esInicial && activeBoletinTerms.length > 0 && activeBoletinTerms[0] > 1;
    const hasExcludedReportWithoutBaja =
      !esBaja && snapshot.informes.some((item) => !informesDraft[item.tipoInforme]);
    return hasExcludedStartTerm || hasExcludedReportWithoutBaja;
  }, [snapshot, altaTardiaDraft, activeBoletinTerms, esBaja, informesDraft]);

  const isDirty = useMemo(() => {
    if (!snapshot) return false;
    if (altaTardiaDraft !== Boolean(snapshot.esAltaTardia)) return true;
    const originalFechaEgreso = snapshot.fechaEgreso ? snapshot.fechaEgreso.slice(0, 10) : '';
    if (esBaja && fechaEgresoDraft !== originalFechaEgreso) return true;
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
    if (snapshot.informes.some((item) => informesDraft[item.tipoInforme] !== item.evaluable)) {
      return true;
    }
    if (
      !snapshot.esInicial &&
      serializeAdminData(adminDraft) !== serializeAdminData(normalizeAdminData(snapshot.datosAdministrativos))
    ) {
      return true;
    }
    return false;
  }, [snapshot, altaTardiaDraft, esBaja, fechaEgresoDraft, boletinesDraft, informesDraft, adminDraft]);

  const handleReset = () => {
    if (!snapshot) return;
    setSaveError(null);
    hydrateFromSnapshot(snapshot);
  };

  const handleSave = async () => {
    if (!snapshot || coupledValidationError) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await cursadaService.saveEvaluations(snapshot, {
        esAltaTardia: altaTardiaDraft,
        ...(snapshot.boletines && boletinesDraft ? { boletines: boletinesDraft } : {}),
        informes: snapshot.informes.map((item) => ({
          tipoInforme: item.tipoInforme,
          evaluable: Boolean(informesDraft[item.tipoInforme]),
        })),
        ...(esBaja && fechaEgresoDraft ? { fechaEgreso: fechaEgresoDraft } : {}),
        ...(!snapshot.esInicial
          ? {
              datosAdministrativos: {
                escuelaInicial: adminDraft.escuelaInicial.trim(),
                fechaIngresoInicial: adminDraft.fechaIngresoInicial,
                fechaEgresoInicial: adminDraft.fechaEgresoInicial,
                cambiosEscuela: adminDraft.cambiosEscuela
                  .map((item) => ({
                    fecha: item.fecha.trim(),
                    causa: item.causa.trim(),
                    escuelaDestino: item.escuelaDestino.trim(),
                  }))
                  .filter((item) => item.fecha || item.causa || item.escuelaDestino),
                cambioDomicilio: adminDraft.cambioDomicilio.trim(),
              },
            }
          : {}),
      });
      hydrateFromSnapshot(updated);
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

  const hasExistingAdminData = Boolean(
    adminDraft.escuelaInicial ||
      adminDraft.fechaIngresoInicial ||
      adminDraft.fechaEgresoInicial ||
      adminDraft.cambiosEscuela.length > 0 ||
      adminDraft.cambioDomicilio,
  );

  const isLateEntryForBoletin =
    !snapshot.esInicial &&
    (altaTardiaDraft || (activeBoletinTerms.length > 0 && activeBoletinTerms[0] > 1));

  const missingLateEntryFields = (() => {
    if (!isLateEntryForBoletin) return [];
    const missing: string[] = [];
    if (!adminDraft.escuelaInicial.trim()) missing.push('Escuela en la que inició el año');
    if (!adminDraft.fechaIngresoInicial.trim()) missing.push('Fecha de ingreso (escuela anterior)');
    if (!adminDraft.fechaEgresoInicial.trim()) missing.push('Fecha de egreso (escuela anterior)');
    const hasCompleteTransfer = adminDraft.cambiosEscuela.some(
      (item) => item.fecha.trim() && item.causa.trim() && item.escuelaDestino.trim(),
    );
    if (!hasCompleteTransfer) missing.push('Pase de ingreso completo (fecha, causa y escuela destino)');
    return missing;
  })();

  const showAdminSection = !snapshot.esInicial && (altaTardiaDraft || esBaja || hasExistingAdminData);
  const activeAdminKeys = adminExpandedKeys ?? (missingLateEntryFields.length > 0 ? ['admin'] : []);

  const boletinSummary =
    activeBoletinTerms.length === 0
      ? 'El alumno no figura como evaluable en ningún bimestre de boletines (Sin cursada).'
      : isConsecutiveRangeValid
      ? `Evaluable en boletines del ${activeBoletinTerms[0]}.º al ${activeBoletinTerms[activeBoletinTerms.length - 1]}.º bimestre.`
      : 'Seleccioná un rango consecutivo de bimestres.';

  const updateTransferItem = (index: number, patch: Partial<CambioEscuelaItem>) => {
    setSaveError(null);
    setAdminDraft((prev) => ({
      ...prev,
      cambiosEscuela: prev.cambiosEscuela.map((item, idx) =>
        idx === index ? { ...item, ...patch } : item,
      ),
    }));
  };

  const addTransferItem = () => {
    setSaveError(null);
    const isFirstLateEntryTransfer = altaTardiaDraft && adminDraft.cambiosEscuela.length === 0;
    setAdminDraft((prev) => ({
      ...prev,
      cambiosEscuela: [
        ...prev.cambiosEscuela,
        {
          fecha: isFirstLateEntryTransfer && snapshot.fechaIngreso ? snapshot.fechaIngreso.slice(0, 10) : '',
          causa: '',
          escuelaDestino: isFirstLateEntryTransfer || (altaTardiaDraft && !esBaja) ? 'Colegio Crecer y Ser' : '',
        },
      ],
    }));
  };

  const removeTransferItem = (index: number) => {
    setSaveError(null);
    setAdminDraft((prev) => ({
      ...prev,
      cambiosEscuela: prev.cambiosEscuela.filter((_, idx) => idx !== index),
    }));
  };

  const getBoletinSwitchState = (termNumber: number, checked: boolean) => {
    if (blockedTerms.has(termNumber) && checked) {
      return {
        disabled: true,
        tooltip: 'Este bimestre ya registra notas, cierres o entregas y no puede desactivarse.',
      };
    }
    if (!canEditInstances) {
      return {
        disabled: true,
        tooltip: 'Alumno regular de ciclo completo. Activá Alta Tardía o registrá una Baja para modificar bimestres.',
      };
    }
    if (!esBaja && termNumber === 4 && checked) {
      return {
        disabled: true,
        tooltip: 'Para excluir el 4.º bimestre primero debés registrar la Baja del alumno.',
      };
    }
    if (!altaTardiaDraft && esBaja && termNumber === 1 && checked && activeBoletinTerms.length > 1) {
      return {
        disabled: true,
        tooltip: 'Sin Alta Tardía no se puede excluir el 1.º bimestre dejando posteriores activos. Usá "No cursó ningún bimestre" si corresponde.',
      };
    }
    return { disabled: false, tooltip: null };
  };

  return (
    <div className={styles.container}>
      <div className={styles.contextBar}>
        <div className={styles.contextMeta}>
          <Text strong>{snapshot.curso}</Text>
          <Tag color="blue">Ciclo {snapshot.ciclo}</Tag>
          <Tag color={statusColor}>{snapshot.estadoAdministrativo}</Tag>
          {altaTardiaDraft && <Tag color="gold">Alta Tardía (A.T.)</Tag>}
          {!altaTardiaDraft && !esBaja && <Tag color="success">Ciclo completo</Tag>}
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

      <Card size="small" className="detail-sub-card">
        <div className={styles.regimeRow}>
          <div className={styles.regimeInfo}>
            <Text strong>Alta Tardía (A.T.)</Text>
            <Text type="secondary" style={{ fontSize: 12.5 }}>
              Activá esta marca cuando el alumno ingresó con el ciclo iniciado y requiere trato especial en evaluaciones o pases.
            </Text>
          </div>
          <div className={styles.regimeControls}>
            <Tooltip
              title={
                disableTurningOffAltaTardia
                  ? 'Primero volvé a activar los bimestres iniciales o informes excluidos para quitar la marca de Alta Tardía.'
                  : undefined
              }
            >
              <Switch
                checked={altaTardiaDraft}
                disabled={saving || disableTurningOffAltaTardia}
                checkedChildren="SÍ"
                unCheckedChildren="NO"
                aria-label="Alta Tardía"
                onChange={(checked) => {
                  setSaveError(null);
                  setAltaTardiaDraft(checked);
                }}
              />
            </Tooltip>
          </div>
        </div>

        {esBaja && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--cys-color-border-secondary)' }}>
            <Row gutter={12} align="middle">
              <Col xs={24} sm={14}>
                <Text strong style={{ display: 'block', fontSize: 13 }}>
                  Fecha administrativa de baja
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  La baja habilita excluir bimestres e informes finales o marcar sin cursada.
                </Text>
              </Col>
              <Col xs={24} sm={10}>
                <DatePicker
                  format="DD/MM/YYYY"
                  className={ui.fullWidth}
                  value={fechaEgresoDraft ? dayjs(fechaEgresoDraft) : null}
                  disabled={saving}
                  onChange={(value) => {
                    setSaveError(null);
                    setFechaEgresoDraft(value ? value.format('YYYY-MM-DD') : '');
                  }}
                />
              </Col>
            </Row>
          </div>
        )}

        {!canEditInstances && (
          <Alert
            type="info"
            showIcon
            style={{ marginTop: 12 }}
            message="Alumno regular de ciclo completo"
            description="Participa automáticamente de todas las instancias. Para excluir períodos iniciales activá Alta Tardía; para un egreso anticipado registrá la Baja desde su ficha o el listado."
          />
        )}
      </Card>

      {!snapshot.esInicial && snapshot.boletines && boletinesDraft && (
        <Card
          size="small"
          className="detail-sub-card"
          title={
            <div className={styles.cardHeader}>
              <span>Boletines de Primaria</span>
              <Tag color={activeBoletinTerms.length > 0 ? 'blue' : 'default'}>
                {activeBoletinTerms.length === 0
                  ? 'Sin cursada'
                  : activeBoletinTerms.length === 4
                  ? 'Año completo'
                  : `${activeBoletinTerms.length} bimestre${activeBoletinTerms.length === 1 ? '' : 's'}`}
              </Tag>
            </div>
          }
        >
          <Text type="secondary" className={styles.cardDescription}>
            {canEditInstances
              ? 'Ajustá los bimestres evaluables según el régimen activo. Quienes figuren en NO no se contabilizan en el curso y aparecen griseados al final de la revisión directiva.'
              : 'Todos los bimestres permanecen activos para alumnos regulares de ciclo completo.'}
          </Text>

          {esBaja && (
            <div style={{ marginBottom: 10 }}>
              <Tooltip
                title={
                  blockedTerms.size > 0
                    ? 'No se puede marcar sin cursada porque ya existen bimestres con notas, cierres o entregas.'
                    : undefined
                }
              >
                <Checkbox
                  checked={isSinCursada}
                  disabled={saving || blockedTerms.size > 0}
                  onChange={(e) => {
                    setSaveError(null);
                    if (e.target.checked) {
                      setBoletinesDraft({ b1: false, b2: false, b3: false, b4: false });
                    } else {
                      setBoletinesDraft({ b1: true, b2: false, b3: false, b4: false });
                    }
                  }}
                >
                  No cursó ningún bimestre (Sin cursada)
                </Checkbox>
              </Tooltip>
            </div>
          )}

          <div className={styles.termGrid}>
            {BOLETIN_TERMS.map((term) => {
              const checked = boletinesDraft[term.key];
              const lockedByData = blockedTerms.has(term.number);
              const switchState = getBoletinSwitchState(term.number, checked);
              return (
                <div
                  key={term.key}
                  className={`${styles.termTile} ${checked ? styles.termTileActive : ''}`}
                >
                  <div className={styles.termTileHeader}>
                    <span className={styles.termLabel}>{term.label}</span>
                    {lockedByData && (
                      <Tooltip title="Este bimestre ya registra notas, cierres o entregas y no puede desactivarse.">
                        <LockOutlined className={styles.lockIcon} />
                      </Tooltip>
                    )}
                  </div>
                  <div className={styles.termFooter}>
                    <Text type={checked ? undefined : 'secondary'}>
                      {checked ? 'Evaluable' : 'Excluido'}
                    </Text>
                    <Tooltip title={switchState.tooltip || undefined}>
                      <Switch
                        checked={checked}
                        disabled={saving || switchState.disabled}
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
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>

          {coupledValidationError && (
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 10 }}
              message={coupledValidationError}
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
          {canEditInstances
            ? snapshot.esInicial
              ? 'Activá o desactivá la participación del alumno en el informe de Ciclo Final. La elección impacta automáticamente en Educación Física, Inglés y Educación Musical.'
              : 'Elegí en qué instancias de informes participa el alumno. Cada decisión se aplica automáticamente a todas las materias asociadas a esa instancia.'
            : 'Todas las instancias de informes permanecen activas para alumnos regulares de ciclo completo.'}
        </Text>

        <div className={styles.reportList}>
          {snapshot.informes.map((item) => {
            const meta = REPORT_TYPE_META[item.tipoInforme];
            const checked = Boolean(informesDraft[item.tipoInforme]);
            const subtitle = snapshot.esInicial ? meta.subtitleInicial : meta.subtitlePrimaria;
            const lockTooltip = `Ya figura en la entrega de ${item.materiasEntregadas.join(', ')}.`;
            const switchDisabled =
              saving ||
              (item.bloqueadoPorEntrega && checked) ||
              (!canEditInstances && checked);
            const switchTooltip =
              item.bloqueadoPorEntrega && checked
                ? lockTooltip
                : !canEditInstances
                ? 'Alumno regular de ciclo completo. Activá Alta Tardía o registrá una Baja para modificar informes.'
                : undefined;

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
                  <Tooltip title={switchTooltip}>
                    <Switch
                      checked={checked}
                      disabled={switchDisabled}
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
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {showAdminSection && (
        <Collapse
          activeKey={activeAdminKeys}
          onChange={(keys) => setAdminExpandedKeys(typeof keys === 'string' ? [keys] : keys)}
          items={[
            {
              key: 'admin',
              label: (
                <div className={styles.cardHeader}>
                  <span>Pases de escuela y datos administrativos (Página 14 del boletín)</span>
                  {isLateEntryForBoletin && (
                    missingLateEntryFields.length === 0 ? (
                      <Tag color="success" style={{ margin: 0 }}>Completo para PDF</Tag>
                    ) : (
                      <Tag color="warning" style={{ margin: 0 }}>
                        Faltan datos para PDF ({missingLateEntryFields.length})
                      </Tag>
                    )
                  )}
                </div>
              ),
              children: (
                <Space orientation="vertical" size="small" className={ui.fullWidth}>
                  {isLateEntryForBoletin && missingLateEntryFields.length > 0 && (
                    <Alert
                      type="warning"
                      showIcon
                      title="Alta Tardía: completá los datos de Página 14 para habilitar el boletín PDF"
                      description={`Pendiente: ${missingLateEntryFields.join(' · ')}.`}
                    />
                  )}
                  {(esBaja || (activeBoletinTerms.length > 0 && activeBoletinTerms[activeBoletinTerms.length - 1] < 4)) && (
                    <Alert
                      type="warning"
                      showIcon
                      title="Baja o egreso anticipado"
                      description="Registrá el pase hacia la escuela de destino para la hoja administrativa del boletín."
                    />
                  )}
                  <Card size="small" title="Escuela en la que inició el año (colegio anterior)">
                    <Space orientation="vertical" size="small" className={ui.fullWidth}>
                      <div>
                        <Text strong style={{ display: 'block', fontSize: 12.5, marginBottom: 4 }}>
                          Nombre de la escuela anterior{isLateEntryForBoletin ? ' *' : ''}
                        </Text>
                        <Input
                          value={adminDraft.escuelaInicial}
                          disabled={saving}
                          placeholder="Ej: Escuela N° 18 D.E 13"
                          onChange={(e) => {
                            setSaveError(null);
                            setAdminDraft((prev) => ({ ...prev, escuelaInicial: e.target.value }));
                          }}
                        />
                      </div>
                      <Row gutter={12}>
                        <Col xs={24} sm={12}>
                          <Text strong style={{ display: 'block', fontSize: 12.5, marginBottom: 4 }}>
                            Fecha de ingreso (en esa escuela){isLateEntryForBoletin ? ' *' : ''}
                          </Text>
                          <DatePicker
                            format="DD/MM/YYYY"
                            className={ui.fullWidth}
                            placeholder="DD/MM/AAAA"
                            disabled={saving}
                            value={adminDraft.fechaIngresoInicial ? dayjs(adminDraft.fechaIngresoInicial) : null}
                            onChange={(value) => {
                              setSaveError(null);
                              setAdminDraft((prev) => ({
                                ...prev,
                                fechaIngresoInicial: value ? value.format('YYYY-MM-DD') : '',
                              }));
                            }}
                          />
                        </Col>
                        <Col xs={24} sm={12}>
                          <Text strong style={{ display: 'block', fontSize: 12.5, marginBottom: 4 }}>
                            Fecha de egreso (de esa escuela){isLateEntryForBoletin ? ' *' : ''}
                          </Text>
                          <DatePicker
                            format="DD/MM/YYYY"
                            className={ui.fullWidth}
                            placeholder="DD/MM/AAAA"
                            disabled={saving}
                            value={adminDraft.fechaEgresoInicial ? dayjs(adminDraft.fechaEgresoInicial) : null}
                            onChange={(value) => {
                              setSaveError(null);
                              setAdminDraft((prev) => ({
                                ...prev,
                                fechaEgresoInicial: value ? value.format('YYYY-MM-DD') : '',
                              }));
                            }}
                          />
                        </Col>
                      </Row>
                    </Space>
                  </Card>
                  <Text strong style={{ fontSize: 13, display: 'block', marginTop: 4 }}>
                    Cambios de Escuela (hasta 4 pases){isLateEntryForBoletin ? ' *' : ''}
                  </Text>
                  <div className={styles.transferList}>
                    {adminDraft.cambiosEscuela.map((transfer, index) => (
                      <Card
                        key={index}
                        size="small"
                        title={`Pase ${index + 1}`}
                        extra={
                          <Button
                            type="text"
                            danger
                            disabled={saving}
                            icon={<DeleteOutlined />}
                            onClick={() => removeTransferItem(index)}
                          />
                        }
                      >
                        <Row gutter={8}>
                          <Col xs={24} sm={7}>
                            <Text type="secondary" style={{ display: 'block', fontSize: 11.5, marginBottom: 2 }}>
                              Fecha{isLateEntryForBoletin && index === 0 ? ' *' : ''}
                            </Text>
                            <DatePicker
                              format="DD/MM/YYYY"
                              className={ui.fullWidth}
                              placeholder="DD/MM/AAAA"
                              disabled={saving}
                              value={transfer.fecha ? dayjs(transfer.fecha) : null}
                              onChange={(value) =>
                                updateTransferItem(index, {
                                  fecha: value ? value.format('YYYY-MM-DD') : '',
                                })
                              }
                            />
                          </Col>
                          <Col xs={24} sm={8}>
                            <Text type="secondary" style={{ display: 'block', fontSize: 11.5, marginBottom: 2 }}>
                              Causa{isLateEntryForBoletin && index === 0 ? ' *' : ''}
                            </Text>
                            <Input
                              value={transfer.causa}
                              disabled={saving}
                              placeholder="Ej: Motivos particulares"
                              onChange={(e) => updateTransferItem(index, { causa: e.target.value })}
                            />
                          </Col>
                          <Col xs={24} sm={9}>
                            <Text type="secondary" style={{ display: 'block', fontSize: 11.5, marginBottom: 2 }}>
                              Pasa a la Escuela{isLateEntryForBoletin && index === 0 ? ' *' : ''}
                            </Text>
                            <Input
                              value={transfer.escuelaDestino}
                              disabled={saving}
                              placeholder={altaTardiaDraft ? 'Colegio Crecer y Ser' : 'Nombre de la escuela'}
                              onChange={(e) =>
                                updateTransferItem(index, { escuelaDestino: e.target.value })
                              }
                            />
                          </Col>
                        </Row>
                      </Card>
                    ))}
                    {adminDraft.cambiosEscuela.length < 4 && (
                      <Button
                        type="dashed"
                        disabled={saving}
                        onClick={addTransferItem}
                        block
                        icon={<PlusOutlined />}
                      >
                        {altaTardiaDraft && adminDraft.cambiosEscuela.length === 0
                          ? 'Cargar pase de ingreso a Colegio Crecer y Ser'
                          : 'Agregar pase de escuela'}
                      </Button>
                    )}
                  </div>
                  <div>
                    <Text strong style={{ display: 'block', fontSize: 12.5, marginBottom: 4 }}>
                      Cambio de domicilio (opcional)
                    </Text>
                    <Input
                      value={adminDraft.cambioDomicilio}
                      disabled={saving}
                      placeholder="Ej: Nuevo domicilio particular..."
                      onChange={(e) => {
                        setSaveError(null);
                        setAdminDraft((prev) => ({ ...prev, cambioDomicilio: e.target.value }));
                      }}
                    />
                  </div>
                </Space>
              ),
            },
          ]}
        />
      )}

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
            disabled={!isDirty || Boolean(coupledValidationError)}
            onClick={() => void handleSave()}
          >
            Guardar cambios
          </Button>
        </Space>
      </div>
    </div>
  );
};
