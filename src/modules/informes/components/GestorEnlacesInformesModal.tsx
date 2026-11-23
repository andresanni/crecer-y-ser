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
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useModalSessionKey } from '../../../shared/hooks/useModalSessionKey';
import { FormModal } from '../../../shared/components/FormModal';
import { focusFirstFormError } from '../../../shared/utils/formValidation';
import ui from '../../../shared/styles/ui.module.css';
import { getGradeColorConfig } from '../../alumnos/utils/gradeColors';
import {
  compareCursosInforme,
  formatMateriaNombreUI,
  isInicialCursoInforme,
  TIPOS_INFORME_META,
  type CeldaEtapaInforme,
  type CursoInformeResumen,
  type MateriaEspecialInforme,
  type TipoInforme,
  type TokenAccesoInforme,
} from '../models/informe.model';
import { informesService } from '../services/informes.service';
import { GradeSetSelector } from './GradeSetSelector';
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
  cursoId?: string;
  cursoIds?: string[];
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

  const sortedCursos = useMemo(
    () => [...cursos].sort(compareCursosInforme),
    [cursos],
  );

  const initialSubjectId = requiresSubject
    ? activeMateriaId || materiasEspeciales[0]?.id || ''
    : undefined;
  const fallbackCourseId = activeCursoId || sortedCursos[0]?.id || '';

  const initialCourseIds = useMemo(() => {
    const isAvailable = (cId: string) => {
      const cell = celdas.find(
        (candidate) => (
          candidate.cursoId === cId &&
          (candidate.materiaId || '') === (requiresSubject ? (initialSubjectId || '') : '')
        ),
      );
      const hasActiveLink = Boolean(cell?.enlace);
      return Boolean(cell && !hasActiveLink && !isDeliveredStage(cell.etapa) && cell.etapa !== 'PENDIENTE_CONFIGURACION');
    };

    if (fallbackCourseId && isAvailable(fallbackCourseId)) {
      return [fallbackCourseId];
    }

    const availableForInitialSubject = sortedCursos
      .filter((c) => isAvailable(c.id))
      .map((c) => c.id);

    return availableForInitialSubject.slice(0, 1);
  }, [celdas, fallbackCourseId, initialSubjectId, requiresSubject, sortedCursos]);

  const initialSingleCourseId = initialCourseIds[0];
  const watchedMateriaId = Form.useWatch('materiaId', form) ?? initialSubjectId;
  const watchedCursoId = Form.useWatch('cursoId', form) ?? initialSingleCourseId;
  const watchedCursoIds = Form.useWatch('cursoIds', form) ?? initialCourseIds;
  const selectedCourseIds = useMemo(
    () => (requiresSubject ? (watchedCursoIds ?? []) : (watchedCursoId ? [watchedCursoId] : [])),
    [requiresSubject, watchedCursoId, watchedCursoIds],
  );

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

  const coursesForCurrentSubject = useMemo(
    () => sortedCursos.filter((curso) => cellsForCurrentSubject.has(curso.id)),
    [cellsForCurrentSubject, sortedCursos],
  );

  const hasInicialInCurrentSubject = useMemo(
    () => coursesForCurrentSubject.some((curso) => isInicialCursoInforme(curso)),
    [coursesForCurrentSubject],
  );

  const hasAnyUnavailableCourse = useMemo(() => {
    if (selectedCourseIds.length === 0) return false;
    return selectedCourseIds.some((cId) => {
      const cell = cellsForCurrentSubject.get(cId);
      return !cell || Boolean(cell.enlace) || isDeliveredStage(cell.etapa) || cell.etapa === 'PENDIENTE_CONFIGURACION';
    });
  }, [cellsForCurrentSubject, selectedCourseIds]);

  const isSubmitDisabled = selectedCourseIds.length === 0 || hasAnyUnavailableCourse;

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
        .sort(compareCursosInforme)
        .map((c) => ({ id: c.id, nombre: c.nombre, turno: c.turno }));

      const materia = cell.materiaId ? materiasById.get(cell.materiaId) : undefined;
      byId.set(cell.enlace.id, {
        ...cell.enlace,
        secreto: cachedSecrets[cell.enlace.id] || cell.enlace.secreto,
        cursosDetalle,
        materiaNombre: formatMateriaNombreUI(materia?.nombre) || null,
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
    const targetCourseIds = requiresSubject
      ? (values.cursoIds || [])
      : (values.cursoId ? [values.cursoId] : []);
    if (targetCourseIds.length === 0) return;

    try {
      setCreating(true);
      const issued = await informesService.createEnlace({
        cicloId,
        tipoInforme,
        cursoId: targetCourseIds[0],
        cursoIds: targetCourseIds,
        materiaId: requiresSubject ? values.materiaId : undefined,
        docenteNombre: values.docenteNombre.trim(),
        docenteApellido: values.docenteApellido.trim(),
      });
      setCachedSecrets((current) => ({
        ...current,
        [issued.enlace.id]: issued.secreto,
      }));
      form.setFieldsValue(
        requiresSubject
          ? { cursoIds: [], docenteNombre: '', docenteApellido: '' }
          : { cursoId: undefined, docenteNombre: '', docenteApellido: '' },
      );
      onChanged();
      const count = targetCourseIds.length;
      const hasSelectedInicial = targetCourseIds.some((id) => isInicialCursoInforme(cursosById.get(id)));
      showIssuedLink(
        issued.secreto,
        count > 1
          ? `Enlace generado para ${count} ${hasSelectedInicial ? 'cursos' : 'grados'} con éxito`
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

  const handleDeleteToken = async (tokenId: string) => {
    try {
      setBusyTokenId(tokenId);
      await informesService.deleteEnlace(tokenId);
      message.success('Enlace eliminado');
      onChanged();
    } catch (err) {
      console.error(err);
      message.error('No se pudo eliminar el enlace');
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
      title: requiresSubject ? 'Materia Especial y Set de Grados' : 'Grado',
      key: 'alcance',
      render: (_, record) => (
        <Space size={[6, 6]} wrap>
          {record.materiaNombre && (
            <Tag color="purple" className={styles.subjectTag}>
              <BookOutlined className={styles.tagIcon} />
              {record.materiaNombre}
            </Tag>
          )}
          {record.cursosDetalle.map((c) => {
            const visual = getGradeColorConfig(c.nombre);
            const isKindergarten = Boolean(visual.roomKey);
            return (
              <Tag
                key={c.id}
                color={isKindergarten ? visual.tagPreset : 'blue'}
                className={styles.courseTag}
              >
                {isKindergarten ? visual.label : c.nombre}
              </Tag>
            );
          })}
        </Space>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 100,
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
            title="¿Eliminar este enlace?"
            description={
              requiresSubject
                ? 'El acceso docente se deshabilitará para los grados incluidos, pero el borrador guardado quedará intacto.'
                : 'El acceso docente se deshabilitará para este grado, pero el borrador guardado quedará intacto.'
            }
            onConfirm={() => void handleDeleteToken(record.id)}
            okText="Eliminar enlace"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Eliminar enlace">
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={busyTokenId === record.id}
                aria-label={`Eliminar enlace de ${record.docenteApellido}, ${record.docenteNombre}`}
              />
            </Tooltip>
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
        <Card size="small" className={styles.createCard}>
          <Form<EnlaceInformeFormValues>
            form={form}
            layout="vertical"
            requiredMark
            initialValues={{
              ...(requiresSubject ? { cursoIds: initialCourseIds } : { cursoId: initialSingleCourseId }),
              materiaId: initialSubjectId,
              docenteNombre: initialCourseIds[0]
                ? cellsForCurrentSubject.get(initialCourseIds[0])?.docenteNombre || ''
                : '',
              docenteApellido: initialCourseIds[0]
                ? cellsForCurrentSubject.get(initialCourseIds[0])?.docenteApellido || ''
                : '',
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
                  const hasActiveLink = Boolean(cell?.enlace);
                  return Boolean(cell && !hasActiveLink && !isDeliveredStage(cell.etapa) && cell.etapa !== 'PENDIENTE_CONFIGURACION');
                });
                form.setFieldsValue({ cursoIds: validCourseIds });
                syncTeacherFromSelection(validCourseIds, newSubjectId);
              } else if ('cursoIds' in changed) {
                syncTeacherFromSelection(allValues.cursoIds || [], allValues.materiaId);
              } else if ('cursoId' in changed) {
                syncTeacherFromSelection(allValues.cursoId ? [allValues.cursoId] : [], undefined);
              }
            }}
            onFinish={handleCreateToken}
            onFinishFailed={(error) => focusFirstFormError(form, error)}
          >
            <Row gutter={[12, 0]}>
              {requiresSubject ? (
                <>
                  <Col xs={24} sm={24} md={8}>
                    <Form.Item
                      label="Materia especial"
                      name="materiaId"
                      rules={[{ required: true, message: 'Seleccione la materia especial' }]}
                    >
                      <Select
                        placeholder="Seleccionar materia"
                        options={materiasEspeciales.map((m) => ({
                          value: m.id,
                          label: formatMateriaNombreUI(m.nombre),
                        }))}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} sm={12} md={8}>
                    <Form.Item
                      label="Nombre(s) docente"
                      name="docenteNombre"
                      rules={[{ required: true, whitespace: true, message: 'Ingrese el nombre' }]}
                    >
                      <Input prefix={<UserOutlined />} placeholder="Ej. María" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} sm={12} md={8}>
                    <Form.Item
                      label="Apellido(s) docente"
                      name="docenteApellido"
                      rules={[{ required: true, whitespace: true, message: 'Ingrese el apellido' }]}
                    >
                      <Input placeholder="Ej. Rodríguez" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} lg={19}>
                    <Form.Item
                      label={
                        hasInicialInCurrentSubject
                          ? 'Set de salas y grados a incluir en el enlace'
                          : 'Set de grados a incluir en el enlace'
                      }
                      name="cursoIds"
                      rules={[
                        {
                          required: true,
                          type: 'array',
                          min: 1,
                          message: hasInicialInCurrentSubject
                            ? 'Seleccione al menos una sala o grado'
                            : 'Seleccione al menos un grado',
                        },
                      ]}
                    >
                      <GradeSetSelector
                        cursos={coursesForCurrentSubject}
                        cellsByCourseId={cellsForCurrentSubject}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} lg={5} className={styles.submitColumnAligned}>
                    <Form.Item className={ui.fullWidth}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        icon={<LinkOutlined />}
                        loading={creating}
                        disabled={isSubmitDisabled}
                        className={`btn-primary-gradient ${styles.submitButton}`}
                      >
                        {selectedCourseIds.length > 1
                          ? `Generar enlace (${selectedCourseIds.length})`
                          : 'Generar enlace'}
                      </Button>
                    </Form.Item>
                  </Col>
                </>
              ) : (
                <>
                  <Col xs={24} sm={12} md={6}>
                    <Form.Item
                      label="Grado"
                      name="cursoId"
                      rules={[{ required: true, message: 'Seleccione un grado' }]}
                    >
                      <Select
                        placeholder="Seleccionar grado"
                        options={sortedCursos.map((c) => {
                          const cell = cellsForCurrentSubject.get(c.id);
                          const hasActiveLink = Boolean(cell?.enlace);
                          const delivered = cell ? isDeliveredStage(cell.etapa) : false;
                          const unconfigured = !cell || cell.etapa === 'PENDIENTE_CONFIGURACION';

                          let label = `${c.nombre} (${c.turno})`;
                          if (delivered) {
                            label = `${c.nombre} (Ya entregado)`;
                          } else if (unconfigured) {
                            label = `${c.nombre} (Sin plantilla)`;
                          } else if (hasActiveLink) {
                            const teacher = [
                              cell?.docenteApellido || cell?.enlace?.docenteApellido,
                              cell?.docenteNombre || cell?.enlace?.docenteNombre,
                            ]
                              .filter(Boolean)
                              .join(', ');
                            label = teacher
                              ? `${c.nombre} (Con enlace activo - ${teacher})`
                              : `${c.nombre} (Con enlace activo)`;
                          }

                          return {
                            value: c.id,
                            disabled: delivered || unconfigured || hasActiveLink,
                            label,
                          };
                        })}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} sm={12} md={6}>
                    <Form.Item
                      label="Nombre(s) docente"
                      name="docenteNombre"
                      rules={[{ required: true, whitespace: true, message: 'Ingrese el nombre' }]}
                    >
                      <Input prefix={<UserOutlined />} placeholder="Ej. María" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} sm={12} md={6}>
                    <Form.Item
                      label="Apellido(s) docente"
                      name="docenteApellido"
                      rules={[{ required: true, whitespace: true, message: 'Ingrese el apellido' }]}
                    >
                      <Input placeholder="Ej. Rodríguez" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} sm={12} md={6} className={styles.submitColumn}>
                    <Form.Item className={ui.fullWidth}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        icon={<LinkOutlined />}
                        loading={creating}
                        disabled={isSubmitDisabled}
                        className={`btn-primary-gradient ${styles.submitButton}`}
                      >
                        Generar enlace
                      </Button>
                    </Form.Item>
                  </Col>
                </>
              )}
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
