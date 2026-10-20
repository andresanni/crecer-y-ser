import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Drawer,
  Empty,
  Input,
  Progress,
  Segmented,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  LeftOutlined,
  RightOutlined,
  SaveOutlined,
  SendOutlined,
  TrophyOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import type {
  AlumnoInformeRow,
  ItemPlantillaInforme,
  PlantillaInforme,
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
  onSaveSuccess?: (result: InformeStudentSaveResult) => void;
  initialInscripcionId?: string | null;
  onStudentChange?: (inscripcionId: string) => void;
  studentNavigationDisabled?: boolean;
  reviewControls?: React.ReactNode;
  onPendingChangesChange?: (hasChanges: boolean) => void;
}

interface PageItemGroup {
  pagina: number;
  rows: Array<{
    item: ItemPlantillaInforme;
    showBlockCell: boolean;
    blockRowSpan: number;
  }>;
}

export const VistaInformePorAlumno: React.FC<VistaInformePorAlumnoProps> = ({
  plantilla,
  items,
  alumnos,
  access,
  readOnly = false,
  workflowRevision,
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

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerFilter, setDrawerFilter] = useState<'TODOS' | 'PENDIENTES' | 'COMPLETOS'>('TODOS');

  const isEditable = !readOnly || isStaffEditing;

  const hasChanges = useMemo(() => {
    if (!isEditable) return false;
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
    isEditable,
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

  const pageGroups = useMemo<PageItemGroup[]>(() => {
    const pages = new Map<number, ItemPlantillaInforme[]>();
    for (const item of items) {
      const pageNum = item.pagina || 1;
      const list = pages.get(pageNum) || [];
      list.push(item);
      pages.set(pageNum, list);
    }
    const sortedPageNumbers = Array.from(pages.keys()).sort((a, b) => a - b);
    return sortedPageNumbers.map((pagina) => {
      const pageItems = pages.get(pagina) || [];
      const rows = pageItems.map((item, idx) => {
        if (!hasBlocks) {
          return { item, showBlockCell: false, blockRowSpan: 1 };
        }
        const blockName = item.bloqueNombre || '';
        const prevBlock = idx > 0 ? pageItems[idx - 1].bloqueNombre || '' : null;
        if (idx > 0 && blockName === prevBlock) {
          return { item, showBlockCell: false, blockRowSpan: 0 };
        }
        let span = 1;
        while (
          idx + span < pageItems.length &&
          (pageItems[idx + span].bloqueNombre || '') === blockName
        ) {
          span += 1;
        }
        return { item, showBlockCell: true, blockRowSpan: span };
      });
      return { pagina, rows };
    });
  }, [hasBlocks, items]);

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

  const handleSelectItemValue = (itemId: string, codigo: string) => {
    if (!isEditable) return;
    setDraftRespuestas((current) => ({
      ...current,
      [itemId]: current[itemId] === codigo && !readOnly ? '' : codigo,
    }));
  };

  const handleDiscardChanges = () => {
    setDraftRespuestas(savedRespuestas);
    setDraftDesempeno(savedDesempeno);
    setDraftObservaciones(savedObservaciones);
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
    modal.confirm({
      title: '¿Enviar el informe completo a Dirección?',
      content:
        'Al confirmar la entrega, el curso pasará a Revisión Directiva y este enlace de carga dejará de estar habilitado para modificaciones.',
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

  return (
    <div className={styles.wrapper}>
      <Card className={styles.studentToolbar} styles={{ body: { padding: '14px 18px' } }}>
        <div className={styles.toolbarRow}>
          <div className={styles.studentNavGroup}>
            <Button
              icon={<LeftOutlined />}
              disabled={currentIndex <= 0 || studentNavigationDisabled || saving}
              onClick={() => {
                if (currentIndex > 0) switchStudent(alumnos[currentIndex - 1].inscripcionId);
              }}
              aria-label="Alumno anterior"
            />
            <span className={styles.orderBadge}>
              {currentAlumno?.numeroOrden ?? (currentIndex >= 0 ? currentIndex + 1 : '•')}
            </span>
            <Select
              showSearch
              optionFilterProp="label"
              className={styles.studentSelect}
              value={selectedInscripcionId}
              disabled={studentNavigationDisabled || saving}
              onChange={(val) => switchStudent(val)}
              options={alumnos.map((a, idx) => {
                const st = studentStatusMap[a.inscripcionId];
                const suffix = st?.completo
                  ? '✓ Completo'
                  : `${st?.itemsRespondidos ?? 0}/${items.length}`;
                return {
                  value: a.inscripcionId,
                  label: `${a.numeroOrden ?? idx + 1}. ${a.nombreCompleto} (${suffix})`,
                };
              })}
            />
            <Button
              icon={<RightOutlined />}
              disabled={currentIndex < 0 || currentIndex >= alumnos.length - 1 || studentNavigationDisabled || saving}
              onClick={() => {
                if (currentIndex >= 0 && currentIndex < alumnos.length - 1) {
                  switchStudent(alumnos[currentIndex + 1].inscripcionId);
                }
              }}
              aria-label="Alumno siguiente"
            />
          </div>

          <div className={styles.toolbarActions}>
            {!readOnly && (
              <>
                <Button
                  icon={<UnorderedListOutlined />}
                  onClick={() => setDrawerOpen(true)}
                >
                  Progreso ({completedStudentsCount}/{alumnos.length})
                </Button>
                {access.canSubmitReport && (
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={submitting}
                    onClick={handleSubmitReport}
                  >
                    Enviar informe a Dirección
                  </Button>
                )}
              </>
            )}
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
        <Card className={styles.legendCard} styles={{ body: { padding: '12px 18px' } }}>
          <span className={styles.legendTitle}>Contenidos · Referencia de escala</span>
          <div className={styles.legendGrid}>
            {plantilla.escalaItems.map((opt) => (
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

            {readOnly && (
              <Space size={8}>
                {!isStaffEditing ? (
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => setIsStaffEditing(true)}
                  >
                    Editar informe
                  </Button>
                ) : (
                  <>
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
                  </>
                )}
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
                {pageGroups.map((pageGroup) => (
                  <React.Fragment key={pageGroup.pagina}>
                    {pageGroups.length > 1 && (
                      <tr>
                        <td
                          colSpan={hasBlocks ? 4 : 3}
                          className={styles.pageDivider}
                        >
                          Hoja {pageGroup.pagina} del documento A4
                        </td>
                      </tr>
                    )}
                    {pageGroup.rows.map(({ item, showBlockCell, blockRowSpan }) => {
                      const currentCode = draftRespuestas[item.id] || '';
                      return (
                        <tr key={item.id}>
                          {hasBlocks && showBlockCell && (
                            <td rowSpan={blockRowSpan} className={styles.blockCell}>
                              {item.bloqueNombre || 'General'}
                            </td>
                          )}
                          <td className={styles.orderCell}>{item.ordenVisual}</td>
                          <th scope="row" className={styles.promptHeaderCell}>
                            {item.texto}
                          </th>
                          <td className={styles.valueCell}>
                            {isEditable ? (
                              <div className={styles.scaleOptionsGroup}>
                                {plantilla.escalaItems.map((opt) => {
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
                            ) : currentCode ? (
                              <Tag color="blue" style={{ fontWeight: 700, fontSize: 13, padding: '2px 10px' }}>
                                {escalaItemLabelByCode.get(currentCode) || currentCode}
                              </Tag>
                            ) : (
                              <Text type="secondary">Sin calificar</Text>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
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

              {isEditable ? (
                <div className={styles.scaleOptionsGroup}>
                  {plantilla.escalaDesempenoGeneral.map((opt) => {
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
              ) : draftDesempeno ? (
                <div>
                  <Tag color="success" style={{ fontWeight: 700, fontSize: 13.5, padding: '4px 12px' }}>
                    {escalaDesempenoLabelByCode.get(draftDesempeno) || draftDesempeno}
                  </Tag>
                </div>
              ) : (
                <Text type="secondary">Sin calificación general</Text>
              )}
            </div>
          )}

          {plantilla.permiteObservaciones && (
            <div className={styles.generalSection}>
              <div className={styles.generalHeader}>
                <Text strong style={{ fontSize: 14 }}>
                  Observaciones (Hoja 2)
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Si se deja vacío se imprimirá &quot;-&quot;
                </Text>
              </div>
              {isEditable ? (
                <Input.TextArea
                  rows={3}
                  maxLength={1000}
                  showCount
                  placeholder="Observaciones pedagógicas o de convivencia (opcional)..."
                  value={draftObservaciones}
                  onChange={(e) => setDraftObservaciones(e.target.value)}
                />
              ) : (
                <Text>{draftObservaciones.trim() || '-'}</Text>
              )}
            </div>
          )}

          {!readOnly && (
            <div className={styles.footerBar}>
              <Space size={8} wrap>
                <Button
                  disabled={!hasChanges || saving}
                  onClick={handleDiscardChanges}
                >
                  Descartar cambios
                </Button>
              </Space>
              <Space size={10} wrap>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={saving}
                  onClick={() => void handleSaveCurrentStudent()}
                >
                  Guardar avance del alumno
                </Button>
              </Space>
            </div>
          )}
        </Card>
      )}

      <Drawer
        title="Progreso de informes del curso"
        placement="right"
        size={380}
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
          const st = studentStatusMap[alumno.inscripcionId];
          const isCurrent = alumno.inscripcionId === selectedInscripcionId;
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
              <Tag color={st?.completo ? 'success' : 'warning'} style={{ margin: 0 }}>
                {st?.completo ? 'Completo' : `${st?.itemsRespondidos ?? 0}/${items.length}`}
              </Tag>
            </button>
          );
        })}
      </Drawer>
    </div>
  );
};
