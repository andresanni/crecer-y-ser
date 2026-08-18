import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, List, Typography, Space, App, Tag, Empty, Spin } from 'antd';
import { PlusOutlined, BookOutlined } from '@ant-design/icons';
import { boletinService } from '../services/boletin.service';
import type { Materia } from '../models/boletin.model';

interface Props {
  open: boolean;
  onClose: () => void;
  onMateriaCreated?: (materia: Materia) => void;
}

export const CatalogoMateriasModal: React.FC<Props> = ({
  open,
  onClose,
  onMateriaCreated,
}) => {
  const { message } = App.useApp();
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  const loadMaterias = async () => {
    try {
      setLoading(true);
      const data = await boletinService.getAllMaterias();
      setMaterias(data);
    } catch (err) {
      console.error(err);
      message.error('Error al cargar el catálogo de materias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadMaterias();
      setNuevoNombre('');
      setSearch('');
    }
  }, [open]);

  const handleCrear = async () => {
    if (!nuevoNombre.trim()) {
      message.warning('Ingrese el nombre de la materia');
      return;
    }

    try {
      setCreating(true);
      const creada = await boletinService.createMateria(nuevoNombre);
      message.success(`Materia "${creada.nombre}" creada con éxito`);
      setNuevoNombre('');
      await loadMaterias();
      if (onMateriaCreated) {
        onMateriaCreated(creada);
      }
    } catch (err) {
      console.error(err);
      message.error('No se pudo crear la materia');
    } finally {
      setCreating(false);
    }
  };

  const filteredMaterias = materias.filter((m) =>
    m.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal
      title={
        <Space size={8}>
          <BookOutlined style={{ color: '#2563eb' }} />
          <span>Catálogo General de Materias</span>
          <Tag color="blue">{materias.length} registradas</Tag>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cerrar" onClick={onClose}>
          Cerrar
        </Button>,
      ]}
      width={560}
      destroyOnClose
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 13 }}>
          Aquí se gestionan las materias disponibles para todo el colegio. Luego podrás asignarlas
          a los cursos correspondientes.
        </Typography.Paragraph>

        {/* Formulario de Alta Rápida */}
        <div
          style={{
            padding: 12,
            background: 'var(--cys-color-fill-quaternary, #f8fafc)',
            borderRadius: 10,
            border: '1px solid var(--cys-color-border-secondary, #e2e8f0)',
          }}
        >
          <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
            Nueva Materia
          </Typography.Text>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="Ej: Prácticas del Lenguaje, Robótica..."
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              onPressEnter={handleCrear}
              disabled={creating}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCrear}
              loading={creating}
            >
              Agregar
            </Button>
          </Space.Compact>
        </div>

        {/* Buscador */}
        <Input.Search
          placeholder="Buscar en el catálogo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />

        {/* Listado */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <Spin tip="Cargando materias..." />
          </div>
        ) : filteredMaterias.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No se encontraron materias"
          />
        ) : (
          <div style={{ maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
            <List
              size="small"
              bordered
              dataSource={filteredMaterias}
              renderItem={(materia, idx) => (
                <List.Item key={materia.id}>
                  <Space>
                    <Typography.Text type="secondary" style={{ fontSize: 12, width: 24 }}>
                      #{idx + 1}
                    </Typography.Text>
                    <Typography.Text strong>{materia.nombre}</Typography.Text>
                  </Space>
                </List.Item>
              )}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
