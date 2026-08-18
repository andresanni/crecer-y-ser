import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Input,
  Button,
  Typography,
  Space,
  Tag,
  App,
  Spin,
  Tooltip,
  Divider,
} from 'antd';
import {
  SaveOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckCircleFilled,
  InfoCircleOutlined,
  BookOutlined,
  EditOutlined,
  PlusOutlined,
  CloseOutlined,
  CheckOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { boletinService } from '../services/boletin.service';
import type { CursoMateria, CriterioEvaluacion, CriterioFormItem } from '../models/boletin.model';

interface Props {
  cursoMateria: CursoMateria | null;
  onSaved?: () => void;
}

const DEFAULT_SLOTS_COUNT = 5;

export const CriteriosManager: React.FC<Props> = ({ cursoMateria, onSaved }) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estado de los slots de trabajo
  const [criterios, setCriterios] = useState<CriterioFormItem[]>([]);
  // Copia de respaldo de lo guardado en el servidor para detectar cambios
  const [persistedCriterios, setPersistedCriterios] = useState<CriterioFormItem[]>([]);
  // Set con los índices que actualmente están en modo edición
  const [editingIndices, setEditingIndices] = useState<Set<number>>(new Set());

  // Inicializar los 5 slots
  const initSlots = (initialData: CriterioEvaluacion[] = []) => {
    const slots: CriterioFormItem[] = [];

    for (let i = 1; i <= DEFAULT_SLOTS_COUNT; i++) {
      const found = initialData.find((d) => d.ordenVisual === i);
      slots.push({
        id: found?.id,
        orden_visual: i,
        nombre: found?.nombre || '',
      });
    }

    setCriterios(slots);
    setPersistedCriterios(JSON.parse(JSON.stringify(slots)));
    setEditingIndices(new Set()); // Todos inician en solo lectura
  };

  const loadCriterios = async (cmId: string) => {
    try {
      setLoading(true);
      const data = await boletinService.getCriteriosByCursoMateria(cmId);
      initSlots(data);
    } catch (err) {
      console.error(err);
      message.error('Error al cargar los criterios de evaluación');
      initSlots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cursoMateria) {
      loadCriterios(cursoMateria.id);
    } else {
      setCriterios([]);
      setPersistedCriterios([]);
      setEditingIndices(new Set());
    }
  }, [cursoMateria?.id]);

  // Detectar si hay cambios sin guardar con respecto a lo persistido
  const hasUnsavedChanges = useMemo(() => {
    if (criterios.length !== persistedCriterios.length) return true;
    return criterios.some((c, idx) => {
      const p = persistedCriterios[idx];
      if (!p) return true;
      return c.nombre.trim() !== p.nombre.trim() || c.orden_visual !== p.orden_visual;
    });
  }, [criterios, persistedCriterios]);

  const handleInputChange = (index: number, value: string) => {
    setCriterios((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], nombre: value };
      return copy;
    });
  };

  const handleStartEdit = (index: number) => {
    setEditingIndices((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  };

  const handleCancelEdit = (index: number) => {
    const original = persistedCriterios[index];
    if (original) {
      setCriterios((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index], nombre: original.nombre };
        return copy;
      });
    }
    setEditingIndices((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const handleFinishSlotEdit = (index: number) => {
    setEditingIndices((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
    const currentName = criterios[index]?.nombre?.trim();
    const persistedName = persistedCriterios[index]?.nombre?.trim();
    if (currentName !== persistedName) {
      message.info(`Criterio #${index + 1} actualizado. Recuerda pulsar "Guardar Cambios" para confirmar.`);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= criterios.length) return;

    const copy = [...criterios];
    const currentItem = copy[index];
    const targetItem = copy[targetIndex];

    copy[index] = {
      ...targetItem,
      orden_visual: index + 1,
    };
    copy[targetIndex] = {
      ...currentItem,
      orden_visual: targetIndex + 1,
    };

    setCriterios(copy);

    // Si ambos elementos ya estaban persistidos y no hay textos editándose, persistimos el reorden inmediatamente
    const bothPersisted = Boolean(currentItem.id && targetItem.id);
    const noActiveEdits = editingIndices.size === 0 && !hasUnsavedChanges;

    if (bothPersisted && noActiveEdits && cursoMateria) {
      try {
        setSaving(true);
        await boletinService.saveCriteriosForCursoMateria(cursoMateria.id, copy);
        setPersistedCriterios(JSON.parse(JSON.stringify(copy)));
        message.success('Orden actualizado y guardado');
        if (onSaved) onSaved();
      } catch (err) {
        console.error(err);
        message.error('Error al guardar el nuevo orden');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSave = async () => {
    if (!cursoMateria) return;

    const validos = criterios.filter((c) => c.nombre.trim().length > 0);
    if (validos.length === 0) {
      message.warning('Debes completar al menos un criterio de evaluación');
      return;
    }

    try {
      setSaving(true);
      const guardados = await boletinService.saveCriteriosForCursoMateria(cursoMateria.id, criterios);
      message.success('Criterios de evaluación guardados con éxito');
      initSlots(guardados);
      if (onSaved) {
        onSaved();
      }
    } catch (err) {
      console.error(err);
      message.error('Error al guardar los criterios de evaluación');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSingleSlot = async (index: number) => {
    setEditingIndices((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
    await handleSave();
  };

  if (!cursoMateria) {
    return (
      <Card
        style={{
          minHeight: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          borderRadius: 16,
          background: 'var(--cys-color-bg-container, #ffffff)',
        }}
      >
        <div style={{ padding: 40, maxWidth: 420 }}>
          <BookOutlined style={{ fontSize: 48, color: '#94a3b8', marginBottom: 16 }} />
          <Typography.Title level={4} style={{ color: '#475569', marginBottom: 8 }}>
            Selecciona una Materia
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Elige una materia del panel izquierdo para configurar sus 5 conceptos o indicadores de
            logro que aparecerán en el Boletín de Calificaciones.
          </Typography.Text>
        </div>
      </Card>
    );
  }

  const filledCount = criterios.filter((c) => c.nombre.trim().length > 0).length;
  const isComplete = filledCount === DEFAULT_SLOTS_COUNT;

  return (
    <Card
      style={{
        borderRadius: 16,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
      }}
      headStyle={{ padding: '12px 18px' }}
      bodyStyle={{ padding: '14px 18px 18px' }}
      title={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            width: '100%',
            flexWrap: 'wrap',
          }}
        >
          <Space size={10} style={{ minWidth: 0 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(37, 99, 235, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
                fontSize: 18,
              }}
            >
              <BookOutlined />
            </div>
            <div>
              <Typography.Text strong style={{ fontSize: 16, color: '#0f172a', display: 'block', lineHeight: 1.2 }}>
                {cursoMateria.materiaNombre}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Indicadores de Logro y Criterios Oficiales
              </Typography.Text>
            </div>
          </Space>

          <Space size={6} wrap>
            {isComplete && !hasUnsavedChanges ? (
              <Tag color="success" icon={<CheckCircleFilled />} style={{ fontWeight: 600, borderRadius: 6, margin: 0 }}>
                5/5 Guardados
              </Tag>
            ) : (
              <Tag color="warning" icon={<InfoCircleOutlined />} style={{ fontWeight: 600, borderRadius: 6, margin: 0 }}>
                {filledCount}/5 Configurados
              </Tag>
            )}
            {hasUnsavedChanges && (
              <Tag color="orange" style={{ fontWeight: 600, borderRadius: 6, margin: 0 }}>
                Cambios sin guardar
              </Tag>
            )}
          </Space>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Micro-banner conciso informativo en 1 sola fila */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '6px 12px',
            background: 'rgba(37, 99, 235, 0.05)',
            border: '1px solid rgba(37, 99, 235, 0.15)',
            borderRadius: 8,
            fontSize: 12,
            color: '#334155',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <Space size={6} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <InfoCircleOutlined style={{ color: '#2563eb', fontSize: 13, flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Configure los <strong>5 criterios</strong> de <em>{cursoMateria.materiaNombre}</em>.
            </span>
          </Space>

          <Space size={4} style={{ fontSize: 11, color: '#64748b', flexShrink: 0 }}>
            <span>Automáticos:</span>
            <Tag color="purple" style={{ margin: 0, fontSize: 11, padding: '0 5px', borderRadius: 4, lineHeight: '18px' }}>
              PPI
            </Tag>
            <Tag color="blue" style={{ margin: 0, fontSize: 11, padding: '0 5px', borderRadius: 4, lineHeight: '18px' }}>
              Calificación General
            </Tag>
            <Tooltip title="Los campos PPI (Inclusión) y Calificación General se generan de forma automática en la planilla docente, no es necesario agregarlos como criterios.">
              <InfoCircleOutlined style={{ color: '#94a3b8', cursor: 'pointer', marginLeft: 2 }} />
            </Tooltip>
          </Space>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin tip="Cargando criterios de la materia..." />
          </div>
        ) : (
          <div
            className="cys-criterios-scroll-list"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              maxHeight: 430,
              overflowY: 'auto',
              paddingRight: 6,
            }}
          >
            {criterios.map((criterio, index) => {
              const isEditing = editingIndices.has(index);
              const currentText = criterio.nombre.trim();
              const persistedText = persistedCriterios[index]?.nombre?.trim() || '';
              const isModified = currentText !== persistedText;
              const isPersisted = Boolean(persistedCriterios[index]?.id) && Boolean(persistedText);

              // ----------------------------------------------------
              // ESTADO 1: SLOT NO EDITANDO (Solo Lectura o Vacío)
              // ----------------------------------------------------
              if (!isEditing) {
                // 1.A: Slot Vacío
                if (!currentText) {
                  return (
                    <div
                      key={criterio.orden_visual}
                      onClick={() => handleStartEdit(index)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px dashed #cbd5e1',
                        background: 'var(--cys-color-fill-quaternary, #f8fafc)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      className="cys-slot-empty-hover"
                    >
                      <div
                        style={{
                          minWidth: 28,
                          height: 28,
                          borderRadius: 6,
                          background: '#cbd5e1',
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {criterio.orden_visual}
                      </div>
                      <div style={{ flex: 1 }}>
                        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                          <PlusOutlined style={{ marginRight: 6 }} />
                          Hacer clic para redactar Criterio #{criterio.orden_visual}...
                        </Typography.Text>
                      </div>
                      <Button size="small" type="link" icon={<PlusOutlined />} style={{ padding: 0 }}>
                        Agregar
                      </Button>
                    </div>
                  );
                }

                // 1.B: Slot con Contenido (Vista Solo Lectura con tarjeta limpia)
                return (
                  <div
                    key={criterio.orden_visual}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: isModified
                        ? '1px solid #f59e0b'
                        : '1px solid var(--cys-color-border, #e2e8f0)',
                      background: isModified
                        ? '#fffbeb'
                        : 'var(--cys-color-bg-container, #ffffff)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* Badge de Orden */}
                    <div
                      style={{
                        minWidth: 28,
                        height: 28,
                        borderRadius: 6,
                        background: isModified ? '#f59e0b' : '#2563eb',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 13,
                        boxShadow: isModified
                          ? '0 2px 4px rgba(245, 158, 11, 0.25)'
                          : '0 2px 4px rgba(37, 99, 235, 0.25)',
                      }}
                    >
                      {criterio.orden_visual}
                    </div>

                    {/* Texto Solo Lectura */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Typography.Paragraph
                          style={{
                            margin: 0,
                            fontSize: 13.5,
                            fontWeight: 500,
                            color: '#1e293b',
                            lineHeight: 1.45,
                            flex: 1,
                          }}
                        >
                          {criterio.nombre}
                        </Typography.Paragraph>
                        {isModified && (
                          <Tag color="orange" style={{ margin: 0, fontSize: 11, borderRadius: 4 }}>
                            Pendiente de guardar
                          </Tag>
                        )}
                      </div>
                    </div>

                    {/* Acciones: Editar & Orden */}
                    <Space size={4} align="center">
                      <Tooltip title="Editar redacción de este criterio">
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleStartEdit(index)}
                          style={{
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          Editar
                        </Button>
                      </Tooltip>

                      <Space size={1}>
                        <Tooltip title="Mover arriba">
                          <Button
                            size="small"
                            type="text"
                            icon={<ArrowUpOutlined style={{ fontSize: 11 }} />}
                            disabled={index === 0 || saving}
                            onClick={() => handleMove(index, 'up')}
                          />
                        </Tooltip>
                        <Tooltip title="Mover abajo">
                          <Button
                            size="small"
                            type="text"
                            icon={<ArrowDownOutlined style={{ fontSize: 11 }} />}
                            disabled={index === criterios.length - 1 || saving}
                            onClick={() => handleMove(index, 'down')}
                          />
                        </Tooltip>
                      </Space>
                    </Space>
                  </div>
                );
              }

              // ----------------------------------------------------
              // ESTADO 2: MODO EDICIÓN ACTIVO (Solo cuando isEditing === true)
              // ----------------------------------------------------
              return (
                <div
                  key={criterio.orden_visual}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: 12,
                    borderRadius: 10,
                    border: '1.5px solid #2563eb',
                    background: '#f8faff',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Badge de Orden Editando */}
                  <div
                    style={{
                      minWidth: 28,
                      height: 28,
                      borderRadius: 6,
                      background: '#1d4ed8',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 13,
                      marginTop: 2,
                    }}
                  >
                    {criterio.orden_visual}
                  </div>

                  {/* Input del Criterio */}
                  <div style={{ flex: 1 }}>
                    <Input.TextArea
                      autoFocus
                      rows={2}
                      placeholder={`Redacte el Criterio #${criterio.orden_visual} (Ej: Participación, comprensión, etc.)`}
                      value={criterio.nombre}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      maxLength={180}
                      disabled={saving}
                      style={{ resize: 'none', borderRadius: 6 }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
                      <Tag color="processing" style={{ fontSize: 11, borderRadius: 4, margin: 0 }}>
                        Modo Edición
                      </Tag>

                      <Space size={6}>
                        {isPersisted && (
                          <Button
                            size="small"
                            icon={<CloseOutlined />}
                            onClick={() => handleCancelEdit(index)}
                            disabled={saving}
                            style={{ fontSize: 12, borderRadius: 6 }}
                          >
                            Descartar
                          </Button>
                        )}
                        <Button
                          size="small"
                          icon={<CheckOutlined />}
                          onClick={() => handleFinishSlotEdit(index)}
                          disabled={saving || !criterio.nombre.trim()}
                          style={{ fontSize: 12, borderRadius: 6, fontWeight: 500 }}
                        >
                          Listo
                        </Button>
                        <Button
                          size="small"
                          type="primary"
                          icon={<SaveOutlined />}
                          onClick={() => handleSaveSingleSlot(index)}
                          loading={saving}
                          disabled={!criterio.nombre.trim()}
                          style={{ fontSize: 12, borderRadius: 6, fontWeight: 600 }}
                        >
                          Guardar
                        </Button>
                      </Space>
                    </div>
                  </div>
                </div>
              );
            })}

            <Divider style={{ margin: '10px 0 6px' }} />

            {/* Footer de Guardar Cambios */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                {!hasUnsavedChanges ? (
                  <Space size={6}>
                    <CheckCircleOutlined style={{ color: '#10b981', fontSize: 15 }} />
                    <Typography.Text style={{ fontSize: 12.5, color: '#10b981', fontWeight: 600 }}>
                      Todos los conceptos están guardados y vigentes
                    </Typography.Text>
                  </Space>
                ) : (
                  <Space size={6}>
                    <InfoCircleOutlined style={{ color: '#f59e0b', fontSize: 15 }} />
                    <Typography.Text style={{ fontSize: 12.5, color: '#d97706', fontWeight: 600 }}>
                      Tienes cambios pendientes por guardar en esta materia
                    </Typography.Text>
                  </Space>
                )}
              </div>

              <Button
                type="primary"
                size="middle"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saving}
                disabled={!hasUnsavedChanges && filledCount > 0}
                style={{
                  minWidth: 170,
                  fontWeight: 600,
                  borderRadius: 8,
                  background: hasUnsavedChanges ? undefined : '#10b981',
                  borderColor: hasUnsavedChanges ? undefined : '#10b981',
                }}
              >
                {hasUnsavedChanges ? `Guardar Cambios (${filledCount}/5)` : 'Cambios Guardados'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
