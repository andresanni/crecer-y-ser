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
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { boletinService } from '../services/boletin.service';
import type { Curso } from '../../inscripciones/models/inscripcion.model';
import type { CursoMateria } from '../models/boletin.model';
import { CriteriosManager } from './CriteriosManager';
import { MateriaSelectorModal } from './MateriaSelectorModal';
import { CatalogoMateriasModal } from './CatalogoMateriasModal';
import { PeriodosModal } from './PeriodosModal';
import { useAppStore } from '../../../store/appStore';

export const BoletinConfigPage: React.FC = () => {
  const { message } = App.useApp();
  const { cicloActual } = useAppStore();

  // Estados de datos
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState<string | null>(null);
  const [cursoMaterias, setCursoMaterias] = useState<CursoMateria[]>([]);
  const [selectedCursoMateria, setSelectedCursoMateria] = useState<CursoMateria | null>(null);
  const [criteriosCounts, setCriteriosCounts] = useState<Record<string, number>>({});

  // Estados de carga
  const [loadingCursos, setLoadingCursos] = useState(false);
  const [loadingMaterias, setLoadingMaterias] = useState(false);
  const [reordering, setReordering] = useState(false);

  // Modales
  const [openSelectorModal, setOpenSelectorModal] = useState(false);
  const [openCatalogoModal, setOpenCatalogoModal] = useState(false);
  const [openPeriodosModal, setOpenPeriodosModal] = useState(false);

  // 1. Cargar cursos al montar
  useEffect(() => {
    const loadCursos = async () => {
      try {
        setLoadingCursos(true);
        const data = await boletinService.getCursos();
        setCursos(data);
        if (data.length > 0) {
          setSelectedCursoId(data[0].id);
        }
      } catch (err) {
        console.error(err);
        message.error('Error al cargar la lista de cursos');
      } finally {
        setLoadingCursos(false);
      }
    };

    loadCursos();
  }, []);

  // 2. Cargar materias asignadas al curso seleccionado
  const loadMateriasCurso = useCallback(async (cursoId: string) => {
    try {
      setLoadingMaterias(true);
      const materias = await boletinService.getMateriasByCurso(cursoId);
      setCursoMaterias(materias);

      // Cargar conteo de criterios por cada materia del curso
      const counts: Record<string, number> = {};
      for (const cm of materias) {
        const crits = await boletinService.getCriteriosByCursoMateria(cm.id);
        counts[cm.id] = crits.length;
      }
      setCriteriosCounts(counts);

      // Si la materia previamente seleccionada sigue estando, preservarla; si no, seleccionar la primera
      setSelectedCursoMateria((prev) => {
        if (prev) {
          const match = materias.find((m) => m.id === prev.id);
          if (match) return match;
        }
        return materias.length > 0 ? materias[0] : null;
      });
    } catch (err) {
      console.error(err);
      message.error('Error al cargar las materias del curso');
    } finally {
      setLoadingMaterias(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCursoId) {
      loadMateriasCurso(selectedCursoId);
    } else {
      setCursoMaterias([]);
      setSelectedCursoMateria(null);
    }
  }, [selectedCursoId, loadMateriasCurso]);

  // Reordenar materias
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

      // Actualizar en backend
      await boletinService.updateCursoMateriasOrder([
        { id: copy[index].id, orden_visual: copy[index].ordenVisual },
        { id: copy[targetIndex].id, orden_visual: copy[targetIndex].ordenVisual },
      ]);
    } catch (err) {
      console.error(err);
      message.error('Error al cambiar el orden');
      if (selectedCursoId) loadMateriasCurso(selectedCursoId);
    } finally {
      setReordering(false);
    }
  };

  // Quitar materia del curso
  const handleRemoveMateria = async (cmId: string, nombre: string) => {
    try {
      await boletinService.removeMateriaFromCurso(cmId);
      message.success(`Materia "${nombre}" removida del curso`);
      if (selectedCursoId) {
        await loadMateriasCurso(selectedCursoId);
      }
    } catch (err) {
      console.error(err);
      message.error('Error al remover la materia del curso');
    }
  };

  const selectedCurso = cursos.find((c) => c.id === selectedCursoId);

  // Columnas para la tabla de materias del curso
  const columns: ColumnsType<CursoMateria> = [
    {
      title: '#',
      dataIndex: 'ordenVisual',
      key: 'ordenVisual',
      width: 45,
      align: 'center',
      render: (val) => (
        <Typography.Text strong style={{ color: '#64748b', fontSize: 12 }}>
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
                color: isSelected ? '#2563eb' : undefined,
                fontSize: 14,
              }}
            >
              {nombre}
            </Typography.Text>
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
          okText="Remover"
          cancelText="Cancelar"
          okButtonProps={{ danger: true }}
          onConfirm={(e) => {
            e?.stopPropagation();
            handleRemoveMateria(record.id, record.materiaNombre);
          }}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Barra Superior de Control y Accesos Rápidos */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <Space size={10} align="center">
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: 20,
              }}
            >
              <ScheduleOutlined />
            </div>
            <div>
              <Typography.Title level={3} style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
                Constructor de Boletines y Malla Curricular
              </Typography.Title>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                Configuración anual de materias y 5 criterios oficiales de evaluación por curso.
              </Typography.Text>
            </div>
          </Space>
        </div>

        <Space size="small" wrap>
          <Button
            icon={<CalendarOutlined />}
            onClick={() => setOpenPeriodosModal(true)}
            style={{ fontWeight: 600 }}
          >
            Períodos Escolares
            {cicloActual && (
              <Badge status="processing" style={{ marginLeft: 6 }} />
            )}
          </Button>

          <Button
            icon={<BookOutlined />}
            onClick={() => setOpenCatalogoModal(true)}
            style={{ fontWeight: 600 }}
          >
            Catálogo de Materias
          </Button>
        </Space>
      </div>

      {/* Selector de Curso */}
      <Card
        style={{
          borderRadius: 14,
          background: 'var(--cys-color-bg-container, #ffffff)',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
        }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={12} lg={10}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Typography.Text strong style={{ fontSize: 13, color: '#64748b' }}>
                SELECCIONAR CURSO / DIVISIÓN
              </Typography.Text>
              <Select
                showSearch
                size="large"
                style={{ width: '100%' }}
                placeholder="Seleccione un curso para configurar..."
                loading={loadingCursos}
                value={selectedCursoId}
                onChange={(val) => setSelectedCursoId(val)}
                optionFilterProp="label"
                options={cursos.map((c) => ({
                  value: c.id,
                  label: `${c.nombre} (${c.nivelNombre || 'Nivel'} - ${c.turno})`,
                }))}
              />
            </Space>
          </Col>

          <Col xs={24} md={12} lg={14}>
            {selectedCurso && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <Tag color="blue" style={{ fontSize: 13, padding: '4px 10px', borderRadius: 6 }}>
                  Nivel: <strong>{selectedCurso.nivelNombre || 'General'}</strong>
                </Tag>
                <Tag color="purple" style={{ fontSize: 13, padding: '4px 10px', borderRadius: 6 }}>
                  Turno: <strong>{selectedCurso.turno}</strong>
                </Tag>
                <Tag color="cyan" style={{ fontSize: 13, padding: '4px 10px', borderRadius: 6 }}>
                  Materias asignadas: <strong>{cursoMaterias.length}</strong>
                </Tag>
                <Tooltip title="Recargar configuración de este curso">
                  <Button
                    type="text"
                    icon={<ReloadOutlined />}
                    onClick={() => selectedCursoId && loadMateriasCurso(selectedCursoId)}
                  />
                </Tooltip>
              </div>
            )}
          </Col>
        </Row>
      </Card>

      {/* Layout Master - Detail */}
      <Row gutter={[20, 20]}>
        {/* Columna Izquierda: Materias del Curso */}
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
                  <AppstoreOutlined style={{ color: '#2563eb', fontSize: 17 }} />
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
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

        {/* Columna Derecha: Gestor de los 5 Criterios Oficiales */}
        <Col xs={24} lg={13} xl={14}>
          <CriteriosManager
            cursoMateria={selectedCursoMateria}
            onSaved={() => {
              if (selectedCursoId) {
                loadMateriasCurso(selectedCursoId);
              }
            }}
          />
        </Col>
      </Row>

      {/* Modales */}
      {selectedCurso && (
        <MateriaSelectorModal
          open={openSelectorModal}
          onClose={() => setOpenSelectorModal(false)}
          cursoId={selectedCurso.id}
          cursoNombre={selectedCurso.nombre}
          assignedMateriaIds={cursoMaterias.map((cm) => cm.materiaId)}
          onMateriasAdded={() => {
            if (selectedCursoId) loadMateriasCurso(selectedCursoId);
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
    </div>
  );
};
