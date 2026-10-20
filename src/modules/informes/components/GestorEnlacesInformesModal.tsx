import React, { useMemo, useState } from 'react';
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
  BookOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  KeyOutlined,
  LinkOutlined,
  PlusCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useModalSessionKey } from '../../../shared/hooks/useModalSessionKey';
import { FormModal } from '../../../shared/components/FormModal';
import { focusFirstFormError } from '../../../shared/utils/formValidation';
import ui from '../../../shared/styles/ui.module.css';
import {
  TIPOS_INFORME_META,
  type CeldaEtapaInforme,
  type CursoInformeResumen,
  type MateriaEspecialInforme,
  type TipoInforme,
  type TokenAccesoInforme,
} from '../models/informe.model';
import { informesService } from '../services/informes.service';
import styles from './GestorEnlacesInformesModal.module.css';

interface GestorEnlacesInformesModalProps {
  open: boolean;
  onClose: () => void;
  cicloId: string;
  tipoInforme: TipoInforme;
  cursos: CursoInformeResumen[];
  materiasEspeciales: MateriaEspecialInforme[];
  celdas: CeldaEtapaInforme[];
  activeCursoId: string | null;
  activeMateriaId: string | null;
  onChanged: () => void;
}

interface EnlaceInformeFormValues {
  cursoId: string;
  materiaId?: string;
  docenteNombre: string;
  docenteApellido: string;
}

interface EnlaceInformeRow extends TokenAccesoInforme {
  cursoNombre: string;
  cursoTurno: string;
  materiaNombre: string | null;
}

export const GestorEnlacesInformesModal: React.FC<GestorEnlacesInformesModalProps> = (props) => {
  const sessionKey = useModalSessionKey(props.open);
  return (
    <GestorEnlacesInformesModalSession
      key={`${sessionKey}:${props.tipoInforme}:${props.activeCursoId}:${props.activeMateriaId}`}
      {...props}
    />
  );
};

