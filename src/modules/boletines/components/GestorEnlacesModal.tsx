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
  Typography,
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
  CalendarOutlined,
  KeyOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { accesoDocenteService } from '../services/accesoDocente.service';
import type { Curso } from '../../inscripciones/models/inscripcion.model';
import type { Periodo, TokenAccesoDocente } from '../models/boletin.model';

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
  docenteNombre: string;
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
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<EnlaceDocenteFormValues>();

  const [tokens, setTokens] = useState<TokenAccesoDocente[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);


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


  const handleCreateToken = async (values: EnlaceDocenteFormValues) => {
    try {
      setCreating(true);

      const created = await accesoDocenteService.create({
        cursoId: values.cursoId,
        periodoId: values.periodoId,
        docenteNombre: values.docenteNombre.trim(),
      });

      const curso = cursos.find((item) => item.id === values.cursoId);
      const periodo = periodos.find((item) => item.id === values.periodoId);
      const issued = {
        ...created,
        cursoNombre: curso?.nombre,
        periodoNombre: periodo?.nombre,
        numeroPeriodo: periodo?.numeroPeriodo,
      };
      setTokens((current) => [
        issued,
        ...current.filter((item) => (
          item.cursoId !== issued.cursoId || item.periodoId !== issued.periodoId
        )),
      ]);
      if (issued.secreto) {
        await showIssuedLink(issued.secreto, 'Enlace docente generado');
      }
      form.resetFields(['docenteNombre']);
    } catch (err) {
      console.error(err);
      message.error('Error al generar enlace docente');
    } finally {
      setCreating(false);
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

  const copyLink = async (tokenStr: string) => {
    const url = getMagicLinkUrl(tokenStr);
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  };

  const recoverSecret = async (tokenItem: TokenAccesoDocente) => {
    if (tokenItem.secreto) return tokenItem.secreto;
    const secret = await accesoDocenteService.recover(tokenItem.id);
    setTokens((current) => current.map((item) => (
      item.id === tokenItem.id ? { ...item, secreto: secret, recuperable: true } : item
    )));
    return secret;
  };

  const handleCopyLink = async (tokenItem: TokenAccesoDocente) => {
    try {
      const tokenStr = await recoverSecret(tokenItem);
      const copied = await copyLink(tokenStr);
      if (!copied) {
        message.error('No se pudo copiar el enlace al portapapeles.');
        return;
      }
      message.success({
        content: '¡Enlace copiado al portapapeles!',
        icon: <CheckCircleOutlined className={styles.successIcon} />,
      });
    } catch (err) {
      console.error(err);
      message.error('No se pudo recuperar el enlace');
    }
  };

  const showIssuedLink = async (tokenStr: string, title: string) => {
    const url = getMagicLinkUrl(tokenStr);
    const copied = await copyLink(tokenStr);
    modal.success({
      title,
      content: (
        <Space orientation="vertical">
          <Typography.Text>
            {copied
              ? 'El enlace fue copiado. También podés copiarlo desde esta ventana antes de cerrarla.'
              : 'Copiá el enlace desde esta ventana antes de cerrarla.'}
          </Typography.Text>
          <Typography.Text type="secondary">
            Podrás volver a copiar este enlace desde el gestor mientras sea la llave vigente.
          </Typography.Text>
          <Typography.Text copyable={{ text: url }}>{url}</Typography.Text>
        </Space>
      ),
      okText: 'Listo',
    });
  };


  const handleShareWhatsApp = async (tokenItem: TokenAccesoDocente) => {
    try {
      const secret = await recoverSecret(tokenItem);
      const url = getMagicLinkUrl(secret);
      const text = `Hola ${tokenItem.docenteNombre || 'Docente'}, te compartimos el enlace para la carga completa de calificaciones de ${tokenItem.cursoNombre || 'tu curso'} (${tokenItem.periodoNombre || 'período activo'}) en el Colegio Crecer y Ser:\n\n🔗 ${url}\n\nEste enlace es personal y de acceso directo sin contraseñas.`;
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, '_blank');
    } catch (err) {
      console.error(err);
      message.error('No se pudo recuperar el enlace');
    }
  };

  const handleRotateToken = async (tokenItem: TokenAccesoDocente) => {
    try {
      const rotated = await accesoDocenteService.rotate(tokenItem.id);
      const updated = { ...tokenItem, ...rotated };
      setTokens((current) => current.map((item) => item.id === tokenItem.id ? updated : item));
      if (updated.secreto) {
        await showIssuedLink(updated.secreto, 'Enlace docente regenerado');
      }
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
      title: 'Acciones',
      key: 'acciones',
      align: 'center',
      render: (_, record) => (
        <Space size={6}>
          {record.secreto || record.recuperable ? (
            <>
              <Tooltip title="Copiar enlace directo">
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => void handleCopyLink(record)}
                  aria-label={`Copiar enlace de ${record.docenteNombre || 'docente'}`}
                />
              </Tooltip>
              <Tooltip title="Compartir por WhatsApp">
                <Button
                  size="small"
                  icon={<WhatsAppOutlined className={styles.successIcon} />}
                  onClick={() => void handleShareWhatsApp(record)}
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
            description="El acceso se eliminará, pero la carga parcial quedará pausada y podrá retomarse generando un enlace nuevo."
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
            }}
            onFinish={handleCreateToken}
            onFinishFailed={(error) => focusFirstFormError(form, error)}
          >
            <Row gutter={[14, 0]}>
              <Col xs={24} sm={12} md={6}>
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

              <Col xs={24} sm={12} md={6}>
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

              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  label="Nombre del docente"
                  name="docenteNombre"
                  rules={[{ required: true, whitespace: true, message: 'Indique el nombre del docente' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="Ej. Prof. Andrea Gómez" />
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

        <section className={styles.listSection} aria-labelledby="enlaces-disponibles-title">
          <div className={styles.listHeader}>
            <Typography.Text id="enlaces-disponibles-title" strong className={styles.listTitle}>
              Enlaces disponibles ({tokens.length})
            </Typography.Text>
            <Typography.Text type="secondary" className={styles.listHint}>
              Regenerar reemplaza la llave anterior sin perder el avance de la carga.
            </Typography.Text>
          </div>

          <Table
            size="small"
            rowKey="id"
            loading={loading}
            dataSource={tokens}
            columns={columns}
            scroll={{ x: 720 }}
            pagination={{ pageSize: 5, showSizeChanger: false, hideOnSinglePage: true }}
            locale={{ emptyText: 'Todavía no hay enlaces de carga disponibles.' }}
          />
        </section>
      </div>
    </FormModal>
  );
};
