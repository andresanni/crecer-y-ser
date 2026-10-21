import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Drawer,
  Empty,
  Input,
  Modal,
  Progress,
  Segmented,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  DownOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  LeftOutlined,
  RightOutlined,
  SaveOutlined,
  SearchOutlined,
  SendOutlined,
  TrophyOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import {
  isNoCorrespondeOption,
  type AlumnoInformeRow,
  type ItemPlantillaInforme,
  type PlantillaInforme,
} from '../models/informe.model';
import type { InformeAccessPolicy } from '../models/informeAccess.model';
import type { InformeStudentSaveResult } from '../models/informeDataSource.model';
import {
  InformeAccessDeniedError,
  InformeRevisionConflictError,
  InformeSubmissionIncompleteError,
} from '../services/informes.service';
import styles from './VistaInformePorAlumno.module.css';

const { Text } = Typography;

interface VistaInformePorAlumnoProps {
  plantilla: PlantillaInforme;
  items: ItemPlantillaInforme[];
  alumnos: AlumnoInformeRow[];
  access: InformeAccessPolicy;
  readOnly?: boolean;
  workflowRevision?: number;
  cursoNombre?: string;
  tieneOtrosCursosAsignados?: boolean;
  onCompletedCountChange?: (completedCount: number) => void;
  onSaveSuccess?: (result: InformeStudentSaveResult) => void;
  initialInscripcionId?: string | null;
  onStudentChange?: (inscripcionId: string) => void;
  studentNavigationDisabled?: boolean;
  reviewControls?: React.ReactNode;
  onPendingChangesChange?: (hasChanges: boolean) => void;
}

interface TableItemRow {
  item: ItemPlantillaInforme;
  showBlockCell: boolean;
  blockRowSpan: number;
}

