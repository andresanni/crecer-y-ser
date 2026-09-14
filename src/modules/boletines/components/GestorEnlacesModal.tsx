import { useModalSessionKey } from '../../../shared/hooks/useModalSessionKey';
import { FormModal } from '../../../shared/components/FormModal';
import { focusFirstFormError } from '../../../shared/utils/formValidation';
import ui from '../../../shared/styles/ui.module.css';
import styles from './GestorEnlacesModal.module.css';
import React, { useState, useEffect } from 'react';
import {
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
import { accesoDocenteService } from '../services/accesoDocente.service';
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

interface EnlaceDocenteFormValues {
  cursoId: string;
  periodoId: string;
  materiaId?: string;
  docenteNombre: string;
  fechaExpiracion?: dayjs.Dayjs | null;
}

export const GestorEnlacesModal: React.FC<GestorEnlacesModalProps> = (props) => {
  const sessionKey = useModalSessionKey(props.open);
  return (
    <GestorEnlacesModalSession key={sessionKey + ':' + props.activeCursoId + ':' + props.activePeriodoId} {...props} />
  );
};

const GestorEnlacesModalSession: React.FC<GestorEnlacesModalProps> = ({
  open,
  onClose,
  cursos,
  periodos,
  activeCursoId,
  activePeriodoId,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<EnlaceDocenteFormValues>();

  const [tokens, setTokens] = useState<TokenAccesoDocente[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [materiasDisponibles, setMateriasDisponibles] = useState<CursoMateria[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState<string | undefined>(
    activeCursoId || cursos[0]?.id,
  );


  useEffect(() => {
    let active = true;
    if (open) {
      accesoDocenteService.list()
        .then((data) => {
          if (active) setTokens(data);
        })
        .catch((err) => {
          if (!active) return;
          console.error(err);
          message.error('Error al cargar enlaces docentes');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [message, open]);


  useEffect(() => {
    let active = true;
    const loadMateriasCurso = async () => {
      if (!selectedCursoId) {
        setMateriasDisponibles([]);
        return;
      }
      try {
        const mats = await boletinService.getMateriasByCurso(selectedCursoId);
        if (active) setMateriasDisponibles(mats);
      } catch (err) {
        console.error(err);
      }
    };
    void loadMateriasCurso();
    return () => { active = false; };
  }, [selectedCursoId]);

  const handleFormValuesChange = (changedValues: Partial<EnlaceDocenteFormValues>) => {
    if ('cursoId' in changedValues) {
      setSelectedCursoId(changedValues.cursoId);
      form.setFieldValue('materiaId', undefined);
    }
  };


  const handleCreateToken = async (values: EnlaceDocenteFormValues) => {
    try {
      setCreating(true);

      const fechaExp = values.fechaExpiracion
        ? dayjs(values.fechaExpiracion).format('YYYY-MM-DD 23:59:59')
        : undefined;

      const created = await accesoDocenteService.create({
        cursoId: values.cursoId,
        periodoId: values.periodoId,
        materiaId: values.materiaId || undefined,
        docenteNombre: values.docenteNombre.trim(),
        fechaExpiracion: fechaExp,
      });

      const curso = cursos.find((item) => item.id === values.cursoId);
      const periodo = periodos.find((item) => item.id === values.periodoId);
      const materia = materiasDisponibles.find((item) => item.materiaId === values.materiaId);
      const issued = {
        ...created,
        cursoNombre: curso?.nombre,
        periodoNombre: periodo?.nombre,
        numeroPeriodo: periodo?.numeroPeriodo,
        materiaNombre: materia?.materiaNombre,
      };
      setTokens((current) => [issued, ...current]);
      if (issued.secreto) handleCopyLink(issued.secreto);
      message.success('Enlace generado y copiado. El secreto no podrá consultarse nuevamente.');
      form.resetFields(['docenteNombre', 'materiaId', 'fechaExpiracion']);
    } catch (err) {
      console.error(err);
      message.error('Error al generar enlace docente');
    } finally {
      setCreating(false);
    }
  };


  const handleToggleActivo = async (tokenItem: TokenAccesoDocente, activo: boolean) => {
    try {
      await accesoDocenteService.setActive(tokenItem.id, activo);
      message.success(`Enlace ${activo ? 'activado' : 'desactivado'} correctamente`);
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenItem.id ? { ...t, activo } : t))
      );
    } catch (err) {
      console.error(err);
      message.error('Error al actualizar estado del enlace');
    }
  };


  const handleDeleteToken = async (tokenId: string) => {
    try {
      await accesoDocenteService.delete(tokenId);
      message.success('Enlace eliminado');
      setTokens((prev) => prev.filter((t) => t.id !== tokenId));
    } catch (err) {
      console.error(err);
      message.error('Error al eliminar enlace');
    }
  };


  const getMagicLinkUrl = (tokenStr: string) => {
    const origin = window.location.origin;
    return `${origin}/carga#token=${encodeURIComponent(tokenStr)}`;
  };

  const handleCopyLink = (tokenStr: string) => {
    const url = getMagicLinkUrl(tokenStr);
    navigator.clipboard.writeText(url);
    message.success({
      content: '¡Enlace copiado al portapapeles!',
      icon: <CheckCircleOutlined className={styles.successIcon} />,
    });
  };


  const handleShareWhatsApp = (tokenItem: TokenAccesoDocente) => {
    if (!tokenItem.secreto) {
      message.warning('Regenerá el enlace antes de compartirlo. El secreto original no se almacena.');
      return;
    }
    const url = getMagicLinkUrl(tokenItem.secreto);
    const materiaText = tokenItem.materiaNombre
      ? `la materia "${tokenItem.materiaNombre}"`
      : 'todas las materias';

    const text = `Hola ${tokenItem.docenteNombre || 'Docente'}, te compartimos el enlace para la carga de calificaciones de ${tokenItem.cursoNombre || 'tu curso'} (${tokenItem.periodoNombre || 'período activo'}) para ${materiaText} en el Colegio Crecer y Ser:\n\n🔗 ${url}\n\nEste enlace es personal y de acceso directo sin contraseñas.`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleRotateToken = async (tokenItem: TokenAccesoDocente) => {
    try {
      const rotated = await accesoDocenteService.rotate(tokenItem.id);
      const updated = { ...tokenItem, ...rotated };
      setTokens((current) => current.map((item) => item.id === tokenItem.id ? updated : item));
      if (updated.secreto) handleCopyLink(updated.secreto);
      message.success('Enlace regenerado y copiado. El anterior dejó de funcionar.');
    } catch (err) {
      console.error(err);
      message.error('No se pudo regenerar el enlace');
    }
  };

  const columns: ColumnsType<TokenAccesoDocente> = [
    {
      title: 'Docente / Referencia',
      key: 'docente',
      render: (_, record) => (
        <div>
          <Typography.Text strong className={styles.teacherName}>
            <UserOutlined className={styles.teacherIcon} />
            {record.docenteNombre || 'Docente sin especificar'}
          </Typography.Text>
          <Typography.Text type="secondary" className={ui.smallText}>
            Referencia: <span className={styles.token}>{record.tokenPrefijo}</span>
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Curso y Período',
      key: 'curso_periodo',
      render: (_, record) => (
        <div>
          <Tag color="blue" className={styles.tag}>
            {record.cursoNombre || 'Curso'}
          </Tag>
          <Tag color="green" className={styles.tag}>
            <CalendarOutlined className={styles.tagIcon} />
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
          <Tag color="purple" className={styles.tag}>
            <BookOutlined className={styles.tagIcon} />
            {record.materiaNombre}
          </Tag>
        ) : (
          <Tag color="cyan" className={styles.tag}>
            Todas las materias
          </Tag>
        ),
    },
    {
      title: 'Vencimiento',
      key: 'expiracion',
      render: (_, record) => {
        if (!record.fechaExpiracion) {
          return <Typography.Text type="secondary" className={styles.expiration}>Sin límite</Typography.Text>;
        }
        const exp = dayjs(record.fechaExpiracion);
        const isExpired = dayjs().isAfter(exp);
        return (
          <Tag color={isExpired ? 'error' : 'default'} className={ui.smallText}>
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
          aria-label={`${record.activo ? 'Desactivar' : 'Activar'} enlace de ${record.docenteNombre || 'docente'}`}
        />
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      align: 'center',
      render: (_, record) => (
        <Space size={6}>
          {record.secreto ? (
            <>
              <Tooltip title="Copiar enlace directo">
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => handleCopyLink(record.secreto!)}
                  aria-label={`Copiar enlace de ${record.docenteNombre || 'docente'}`}
                />
              </Tooltip>
              <Tooltip title="Compartir por WhatsApp">
                <Button
                  size="small"
                  icon={<WhatsAppOutlined className={styles.successIcon} />}
                  onClick={() => handleShareWhatsApp(record)}
                  aria-label={`Compartir enlace de ${record.docenteNombre || 'docente'} por WhatsApp`}
                />
              </Tooltip>
            </>
          ) : (
            <Popconfirm
              title="¿Regenerar este enlace?"
              description="El enlace anterior dejará de funcionar y se copiará uno nuevo."
              onConfirm={() => handleRotateToken(record)}
              okText="Regenerar"
              cancelText="Cancelar"
            >
              <Tooltip title="Regenerar para compartir">
                <Button
                  size="small"
                  icon={<LinkOutlined />}
                  aria-label={`Regenerar enlace de ${record.docenteNombre || 'docente'}`}
                />
              </Tooltip>
            </Popconfirm>
          )}
          <Popconfirm
            title="¿Eliminar este enlace?"
            description="El docente ya no podrá ingresar con este link."
            onConfirm={() => handleDeleteToken(record.id)}
            okText="Eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label={`Eliminar enlace de ${record.docenteNombre || 'docente'}`}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <FormModal
      open={open}
      onCancel={onClose}
      width={1040}
      title="Enlaces de carga docente"
      description="Generá y administrá accesos directos para la carga de calificaciones."
      icon={<KeyOutlined />}
      footer={<Button onClick={onClose}>Cerrar</Button>}
    >
      <div className={styles.content}>
        <Card
          size="small"
          className={styles.createCard}
          title={
            <span className={styles.cardTitle}>
              <PlusCircleOutlined className={ui.primary} />
              Nuevo enlace
            </span>
          }
        >
          <Form<EnlaceDocenteFormValues>
            form={form}
            layout="vertical"
            requiredMark
            initialValues={{
              cursoId: activeCursoId || cursos[0]?.id,
              periodoId: activePeriodoId || periodos[0]?.id,
              docenteNombre: '',
              fechaExpiracion: null,
            }}
            onValuesChange={handleFormValuesChange}
            onFinish={handleCreateToken}
            onFinishFailed={(error) => focusFirstFormError(form, error)}
          >
            <Row gutter={[14, 0]}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label="Curso y división"
                  name="cursoId"
                  rules={[{ required: true, message: 'Seleccione un curso' }]}
                >
                  <Select
                    placeholder="Seleccionar curso"
                    options={cursos.map((c) => ({
                      value: c.id,
                      label: `${c.nombre} (${c.turno})`,
                    }))}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label="Período escolar"
                  name="periodoId"
                  rules={[{ required: true, message: 'Seleccione un período' }]}
                >
                  <Select
                    placeholder="Seleccionar período"
                    options={periodos.map((p) => ({ value: p.id, label: p.nombre }))}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Materia (opcional)" name="materiaId">
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

              <Col xs={24} sm={12} md={12}>
                <Form.Item
                  label="Nombre del docente"
                  name="docenteNombre"
                  rules={[{ required: true, whitespace: true, message: 'Indique el nombre del docente' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="Ej. Prof. Andrea Gómez" />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Vencimiento (opcional)" name="fechaExpiracion">
                  <DatePicker
                    placeholder="Sin límite"
                    className={ui.fullWidth}
                    format="DD/MM/YYYY"
                    disabledDate={(date) => Boolean(date && date.isBefore(dayjs().startOf('day')))}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={6} className={styles.submitColumn}>
                <Form.Item className={ui.fullWidth}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<LinkOutlined />}
                    loading={creating}
                    className={`btn-primary-gradient ${styles.submitButton}`}
                  >
                    Generar enlace
                  </Button>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

        <section className={styles.listSection} aria-labelledby="enlaces-emitidos-title">
          <div className={styles.listHeader}>
            <Typography.Text id="enlaces-emitidos-title" strong className={styles.listTitle}>
              Enlaces emitidos ({tokens.length})
            </Typography.Text>
            <Typography.Text type="secondary" className={styles.listHint}>
              Desactivar un enlace bloquea el acceso docente inmediatamente.
            </Typography.Text>
          </div>

          <Table
            size="small"
            rowKey="id"
            loading={loading}
            dataSource={tokens}
            columns={columns}
            scroll={{ x: 820 }}
            pagination={{ pageSize: 5, showSizeChanger: false, hideOnSinglePage: true }}
            locale={{ emptyText: 'Todavía no hay enlaces de carga emitidos.' }}
          />
        </section>
      </div>
    </FormModal>
  );
};
