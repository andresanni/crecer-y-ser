import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Row,
  Col,
  Typography,
  Empty,
  theme,
  Space,
  Button,
  Spin,
  Alert,
  Card,
  App,
  Modal,
  Tag,
} from 'antd';
import {
  CalendarOutlined,
  SettingOutlined,
  PrinterOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  RightOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { SectionLayout } from '../../../shared/components/SectionLayout';
import { useAppStore } from '../../../store/appStore';
import { inscripcionService } from '../../inscripciones/services/inscripcion.service';
import type { Curso } from '../../inscripciones/models/inscripcion.model';
import { NOMBRES_MESES } from '../models/asistencia.model';
import type { RegistroMensualCompleto } from '../models/estadisticasAsistencia.model';
import { registroAsistenciaCursoService, MesNoConfiguradoError } from '../services/registroAsistenciaCurso.service';
import { calendarioMesService } from '../services/calendarioMes.service';
import { AperturaMesModal } from './AperturaMesModal';
import { CargaAsistenciaMatrix } from './CargaAsistenciaMatrix';
import { HojaRegistroA4Printable } from './HojaRegistroA4Printable';

export const AsistenciasPage = () => {
  const { message, modal } = App.useApp();
  const { cicloActual } = useAppStore();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const { token } = theme.useToken();
  const rutaSolicitada = searchParams.toString();
  const [rutaActual, setRutaActual] = useState(rutaSolicitada);
  const parametrosActuales = new URLSearchParams(rutaActual);
  const mesParametro = Number(parametrosActuales.get('mes'));
  const mesSeleccionado = mesParametro >= 3 && mesParametro <= 12 && Number.isInteger(mesParametro) ? mesParametro : 0;
  const cursoSeleccionadoId = mesSeleccionado ? parametrosActuales.get('curso') || '' : '';
  const [cargandoNavegacion, setCargandoNavegacion] = useState(true);
  const [errorNavegacion, setErrorNavegacion] = useState<string | null>(null);
  const [mesesConfigurados, setMesesConfigurados] = useState<number[]>([]);
  const [registroCompleto, setRegistroCompleto] = useState<RegistroMensualCompleto | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [mesSinConfigurar, setMesSinConfigurar] = useState(false);
  const solicitudRegistro = useRef(0);
  const [modalAperturaOpen, setModalAperturaOpen] = useState<boolean>(false);
  const [modalImpresionOpen, setModalImpresionOpen] = useState<boolean>(false);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);

  useEffect(() => {
    if (rutaActual === rutaSolicitada) return;
    const timer = setTimeout(() => {
      if (!cambiosPendientes) {
        setRutaActual(rutaSolicitada);
        return;
      }
      modal.confirm({
        title: 'Hay cambios sin guardar',
        content: '¿Descartar los cambios y salir del registro?',
        okText: 'Descartar y salir',
        cancelText: 'Seguir editando',
        onOk: () => {
          setCambiosPendientes(false);
          setRutaActual(rutaSolicitada);
        },
        onCancel: () => setSearchParams(rutaActual, { replace: true }),
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [rutaActual, rutaSolicitada, cambiosPendientes, modal, setSearchParams]);

  const cargarMesesConfigurados = useCallback(async () => {
    if (!cicloActual) return;
    const records = await calendarioMesService.obtenerMesesPorCiclo(cicloActual.id);
    setMesesConfigurados(records.map((r) => r.mes).sort((a, b) => a - b));
  }, [cicloActual]);

  const cargarNavegacion = useCallback(async () => {
    if (!cicloActual) return;
    setCargandoNavegacion(true);
    setErrorNavegacion(null);
    try {
      const [todosLosCursos] = await Promise.all([inscripcionService.getCursos(), cargarMesesConfigurados()]);
      setCursos(todosLosCursos.filter(
        (c) => c.nivelNombre.toLowerCase().includes('primar') || /^[1-7]°/.test(c.nombre)
      ).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }) || a.turno.localeCompare(b.turno, 'es')));
    } catch {
      setErrorNavegacion('No se pudieron cargar los meses y cursos.');
    } finally {
      setCargandoNavegacion(false);
    }
  }, [cicloActual, cargarMesesConfigurados]);

  useEffect(() => {
    const timer = setTimeout(() => void cargarNavegacion(), 0);
    return () => clearTimeout(timer);
  }, [cargarNavegacion]);

  useEffect(() => {
    if (!cambiosPendientes) return;
    const advertirSalida = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', advertirSalida);
    return () => window.removeEventListener('beforeunload', advertirSalida);
  }, [cambiosPendientes]);

  const cargarRegistro = useCallback(async () => {
    const solicitud = ++solicitudRegistro.current;
    if (!cursoSeleccionadoId || !cicloActual) {
      setLoading(false);
      setRegistroCompleto(null);
      setErrorCarga(null);
      return false;
    }

    setLoading(true);
    setErrorCarga(null);
    setMesSinConfigurar(false);
    setRegistroCompleto(null);
    try {
      const data = await registroAsistenciaCursoService.obtenerHojaAsistenciaCompleta(
        cursoSeleccionadoId,
        cicloActual.id,
        mesSeleccionado
      );
      if (solicitud !== solicitudRegistro.current) return false;
      setRegistroCompleto(data);
      return true;
    } catch (err: unknown) {
      if (solicitud !== solicitudRegistro.current) return false;
      setRegistroCompleto(null);
      setMesSinConfigurar(err instanceof MesNoConfiguradoError);
      const msg = err instanceof Error ? err.message : 'Error desconocido al cargar asistencias.';
      setErrorCarga(msg);
      return false;
    } finally {
      if (solicitud === solicitudRegistro.current) setLoading(false);
    }
  }, [cursoSeleccionadoId, cicloActual, mesSeleccionado]);

  const abrirImpresion = async () => {
    if (cambiosPendientes) return;
    if (await cargarRegistro()) setModalImpresionOpen(true);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void cargarRegistro();
    }, 0);
    return () => {
      clearTimeout(timer);
      solicitudRegistro.current += 1;
    };
  }, [cursoSeleccionadoId, cicloActual, mesSeleccionado, cargarRegistro]);

  const handleMesGuardado = (mes: number) => {
    setSearchParams(cursoSeleccionadoId && mes === mesSeleccionado ? { mes: String(mes), curso: cursoSeleccionadoId } : { mes: String(mes) });
    void cargarMesesConfigurados().catch(() => message.error('No se pudo actualizar la lista de meses.'));
    if (mes === mesSeleccionado) void cargarRegistro();
  };

  const mesesBase = [
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
  ];

  const mesAbierto = mesesConfigurados.includes(mesSeleccionado);
  const nombreMes = mesesBase.find((m) => m.value === mesSeleccionado)?.label;
  const cursoSeleccionado = cursos.find((c) => c.id === cursoSeleccionadoId);

  return (
    <SectionLayout
      title={cursoSeleccionadoId ? `${nombreMes} · ${cursoSeleccionado?.nombre || 'Registro'}` : mesSeleccionado ? `${nombreMes} ${cicloActual?.ano || ''}` : 'Registros de Asistencia'}
      icon={<CalendarOutlined />}
      actions={
        <Space wrap>
          {mesSeleccionado > 0 && <Button aria-label={cursoSeleccionadoId ? 'Cursos' : 'Meses'} icon={<ArrowLeftOutlined />} disabled={cambiosPendientes || loading}
            onClick={() => setSearchParams(cursoSeleccionadoId ? { mes: String(mesSeleccionado) } : {})}>
            {cursoSeleccionadoId ? 'Cursos' : 'Meses'}</Button>}
          {cursoSeleccionadoId && <>
            <Button icon={<ReloadOutlined />} disabled={cambiosPendientes || loading}
              onClick={() => void cargarRegistro()}>Actualizar</Button>
            <Button icon={<PrinterOutlined />} disabled={!registroCompleto || cambiosPendientes || loading}
              onClick={() => void abrirImpresion()}>Imprimir A4</Button>
          </>}
          {mesSeleccionado > 0 && <Button aria-label={mesAbierto ? 'Calendario' : 'Abrir mes'} type={mesAbierto ? 'default' : 'primary'} icon={<SettingOutlined />}
            disabled={cambiosPendientes || loading || cargandoNavegacion || !!errorNavegacion}
            onClick={() => setModalAperturaOpen(true)}>{mesAbierto ? 'Calendario' : 'Abrir mes'}</Button>}
        </Space>
      }
    >
      {!cicloActual && <Empty description="Seleccioná un ciclo lectivo" />}
      {cicloActual && cargandoNavegacion && <Spin style={{ display: 'block', margin: 40 }} />}
      {errorNavegacion && <Alert type="error" showIcon title={errorNavegacion}
        action={<Button onClick={() => void cargarNavegacion()}>Reintentar</Button>} />}
      {cicloActual && !cargandoNavegacion && !errorNavegacion && !mesSeleccionado && <>
        <Typography.Title level={5} style={{ marginTop: 0 }}>Seleccionar mes · {cicloActual.ano}</Typography.Title>
        <Row gutter={[16, 16]}>
          {mesesBase.map(({ value, label }) => {
            const abierto = mesesConfigurados.includes(value);
            return <Col key={value} xs={24} sm={12} lg={8} xl={6}>
              <Card size="small" style={{ height: '100%', borderColor: abierto ? token.colorSuccessBorder : token.colorBorderSecondary,
                background: abierto ? token.colorSuccessBg : token.colorBgContainer }}>
                <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                  <Button aria-label={label} type="link" style={{ padding: 0, fontSize: token.fontSizeLG, fontWeight: 600 }}
                    onClick={() => setSearchParams({ mes: String(value) })}>{label}<RightOutlined /></Button>
                  <Tag color={abierto ? 'success' : 'default'} icon={abierto ? <CheckCircleOutlined /> : undefined}>
                    {abierto ? 'Abierto' : 'Sin abrir'}</Tag>
                </Space>
              </Card>
            </Col>;
          })}
        </Row>
      </>}
      {cicloActual && !cargandoNavegacion && !errorNavegacion && mesSeleccionado > 0 && !cursoSeleccionadoId && (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Tag color={mesAbierto ? 'success' : 'default'}>{mesAbierto ? 'Mes abierto' : 'Sin abrir'}</Tag>
          {!mesAbierto && <Alert type="info" showIcon title="Abrí el mes para cargar los registros." />}
          <Card size="small" style={{ width: '100%', maxWidth: 560 }}>
            {cursos.length === 0 ? <Empty description="No hay cursos de primaria" /> : cursos.map((curso, index) => (
              <div key={curso.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                padding: '12px 4px', borderBottom: index < cursos.length - 1 ? `1px solid ${token.colorBorderSecondary}` : undefined }}>
                <Space orientation="vertical" size={0}>
                  <Typography.Text strong>{curso.nombre}</Typography.Text>
                  <Typography.Text type="secondary">{curso.turno}</Typography.Text>
                </Space>
                <Button disabled={!mesAbierto} icon={<RightOutlined />} iconPlacement="end"
                  onClick={() => setSearchParams({ mes: String(mesSeleccionado), curso: curso.id })}>Ver registro</Button>
              </div>
            ))}
          </Card>
        </Space>
      )}

      {cursoSeleccionadoId && loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
        </div>
      )}

      {cursoSeleccionadoId && !loading && errorCarga && !mesSinConfigurar && (
        <Alert type="error" showIcon title="No se pudo cargar el registro" description={errorCarga}
          action={<Button onClick={() => void cargarRegistro()}>Reintentar</Button>} />
      )}

      {cursoSeleccionadoId && !loading && errorCarga && mesSinConfigurar && (
        <Alert type="warning" showIcon title="Abrí el mes desde Calendario para cargar este registro." />
      )}

      {cursoSeleccionadoId && !loading && !errorCarga && registroCompleto && (
        <CargaAsistenciaMatrix
          key={`${registroCompleto.curso.id}_${registroCompleto.mesCalendario.id}`}
          registro={registroCompleto}
          onRecargar={() => void cargarRegistro()}
          onAbrirAperturaMes={() => setModalAperturaOpen(true)}
          onImprimirA4={() => void abrirImpresion()}
          onCambiosPendientes={setCambiosPendientes}
        />
      )}

      {cicloActual && (
        <AperturaMesModal
          open={modalAperturaOpen}
          onClose={() => setModalAperturaOpen(false)}
          cicloId={cicloActual.id}
          ano={cicloActual.ano}
          mes={mesSeleccionado}
          onMesGuardado={handleMesGuardado}
        />
      )}

      <Modal
        open={modalImpresionOpen}
        onCancel={() => setModalImpresionOpen(false)}
        width="95vw"
        style={{ top: 16, maxWidth: 1300 }}
        styles={{
          body: {
            padding: 0,
            background: '#525659',
            maxHeight: 'calc(88vh - 110px)',
            overflow: 'auto',
          },
        }}
        title={
          <Space>
            <PrinterOutlined />
            <span>Registro Oficial Mensual A4</span>
            {registroCompleto && (
              <Tag color="blue">
                {registroCompleto.curso.nombre} - {NOMBRES_MESES[registroCompleto.mesCalendario.mes]} {registroCompleto.mesCalendario.ano}
              </Tag>
            )}
          </Space>
        }
        footer={[
          <Button key="cerrar" onClick={() => setModalImpresionOpen(false)}>
            Cerrar
          </Button>,
          <Button
            key="imprimir"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => window.print()}
          >
            Imprimir / Guardar PDF Oficial
          </Button>,
        ]}
        destroyOnHidden
      >
        {registroCompleto && <HojaRegistroA4Printable registro={registroCompleto} />}
      </Modal>
    </SectionLayout>
  );
};