export const VistaInformePorAlumno: React.FC<VistaInformePorAlumnoProps> = ({
  plantilla,
  items,
  alumnos,
  access,
  readOnly = false,
  workflowRevision,
  cursoNombre,
  tieneOtrosCursosAsignados = false,
  onCompletedCountChange,
  onSaveSuccess,
  initialInscripcionId,
  onStudentChange,
  studentNavigationDisabled = false,
  reviewControls,
  onPendingChangesChange,
}) => {
  const { message, modal } = App.useApp();
  const tableCaptionId = useId();

  const [requestedInscripcionId, setRequestedInscripcionId] = useState<string | null>(
    initialInscripcionId || alumnos[0]?.inscripcionId || null,
  );
  const selectedInscripcionId = alumnos.some((a) => a.inscripcionId === requestedInscripcionId)
    ? requestedInscripcionId
    : alumnos[0]?.inscripcionId ?? null;

  const [studentStatusOverrides, setStudentStatusOverrides] = useState<
    Record<
      string,
      {
        completo: boolean;
        itemsRespondidos: number;
        totalItems: number;
        desempenoGeneralCompleto: boolean;
      }
    >
  >({});

  const studentStatusMap = useMemo(() => {
    const map: Record<
      string,
      {
        completo: boolean;
        itemsRespondidos: number;
        totalItems: number;
        desempenoGeneralCompleto: boolean;
      }
    > = {};
    for (const alumno of alumnos) {
      map[alumno.inscripcionId] = studentStatusOverrides[alumno.inscripcionId] || {
        completo: alumno.completo,
        itemsRespondidos: alumno.itemsRespondidos,
        totalItems: alumno.totalItems,
        desempenoGeneralCompleto: alumno.desempenoGeneralCompleto,
      };
    }
    return map;
  }, [alumnos, studentStatusOverrides]);

  const [loadingStudent, setLoadingStudent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isStaffEditing, setIsStaffEditing] = useState(false);
  const [revisionConflict, setRevisionConflict] = useState(false);
  const [loadedRevision, setLoadedRevision] = useState<number | undefined>(workflowRevision);
  const [studentReloadCounter, setStudentReloadCounter] = useState(0);

  const [savedRespuestas, setSavedRespuestas] = useState<Record<string, string>>({});
  const [draftRespuestas, setDraftRespuestas] = useState<Record<string, string>>({});
  const [savedDesempeno, setSavedDesempeno] = useState<string>('');
  const [draftDesempeno, setDraftDesempeno] = useState<string>('');
  const [savedObservaciones, setSavedObservaciones] = useState<string>('');
  const [draftObservaciones, setDraftObservaciones] = useState<string>('');

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingDesempeno, setEditingDesempeno] = useState(false);
  const [editingObservaciones, setEditingObservaciones] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerFilter, setDrawerFilter] = useState<'TODOS' | 'PENDIENTES' | 'COMPLETOS'>('TODOS');
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const hasChanges = useMemo(() => {
    if (draftDesempeno !== savedDesempeno) return true;
    if (plantilla.permiteObservaciones && draftObservaciones !== savedObservaciones) return true;
    for (const item of items) {
      if ((draftRespuestas[item.id] || '') !== (savedRespuestas[item.id] || '')) {
        return true;
      }
    }
    return false;
  }, [
    draftDesempeno,
    draftObservaciones,
    draftRespuestas,
    items,
    plantilla.permiteObservaciones,
    savedDesempeno,
    savedObservaciones,
    savedRespuestas,
  ]);

  useEffect(() => {
    onPendingChangesChange?.(hasChanges || isStaffEditing);
  }, [hasChanges, isStaffEditing, onPendingChangesChange]);

  useEffect(() => {
    if (!selectedInscripcionId) return;
    let active = true;
    const loadStudent = async () => {
      setLoadingStudent(true);
      try {
        const snapshot = await access.dataSource.getAlumno(selectedInscripcionId);
        if (!active) return;
        const map: Record<string, string> = {};
        for (const resp of snapshot.evaluacion.respuestas) {
          map[resp.itemId] = resp.valorCodigo;
        }
        setSavedRespuestas(map);
        setDraftRespuestas(map);
        setSavedDesempeno(snapshot.evaluacion.desempenoGeneralValor || '');
        setDraftDesempeno(snapshot.evaluacion.desempenoGeneralValor || '');
        setSavedObservaciones(snapshot.evaluacion.observaciones || '');
        setDraftObservaciones(snapshot.evaluacion.observaciones || '');
        if (snapshot.revision !== undefined) {
          setLoadedRevision(snapshot.revision);
        } else if (workflowRevision !== undefined) {
          setLoadedRevision(workflowRevision);
        }
        setRevisionConflict(false);
        setIsStaffEditing(false);
        setEditingItemId(null);
        setEditingDesempeno(false);
        setEditingObservaciones(false);
        setStudentStatusOverrides((current) => ({
          ...current,
          [selectedInscripcionId]: {
            completo: snapshot.completo,
            itemsRespondidos: snapshot.itemsRespondidos,
            totalItems: snapshot.totalItems,
            desempenoGeneralCompleto: snapshot.desempenoGeneralCompleto,
          },
        }));
      } catch (error: unknown) {
        if (!active) return;
        if (error instanceof InformeAccessDeniedError) {
          access.onAccessDenied?.();
          return;
        }
        console.error(error);
        message.error('No se pudo cargar el informe del alumno');
      } finally {
        if (active) setLoadingStudent(false);
      }
    };
    void loadStudent();

    return () => {
      active = false;
    };
  }, [access, message, selectedInscripcionId, studentReloadCounter, workflowRevision]);

  const currentIndex = useMemo(
    () => alumnos.findIndex((a) => a.inscripcionId === selectedInscripcionId),
    [alumnos, selectedInscripcionId],
  );
  const currentAlumno = currentIndex >= 0 ? alumnos[currentIndex] : null;

  const currentOrder = currentAlumno ? (currentAlumno.numeroOrden ?? currentIndex + 1) : 1;
  const currentIsDirectivoReview = readOnly && Boolean(currentAlumno?.estadoVisado);
  const currentIsVisado = currentAlumno?.estadoVisado === 'VISADO';
  const currentSt = currentAlumno ? studentStatusMap[currentAlumno.inscripcionId] : null;
  const currentIsComplete = Boolean(currentSt?.completo);
  const currentStatusLabel = currentIsDirectivoReview
    ? (currentIsVisado ? 'Visado' : 'Sin visar')
    : (currentIsComplete ? 'Completo' : `${currentSt?.itemsRespondidos ?? 0}/${items.length}`);
  const currentStatusColor = currentIsDirectivoReview
    ? (currentIsVisado ? 'success' : 'warning')
    : (currentIsComplete ? 'success' : 'warning');

  const modalFilteredAlumnos = useMemo(() => {
    const q = studentSearchQuery.trim().toLowerCase();
    if (!q) return alumnos;
    return alumnos.filter((a, idx) => {
      const order = String(a.numeroOrden ?? idx + 1);
      return order === q || a.nombreCompleto.toLowerCase().includes(q);
    });
  }, [alumnos, studentSearchQuery]);

  const switchStudent = useCallback(
    (targetInscripcionId: string) => {
      if (targetInscripcionId === selectedInscripcionId || studentNavigationDisabled) return;
      const applySwitch = () => {
        setIsStaffEditing(false);
        setRequestedInscripcionId(targetInscripcionId);
        onStudentChange?.(targetInscripcionId);
      };
      if (!hasChanges && !isStaffEditing) {
        applySwitch();
        return;
      }
      modal.confirm({
        title: '¿Cambiar de alumno sin guardar?',
        content: 'Los cambios pendientes en el informe de este alumno se perderán.',
        okText: 'Cambiar sin guardar',
        okType: 'danger',
        cancelText: 'Continuar editando',
        onOk: applySwitch,
      });
    },
    [hasChanges, isStaffEditing, modal, onStudentChange, selectedInscripcionId, studentNavigationDisabled],
  );

  const hasBlocks = useMemo(
    () => items.some((item) => Boolean(item.bloqueNombre)),
    [items],
  );

  const tableRows = useMemo<TableItemRow[]>(() => {
    return items.map((item, idx) => {
      if (!hasBlocks) {
        return { item, showBlockCell: false, blockRowSpan: 1 };
      }
      const blockName = item.bloqueNombre || '';
      const prevBlock = idx > 0 ? items[idx - 1].bloqueNombre || '' : null;
      if (idx > 0 && blockName === prevBlock) {
        return { item, showBlockCell: false, blockRowSpan: 0 };
      }
      let span = 1;
      while (
        idx + span < items.length &&
        (items[idx + span].bloqueNombre || '') === blockName
      ) {
        span += 1;
      }
      return { item, showBlockCell: true, blockRowSpan: span };
    });
  }, [hasBlocks, items]);

  const availableEscalaItems = useMemo(
    () => plantilla.escalaItems.filter((opt) => !isNoCorrespondeOption(opt.codigo, opt.etiqueta)),
    [plantilla.escalaItems],
  );

  const availableEscalaDesempenoGeneral = useMemo(
    () =>
      plantilla.escalaDesempenoGeneral.filter(
        (opt) => !isNoCorrespondeOption(opt.codigo, opt.etiqueta),
      ),
    [plantilla.escalaDesempenoGeneral],
  );

  const escalaItemLabelByCode = useMemo(
    () => new Map(plantilla.escalaItems.map((opt) => [opt.codigo, opt.etiqueta])),
    [plantilla.escalaItems],
  );
  const escalaDesempenoLabelByCode = useMemo(
    () => new Map(plantilla.escalaDesempenoGeneral.map((opt) => [opt.codigo, opt.etiqueta])),
    [plantilla.escalaDesempenoGeneral],
  );

  const answeredCountDraft = useMemo(
    () => items.filter((item) => Boolean(draftRespuestas[item.id])).length,
    [draftRespuestas, items],
  );
  const draftComplete = useMemo(
    () => (
      items.length > 0 &&
      answeredCountDraft === items.length &&
      (!plantilla.requiereDesempenoGeneral || Boolean(draftDesempeno))
    ),
    [answeredCountDraft, draftDesempeno, items.length, plantilla.requiereDesempenoGeneral],
  );

  const completedStudentsCount = useMemo(
    () => alumnos.filter((a) => studentStatusMap[a.inscripcionId]?.completo).length,
    [alumnos, studentStatusMap],
  );
  const pendingStudentsCount = alumnos.length - completedStudentsCount;
  const allStudentsComplete = alumnos.length > 0 && completedStudentsCount === alumnos.length;

  useEffect(() => {
    onCompletedCountChange?.(completedStudentsCount);
  }, [completedStudentsCount, onCompletedCountChange]);

  const handleSelectItemValue = (itemId: string, codigo: string) => {
    if (saving) return;
    setDraftRespuestas((current) => ({
      ...current,
      [itemId]: current[itemId] === codigo && !readOnly ? '' : codigo,
    }));
  };

  const handleDiscardChanges = () => {
    setDraftRespuestas(savedRespuestas);
    setDraftDesempeno(savedDesempeno);
    setDraftObservaciones(savedObservaciones);
    setEditingItemId(null);
    setEditingDesempeno(false);
    setEditingObservaciones(false);
    setIsStaffEditing(false);
    setRevisionConflict(false);
  };

  const handleSaveCurrentStudent = async () => {
    if (!selectedInscripcionId) return;
    if (readOnly && !draftComplete) {
      message.warning('En revisión directiva debés completar todos los ítems y el desempeño general antes de guardar.');
      return;
    }
    try {
      setSaving(true);
      const respuestasPayload = items
        .filter((item) => Boolean(draftRespuestas[item.id]))
        .map((item) => ({
          itemId: item.id,
          valorCodigo: draftRespuestas[item.id],
        }));

      const result = await access.dataSource.saveAlumno({
        inscripcionId: selectedInscripcionId,
        expectedRevision: loadedRevision ?? workflowRevision,
        desempenoGeneralValor: draftDesempeno,
        observaciones: draftObservaciones,
        respuestas: respuestasPayload,
      });

      const nextMap: Record<string, string> = {};
      for (const resp of result.evaluacion.respuestas) {
        nextMap[resp.itemId] = resp.valorCodigo;
      }
      setSavedRespuestas(nextMap);
      setDraftRespuestas(nextMap);
      setSavedDesempeno(result.evaluacion.desempenoGeneralValor || '');
      setDraftDesempeno(result.evaluacion.desempenoGeneralValor || '');
      setSavedObservaciones(result.evaluacion.observaciones || '');
      setDraftObservaciones(result.evaluacion.observaciones || '');
      if (result.revision !== undefined) {
        setLoadedRevision(result.revision);
      }
      setIsStaffEditing(false);
      setEditingItemId(null);
      setEditingDesempeno(false);
      setEditingObservaciones(false);
      setRevisionConflict(false);
      setStudentStatusOverrides((current) => ({
        ...current,
        [selectedInscripcionId]: {
          completo: result.completo,
          itemsRespondidos: result.itemsRespondidos,
          totalItems: result.totalItems,
          desempenoGeneralCompleto: result.desempenoGeneralCompleto,
        },
      }));
      onSaveSuccess?.(result);
      message.success(
        readOnly
          ? 'Corrección guardada. El visado del alumno quedó pendiente de nueva revisión.'
          : result.completo
            ? 'Informe del alumno guardado y completo'
            : 'Avance del alumno guardado',
      );
    } catch (error) {
      if (error instanceof InformeAccessDeniedError) {
        access.onAccessDenied?.();
        return;
      }
      if (error instanceof InformeRevisionConflictError) {
        setRevisionConflict(true);
        message.warning('El informe cambió en otra sesión. Recargá los datos antes de guardar.');
        return;
      }
      console.error(error);
      message.error('No se pudo guardar el informe del alumno');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReport = () => {
    if (!access.canSubmitReport || !access.dataSource.submitReport) return;
    if (hasChanges) {
      message.warning('Guardá los cambios pendientes del alumno actual antes de enviar el informe.');
      return;
    }
    const targetCourseLabel = cursoNombre || 'el curso';
    modal.confirm({
      title: cursoNombre
        ? `¿Enviar el informe de ${cursoNombre} a Dirección?`
        : '¿Enviar el informe completo a Dirección?',
      content: tieneOtrosCursosAsignados
        ? `Al confirmar la entrega, ${targetCourseLabel} pasará a Revisión Directiva. Este enlace seguirá habilitado para los demás grados pendientes de tu asignación.`
        : 'Al confirmar la entrega, el curso pasará a Revisión Directiva y este enlace de carga dejará de estar habilitado para modificaciones.',
      okText: 'Confirmar y enviar',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          setSubmitting(true);
          const result = await access.dataSource.submitReport!();
          access.onReportSubmitted?.(result);
        } catch (error) {
          if (error instanceof InformeAccessDeniedError) {
            access.onAccessDenied?.();
            return;
          }
          if (error instanceof InformeSubmissionIncompleteError) {
            const detail = error.detail;
            if (detail.cursadasPendientes?.length > 0) {
              modal.warning({
                title: 'Cursadas pendientes de confirmación',
                content: `Dirección debe confirmar la cursada de ${detail.cursadasPendientes.length} alumno(s) antes de enviar la entrega definitiva.`,
              });
            } else {
              modal.warning({
                title: 'Faltan alumnos por completar',
                content: `Completá todos los ítems y el desempeño general de los ${detail.pendientes.length} alumno(s) pendientes antes de enviar.`,
              });
            }
            return;
          }
          console.error(error);
          message.error('No se pudo enviar el informe');
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const filteredDrawerAlumnos = useMemo(() => {
    if (drawerFilter === 'COMPLETOS') {
      return alumnos.filter((a) => studentStatusMap[a.inscripcionId]?.completo);
    }
    if (drawerFilter === 'PENDIENTES') {
      return alumnos.filter((a) => !studentStatusMap[a.inscripcionId]?.completo);
    }
    return alumnos;
  }, [alumnos, drawerFilter, studentStatusMap]);

  const visadosCount = useMemo(
    () => alumnos.filter((a) => a.estadoVisado === 'VISADO').length,
    [alumnos],
  );

  const studentModalTitle = useMemo(() => {
    if (readOnly && alumnos.some((a) => Boolean(a.estadoVisado))) {
      return `Seleccionar alumno (${visadosCount}/${alumnos.length} visados)`;
    }
    return `Seleccionar alumno (${completedStudentsCount}/${alumnos.length} completos)`;
  }, [alumnos, completedStudentsCount, readOnly, visadosCount]);

  const progressActionControl = !readOnly ? (
    <Button
      icon={allStudentsComplete ? <CheckCircleOutlined style={{ color: 'var(--cys-color-success-text)' }} /> : <UnorderedListOutlined />}
      onClick={() => setDrawerOpen(true)}
    >
      Progreso ({completedStudentsCount}/{alumnos.length})
    </Button>
  ) : null;

  const submitActionControl = !readOnly && access.canSubmitReport ? (
    <Tooltip
      title={
        hasChanges
          ? 'Guardá los cambios pendientes del alumno actual antes de enviar'
          : !allStudentsComplete
            ? `Faltan completar ${pendingStudentsCount} alumno(s) para poder enviar a Dirección`
            : undefined
      }
    >
      <span>
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={submitting}
          disabled={!allStudentsComplete || hasChanges || saving}
          onClick={handleSubmitReport}
        >
          {cursoNombre ? `Enviar ${cursoNombre} a Dirección` : 'Enviar informe a Dirección'}
        </Button>
      </span>
    </Tooltip>
  ) : null;

  return (
    <div className={styles.wrapper}>
      {(submitActionControl || reviewControls) && (
        <div className={styles.mobileActionsBar}>
          {submitActionControl}
          {reviewControls}
        </div>
      )}

      <Card className={styles.studentToolbar}>
        <div className={styles.toolbarRow}>
          <div className={styles.studentNavGroup}>
            <Button
              icon={<LeftOutlined />}
              disabled={currentIndex <= 0 || studentNavigationDisabled || saving}
              onClick={() => {
                if (currentIndex > 0) switchStudent(alumnos[currentIndex - 1].inscripcionId);
              }}
              aria-label="Alumno anterior"
              className={styles.navArrowButton}
            />
            <Select
              showSearch
              filterOption={(input, option) => {
                const search = (option as { searchValue?: string })?.searchValue;
                return Boolean(search && search.toLowerCase().includes(input.toLowerCase()));
              }}
              placement="bottomLeft"
              classNames={{ popup: { root: styles.studentDropdown } }}
              className={`${styles.studentSelect} ${styles.desktopStudentSelect}`}
              value={selectedInscripcionId}
              disabled={studentNavigationDisabled || saving}
              onChange={(val) => switchStudent(val)}
              options={alumnos.map((a, idx) => {
                const order = a.numeroOrden ?? idx + 1;
                const isDirectivoReview = readOnly && Boolean(a.estadoVisado);
                const isVisado = a.estadoVisado === 'VISADO';
                const st = studentStatusMap[a.inscripcionId];
                const isComplete = Boolean(st?.completo);

                const statusLabel = isDirectivoReview
                  ? (isVisado ? 'Visado' : 'Sin visar')
                  : (isComplete ? 'Completo' : `${st?.itemsRespondidos ?? 0}/${items.length}`);

                const statusColor = isDirectivoReview
                  ? (isVisado ? 'success' : 'warning')
                  : (isComplete ? 'success' : 'warning');

                return {
                  value: a.inscripcionId,
                  searchValue: `${order}. ${a.nombreCompleto} ${statusLabel}`,
                  label: (
                    <div className={styles.studentOptionRow}>
                      <span className={styles.studentOptionName}>
                        {order}. {a.nombreCompleto}
                      </span>
                      <Tag
                        color={statusColor}
                        className={styles.studentOptionTag}
                      >
                        {statusLabel}
                      </Tag>
                    </div>
                  ),
                };
              })}
            />
            <button
              type="button"
              className={styles.mobileStudentTrigger}
              onClick={() => setStudentModalOpen(true)}
              disabled={studentNavigationDisabled || saving}
              aria-label="Seleccionar alumno"
            >
              <span className={styles.mobileStudentTriggerName}>
                {currentAlumno ? `${currentOrder}. ${currentAlumno.nombreCompleto}` : 'Seleccionar alumno...'}
              </span>
              <span className={styles.mobileStudentTriggerRight}>
                {currentAlumno && (
                  <Tag color={currentStatusColor} className={styles.mobileStudentTriggerTag}>
                    {currentStatusLabel}
                  </Tag>
                )}
                <DownOutlined className={styles.mobileStudentTriggerArrow} />
              </span>
            </button>
            <Button
              icon={<RightOutlined />}
              disabled={currentIndex < 0 || currentIndex >= alumnos.length - 1 || studentNavigationDisabled || saving}
              onClick={() => {
                if (currentIndex >= 0 && currentIndex < alumnos.length - 1) {
                  switchStudent(alumnos[currentIndex + 1].inscripcionId);
                }
              }}
              aria-label="Alumno siguiente"
              className={styles.navArrowButton}
            />
          </div>

          <div className={styles.desktopToolbarActions}>
            {progressActionControl}
            {submitActionControl}
            {reviewControls}
          </div>
        </div>
      </Card>

      {revisionConflict && (
        <Alert
          type="error"
          showIcon
          title="El informe fue modificado en otra sesión"
          description="Recargá los datos actualizados antes de realizar una nueva corrección."
          action={
            <Button
              size="small"
              onClick={() => setStudentReloadCounter((c) => c + 1)}
            >
              Recargar datos
            </Button>
          }
        />
      )}

      {plantilla.mostrarLeyendaEscala && (
        <Card className={styles.legendCard}>
          <span className={styles.legendTitle}>Contenidos · Referencia de escala</span>
          <div className={styles.legendGrid}>
            {availableEscalaItems.map((opt) => (
              <div key={opt.codigo} className={styles.legendItem}>
                <span className={styles.legendCode}>{opt.etiqueta}</span>
                <Text>{opt.descripcion || opt.etiqueta}</Text>
              </div>
            ))}
          </div>
        </Card>
      )}

      {loadingStudent ? (
        <Card style={{ textAlign: 'center', padding: 64 }}>
          <Spin size="large" description="Cargando informe del alumno..." />
        </Card>
      ) : !currentAlumno ? (
        <Card>
          <Empty description="Seleccioná un alumno para visualizar su informe" />
        </Card>
      ) : (
        <Card className={styles.itemsCard}>
          <div className={styles.cardHeaderRow} style={{ marginBottom: 14 }}>
            <div className={styles.cardTitleGroup}>
              <Typography.Title level={5} style={{ margin: 0 }}>
                {plantilla.tituloTabla}
              </Typography.Title>
              <Tag
                color={draftComplete ? 'success' : 'warning'}
                icon={draftComplete ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
              >
                {answeredCountDraft} de {items.length} ítems calificados
              </Tag>
              {hasChanges && (
                <Tag color="processing" icon={<ExclamationCircleOutlined />}>
                  Cambios sin guardar
                </Tag>
              )}
            </div>

            {readOnly && hasChanges && (
              <Space size={8}>
                <Button
                  icon={<CloseOutlined />}
                  disabled={saving}
                  onClick={handleDiscardChanges}
                >
                  Descartar
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={saving}
                  onClick={() => void handleSaveCurrentStudent()}
                >
                  Guardar corrección
                </Button>
              </Space>
            )}
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-labelledby={tableCaptionId}
            className={styles.tableRegion}
          >
            <table className={styles.itemsTable}>
              <caption id={tableCaptionId} className="sr-only" style={{ display: 'none' }}>
                {plantilla.tituloTabla} — {currentAlumno.nombreCompleto}
              </caption>
              <thead>
                <tr>
                  {hasBlocks && <th scope="col">Bloque</th>}
                  <th scope="col" className={styles.orderCell}>N.°</th>
                  <th scope="col">Indicador / Contenido</th>
                  <th scope="col">Valoración</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map(({ item, showBlockCell, blockRowSpan }) => {
                  const currentCode = draftRespuestas[item.id] || '';
                  return (
                    <tr key={item.id}>
                      {hasBlocks && showBlockCell && (
                        <td rowSpan={blockRowSpan} className={styles.blockCell}>
                          {item.bloqueNombre || 'General'}
                        </td>
                      )}
                      <td className={styles.orderCell}>
                        <span className={styles.itemIndexBadge}>{item.ordenVisual}</span>
                      </td>
                      <th scope="row" className={styles.promptHeaderCell}>
                        {item.texto}
                      </th>
                      <td className={styles.valueCell}>
                        {!readOnly || isStaffEditing ? (
                          <div className={styles.scaleOptionsGroup}>
                            {availableEscalaItems.map((opt) => {
                              const selected = currentCode === opt.codigo;
                              return (
                                <Button
                                  key={opt.codigo}
                                  size="small"
                                  type={selected ? 'primary' : 'default'}
                                  className={styles.scaleOptionButton}
                                  onClick={() => handleSelectItemValue(item.id, opt.codigo)}
                                >
                                  {opt.etiqueta}
                                </Button>
                              );
                            })}
                          </div>
                        ) : editingItemId === item.id ? (
                          <div className={styles.scaleOptionsGroup} style={{ alignItems: 'center' }}>
                            {availableEscalaItems.map((opt) => {
                              const selected = currentCode === opt.codigo;
                              return (
                                <Button
                                  key={opt.codigo}
                                  size="small"
                                  type={selected ? 'primary' : 'default'}
                                  className={styles.scaleOptionButton}
                                  onClick={() => {
                                    handleSelectItemValue(item.id, opt.codigo);
                                    setEditingItemId(null);
                                  }}
                                >
                                  {opt.etiqueta}
                                </Button>
                              );
                            })}
                            <Tooltip title="Cancelar">
                              <Button
                                type="text"
                                size="small"
                                shape="circle"
                                icon={<CloseOutlined />}
                                onClick={() => setEditingItemId(null)}
                                aria-label="Cancelar edición de este ítem"
                              />
                            </Tooltip>
                          </div>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <Tooltip title="Modificar valoración">
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={() => !saving && setEditingItemId(item.id)}
                                onKeyDown={(e) => {
                                  if (!saving && (e.key === 'Enter' || e.key === ' ')) {
                                    e.preventDefault();
                                    setEditingItemId(item.id);
                                  }
                                }}
                                style={{
                                  cursor: saving ? 'not-allowed' : 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                              >
                                {currentCode ? (
                                  <Tag
                                    color="blue"
                                    style={{
                                      fontWeight: 700,
                                      fontSize: 13,
                                      padding: '2px 10px',
                                      margin: 0,
                                      cursor: 'inherit',
                                    }}
                                  >
                                    {escalaItemLabelByCode.get(currentCode) || currentCode}
                                  </Tag>
                                ) : (
                                  <Text type="secondary" style={{ cursor: 'inherit' }}>
                                    Sin calificar
                                  </Text>
                                )}
                              </span>
                            </Tooltip>
                            <Tooltip title="Modificar valoración">
                              <Button
                                type="text"
                                size="small"
                                shape="circle"
                                icon={<EditOutlined style={{ fontSize: 13, color: 'var(--cys-color-primary-text)' }} />}
                                disabled={saving}
                                onClick={() => setEditingItemId(item.id)}
                                aria-label={`Modificar valoración de ítem ${item.ordenVisual}`}
                              />
                            </Tooltip>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {plantilla.requiereDesempenoGeneral && (
            <div className={styles.generalSection}>
              <div className={styles.generalHeader}>
                <Space size={8}>
                  <TrophyOutlined style={{ color: 'var(--cys-color-primary-text)', fontSize: 16 }} />
                  <Text strong style={{ fontSize: 14 }}>
                    Desempeño General del Área Especial
                  </Text>
                </Space>
                {!draftDesempeno && (
                  <Tag color="warning">Requerido para completar el informe</Tag>
                )}
              </div>

              {!readOnly || isStaffEditing ? (
                <div className={styles.generalScaleOptionsGroup}>
                  {availableEscalaDesempenoGeneral.map((opt) => {
                    const selected = draftDesempeno === opt.codigo;
                    return (
                      <Button
                        key={opt.codigo}
                        type={selected ? 'primary' : 'default'}
                        onClick={() =>
                          setDraftDesempeno((current) =>
                            current === opt.codigo && !readOnly ? '' : opt.codigo,
                          )
                        }
                      >
                        {opt.etiqueta}
                      </Button>
                    );
                  })}
                </div>
              ) : editingDesempeno ? (
                <div className={styles.generalScaleOptionsGroup} style={{ alignItems: 'center' }}>
                  {availableEscalaDesempenoGeneral.map((opt) => {
                    const selected = draftDesempeno === opt.codigo;
                    return (
                      <Button
                        key={opt.codigo}
                        type={selected ? 'primary' : 'default'}
                        className={styles.scaleOptionButton}
                        onClick={() => {
                          setDraftDesempeno(opt.codigo);
                          setEditingDesempeno(false);
                        }}
                      >
                        {opt.etiqueta}
                      </Button>
                    );
                  })}
                  <Tooltip title="Cancelar">
                    <Button
                      type="text"
                      size="small"
                      shape="circle"
                      icon={<CloseOutlined />}
                      onClick={() => setEditingDesempeno(false)}
                      aria-label="Cancelar modificación de desempeño general"
                    />
                  </Tooltip>
                </div>
              ) : (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Tooltip title="Modificar desempeño general">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => !saving && setEditingDesempeno(true)}
                      onKeyDown={(e) => {
                        if (!saving && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          setEditingDesempeno(true);
                        }
                      }}
                      style={{
                        cursor: saving ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      {draftDesempeno ? (
                        <Tag
                          color="success"
                          style={{
                            fontWeight: 700,
                            fontSize: 13.5,
                            padding: '4px 12px',
                            margin: 0,
                            cursor: 'inherit',
                          }}
                        >
                          {escalaDesempenoLabelByCode.get(draftDesempeno) || draftDesempeno}
                        </Tag>
                      ) : (
                        <Text type="secondary" style={{ cursor: 'inherit' }}>
                          Sin calificación general
                        </Text>
                      )}
                    </span>
                  </Tooltip>
                  <Tooltip title="Modificar desempeño general">
                    <Button
                      type="text"
                      size="small"
                      shape="circle"
                      icon={<EditOutlined style={{ fontSize: 13, color: 'var(--cys-color-primary-text)' }} />}
                      disabled={saving}
                      onClick={() => setEditingDesempeno(true)}
                      aria-label="Modificar desempeño general"
                    />
                  </Tooltip>
                </div>
              )}
            </div>
          )}

          {plantilla.permiteObservaciones && (
            <div className={styles.generalSection}>
              <div className={styles.generalHeader}>
                <Text strong style={{ fontSize: 14 }}>
                  Observaciones
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Si se deja vacío se imprimirá &quot;-&quot;
                </Text>
              </div>
              {!readOnly || isStaffEditing ? (
                <Input.TextArea
                  rows={3}
                  maxLength={1000}
                  showCount
                  placeholder="Observaciones pedagógicas o de convivencia (opcional)..."
                  value={draftObservaciones}
                  onChange={(e) => setDraftObservaciones(e.target.value)}
                />
              ) : editingObservaciones ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Input.TextArea
                    rows={3}
                    maxLength={1000}
                    showCount
                    autoFocus
                    placeholder="Observaciones pedagógicas o de convivencia (opcional)..."
                    value={draftObservaciones}
                    onChange={(e) => setDraftObservaciones(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button size="small" onClick={() => setEditingObservaciones(false)}>
                      Listo
                    </Button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <Text style={{ whiteSpace: 'pre-wrap' }}>{draftObservaciones.trim() || '-'}</Text>
                  <Tooltip title="Modificar observaciones">
                    <Button
                      type="text"
                      size="small"
                      shape="circle"
                      icon={<EditOutlined style={{ fontSize: 13, color: 'var(--cys-color-primary-text)' }} />}
                      disabled={saving}
                      onClick={() => setEditingObservaciones(true)}
                      aria-label="Modificar observaciones"
                    />
                  </Tooltip>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {hasChanges && (
        <div className={`cys-floating-action-bar ${styles.floatingActionBar}`}>
          <div className={styles.floatingActionStatus}>
            <ExclamationCircleOutlined style={{ color: 'var(--cys-color-primary-text)', fontSize: 18 }} />
            <Text strong className={styles.floatingActionText}>
              Cambios sin guardar
              {currentAlumno ? ` · ${currentAlumno.nombreCompleto}` : ''}
            </Text>
          </div>

          <div className={styles.floatingActionButtons}>
            <Button
              onClick={handleDiscardChanges}
              disabled={saving}
              className={styles.floatingActionDiscardBtn}
            >
              Descartar
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => void handleSaveCurrentStudent()}
              loading={saving}
              className={`btn-primary-gradient ${styles.floatingActionSaveBtn}`}
            >
              {readOnly ? 'Guardar corrección' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      )}

      <Drawer
        title="Progreso de informes del curso"
        placement="right"
        styles={{ wrapper: { width: 'min(400px, 100vw)' } }}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text strong>
              {completedStudentsCount} de {alumnos.length} alumnos completos
            </Text>
            <Text strong>
              {alumnos.length > 0 ? Math.round((completedStudentsCount / alumnos.length) * 100) : 0}%
            </Text>
          </div>
          <Progress
            percent={alumnos.length > 0 ? Math.round((completedStudentsCount / alumnos.length) * 100) : 0}
            showInfo={false}
          />
        </div>

        <Segmented
          block
          style={{ marginBottom: 14 }}
          value={drawerFilter}
          onChange={(val) => setDrawerFilter(val as 'TODOS' | 'PENDIENTES' | 'COMPLETOS')}
          options={[
            { label: `Todos (${alumnos.length})`, value: 'TODOS' },
            { label: `Pendientes (${alumnos.length - completedStudentsCount})`, value: 'PENDIENTES' },
            { label: `Completos (${completedStudentsCount})`, value: 'COMPLETOS' },
          ]}
        />

        {filteredDrawerAlumnos.map((alumno, idx) => {
          const isDirectivoReview = readOnly && Boolean(alumno.estadoVisado);
          const isVisado = alumno.estadoVisado === 'VISADO';
          const st = studentStatusMap[alumno.inscripcionId];
          const isCurrent = alumno.inscripcionId === selectedInscripcionId;
          const statusLabel = isDirectivoReview
            ? (isVisado ? 'Visado' : 'Sin visar')
            : (st?.completo ? 'Completo' : `${st?.itemsRespondidos ?? 0}/${items.length}`);
          const statusColor = isDirectivoReview
            ? (isVisado ? 'success' : 'warning')
            : (st?.completo ? 'success' : 'warning');
          return (
            <button
              key={alumno.inscripcionId}
              type="button"
              className={`${styles.drawerStudentButton} ${isCurrent ? styles.drawerStudentButtonActive : ''}`}
              onClick={() => {
                setDrawerOpen(false);
                switchStudent(alumno.inscripcionId);
              }}
            >
              <span>
                <Text strong>
                  {alumno.numeroOrden ?? idx + 1}. {alumno.nombreCompleto}
                </Text>
              </span>
              <Tag color={statusColor} style={{ margin: 0 }}>
                {statusLabel}
              </Tag>
            </button>
          );
        })}
      </Drawer>

      <Modal
        title={studentModalTitle}
        open={studentModalOpen}
        onCancel={() => {
          setStudentModalOpen(false);
          setStudentSearchQuery('');
        }}
        footer={null}
        centered
        width="min(460px, 94vw)"
        destroyOnHidden
        styles={{
          body: {
            padding: '12px 14px',
            maxHeight: '70vh',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--cys-color-text-secondary)' }} />}
          placeholder="Buscar por nombre o número..."
          allowClear
          value={studentSearchQuery}
          onChange={(e) => setStudentSearchQuery(e.target.value)}
          className={styles.modalStudentSearchInput}
        />
        <div className={styles.modalStudentList}>
          {modalFilteredAlumnos.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No se encontraron alumnos"
              style={{ margin: '20px 0' }}
            />
          ) : (
            modalFilteredAlumnos.map((alumno) => {
              const originalIndex = alumnos.findIndex((a) => a.inscripcionId === alumno.inscripcionId);
              const order = alumno.numeroOrden ?? (originalIndex >= 0 ? originalIndex + 1 : 1);
              const isDirectivoReview = readOnly && Boolean(alumno.estadoVisado);
              const isVisado = alumno.estadoVisado === 'VISADO';
              const st = studentStatusMap[alumno.inscripcionId];
              const isComplete = Boolean(st?.completo);
              const isCurrent = alumno.inscripcionId === selectedInscripcionId;

              const statusLabel = isDirectivoReview
                ? (isVisado ? 'Visado' : 'Sin visar')
                : (isComplete ? 'Completo' : `${st?.itemsRespondidos ?? 0}/${items.length}`);

              const statusColor = isDirectivoReview
                ? (isVisado ? 'success' : 'warning')
                : (isComplete ? 'success' : 'warning');

              return (
                <button
                  key={alumno.inscripcionId}
                  type="button"
                  className={`${styles.modalStudentItem} ${isCurrent ? styles.modalStudentItemSelected : ''}`}
                  onClick={() => {
                    setStudentModalOpen(false);
                    setStudentSearchQuery('');
                    switchStudent(alumno.inscripcionId);
                  }}
                >
                  <div className={styles.modalStudentItemLeft}>
                    {isCurrent && <CheckCircleOutlined className={styles.modalStudentItemCheck} />}
                    <span className={styles.modalStudentItemName}>
                      {order}. {alumno.nombreCompleto}
                    </span>
                  </div>
                  <Tag color={statusColor} className={styles.modalStudentItemTag}>
                    {statusLabel}
                  </Tag>
                </button>
              );
            })
          )}
        </div>
      </Modal>
    </div>
  );
};
