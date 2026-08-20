import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Table,
  Space,
  Tag,
  Switch,
  Typography,
  DatePicker,
  App,
  Tooltip,
  Popconfirm,
  Row,
  Col,
  Card,
} from 'antd';
import {
  LinkOutlined,
  CopyOutlined,
  DeleteOutlined,
  PlusCircleOutlined,
  WhatsAppOutlined,
  UserOutlined,
  BookOutlined,
  CalendarOutlined,
  KeyOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { boletinService } from '../services/boletin.service';
import type { Curso } from '../../inscripciones/models/inscripcion.model';
import type { Periodo, CursoMateria, TokenAccesoDocente } from '../models/boletin.model';

interface GestorEnlacesModalProps {
  open: boolean;
  onClose: () => void;
  cursos: Curso[];
  periodos: Periodo[];
  activeCursoId: string | null;
  activePeriodoId: string | null;
}

export const GestorEnlacesModal: React.FC<GestorEnlacesModalProps> = ({
  open,
  onClose,
  cursos,
  periodos,
  activeCursoId,
  activePeriodoId,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [tokens, setTokens] = useState<TokenAccesoDocente[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [materiasDisponibles, setMateriasDisponibles] = useState<CursoMateria[]>([]);

  // Cargar lista de tokens
  const loadTokens = useCallback(async () => {
    try {
      setLoading(true);
      const data = await boletinService.getTokensAccesoDocente();
      setTokens(data);
    } catch (err) {
      console.error(err);
      message.error('Error al cargar enlaces docentes');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    if (open) {
      loadTokens();
      form.setFieldsValue({
        cursoId: activeCursoId || (cursos.length > 0 ? cursos[0].id : undefined),
        periodoId: activePeriodoId || (periodos.length > 0 ? periodos[0].id : undefined),
        materiaId: undefined,
        docenteNombre: '',
        fechaExpiracion: null,
      });
    }
  }, [open, activeCursoId, activePeriodoId, cursos, periodos, loadTokens, form]);

  // Cargar materias según el curso seleccionado en el formulario
  const watchedCursoId = Form.useWatch('cursoId', form);
  useEffect(() => {
    const loadMateriasCurso = async () => {
      if (!watchedCursoId) {
        setMateriasDisponibles([]);
        return;
      }
      try {
        const mats = await boletinService.getMateriasByCurso(watchedCursoId);
        setMateriasDisponibles(mats);
      } catch (err) {
        console.error(err);
      }
    };
    loadMateriasCurso();
  }, [watchedCursoId]);

  // Generar un nuevo enlace mágico
  const handleCreateToken = async () => {
    try {
      const values = await form.validateFields();
      setCreating(true);

      const fechaExp = values.fechaExpiracion
        ? dayjs(values.fechaExpiracion).format('YYYY-MM-DD 23:59:59')
        : undefined;

      await boletinService.createTokenAccesoDocente({
        cursoId: values.cursoId,
        periodoId: values.periodoId,
        materiaId: values.materiaId || undefined,
        docenteNombre: values.docenteNombre.trim(),
        fechaExpiracion: fechaExp,
      });

      message.success('Enlace de acceso docente generado exitosamente');
      form.resetFields(['docenteNombre', 'materiaId', 'fechaExpiracion']);
      loadTokens();
    } catch (err) {
      console.error(err);
      message.error('Error al generar enlace docente');
    } finally {
      setCreating(false);
    }
  };

  // Activar / Desactivar token
  const handleToggleActivo = async (tokenItem: TokenAccesoDocente, activo: boolean) => {
    try {
      await boletinService.toggleTokenAccesoDocente(tokenItem.id, activo);
      message.success(`Enlace ${activo ? 'activado' : 'desactivado'} correctamente`);
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenItem.id ? { ...t, activo } : t))
      );
    } catch (err) {
      console.error(err);
      message.error('Error al actualizar estado del enlace');
    }
  };

  // Eliminar token
  const handleDeleteToken = async (tokenId: string) => {
    try {
      await boletinService.deleteTokenAccesoDocente(tokenId);
      message.success('Enlace eliminado');
      setTokens((prev) => prev.filter((t) => t.id !== tokenId));
    } catch (err) {
      console.error(err);
      message.error('Error al eliminar enlace');
    }
  };

  // Copiar URL al portapapeles
  const getMagicLinkUrl = (tokenStr: string) => {
    const origin = window.location.origin;
    return `${origin}/carga?token=${tokenStr}`;
  };

  const handleCopyLink = (tokenStr: string) => {
    const url = getMagicLinkUrl(tokenStr);
    navigator.clipboard.writeText(url);
    message.success({
      content: '¡Enlace copiado al portapapeles!',
      icon: <CheckCircleOutlined style={{ color: '#10b981' }} />,
    });
  };

  // Compartir por WhatsApp
  const handleShareWhatsApp = (tokenItem: TokenAccesoDocente) => {
    const url = getMagicLinkUrl(tokenItem.token);
    const materiaText = tokenItem.materiaNombre
      ? `la materia "${tokenItem.materiaNombre}"`
      : 'todas las materias';

    const text = `Hola ${tokenItem.docenteNombre || 'Docente'}, te compartimos el enlace para la carga de calificaciones de ${tokenItem.cursoNombre || 'tu curso'} (${tokenItem.periodoNombre || 'período activo'}) para ${materiaText} en el Colegio Crecer y Ser:\n\n🔗 ${url}\n\nEste enlace es personal y de acceso directo sin contraseñas.`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const columns: ColumnsType<TokenAccesoDocente> = [
    {
      title: 'Docente / Referencia',
      key: 'docente',
      render: (_, record) => (
        <div>
          <Typography.Text strong style={{ fontSize: 13.5, color: '#0f172a', display: 'block' }}>
            <UserOutlined style={{ marginRight: 6, color: '#2563eb' }} />
            {record.docenteNombre || 'Docente sin especificar'}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            Token: <span style={{ fontFamily: 'monospace' }}>{record.token.slice(0, 10)}...</span>
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Curso y Período',
      key: 'curso_periodo',
      render: (_, record) => (
        <div>
          <Tag color="blue" style={{ borderRadius: 4, fontWeight: 600, fontSize: 11, margin: '0 4px 2px 0' }}>
            {record.cursoNombre || 'Curso'}
          </Tag>
          <Tag color="green" style={{ borderRadius: 4, fontSize: 11 }}>
            <CalendarOutlined style={{ marginRight: 3 }} />
            {record.periodoNombre || 'Período'}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Alcance Materia',
      key: 'materia',
      render: (_, record) =>
        record.materiaNombre ? (
          <Tag color="purple" style={{ borderRadius: 4, fontWeight: 600 }}>
            <BookOutlined style={{ marginRight: 4 }} />
            {record.materiaNombre}
          </Tag>
        ) : (
          <Tag color="cyan" style={{ borderRadius: 4, fontWeight: 600 }}>
            Todas las materias
          </Tag>
        ),
    },
    {
      title: 'Vencimiento',
      key: 'expiracion',
      render: (_, record) => {
        if (!record.fechaExpiracion) {
          return <Typography.Text type="secondary" style={{ fontSize: 11.5 }}>Sin límite</Typography.Text>;
        }
        const exp = dayjs(record.fechaExpiracion);
        const isExpired = dayjs().isAfter(exp);
        return (
          <Tag color={isExpired ? 'error' : 'default'} style={{ fontSize: 11 }}>
            {isExpired ? 'Expiró: ' : 'Hasta: '}
            {exp.format('DD/MM/YYYY')}
          </Tag>
        );
      },
    },
    {
      title: 'Activo',
      key: 'activo',
      align: 'center',
      render: (_, record) => (
        <Switch
          size="small"
          checked={record.activo}
          onChange={(checked) => handleToggleActivo(record, checked)}
        />
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      align: 'center',
      render: (_, record) => (
        <Space size={6}>
          <Tooltip title="Copiar enlace directo">
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyLink(record.token)}
            />
          </Tooltip>
          <Tooltip title="Compartir por WhatsApp">
            <Button
              size="small"
              icon={<WhatsAppOutlined style={{ color: '#16a34a' }} />}
              onClick={() => handleShareWhatsApp(record)}
            />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar este enlace?"
            description="El docente ya no podrá ingresar con este link."
            onConfirm={() => handleDeleteToken(record.id)}
            okText="Eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={860}
      style={{ top: 24 }}
      title={
        <Space size={8} align="center">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 16,
            }}
          >
            <KeyOutlined />
          </div>
          <div>
            <Typography.Text strong style={{ fontSize: 16, display: 'block' }}>
              Gestor de Enlaces Mágicos para Docentes
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Permite a los maestros cargar calificaciones sin usuario ni contraseña de forma aislada y segura.
            </Typography.Text>
          </div>
        </Space>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
        {/* Formulario de Emisión de Enlaces */}
        <Card
          size="small"
          style={{
            borderRadius: 12,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
          title={
            <Space size={6}>
              <PlusCircleOutlined style={{ color: '#2563eb' }} />
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>Emitir Nuevo Enlace de Carga</span>
            </Space>
          }
        >
          <Form form={form} layout="vertical" onFinish={handleCreateToken}>
            <Row gutter={[12, 0]}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  label="Curso / División"
                  name="cursoId"
                  rules={[{ required: true, message: 'Seleccione un curso' }]}
                >
                  <Select
                    placeholder="Curso..."
                    options={cursos.map((c) => ({
                      value: c.id,
                      label: `${c.nombre} (${c.turno})`,
                    }))}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  label="Período Escolar"
                  name="periodoId"
                  rules={[{ required: true, message: 'Seleccione un período' }]}
                >
                  <Select
                    placeholder="Bimestre..."
                    options={periodos.map((p) => ({
                      value: p.id,
                      label: p.nombre,
                    }))}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Materia Específica (Opcional)" name="materiaId">
                  <Select
                    placeholder="Todas las materias"
                    allowClear
                    options={materiasDisponibles.map((m) => ({
                      value: m.materiaId,
                      label: m.materiaNombre,
                    }))}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  label="Nombre del Docente"
                  name="docenteNombre"
                  rules={[{ required: true, message: 'Indique el nombre' }]}
                >
                  <Input placeholder="Ej: Prof. Andrea Gómez" />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Fecha de Expiración" name="fechaExpiracion">
                  <DatePicker
                    placeholder="Sin límite"
                    style={{ width: '100%' }}
                    format="DD/MM/YYYY"
                    disabledDate={(d) => d && d.isBefore(dayjs().startOf('day'))}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={6} style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 24 }}>
                <Button
                  type="primary"
                  icon={<LinkOutlined />}
                  onClick={handleCreateToken}
                  loading={creating}
                  className="btn-primary-gradient"
                  style={{ width: '100%', borderRadius: 8, fontWeight: 600 }}
                >
                  Generar Enlace
                </Button>
              </Col>
            </Row>
          </Form>
        </Card>

        {/* Tabla de Enlaces Emitidos */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Typography.Text strong style={{ fontSize: 13.5, color: '#334155' }}>
              Enlaces Emitidos ({tokens.length})
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 11.5 }}>
              Los enlaces desactivados bloquean el ingreso docente de forma inmediata.
            </Typography.Text>
          </div>

          <Table
            size="small"
            rowKey="id"
            loading={loading}
            dataSource={tokens}
            columns={columns}
            pagination={{ pageSize: 5, showSizeChanger: false }}
            locale={{ emptyText: 'No hay enlaces docentes emitidos todavía.' }}
          />
        </div>
      </div>
    </Modal>
  );
};
