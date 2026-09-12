import ui from '../../../shared/styles/ui.module.css';
import { SectionLayout } from '../../../shared/components/SectionLayout';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Select,
  Button,
  Table,
  Typography,
  Space,
  Tag,
  App,
  Popconfirm,
  Tooltip,
  Row,
  Col,
  Empty,
  Badge,
  Progress,
} from 'antd';
import {
  BookOutlined,
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  ScheduleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { boletinService } from '../services/boletin.service';
import type { Curso } from '../../inscripciones/models/inscripcion.model';
import {
  type CursoMateria,
  type ProgresoConstructorCurso,
  esMateriaConducta,
} from '../models/boletin.model';
import { CriteriosManager } from './CriteriosManager';
import { MateriaSelectorModal } from './MateriaSelectorModal';
import { CatalogoMateriasModal } from './CatalogoMateriasModal';
import { PeriodosModal } from './PeriodosModal';
import { useAppStore } from '../../../store/appStore';

export const BoletinConfigPage: React.FC = () => {
  const { message } = App.useApp();
  const { cicloActual } = useAppStore();


  const [cursos, setCursos] = useState<Curso[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState<string | null>(null);
  const [cursoMaterias, setCursoMaterias] = useState<CursoMateria[]>([]);
  const [selectedCursoMateria, setSelectedCursoMateria] = useState<CursoMateria | null>(null);
  const [criteriosCounts, setCriteriosCounts] = useState<Record<string, number>>({});
  const [progresoCursosMap, setProgresoCursosMap] = useState<Record<string, ProgresoConstructorCurso>>({});


  const [loadingCursos, setLoadingCursos] = useState(false);
  const [loadingMaterias, setLoadingMaterias] = useState(false);
  const [reordering, setReordering] = useState(false);


  const [openSelectorModal, setOpenSelectorModal] = useState(false);
  const [openCatalogoModal, setOpenCatalogoModal] = useState(false);
  const [openPeriodosModal, setOpenPeriodosModal] = useState(false);


  const loadProgresoGlobal = useCallback(async () => {
    try {
      const pMap = await boletinService.getProgresoConstructorCursos();
      setProgresoCursosMap(pMap);
    } catch (err) {
      console.error('Error al calcular progreso global:', err);
    }
  }, []);


  useEffect(() => {
    let active = true;
    const loadCursos = async () => {
      try {
        setLoadingCursos(true);
        const [data, pMap] = await Promise.all([
          boletinService.getCursos(),
          boletinService.getProgresoConstructorCursos(),
        ]);
        if (!active) return;
        setCursos(data);
        setProgresoCursosMap(pMap);
        if (data.length > 0) {
          setSelectedCursoId(data[0].id);
        }
      } catch (err) {
        console.error(err);
        if (active) message.error('Error al cargar la lista de cursos');
      } finally {
        if (active) setLoadingCursos(false);
      }
    };

    void loadCursos();
    return () => { active = false; };
  }, [message]);


  const [materiasRevision, setMateriasRevision] = useState(0);
  const loadMateriasCurso = () => setMateriasRevision((value) => value + 1);
  useEffect(() => {
    if (!selectedCursoId) return;
    let active = true;
    const fetchMaterias = async () => {
      try {
        setLoadingMaterias(true);
        const materias = await boletinService.getMateriasByCurso(selectedCursoId);
        const entries = await Promise.all(materias.map(async (materia) => {
          const criterios = await boletinService.getCriteriosByCursoMateria(materia.id);
          return [materia.id, criterios.length] as const;
        }));
        if (!active) return;
        setCursoMaterias(materias);
        setCriteriosCounts(Object.fromEntries(entries));
        setSelectedCursoMateria((prev) => materias.find((materia) => materia.id === prev?.id) ?? materias[0] ?? null);
      } catch (err) {
        if (!active) return;
        console.error(err);
        setCursoMaterias([]);
        setSelectedCursoMateria(null);
        message.error('Error al cargar las materias del curso');
      } finally {
        if (active) setLoadingMaterias(false);
      }
    };
    void fetchMaterias();
    return () => { active = false; };
  }, [selectedCursoId, materiasRevision, message]);


  const handleMoveMateria = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= cursoMaterias.length) return;

    try {
      setReordering(true);
      const copy = [...cursoMaterias];
      const itemA = copy[index];
      const itemB = copy[targetIndex];

      copy[index] = { ...itemB, ordenVisual: index + 1 };
      copy[targetIndex] = { ...itemA, ordenVisual: targetIndex + 1 };

      setCursoMaterias(copy);


      await boletinService.updateCursoMateriasOrder([
        { id: copy[index].id, orden_visual: copy[index].ordenVisual },
        { id: copy[targetIndex].id, orden_visual: copy[targetIndex].ordenVisual },
      ]);
    } catch (err) {
      console.error(err);
      message.error('Error al cambiar el orden');
      if (selectedCursoId) loadMateriasCurso();
    } finally {
      setReordering(false);
    }
  };


  const handleRemoveMateria = async (cmId: string, nombre: string) => {
    try {
      await boletinService.removeMateriaFromCurso(cmId);
      message.success(`Materia "${nombre}" removida del curso`);
      if (selectedCursoId) {
        loadMateriasCurso();
        loadProgresoGlobal();
      }
    } catch (err) {
      console.error(err);
      message.error('Error al remover la materia del curso');
    }
  };

  const selectedCurso = cursos.find((c) => c.id === selectedCursoId);
  const selectedProg = selectedCursoId ? progresoCursosMap[selectedCursoId] : undefined;


  const columns: ColumnsType<CursoMateria> = [
    {
      title: '#',
      dataIndex: 'ordenVisual',
      key: 'ordenVisual',
      width: 45,
      align: 'center',
      render: (val) => (
        <Typography.Text strong className={ui.secondaryCaption}>
          {val}
        </Typography.Text>
      ),
    },
    {
      title: 'Materia',
      dataIndex: 'materiaNombre',
      key: 'materiaNombre',
      render: (nombre, record) => {
        const count = criteriosCounts[record.id] ?? 0;
        const isComplete = count === 5;
        const isSelected = selectedCursoMateria?.id === record.id;

        return (
          <div>
            <Typography.Text
              strong
              style={{
                color: isSelected ? "var(--cys-color-primary-text)" : undefined,
                fontSize: 14,
              }}
            >
              {nombre}
            </Typography.Text>
            {esMateriaConducta(nombre) && (
              <Tag color="cyan" style={{ fontSize: 10, padding: '0 4px', borderRadius: 4, marginLeft: 6, fontWeight: 600 }}>
                Conducta
              </Tag>
            )}
            <div style={{ marginTop: 2 }}>
              {isComplete ? (
                <Tag color="success" style={{ fontSize: 11, padding: '0 6px', borderRadius: 4 }}>
                  <CheckCircleOutlined /> 5/5 criterios
                </Tag>
              ) : (
                <Tag color="warning" style={{ fontSize: 11, padding: '0 6px', borderRadius: 4 }}>
                  <ExclamationCircleOutlined /> {count}/5 criterios
                </Tag>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Orden',
      key: 'reorder',
      width: 70,
      align: 'center',
      render: (_, __, index) => (
        <Space size={2}>
          <Tooltip title="Subir">
            <Button
              size="small"
              type="text"
              icon={<ArrowUpOutlined />}
              disabled={index === 0 || reordering}
              onClick={(e) => {
                e.stopPropagation();
                handleMoveMateria(index, 'up');
              }}
            />
          </Tooltip>
          <Tooltip title="Bajar">
            <Button
              size="small"
              type="text"
              icon={<ArrowDownOutlined />}
              disabled={index === cursoMaterias.length - 1 || reordering}
              onClick={(e) => {
                e.stopPropagation();
                handleMoveMateria(index, 'down');
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 45,
      align: 'right',
      render: (_, record) => (
        <Popconfirm
          title="¿Remover materia del curso?"
          description="Se eliminarán también los criterios configurados para esta materia en este curso."
          onConfirm={(e) => {
            e?.stopPropagation();
            handleRemoveMateria(record.id, record.materiaNombre || 'Materia');
          }}
          okText="Remover"
          cancelText="Cancelar"
          okButtonProps={{ danger: true }}
        >
          <Button
            size="small"
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={(e) => e.stopPropagation()}
          />
        </Popconfirm>
      ),
    },
  ];

  return (
    <SectionLayout title="Constructor de boletines" icon={<ScheduleOutlined />} actions={
        <Space size="small" wrap>
          <Button
            icon={<CalendarOutlined />}
            onClick={() => setOpenPeriodosModal(true)}
            className={ui.strong}
          >
            Períodos Escolares
            {cicloActual && (
              <Badge status="processing" style={{ marginLeft: 6 }} />
            )}
          </Button>

          <Button
            icon={<BookOutlined />}
            onClick={() => setOpenCatalogoModal(true)}
            className={ui.strong}
          >
            Catálogo de Materias
          </Button>
        </Space>
      }>

      { }
      <Card
        style={{
          borderRadius: 14,
          background: 'var(--cys-color-bg-container, #ffffff)',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
        }}
        styles={{ body: { padding: '16px 20px' } }}
      >
        <Row gutter={[20, 16]} align="middle" justify="space-between">
          <Col xs={24} md={12} lg={11}>
            <Space orientation="vertical" size={6} className={ui.fullWidth}>
              <Typography.Text strong style={{ fontSize: 13, color: 'var(--cys-color-text-description)' }}>
                SELECCIONAR CURSO / DIVISIÓN
              </Typography.Text>
              <Select
                showSearch
                size="large"
                className={ui.fullWidth}
                placeholder="Seleccione un curso para configurar..."
                loading={loadingCursos}
                value={selectedCursoId}
                onChange={(val) => setSelectedCursoId(val)}
                optionFilterProp="label"
                options={cursos.map((c) => {
                  const prog = progresoCursosMap[c.id];
                  const searchLabel = `${c.nombre} ${c.nivelNombre || ''} ${c.turno}`;

                  let tagNode = null;
                  if (!prog || prog.estado === 'VACIO') {
                    tagNode = (
                      <Tag color="default" className={ui.compactTag}>
                        Sin materias
                      </Tag>
                    );
                  } else if (prog.estado === 'COMPLETO') {
                    tagNode = (
                      <Tag color="success" style={{ margin: 0, fontSize: 11, borderRadius: 4, fontWeight: 600 }}>
                        <CheckCircleOutlined style={{ marginRight: 3 }} /> {prog.materiasCompletas}/{prog.totalMaterias} listas (100%)
                      </Tag>
                    );
                  } else if (prog.estado === 'EN_PROGRESO') {
                    tagNode = (
                      <Tag color="processing" style={{ margin: 0, fontSize: 11, borderRadius: 4, fontWeight: 600 }}>
                        <SyncOutlined style={{ marginRight: 3 }} /> {prog.materiasCompletas}/{prog.totalMaterias} ({prog.porcentaje}%)
                      </Tag>
                    );
                  } else if (prog.estado === 'SIN_CRITERIOS') {
                    tagNode = (
                      <Tag color="warning" style={{ margin: 0, fontSize: 11, borderRadius: 4, fontWeight: 600 }}>
                        <ExclamationCircleOutlined style={{ marginRight: 3 }} /> {prog.totalMaterias} mat. (0 crit.)
                      </Tag>
                    );
                  }

                  return {
                    value: c.id,
                    label: searchLabel,
                    customRender: (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 8 }}>
                        <Space size={6}>
                          <span style={{ fontWeight: 600, color: 'var(--cys-color-text)' }}>{c.nombre}</span>
                          <span className={ui.secondaryCaption}>({c.nivelNombre || 'Nivel'} - {c.turno})</span>
                        </Space>
                        {tagNode}
                      </div>
                    ),
                  };
                })}
                optionRender={(option) => option.data.customRender}
              />
            </Space>
          </Col>

          <Col xs={24} md={12} lg={13}>
            {selectedCurso && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  background: 'var(--cys-color-fill-quaternary, #f8fafc)',
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: "1px solid var(--cys-color-border-secondary, var(--cys-color-border-secondary))",
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <Space size={8} wrap>
                    <Tag color="blue" style={{ fontSize: 12, borderRadius: 4, margin: 0 }}>
                      Nivel: <strong>{selectedCurso.nivelNombre || 'General'}</strong>
                    </Tag>
                    <Tag color="purple" style={{ fontSize: 12, borderRadius: 4, margin: 0 }}>
                      Turno: <strong>{selectedCurso.turno}</strong>
                    </Tag>
                    <Tag color="cyan" style={{ fontSize: 12, borderRadius: 4, margin: 0 }}>
                      Materias: <strong>{cursoMaterias.length}</strong>
                    </Tag>
                  </Space>

                  <Space size={8} align="center">
                    {selectedProg?.estado === 'COMPLETO' ? (
                      <Badge
                        status="success"
                        text={<strong style={{ color: 'var(--cys-color-success-text)', fontSize: 12.5 }}>Malla 100% Configurada</strong>}
                      />
                    ) : selectedProg?.estado === 'EN_PROGRESO' ? (
                      <Badge
                        status="processing"
                        text={<strong style={{ color: 'var(--cys-color-primary-text)', fontSize: 12.5 }}>En Construcción ({selectedProg.porcentaje}%)</strong>}
                      />
                    ) : selectedProg?.estado === 'SIN_CRITERIOS' ? (
                      <Badge
                        status="warning"
                        text={<strong style={{ color: "var(--cys-color-warning-text)", fontSize: 12.5 }}>Sin Criterios Cargados</strong>}
                      />
                    ) : (
                      <Badge
                        status="default"
                        text={<span style={{ color: 'var(--cys-color-text-description)', fontSize: 12.5 }}>Sin materias asignadas</span>}
                      />
                    )}

                    <Tooltip title="Recargar configuración de este curso">
                      <Button
                        type="text"
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={() => {
                          if (selectedCursoId) {
                            loadMateriasCurso();
                            loadProgresoGlobal();
                          }
                        }}
                      />
                    </Tooltip>
                  </Space>
                </div>

                { }
                {selectedProg && selectedProg.totalMaterias > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <Progress
                        percent={selectedProg.porcentaje}
                        size="small"
                        strokeColor={selectedProg.estado === 'COMPLETO' ? '#10b981' : '#2563eb'}
                        status={selectedProg.estado === 'COMPLETO' ? 'success' : 'active'}
                      />
                    </div>
                    <Typography.Text type="secondary" style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>
                      <strong>{selectedProg.materiasCompletas} de {selectedProg.totalMaterias}</strong> materias listas (5/5 criterios)
                    </Typography.Text>
                  </div>
                )}
              </div>
            )}
          </Col>
        </Row>
      </Card>

      { }
      <Row gutter={[20, 20]}>
        { }
        <Col xs={24} lg={11} xl={10}>
          <Card
            style={{
              borderRadius: 16,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
              minHeight: 540,
            }}
            headStyle={{ padding: '12px 18px' }}
            title={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  width: '100%',
                  flexWrap: 'wrap',
                }}
              >
                <Space size={8} style={{ minWidth: 0 }}>
                  <AppstoreOutlined style={{ color: 'var(--cys-color-primary-text)', fontSize: 17 }} />
                  <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--cys-color-text)' }}>
                    Materias del Plan
                  </span>
                  {selectedCursoId && (
                    <Badge
                      count={cursoMaterias.length}
                      overflowCount={99}
                      style={{ backgroundColor: '#2563eb', fontWeight: 600 }}
                    />
                  )}
                </Space>
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  disabled={!selectedCursoId}
                  onClick={() => setOpenSelectorModal(true)}
                  className="btn-primary-gradient"
                  style={{ borderRadius: 6, fontWeight: 600, paddingInline: 12 }}
                >
                  Asignar Materia
                </Button>
              </div>
            }
          >
            {!selectedCursoId ? (
              <Empty description="Seleccione un curso primero" />
            ) : (
              <Table
                className="cys-materias-table"
                rowKey="id"
                size="middle"
                columns={columns}
                dataSource={cursoMaterias}
                loading={loadingMaterias}
                pagination={false}
                scroll={{ y: 420 }}
                rowClassName={(record) =>
                  selectedCursoMateria?.id === record.id ? 'cys-table-row-selected' : ''
                }
                onRow={(record) => ({
                  onClick: () => setSelectedCursoMateria(record),
                  style: {
                    cursor: 'pointer',
                    background:
                      selectedCursoMateria?.id === record.id
                        ? 'rgba(37, 99, 235, 0.08)'
                        : undefined,
                  },
                })}
              />
            )}
          </Card>
        </Col>

        { }
        <Col xs={24} lg={13} xl={14}>
          <CriteriosManager
            cursoMateria={selectedCursoMateria}
            onSaved={() => {
              if (selectedCursoId) {
                loadMateriasCurso();
                loadProgresoGlobal();
              }
            }}
          />
        </Col>
      </Row>

      { }
      {selectedCurso && (
        <MateriaSelectorModal
          open={openSelectorModal}
          onClose={() => setOpenSelectorModal(false)}
          cursoId={selectedCurso.id}
          cursoNombre={selectedCurso.nombre}
          assignedMateriaIds={cursoMaterias.map((cm) => cm.materiaId)}
          onMateriasAdded={() => {
            if (selectedCursoId) {
              loadMateriasCurso();
              loadProgresoGlobal();
            }
          }}
          onOpenCatalogoModal={() => setOpenCatalogoModal(true)}
        />
      )}

      <CatalogoMateriasModal
        open={openCatalogoModal}
        onClose={() => setOpenCatalogoModal(false)}
      />

      <PeriodosModal
        open={openPeriodosModal}
        onClose={() => setOpenPeriodosModal(false)}
      />
    </SectionLayout>
  );
};
