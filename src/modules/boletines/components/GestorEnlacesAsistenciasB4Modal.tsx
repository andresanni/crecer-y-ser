import React, { useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  KeyOutlined,
  LinkOutlined,
  PlusCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { FormModal } from '../../../shared/components/FormModal';
import { useModalSessionKey } from '../../../shared/hooks/useModalSessionKey';
import { focusFirstFormError } from '../../../shared/utils/formValidation';
import ui from '../../../shared/styles/ui.module.css';
import styles from './GestorEnlacesModal.module.css';
import { asistenciasB4Service } from '../services/asistenciasB4.service';
import type { CursoAsistenciaB4Etapa } from '../models/asistenciasB4.model';

interface GestorEnlacesAsistenciasB4ModalProps {
  open: boolean;
  onClose: () => void;
  periodoId: string;
  cursos: CursoAsistenciaB4Etapa[];
  activeCursoId: string | null;
  onChanged: () => void;
}

interface FormValues {
  cursoId: string;
  docenteNombre: string;
}

export const GestorEnlacesAsistenciasB4Modal: React.FC<GestorEnlacesAsistenciasB4ModalProps> = (props) => {
  const sessionKey = useModalSessionKey(props.open);
  return (
    <GestorEnlacesAsistenciasB4Session
      key={`${sessionKey}:${props.activeCursoId || 'all'}`}
      {...props}
    />
  );
};

const GestorEnlacesAsistenciasB4Session: React.FC<GestorEnlacesAsistenciasB4ModalProps> = ({
  open,
  onClose,
  periodoId,
  cursos,
  activeCursoId,
  onChanged,
}) => {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [busyTokenId, setBusyTokenId] = useState<string | null>(null);

  const cursosHabilitados = cursos.filter(
    (c) => c.etapa !== 'COMPLETADO' && c.etapa !== 'CONTROL_DIRECTIVO',
  );
  const activeTokens = cursos.filter((c) => Boolean(c.tokenDocente));

  const showGeneratedLinkModal = (title: string, secret: string, cursoNombre: string) => {
    const url = asistenciasB4Service.buildPublicUrl(secret);
    modal.info({
      title,
      width: 560,
      icon: <CheckCircleOutlined style={{ color: 'var(--cys-color-success-text)' }} />,
      okText: 'Cerrar',
      content: (
        <Space orientation="vertical" size={10} style={{ width: '100%', marginTop: 8 }}>
          <Typography.Text>
            Enlace exclusivo de <strong>Asistencias finales (4.° Bimestre)</strong> para <strong>{cursoNombre}</strong>:
          </Typography.Text>
          <Input.TextArea value={url} readOnly autoSize={{ minRows: 2, maxRows: 4 }} />
          <Button
            type="primary"
            icon={<CopyOutlined />}
            onClick={() => {
              void navigator.clipboard.writeText(url);
              message.success('Enlace copiado al portapapeles.');
            }}
          >
            Copiar enlace
          </Button>
        </Space>
      ),
    });
  };

  const handleIssue = async (values: FormValues) => {
    try {
      setSubmitting(true);
      const res = await asistenciasB4Service.issueLink({
        cursoId: values.cursoId,
        periodoId,
        docenteNombre: values.docenteNombre.trim(),
      });
      const cursoNombre = cursos.find((c) => c.cursoId === values.cursoId)?.cursoNombre || 'el curso';
      form.resetFields(['docenteNombre']);
      onChanged();
      showGeneratedLinkModal('Enlace generado', res.secreto, cursoNombre);
    } catch (error: unknown) {
      console.error(error);
      const msg = error instanceof Error ? error.message : 'No se pudo generar el enlace.';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async (tokenId: string) => {
    try {
      setBusyTokenId(tokenId);
      const res = await asistenciasB4Service.recoverLink(tokenId);
      const url = asistenciasB4Service.buildPublicUrl(res.secreto);
      await navigator.clipboard.writeText(url);
      message.success('Enlace copiado al portapapeles.');
    } catch (error) {
      console.error(error);
      message.error('No se pudo recuperar el enlace.');
    } finally {
      setBusyTokenId(null);
    }
  };

  const handleDelete = async (tokenId: string) => {
    try {
      setBusyTokenId(tokenId);
      await asistenciasB4Service.deleteLink(tokenId);
      message.success('Enlace eliminado. El borrador guardado se conserva.');
      onChanged();
    } catch (error) {
      console.error(error);
      message.error('No se pudo eliminar el enlace.');
    } finally {
      setBusyTokenId(null);
    }
  };

  const columns: ColumnsType<CursoAsistenciaB4Etapa> = [
    {
      title: 'Docente / Referencia',
      key: 'docente',
      render: (_, row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Space size={6}>
            <UserOutlined className={ui.primary} />
            <Typography.Text strong>{row.tokenDocente?.docenteNombre || 'Docente de grado'}</Typography.Text>
          </Space>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Referencia: {row.tokenDocente?.tokenPrefijo || '—'}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Curso y Avance',
      key: 'alcance',
      render: (_, row) => (
        <Space size={6} wrap>
          <Tag color="blue" style={{ fontWeight: 700, margin: 0 }}>{row.cursoNombre}</Tag>
          <Tag color="green" icon={<CalendarOutlined />} style={{ margin: 0 }}>
            4° Bimestre
          </Tag>
          <Typography.Text type="secondary" style={{ fontSize: 12.5 }}>
            {row.alumnosCargados}/{row.totalAlumnos} alumnos
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 110,
      align: 'center',
      render: (_, row) => {
        const token = row.tokenDocente;
        if (!token) return null;
        const busy = busyTokenId === token.id;
        return (
          <Space size={6}>
            <Tooltip title="Copiar enlace directo">
              <Button
                size="small"
                icon={<CopyOutlined />}
                loading={busy}
                onClick={() => void handleCopy(token.id)}
                aria-label={`Copiar enlace de ${token.docenteNombre || 'docente'}`}
              />
            </Tooltip>
            <Popconfirm
              title="¿Eliminar este enlace?"
              description="El acceso se eliminará, pero la carga parcial quedará pausada y podrá retomarse generando un enlace nuevo."
              okText="Eliminar"
              cancelText="Cancelar"
              okButtonProps={{ danger: true }}
              onConfirm={() => void handleDelete(token.id)}
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={busy}
                aria-label={`Eliminar enlace de ${token.docenteNombre || 'docente'}`}
              />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const defaultCursoId = activeCursoId && cursosHabilitados.some((c) => c.cursoId === activeCursoId)
    ? activeCursoId
    : cursosHabilitados[0]?.cursoId;

  return (
    <FormModal
      open={open}
      onCancel={onClose}
      width={1040}
      title="Enlaces de asistencias finales"
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
          <Form<FormValues>
            form={form}
            layout="vertical"
            requiredMark
            initialValues={{
              cursoId: defaultCursoId,
              docenteNombre: '',
            }}
            onFinish={(vals) => void handleIssue(vals)}
            onFinishFailed={(info) => focusFirstFormError(form, info)}
          >
            <Row gutter={[14, 0]}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="cursoId"
                  label="Curso y división"
                  rules={[{ required: true, message: 'Seleccione un curso' }]}
                >
                  <Select
                    placeholder="Seleccionar curso"
                    options={cursosHabilitados.map((c) => ({
                      value: c.cursoId,
                      label: c.turno ? `${c.cursoNombre} (${c.turno})` : c.cursoNombre,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={10}>
                <Form.Item
                  name="docenteNombre"
                  label="Nombre del docente"
                  rules={[{ required: true, whitespace: true, message: 'Indique el nombre del docente' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="Ej. Prof. Andrea Gómez" maxLength={120} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={24} md={6} className={styles.submitColumn}>
                <Form.Item className={ui.fullWidth}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<LinkOutlined />}
                    loading={submitting}
                    disabled={cursosHabilitados.length === 0}
                    className={`btn-primary-gradient ${styles.submitButton}`}
                  >
                    Generar enlace
                  </Button>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

        <section className={styles.listSection} aria-labelledby="enlaces-asistencias-title">
          <div className={styles.listHeader}>
            <Typography.Text id="enlaces-asistencias-title" strong className={styles.listTitle}>
              Enlaces disponibles ({activeTokens.length})
            </Typography.Text>
          </div>

          <Table
            rowKey="cursoId"
            size="small"
            dataSource={activeTokens}
            columns={columns}
            scroll={{ x: 720 }}
            pagination={{ pageSize: 5, showSizeChanger: false, hideOnSinglePage: true }}
            locale={{ emptyText: 'Todavía no hay enlaces de asistencias disponibles.' }}
          />
        </section>
      </div>
    </FormModal>
  );
};