const GestorEnlacesInformesModalSession: React.FC<GestorEnlacesInformesModalProps> = ({
  open,
  onClose,
  cicloId,
  tipoInforme,
  cursos,
  materiasEspeciales,
  celdas,
  activeCursoId,
  activeMateriaId,
  onChanged,
}) => {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<EnlaceInformeFormValues>();
  const [creating, setCreating] = useState(false);
  const [busyTokenId, setBusyTokenId] = useState<string | null>(null);
  const [cachedSecrets, setCachedSecrets] = useState<Record<string, string>>({});

  const meta = TIPOS_INFORME_META[tipoInforme];
  const requiresSubject = meta.requiereMateriaEspecial;

  const initialCourseId = activeCursoId || cursos[0]?.id || '';
  const initialSubjectId = requiresSubject
    ? activeMateriaId || materiasEspeciales[0]?.id || ''
    : undefined;

  const initialCell = useMemo(
    () => celdas.find(
      (cell) => cell.cursoId === initialCourseId && (cell.materiaId || '') === (initialSubjectId || ''),
    ),
    [celdas, initialCourseId, initialSubjectId],
  );

  const cursosById = useMemo(
    () => new Map(cursos.map((curso) => [curso.id, curso])),
    [cursos],
  );
  const materiasById = useMemo(
    () => new Map(materiasEspeciales.map((mat) => [mat.id, mat])),
    [materiasEspeciales],
  );

  const tokens = useMemo<EnlaceInformeRow[]>(() => {
    const list: EnlaceInformeRow[] = [];
    for (const cell of celdas) {
      if (!cell.enlace) continue;
      const curso = cursosById.get(cell.cursoId);
      const materia = cell.materiaId ? materiasById.get(cell.materiaId) : undefined;
      list.push({
        ...cell.enlace,
        secreto: cachedSecrets[cell.enlace.id] || cell.enlace.secreto,
        cursoNombre: curso?.nombre || 'Curso',
        cursoTurno: curso?.turno || '',
        materiaNombre: materia?.nombre || null,
      });
    }
    return list;
  }, [cachedSecrets, celdas, cursosById, materiasById]);

  const handleScopeSelectionChange = () => {
    const selectedCourseId = form.getFieldValue('cursoId') as string | undefined;
    const selectedSubjectId = form.getFieldValue('materiaId') as string | undefined;
    const cell = celdas.find(
      (candidate) => (
        candidate.cursoId === selectedCourseId &&
        (candidate.materiaId || '') === (requiresSubject ? (selectedSubjectId || '') : '')
      ),
    );
    if (cell?.docenteNombre || cell?.docenteApellido) {
      form.setFieldsValue({
        docenteNombre: cell.docenteNombre || '',
        docenteApellido: cell.docenteApellido || '',
      });
    }
  };

  const showIssuedLink = (secret: string, title: string) => {
    const url = informesService.buildMagicLinkUrl(secret);
    modal.success({
      title,
      content: (
        <Typography.Paragraph
          copyable={{ text: url }}
          style={{ margin: '12px 0 0', wordBreak: 'break-all' }}
        >
          {url}
        </Typography.Paragraph>
      ),
      okText: 'Listo',
    });
  };

  const handleCreateToken = async (values: EnlaceInformeFormValues) => {
    try {
      setCreating(true);
      const issued = await informesService.createEnlace({
        cicloId,
        tipoInforme,
        cursoId: values.cursoId,
        materiaId: requiresSubject ? values.materiaId : undefined,
        docenteNombre: values.docenteNombre.trim(),
        docenteApellido: values.docenteApellido.trim(),
      });
      setCachedSecrets((current) => ({
        ...current,
        [issued.enlace.id]: issued.secreto,
      }));
      onChanged();
      showIssuedLink(issued.secreto, 'Enlace de informe generado con éxito');
    } catch (err) {
      console.error(err);
      const msg = err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
        ? err.message
        : 'No se pudo generar el enlace del informe';
      message.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = async (record: EnlaceInformeRow) => {
    try {
      setBusyTokenId(record.id);
      let secret = record.secreto;
      if (!secret) {
        const recovered = await informesService.recoverEnlace(record.id);
        secret = recovered.secreto;
        setCachedSecrets((current) => ({ ...current, [record.id]: secret! }));
      }
      const url = informesService.buildMagicLinkUrl(secret);
      await navigator.clipboard.writeText(url);
      message.success({
        content: '¡Enlace copiado al portapapeles!',
        icon: <CheckCircleOutlined className={styles.successIcon} />,
      });
    } catch (err) {
      console.error(err);
      message.error('No se pudo recuperar o copiar el enlace');
    } finally {
      setBusyTokenId(null);
    }
  };

  const handleRotateToken = async (record: EnlaceInformeRow) => {
    try {
      setBusyTokenId(record.id);
      const rotated = await informesService.rotateEnlace(record.id);
      setCachedSecrets((current) => ({
        ...current,
        [rotated.enlace.id]: rotated.secreto,
      }));
      onChanged();
      showIssuedLink(rotated.secreto, 'Enlace regenerado con éxito');
    } catch (err) {
      console.error(err);
      message.error('No se pudo regenerar el enlace');
    } finally {
      setBusyTokenId(null);
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    try {
      setBusyTokenId(tokenId);
      await informesService.deleteEnlace(tokenId);
      message.success('Enlace pausado');
      onChanged();
    } catch (err) {
      console.error(err);
      message.error('No se pudo pausar el enlace');
    } finally {
      setBusyTokenId(null);
    }
  };

  const columns: ColumnsType<EnlaceInformeRow> = [
    {
      title: 'Docente / Referencia',
      key: 'docente',
      render: (_, record) => (
        <div>
          <Typography.Text strong className={styles.teacherName}>
            <UserOutlined className={styles.teacherIcon} />
            {`${record.docenteApellido}, ${record.docenteNombre}`.trim()}
          </Typography.Text>
          <Typography.Text type="secondary" className={ui.smallText}>
            Referencia: <span className={styles.token}>{record.tokenPrefijo}</span>
          </Typography.Text>
        </div>
      ),
    },
    {
      title: requiresSubject ? 'Grado y Materia Especial' : 'Grado',
      key: 'alcance',
      render: (_, record) => (
        <Space size={8} wrap>
          <Tag color="blue" className={styles.courseTag}>
            {record.cursoNombre} {record.cursoTurno ? `(${record.cursoTurno})` : ''}
          </Tag>
          {record.materiaNombre && (
            <Tag color="purple" className={styles.subjectTag}>
              <BookOutlined className={styles.tagIcon} />
              {record.materiaNombre}
            </Tag>
          )}
        </Space>
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
              loading={busyTokenId === record.id}
              onClick={() => void handleCopyLink(record)}
              aria-label={`Copiar enlace de ${record.docenteApellido}, ${record.docenteNombre}`}
            />
          </Tooltip>
          <Popconfirm
            title="¿Regenerar este enlace?"
            description="El enlace anterior dejará de funcionar y se generará uno nuevo."
            onConfirm={() => void handleRotateToken(record)}
            okText="Regenerar"
            cancelText="Cancelar"
          >
            <Tooltip title="Regenerar enlace">
              <Button
                size="small"
                icon={<LinkOutlined />}
                loading={busyTokenId === record.id}
                aria-label={`Regenerar enlace de ${record.docenteApellido}, ${record.docenteNombre}`}
              />
            </Tooltip>
          </Popconfirm>
          <Popconfirm
            title="¿Pausar este enlace?"
            description="El acceso docente se deshabilitará, pero el borrador guardado quedará intacto y podrá retomarse generando un nuevo enlace."
            onConfirm={() => void handleDeleteToken(record.id)}
            okText="Pausar enlace"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={busyTokenId === record.id}
              aria-label={`Pausar enlace de ${record.docenteApellido}, ${record.docenteNombre}`}
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
      width={1080}
      title={`Enlaces de carga docente · ${meta.tituloCorto}`}
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
              Emitir o actualizar enlace docente
            </span>
          }
        >
          <Form<EnlaceInformeFormValues>
            form={form}
            layout="vertical"
            requiredMark
            initialValues={{
              cursoId: initialCourseId,
              materiaId: initialSubjectId,
              docenteNombre: initialCell?.docenteNombre || '',
              docenteApellido: initialCell?.docenteApellido || '',
            }}
            onValuesChange={(changed) => {
              if ('cursoId' in changed || 'materiaId' in changed) {
                handleScopeSelectionChange();
              }
            }}
            onFinish={handleCreateToken}
            onFinishFailed={(error) => focusFirstFormError(form, error)}
          >
            <Row gutter={[14, 0]}>
              <Col xs={24} sm={12} md={requiresSubject ? 5 : 6}>
                <Form.Item
                  label="Grado"
                  name="cursoId"
                  rules={[{ required: true, message: 'Seleccione un grado' }]}
                >
                  <Select
                    placeholder="Seleccionar grado"
                    options={cursos.map((c) => ({
                      value: c.id,
                      label: `${c.nombre} (${c.turno})`,
                    }))}
                  />
                </Form.Item>
              </Col>

              {requiresSubject && (
                <Col xs={24} sm={12} md={6}>
                  <Form.Item
                    label="Materia especial"
                    name="materiaId"
                    rules={[{ required: true, message: 'Seleccione la materia especial' }]}
                  >
                    <Select
                      placeholder="Seleccionar materia"
                      options={materiasEspeciales.map((m) => ({
                        value: m.id,
                        label: m.nombre,
                      }))}
                    />
                  </Form.Item>
                </Col>
              )}

              <Col xs={24} sm={12} md={requiresSubject ? 4 : 6}>
                <Form.Item
                  label="Nombre(s) docente"
                  name="docenteNombre"
                  rules={[{ required: true, whitespace: true, message: 'Ingrese el nombre' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="Ej. María Florencia" />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={requiresSubject ? 4 : 6}>
                <Form.Item
                  label="Apellido(s) docente"
                  name="docenteApellido"
                  rules={[{ required: true, whitespace: true, message: 'Ingrese el apellido' }]}
                >
                  <Input placeholder="Ej. Rodríguez" />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={requiresSubject ? 5 : 6} className={styles.submitColumn}>
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

        <section className={styles.listSection} aria-labelledby="enlaces-informes-disponibles-title">
          <div className={styles.listHeader}>
            <Typography.Text id="enlaces-informes-disponibles-title" strong className={styles.listTitle}>
              Enlaces vigentes en {meta.tituloCorto} ({tokens.length})
            </Typography.Text>
          </div>

          <Table
            size="small"
            rowKey="id"
            dataSource={tokens}
            columns={columns}
            scroll={{ x: 760 }}
            pagination={{ pageSize: 6, showSizeChanger: false, hideOnSinglePage: true }}
            locale={{ emptyText: 'Todavía no hay enlaces activos para esta instancia.' }}
          />
        </section>
      </div>
    </FormModal>
  );
};
