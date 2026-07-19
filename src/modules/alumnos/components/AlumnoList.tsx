import React, { useEffect, useState } from 'react';
import { Table, Typography, Button, Space, message, Popconfirm, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { alumnoService } from '../services/alumno.service';
import type { Alumno } from '../models/alumno.model';
import { AlumnoFormModal, type AlumnoFormValues } from './AlumnoFormModal';

const { Title } = Typography;

export const AlumnoList: React.FC = () => {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingAlumno, setEditingAlumno] = useState<Alumno | null>(null);

  const fetchAlumnos = async () => {
    try {
      setLoading(true);
      const data = await alumnoService.getList(currentPage, 50, searchTerm);
      setAlumnos(data.items);
      setTotalItems(data.totalItems);
    } catch (error) {
      console.error('Error al cargar alumnos:', error);
      message.error('Error al cargar la lista de alumnos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAlumnos().then(() => {
      alumnoService.subscribeToRealtime((action, alumno) => {
        setAlumnos((prev) => {
          if (action === 'create') {
            if (prev.some((a) => a.id === alumno.id)) return prev;
            return [alumno, ...prev];
          }
          if (action === 'update') {
            return prev.map((a) => (a.id === alumno.id ? alumno : a));
          }
          if (action === 'delete') {
            return prev.filter((a) => a.id !== alumno.id);
          }
          return prev;
        });
      });
    });

    return () => {
      alumnoService.unsubscribeRealtime();
    };
  }, [currentPage, searchTerm]);

  const handleOpenModal = (alumno?: Alumno) => {
    setEditingAlumno(alumno || null);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingAlumno(null);
  };

  const handleSubmit = async (values: AlumnoFormValues, originalUpdatedDate?: string) => {
    try {
      const dataToSubmit = {
        numero_legajo: values.numeroLegajo,
        dni: values.dni,
        apellidos: values.apellidos,
        nombres: values.nombres,
        fecha_nacimiento: values.fechaNacimiento ? values.fechaNacimiento.format('YYYY-MM-DD') : '',
      };

      if (editingAlumno) {
        if (!originalUpdatedDate) throw new Error("Falta la fecha de actualización original");
        await alumnoService.update(editingAlumno.id, dataToSubmit, originalUpdatedDate);
        message.success('Alumno actualizado con éxito');
      } else {
        await alumnoService.create(dataToSubmit);
        message.success('Alumno creado con éxito');
      }
      handleCloseModal();
    } catch (error: unknown) {
      console.error('Error al guardar alumno:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error al guardar los datos del alumno';
      message.error(errorMsg);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await alumnoService.delete(id);
      message.success('Alumno eliminado con éxito');
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
        <Space>
          <Input.Search
            placeholder="Buscar apellido o DNI"
            allowClear
            onSearch={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            style={{ width: 250 }}
          />
          <Button type="primary" onClick={() => handleOpenModal()}>
            Nuevo Alumno
          </Button>
        </Space>
      </div>
      
      <Table 
        columns={columns} 
        dataSource={alumnos} 
        rowKey="id" 
        loading={loading}
        bordered
        pagination={{
          current: currentPage,
          pageSize: 50,
          total: totalItems,
          onChange: (page) => setCurrentPage(page),
          showSizeChanger: false,
        }}
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
