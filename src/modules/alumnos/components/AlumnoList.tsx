import React, { useEffect, useState } from 'react';
import { Table, Typography, Button, Space, message, Popconfirm } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { alumnoService } from '../services/alumno.service';
import type { Alumno } from '../models/alumno.model';
import { AlumnoFormModal } from './AlumnoFormModal';

const { Title } = Typography;

export const AlumnoList: React.FC = () => {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingAlumno, setEditingAlumno] = useState<Alumno | null>(null);

  const fetchAlumnos = async () => {
    try {
      setLoading(true);
      const data = await alumnoService.getAll();
      setAlumnos(data);
    } catch (error) {
      console.error('Error al cargar alumnos:', error);
      message.error('Error al cargar la lista de alumnos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlumnos();
  }, []);

  const handleOpenModal = (alumno?: Alumno) => {
    setEditingAlumno(alumno || null);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingAlumno(null);
  };

  const handleSubmit = async (values: Record<string, any>) => {
    try {
      const dataToSubmit = {
        numero_legajo: values.numeroLegajo,
        dni: values.dni,
        apellidos: values.apellidos,
        nombres: values.nombres,
        fecha_nacimiento: values.fechaNacimiento ? values.fechaNacimiento.format('YYYY-MM-DD') : '',
      };

      if (editingAlumno) {
        await alumnoService.update(editingAlumno.id, dataToSubmit);
        message.success('Alumno actualizado con éxito');
      } else {
        await alumnoService.create(dataToSubmit);
        message.success('Alumno creado con éxito');
      }
      handleCloseModal();
      fetchAlumnos();
    } catch (error) {
      console.error('Error al guardar alumno:', error);
      message.error('Error al guardar los datos del alumno');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await alumnoService.delete(id);
      message.success('Alumno eliminado con éxito');
      fetchAlumnos();
    } catch (error) {
      console.error('Error al eliminar alumno:', error);
      message.error('Error al eliminar el alumno');
    }
  };

  const columns: ColumnsType<Alumno> = [
    {
      title: 'Legajo',
      dataIndex: 'numeroLegajo',
      key: 'numeroLegajo',
    },
    {
      title: 'Apellidos',
      dataIndex: 'apellidos',
      key: 'apellidos',
    },
    {
      title: 'Nombres',
      dataIndex: 'nombres',
      key: 'nombres',
    },
    {
      title: 'DNI',
      dataIndex: 'dni',
      key: 'dni',
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" onClick={() => handleOpenModal(record)} style={{ padding: 0 }}>
            Editar
          </Button>
          <Popconfirm
            title="¿Estás seguro de eliminar este alumno?"
            onConfirm={() => handleDelete(record.id)}
            okText="Sí, eliminar"
            cancelText="Cancelar"
          >
            <Button type="link" danger style={{ padding: 0 }}>
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Listado de Alumnos</Title>
        <Button type="primary" onClick={() => handleOpenModal()}>
          Nuevo Alumno
        </Button>
      </div>
      
      <Table 
        columns={columns} 
        dataSource={alumnos} 
        rowKey="id" 
        loading={loading}
        bordered
      />

      <AlumnoFormModal 
        visible={isModalVisible}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        initialValues={editingAlumno}
      />
    </div>
  );
};
