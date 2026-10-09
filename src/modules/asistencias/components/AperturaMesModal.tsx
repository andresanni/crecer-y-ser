import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Modal,
  Form,
  Select,
  InputNumber,
  Input,
  Button,
  Table,
  Space,
  Tag,
  Popconfirm,
  Card,
  Row,
  Col,
  Spin,
  App,
  Alert,
  Statistic,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { ClientResponseError } from 'pocketbase';
import type { VersionRegistroAsistencia } from '../models/asistenciaSnapshot.model';
import {
  NOMBRES_MESES,
  type MesCalendarioRecord,
  type EventoCalendario,
  type TipoEventoCalendario,
  eventoCalendarioAdapter,
} from '../models/asistencia.model';
import { calendarioMesService } from '../services/calendarioMes.service';
import { calcularDiasHabilesYAcumulado } from '../utils/calendarioCalculos';

interface AperturaMesModalProps {
  open: boolean;
  onClose: () => void;
  cicloId: string;
  ano: number;
  mes: number;
  onMesGuardado?: (mes: number) => void;
}

interface EventoLocal {
  id?: string;
  dia: number;
  tipo: TipoEventoCalendario;
  textoCeldaVertical: string;
  descripcionObservaciones: string;
}

export const AperturaMesModal = ({
  open,
  onClose,
  cicloId,
  ano,
  mes: mesSeleccionado,
  onMesGuardado,
}: AperturaMesModalProps) => {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [versionCalendario, setVersionCalendario] = useState<VersionRegistroAsistencia | null>(null);
  const [guardadoBloqueado, setGuardadoBloqueado] = useState<string | null>(null);
  const solicitudMes = useRef(0);
  const mesesConfigurados = useRef<MesCalendarioRecord[]>([]);
  const [resumenDias, setResumenDias] = useState<ReturnType<typeof calcularDiasHabilesYAcumulado> | null>(null);
  const [eventos, setEventos] = useState<EventoLocal[]>([]);

  const [nuevoDia, setNuevoDia] = useState<number>(1);
  const [nuevoDiaHasta, setNuevoDiaHasta] = useState<number | null>(null);
  const [nuevoTipo, setNuevoTipo] = useState<TipoEventoCalendario>('FERIADO');
  const [nuevoTextoVertical, setNuevoTextoVertical] = useState<string>('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState<string>('');

  const calcularHabilesYAcumulado = useCallback(
    (mesNum: number, eventosActuales: EventoLocal[]) => calcularDiasHabilesYAcumulado(
      ano, mesNum, eventosActuales.map((evento) => evento.dia), mesesConfigurados.current,
    ),
    [ano],
  );

  const cargarDatosMes = useCallback(
    async (mesNum: number) => {
      if (!cicloId) return;
      const solicitud = ++solicitudMes.current;
      setLoading(true);
      setVersionCalendario(null);
      setResumenDias(null);
      try {
        const snapshot = await calendarioMesService.obtenerConfiguracion(cicloId, mesNum);
        if (solicitud !== solicitudMes.current) return;
        setVersionCalendario({ revision: snapshot.revision, versionFuentes: snapshot.versionFuentes });
        setGuardadoBloqueado(null);
        mesesConfigurados.current = snapshot.meses;
        let eventosLocales: EventoLocal[] = [];

        if (snapshot.mes) {
          const eventosData = snapshot.eventos.map(eventoCalendarioAdapter);
          eventosLocales = eventosData.map((e: EventoCalendario) => ({
            id: e.id,
            dia: e.dia,
            tipo: e.tipo,
            textoCeldaVertical: e.textoCeldaVertical,
            descripcionObservaciones: e.descripcionObservaciones,
          }));
        }
        setEventos(eventosLocales);

        setResumenDias(calcularHabilesYAcumulado(mesNum, eventosLocales));
      } catch {
        if (solicitud !== solicitudMes.current) return;
        setVersionCalendario(null);
        message.error('Error al cargar la información del mes.');
      } finally {
        if (solicitud === solicitudMes.current) setLoading(false);
      }
    },
    [cicloId, message, calcularHabilesYAcumulado]
  );

  useEffect(() => {
    if (!open || !cicloId) return;
    const timer = setTimeout(() => void cargarDatosMes(mesSeleccionado), 0);
    return () => {
      clearTimeout(timer);
      solicitudMes.current += 1;
    };
  }, [open, cicloId, mesSeleccionado, cargarDatosMes]);

  const handleAgregarEvento = async () => {
    const ultimoDia = dayjs(`${ano}-${String(mesSeleccionado).padStart(2, '0')}-01`).daysInMonth();
    if (!Number.isInteger(nuevoDia) || nuevoDia < 1 || nuevoDia > ultimoDia) {
      message.warning(`El día debe estar entre 1 y ${ultimoDia}.`);
      return;
    }
    const hasta = nuevoTipo === 'SIN_CLASES' ? nuevoDiaHasta ?? nuevoDia : nuevoDia;
    if (!Number.isInteger(hasta) || hasta < nuevoDia || hasta > ultimoDia) {
      message.warning(`El último día debe estar entre ${nuevoDia} y ${ultimoDia}.`);
      return;
    }
    const texto = nuevoTipo === 'SIN_CLASES' ? '' : nuevoTextoVertical.trim() || nuevoTipo;
    const desc = nuevoTipo === 'SIN_CLASES' ? '' : nuevaDescripcion.trim() || `${nuevoDia}. ${texto}`;
    const yaExiste = eventos.some((e) => e.dia >= nuevoDia && e.dia <= hasta);
    if (yaExiste) {
      message.warning('Ya existe una fecha configurada dentro del rango seleccionado.');
      return;
    }

    const nuevos: EventoLocal[] = Array.from({ length: hasta - nuevoDia + 1 }, (_, index) => ({
      dia: nuevoDia + index,
      tipo: nuevoTipo,
      textoCeldaVertical: texto,
      descripcionObservaciones: desc,
    }));

    const nuevosEventos = [...eventos, ...nuevos].sort((a, b) => a.dia - b.dia);
    setEventos(nuevosEventos);
    setNuevoTextoVertical('');
    setNuevaDescripcion('');
    setNuevoDiaHasta(null);

    const resumen = calcularHabilesYAcumulado(mesSeleccionado, nuevosEventos);
    setResumenDias(resumen);
    message.success(`Evento del día ${nuevoDia} agregado. Días hábiles resultantes: ${resumen.habiles}.`);
  };

  const handleEliminarEvento = (diaAEliminar: number) => {
    const filtrados = eventos.filter((e) => e.dia !== diaAEliminar);
    setEventos(filtrados);
    const resumen = calcularHabilesYAcumulado(mesSeleccionado, filtrados);
    setResumenDias(resumen);
    message.info(`Evento eliminado. Días hábiles resultantes: ${resumen.habiles}.`);
  };

  const handleGuardar = async () => {
    if (saving || loading || guardadoBloqueado || !versionCalendario) return;
    try {
      await form.validateFields();
      setSaving(true);

      const listaFinal = [...eventos];
      if (nuevoTipo !== 'SIN_CLASES' && (nuevoTextoVertical.trim() || nuevaDescripcion.trim())) {
        const ultimoDia = dayjs(`${ano}-${String(mesSeleccionado).padStart(2, '0')}-01`).daysInMonth();
        if (!Number.isInteger(nuevoDia) || nuevoDia < 1 || nuevoDia > ultimoDia || listaFinal.some(e => e.dia === nuevoDia)) {
          message.warning('Revisá el día del evento pendiente: debe existir en el mes y no estar repetido.');
          return;
        }
        if (nuevoDia >= 1 && nuevoDia <= ultimoDia) {
          const texto = nuevoTextoVertical.trim() || nuevoTipo;
          const desc = nuevaDescripcion.trim() || `${nuevoDia}. ${texto}`;
          listaFinal.push({
            dia: nuevoDia,
            tipo: nuevoTipo,
            textoCeldaVertical: texto,
            descripcionObservaciones: desc,
          });
          listaFinal.sort((a, b) => a.dia - b.dia);
        }
      }

      if (!versionCalendario) throw new Error('Esperá a que se cargue la configuración del mes.');
      await calendarioMesService.guardarConfiguracion(cicloId, mesSeleccionado, versionCalendario, listaFinal);
      message.success(`Mes de ${NOMBRES_MESES[mesSeleccionado]} configurado exitosamente.`);
      onMesGuardado?.(mesSeleccionado);
      onClose();
    } catch (error) {
      if (error instanceof ClientResponseError && error.status !== 400) {
        setGuardadoBloqueado(error.status === 409
          ? 'El calendario cambió en otra sesión. Conservamos tu configuración local; cargá la versión actual antes de volver a editar.'
          : 'No se pudo confirmar el guardado. Cargá la versión guardada para verificar el resultado antes de reintentar.');
      } else message.error(error instanceof Error ? error.message : 'Revisá la configuración del mes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Apertura de Registros - Mes de ${NOMBRES_MESES[mesSeleccionado]} ${ano}`}
      open={open}
      onCancel={onClose}
      cancelButtonProps={{ disabled: saving }}
      closable={!saving}
      mask={{ closable: !saving }}
      keyboard={!saving}
      onOk={handleGuardar}
      confirmLoading={saving}
      okButtonProps={{ disabled: loading || !versionCalendario || Boolean(guardadoBloqueado) }}
      okText="Guardar Configuración"
      cancelText="Cancelar"
      width={780}
      destroyOnHidden
    >
      <Spin spinning={loading}>
        {guardadoBloqueado && <Alert type="warning" showIcon title="Es necesario volver a cargar el calendario" description={guardadoBloqueado}
          action={<Button onClick={() => modal.confirm({ title: '¿Cargar la configuración guardada?',
            content: 'Se descartarán los eventos locales y se consultará el calendario actual.', okText: 'Cargar', cancelText: 'Conservar cambios',
            onOk: () => cargarDatosMes(mesSeleccionado),
          })}>Cargar versión guardada</Button>} />}
        <Form form={form} layout="vertical" disabled={saving || loading || Boolean(guardadoBloqueado)}>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} md={12}>
              <Statistic title="Días hábiles del mes" value={resumenDias?.habiles ?? '—'} />
              <Typography.Text type="secondary">Lunes a viernes, excluyendo días sin clase.</Typography.Text>
            </Col>
            <Col xs={24} md={12}>
              <Statistic title={
                <Space wrap size={6}>
                  <span>Días hábiles acumulados</span>
                  {!!resumenDias?.mesesPendientes.length && <Tag color="gold">Provisorio</Tag>}
                </Space>
              } value={resumenDias?.acumulado ?? '—'} />
              <Typography.Text type="secondary">Desde febrero hasta este mes inclusive.</Typography.Text>
              {!!resumenDias?.mesesPendientes.length && (
                <div><Typography.Text type="warning">
                  Falta configurar: {resumenDias.mesesPendientes.map((mes) => NOMBRES_MESES[mes].toLowerCase()).join(', ')}.
                </Typography.Text></div>
              )}
            </Col>
          </Row>

          <Card
            size="small"
            title="Fechas sin clases del mes"
            style={{ marginTop: 12 }}
          >
            <Space orientation="vertical" style={{ width: '100%' }} size="middle">
              <Row gutter={[8, 8]} align="middle">
                <Col xs={6} sm={3}>
                  <InputNumber
                    min={1}
                    max={dayjs(`${ano}-${String(mesSeleccionado).padStart(2, '0')}-01`).daysInMonth()}
                    value={nuevoDia}
                    onChange={(val) => setNuevoDia(val || 1)}
                    placeholder={nuevoTipo === 'SIN_CLASES' ? 'Desde' : 'Día'}
                    aria-label={nuevoTipo === 'SIN_CLASES' ? 'Desde el día' : 'Día'}
                    style={{ width: '100%' }}
                  />
                </Col>
                {nuevoTipo === 'SIN_CLASES' && <Col xs={6} sm={3}>
                  <InputNumber min={nuevoDia} max={dayjs(`${ano}-${String(mesSeleccionado).padStart(2, '0')}-01`).daysInMonth()}
                    value={nuevoDiaHasta} onChange={setNuevoDiaHasta} placeholder="Hasta" aria-label="Hasta el día" style={{ width: '100%' }} />
                </Col>}
                <Col xs={10} sm={5}>
                  <Select
                    value={nuevoTipo}
                    onChange={(value) => { setNuevoTipo(value); setNuevoDiaHasta(null); }}
                    style={{ width: '100%' }}
                    options={[
                      { value: 'FERIADO', label: 'Feriado' },
                      { value: 'JORNADA_EMI', label: 'Jornada EMI' },
                      { value: 'RECESO', label: 'Receso' },
                      { value: 'ASUETO', label: 'Asueto' },
                      { value: 'SIN_CLASES', label: 'Sin clases' },
                    ]}
                  />
                </Col>
                {nuevoTipo !== 'SIN_CLASES' && <Col xs={8} sm={6}>
                  <Input
                    value={nuevoTextoVertical}
                    onChange={(e) => setNuevoTextoVertical(e.target.value)}
                    onPressEnter={handleAgregarEvento}
                    placeholder="Texto celda (ej. DÍA DEL MAESTRO)"
                  />
                </Col>}
                {nuevoTipo !== 'SIN_CLASES' && <Col xs={18} sm={6}>
                  <Input
                    value={nuevaDescripcion}
                    onChange={(e) => setNuevaDescripcion(e.target.value)}
                    onPressEnter={handleAgregarEvento}
                    placeholder="Descripción al pie (opcional)"
                  />
                </Col>}
                <Col xs={6} sm={4}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAgregarEvento}
                    block
                  >
                    Agregar
                  </Button>
                </Col>
              </Row>
              {nuevoTipo === 'SIN_CLASES' && <Typography.Text type="secondary">
                Agregá un día o un rango. Se aplica a todos los cursos del ciclo, queda en blanco en el registro y no cuenta como asistencia ni día hábil.
              </Typography.Text>}

              <Table
                size="small"
                pagination={false}
                dataSource={eventos}
                rowKey="dia"
                locale={{ emptyText: 'No hay fechas especiales registradas para este mes.' }}
                columns={[
                  {
                    title: 'Día',
                    dataIndex: 'dia',
                    width: 60,
                  },
                  {
                    title: 'Tipo',
                    dataIndex: 'tipo',
                    width: 120,
                    render: (tipo: TipoEventoCalendario) => {
                      const color =
                        tipo === 'FERIADO' ? 'red' : tipo === 'JORNADA_EMI' ? 'purple' : 'orange';
                      return <Tag color={tipo === 'SIN_CLASES' ? undefined : color}>{tipo === 'SIN_CLASES' ? 'Sin clases' : tipo}</Tag>;
                    },
                  },
                  {
                    title: 'Texto Vertical',
                    dataIndex: 'textoCeldaVertical',
                    ellipsis: true,
                  },
                  {
                    title: 'Descripción al pie',
                    dataIndex: 'descripcionObservaciones',
                    ellipsis: true,
                  },
                  {
                    title: '',
                    width: 50,
                    render: (_: unknown, record: EventoLocal) => (
                      <Popconfirm
                        title="¿Eliminar evento?"
                        onConfirm={() => handleEliminarEvento(record.dia)}
                        okText="Sí"
                        cancelText="No"
                      >
                        <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                      </Popconfirm>
                    ),
                  },
                ]}
              />
            </Space>
          </Card>
        </Form>
      </Spin>
    </Modal>
  );
};
