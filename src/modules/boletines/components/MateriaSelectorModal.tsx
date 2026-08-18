import React, { useState, useEffect } from 'react';
import { Modal, List, Typography, Space, App, Tag, Empty, Spin, Button, Input, Checkbox } from 'antd';
import { PlusOutlined, SearchOutlined, BookOutlined } from '@ant-design/icons';
import { boletinService } from '../services/boletin.service';
import type { Materia } from '../models/boletin.model';

interface Props {
  open: boolean;
  onClose: () => void;
  cursoId: string;
  cursoNombre: string;
  assignedMateriaIds: string[];
  onMateriasAdded: () => void;
  onOpenCatalogoModal: () => void;
}

export const MateriaSelectorModal: React.FC<Props> = ({
  open,
  onClose,
  cursoId,
  cursoNombre,
  assignedMateriaIds,
  onMateriasAdded,
  onOpenCatalogoModal,
}) => {
  const { message } = App.useApp();
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const loadMaterias = async () => {
    try {
      setLoading(true);
      const data = await boletinService.getAllMaterias();
      setMaterias(data);
    } catch (err) {
      console.error(err);
      message.error('Error al cargar catálogo de materias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadMaterias();
      setSelectedIds([]);
      setSearch('');
    }
  }, [open]);

  // Filtramos las que NO están asignadas todavía al curso
  const availableMaterias = materias.filter(
    (m) =>
      !assignedMateriaIds.includes(m.id) &&
      m.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddSelected = async () => {
    if (selectedIds.length === 0) {
      message.warning('Seleccione al menos una materia');
      return;
    }

    try {
      setSaving(true);
      // Asignamos una por una con el orden correlativo
      let baseOrder = assignedMateriaIds.length + 1;
      for (const matId of selectedIds) {
        await boletinService.assignMateriaToCurso(cursoId, matId, baseOrder++);
      }
      message.success(`${selectedIds.length} materia(s) agregada(s) a ${cursoNombre}`);
      onMateriasAdded();
      onClose();
    } catch (err) {
      console.error(err);
      message.error('Error al asignar materias al curso');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={
        <Space size={8}>
          <PlusOutlined style={{ color: '#2563eb' }} />
          <span>Agregar Materias a {cursoNombre}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={560}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancelar
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleAddSelected}
          loading={saving}
          disabled={selectedIds.length === 0}
        >
          Agregar ({selectedIds.length})
        </Button>,
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Selecciona una o más materias del catálogo para incorporarlas al plan de estudio:
          </Typography.Text>
          <Button
            type="link"
            size="small"
            icon={<BookOutlined />}
            onClick={() => {
              onClose();
              onOpenCatalogoModal();
            }}
          >
            Nueva materia
          </Button>
        </div>

        <Input
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          placeholder="Buscar materia..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Spin tip="Cargando catálogo..." />
          </div>
        ) : availableMaterias.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              assignedMateriaIds.length === materias.length && materias.length > 0
                ? 'Todas las materias del catálogo ya están asignadas a este curso'
                : 'No se encontraron materias disponibles'
            }
          />
        ) : (
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            <List
              size="small"
              bordered
              dataSource={availableMaterias}
              renderItem={(materia) => {
                const isChecked = selectedIds.includes(materia.id);
                return (
                  <List.Item
                    key={materia.id}
                    onClick={() => toggleSelect(materia.id)}
                    style={{
                      cursor: 'pointer',
                      background: isChecked ? 'rgba(37, 99, 235, 0.06)' : undefined,
                    }}
                  >
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Space>
                        <Checkbox checked={isChecked} />
                        <Typography.Text strong={isChecked}>{materia.nombre}</Typography.Text>
                      </Space>
                      {isChecked && <Tag color="blue">Seleccionada</Tag>}
                    </Space>
                  </List.Item>
                );
              }}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
