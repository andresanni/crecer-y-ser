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
  cursoIds: string[];
  materiaId?: string;
  docenteNombre: string;
  docenteApellido: string;
}

interface EnlaceInformeRow extends TokenAccesoInforme {
  cursosDetalle: Array<{ id: string; nombre: string; turno: string }>;
  materiaNombre: string | null;
}

const isDeliveredStage = (etapa: CeldaEtapaInforme['etapa']) => (
  etapa === 'REVISION_DIRECTIVA' || etapa === 'LISTO_PARA_PDF'
);

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

  const initialSubjectId = requiresSubject
    ? activeMateriaId || materiasEspeciales[0]?.id || ''
    : undefined;
  const fallbackCourseId = activeCursoId || cursos[0]?.id || '';

  const initialCell = useMemo(
    () => celdas.find(
      (cell) => cell.cursoId === fallbackCourseId && (cell.materiaId || '') === (initialSubjectId || ''),
    ),
    [celdas, fallbackCourseId, initialSubjectId],
  );

  const initialCourseIds = useMemo(() => {
    if (initialCell?.enlace?.cursoIds && initialCell.enlace.cursoIds.length > 0) {
      return initialCell.enlace.cursoIds;
    }
    if (fallbackCourseId && initialCell && !isDeliveredStage(initialCell.etapa)) {
      return [fallbackCourseId];
    }
    const availableForInitialSubject = cursos
      .filter((c) => {
        const cell = celdas.find(
          (candidate) => (
            candidate.cursoId === c.id &&
            (candidate.materiaId || '') === (requiresSubject ? (initialSubjectId || '') : '')
          ),
        );
        return cell && !isDeliveredStage(cell.etapa) && cell.etapa !== 'PENDIENTE_CONFIGURACION';
      })
      .map((c) => c.id);
    return availableForInitialSubject.slice(0, 1);
  }, [celdas, cursos, fallbackCourseId, initialCell, initialSubjectId, requiresSubject]);

  const watchedMateriaId = Form.useWatch('materiaId', form) ?? initialSubjectId;
  const watchedCursoIds = Form.useWatch('cursoIds', form) ?? initialCourseIds;

  const cursosById = useMemo(
    () => new Map(cursos.map((curso) => [curso.id, curso])),
    [cursos],
  );
  const materiasById = useMemo(
    () => new Map(materiasEspeciales.map((mat) => [mat.id, mat])),
    [materiasEspeciales],
  );

  const cellsForCurrentSubject = useMemo(() => {
    const targetSubject = requiresSubject ? (watchedMateriaId || '') : '';
    const map = new Map<string, CeldaEtapaInforme>();
    for (const cell of celdas) {
      if ((cell.materiaId || '') === targetSubject) {
        map.set(cell.cursoId, cell);
      }
    }
    return map;
  }, [celdas, requiresSubject, watchedMateriaId]);

  const editableCoursesForSubject = useMemo(
    () => cursos.filter((c) => {
      const cell = cellsForCurrentSubject.get(c.id);
      return cell && !isDeliveredStage(cell.etapa) && cell.etapa !== 'PENDIENTE_CONFIGURACION';
    }),
    [cellsForCurrentSubject, cursos],
  );

  const tokens = useMemo<EnlaceInformeRow[]>(() => {
    const byId = new Map<string, EnlaceInformeRow>();
    for (const cell of celdas) {
      if (!cell.enlace) continue;
      const existing = byId.get(cell.enlace.id);
      if (existing) continue;

      const courseIdsList = cell.enlace.cursoIds && cell.enlace.cursoIds.length > 0
        ? cell.enlace.cursoIds
        : [cell.cursoId];

      const cursosDetalle = courseIdsList
        .map((id) => cursosById.get(id))
        .filter((c): c is CursoInformeResumen => Boolean(c))
        .sort((a, b) => a.gradoNumero - b.gradoNumero)
        .map((c) => ({ id: c.id, nombre: c.nombre, turno: c.turno }));

      const materia = cell.materiaId ? materiasById.get(cell.materiaId) : undefined;
      byId.set(cell.enlace.id, {
        ...cell.enlace,
        secreto: cachedSecrets[cell.enlace.id] || cell.enlace.secreto,
        cursosDetalle,
        materiaNombre: materia?.nombre || null,
      });
    }
    return Array.from(byId.values());
  }, [cachedSecrets, celdas, cursosById, materiasById]);

  const syncTeacherFromSelection = (nextCourseIds: string[], nextSubjectId?: string) => {
    const subjectKey = requiresSubject ? (nextSubjectId || '') : '';
    for (const cId of nextCourseIds) {
      const cell = celdas.find(
        (candidate) => candidate.cursoId === cId && (candidate.materiaId || '') === subjectKey,
      );
      if (cell?.docenteNombre || cell?.docenteApellido) {
        form.setFieldsValue({
          docenteNombre: cell.docenteNombre || '',
          docenteApellido: cell.docenteApellido || '',
        });
        return;
      }
    }
  };

  const applyCoursePreset = (filterFn: (curso: CursoInformeResumen) => boolean) => {
    const matchingIds = editableCoursesForSubject.filter(filterFn).map((c) => c.id);
    form.setFieldsValue({ cursoIds: matchingIds });
    syncTeacherFromSelection(matchingIds, watchedMateriaId);
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
        cursoId: values.cursoIds[0],
        cursoIds: values.cursoIds,
        materiaId: requiresSubject ? values.materiaId : undefined,
        docenteNombre: values.docenteNombre.trim(),
        docenteApellido: values.docenteApellido.trim(),
      });
      setCachedSecrets((current) => ({
        ...current,
        [issued.enlace.id]: issued.secreto,
      }));
      onChanged();
      const count = values.cursoIds.length;
      showIssuedLink(
        issued.secreto,
        count > 1
          ? `Enlace generado para ${count} grados con éxito`
          : 'Enlace de informe generado con éxito',
      );
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
      width: '28%',
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
      title: requiresSubject ? 'Materia Especial y Set de Grados' : 'Set de Grados',
      key: 'alcance',
      render: (_, record) => (
        <Space size={[6, 6]} wrap>
          {record.materiaNombre && (
            <Tag color="purple" className={styles.subjectTag}>
              <BookOutlined className={styles.tagIcon} />
              {record.materiaNombre}
            </Tag>
          )}
          {record.cursosDetalle.map((c) => (
            <Tag key={c.id} color="blue" className={styles.courseTag}>
              {c.nombre}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 150,
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
            description="El enlace anterior dejará de funcionar y se generará uno nuevo para todo el set de grados."
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
            description="El acceso docente se deshabilitará para los grados incluidos, pero el borrador guardado quedará intacto."
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
              Emitir enlace docente por set de grados
            </span>
          }
          extra={
            <Space size={6} wrap>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Selección rápida:
              </Typography.Text>
              <Button
                size="small"
                onClick={() => applyCoursePreset(() => true)}
                disabled={editableCoursesForSubject.length === 0}
              >
                Todos ({editableCoursesForSubject.length})
              </Button>
              <Button
                size="small"
                onClick={() => applyCoursePreset((c) => c.gradoNumero >= 1 && c.gradoNumero <= 3)}
                disabled={editableCoursesForSubject.every((c) => c.gradoNumero > 3)}
              >
                1.er Ciclo (1.° a 3.°)
              </Button>
              <Button
                size="small"
                onClick={() => applyCoursePreset((c) => c.gradoNumero >= 4 && c.gradoNumero <= 7)}
                disabled={editableCoursesForSubject.every((c) => c.gradoNumero < 4)}
              >
                2.° Ciclo (4.° a 7.°)
              </Button>
            </Space>
          }
        >
          <Form<EnlaceInformeFormValues>
            form={form}
            layout="vertical"
            requiredMark
            initialValues={{
              cursoIds: initialCourseIds,
              materiaId: initialSubjectId,
              docenteNombre: initialCell?.docenteNombre || '',
              docenteApellido: initialCell?.docenteApellido || '',
            }}
            onValuesChange={(changed, allValues) => {
              if ('materiaId' in changed) {
                const newSubjectId = allValues.materiaId;
                const validCourseIds = (allValues.cursoIds || []).filter((cId) => {
                  const cell = celdas.find(
                    (candidate) => (
                      candidate.cursoId === cId &&
                      (candidate.materiaId || '') === (requiresSubject ? (newSubjectId || '') : '')
                    ),
                  );
                  return cell && !isDeliveredStage(cell.etapa) && cell.etapa !== 'PENDIENTE_CONFIGURACION';
                });
                form.setFieldsValue({ cursoIds: validCourseIds });
                syncTeacherFromSelection(validCourseIds, newSubjectId);
              } else if ('cursoIds' in changed) {
                syncTeacherFromSelection(allValues.cursoIds || [], allValues.materiaId);
              }
            }}
            onFinish={handleCreateToken}
            onFinishFailed={(error) => focusFirstFormError(form, error)}
          >
            <Row gutter={[14, 0]}>
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

              <Col xs={24} sm={12} md={requiresSubject ? 7 : 10}>
                <Form.Item
                  label="Set de grados a incluir en el enlace"
                  name="cursoIds"
                  rules={[{ required: true, type: 'array', min: 1, message: 'Seleccione al menos un grado' }]}
                >
                  <Select
                    mode="multiple"
                    maxTagCount="responsive"
                    placeholder="Seleccionar uno o más grados"
                    options={cursos.map((c) => {
                      const cell = cellsForCurrentSubject.get(c.id);
                      const delivered = cell ? isDeliveredStage(cell.etapa) : false;
                      const unconfigured = !cell || cell.etapa === 'PENDIENTE_CONFIGURACION';
                      return {
                        value: c.id,
                        disabled: delivered || unconfigured,
                        label: delivered
                          ? `${c.nombre} (Ya entregado)`
                          : unconfigured
                            ? `${c.nombre} (Sin plantilla)`
                            : `${c.nombre} (${c.turno})`,
                      };
                    })}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={requiresSubject ? 3 : 4}>
                <Form.Item
                  label="Nombre(s) docente"
                  name="docenteNombre"
                  rules={[{ required: true, whitespace: true, message: 'Ingrese el nombre' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="Ej. María" />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={requiresSubject ? 3 : 4}>
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
                    {watchedCursoIds && watchedCursoIds.length > 1
                      ? `Generar enlace (${watchedCursoIds.length} grados)`
                      : 'Generar enlace'}
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
