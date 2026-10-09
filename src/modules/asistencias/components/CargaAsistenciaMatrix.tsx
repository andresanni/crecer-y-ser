import React, { useState, useRef, useEffect } from 'react';
import {
  Button,
  Space,
  Tag,
  Typography,
  App,
  Popover,
  Card,
  Row,
  Col,
  Input,
  Statistic,
  Badge,
  Alert,
} from 'antd';
import {
  SaveOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type {
  RegistroMensualCompleto,
  ResumenAsistenciaAlumno,
} from '../models/estadisticasAsistencia.model';
import type { TipoEstadoAsistencia } from '../models/asistencia.model';
import { ClientResponseError } from 'pocketbase';
import { registroAsistenciaCursoService } from '../services/registroAsistenciaCurso.service';
import styles from './CargaAsistenciaMatrix.module.css';

const { Text } = Typography;
const { TextArea } = Input;

interface CargaAsistenciaMatrixProps {
  registro: RegistroMensualCompleto;
  onRecargar: () => void;
  onAbrirAperturaMes: () => void;
  onImprimirA4?: () => void;
  onCambiosPendientes?: (pendientes: boolean) => void;
}

const OPCIONES_ESTADO: Array<{ estado: TipoEstadoAsistencia; etiqueta: string; color: string }> = [
  { estado: 'P', etiqueta: 'Presente (P)', color: 'green' },
  { estado: 'A', etiqueta: 'Ausente (A)', color: 'red' },
  { estado: 'J', etiqueta: 'Justificado (J)', color: 'blue' },
  { estado: 'E', etiqueta: 'Enfermedad (E)', color: 'gold' },
  { estado: 'IT', etiqueta: 'Llegada Tarde (IT)', color: 'purple' },
  { estado: 'RA', etiqueta: 'Retiro Anticipado (RA)', color: 'cyan' },
];

export const CargaAsistenciaMatrix = ({
  registro,
  onRecargar,
  onAbrirAperturaMes,
  onImprimirA4,
  onCambiosPendientes,
}: CargaAsistenciaMatrixProps) => {
  const { message, modal } = App.useApp();
  const [marcasLocales, setMarcasLocales] = useState<Map<string, TipoEstadoAsistencia>>(new Map());
  const [celdasModificadas, setCeldasModificadas] = useState<Set<string>>(new Set());
  const [observacionesCurso, setObservacionesCurso] = useState<string>(
    registro.observacionesAdicionales || ''
  );
  const [celdaAbierta, setCeldaAbierta] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [guardadoBloqueado, setGuardadoBloqueado] = useState<string | null>(null);
  const cellRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());
  const hayCambiosPendientes = celdasModificadas.size > 0 || observacionesCurso !== (registro.observacionesAdicionales || '');

  useEffect(() => {
    onCambiosPendientes?.(hayCambiosPendientes || saving || Boolean(guardadoBloqueado));
  }, [hayCambiosPendientes, saving, guardadoBloqueado, onCambiosPendientes]);

  const { mesCalendario, curso, eventos, alumnos, inscripcion, edades, nacionalidad } = registro;
  const ano = mesCalendario.ano;
  const mes = mesCalendario.mes;
  const mesPad = String(mes).padStart(2, '0');
  const primerDiaMes = `${ano}-${mesPad}-01`;
  const diasEnElMes = dayjs(primerDiaMes).daysInMonth();

  const eventosPorDia = new Map<number, (typeof eventos)[0]>();
  for (const ev of eventos) {
    eventosPorDia.set(ev.dia, ev);
  }

  const obtenerMarcaActual = (alumno: ResumenAsistenciaAlumno, dia: number): string => {
    const key = `${alumno.inscripcionId}_${dia}`;
    if (marcasLocales.has(key)) {
      return marcasLocales.get(key)!;
    }
    return alumno.marcasPorDia[dia] || '';
  };

  const handleCambiarMarca = (
    alumno: ResumenAsistenciaAlumno,
    dia: number,
    nuevoEstado: TipoEstadoAsistencia
  ) => {
    setCeldaAbierta(null);
    const original = alumno.marcasPorDia[dia];
    if (saving || guardadoBloqueado || original === '---') return;

    const key = `${alumno.inscripcionId}_${dia}`;
    const nuevasMarcas = new Map(marcasLocales);
    const nuevasModificadas = new Set(celdasModificadas);

    if (nuevoEstado === original) {
      nuevasMarcas.delete(key);
      nuevasModificadas.delete(key);
    } else {
      nuevasMarcas.set(key, nuevoEstado);
      nuevasModificadas.add(key);
    }

    setMarcasLocales(nuevasMarcas);
    setCeldasModificadas(nuevasModificadas);
  };

  const enfocarCelda = (alumnoIndex: number, dia: number) => {
    const targetKey = `${alumnoIndex}_${dia}`;
    const el = cellRefs.current.get(targetKey);
    if (el) {
      el.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    alumno: ResumenAsistenciaAlumno,
    alumnoIndex: number,
    dia: number
  ) => {
    const key = e.key.toLowerCase();

    if (key === 'p') {
      e.preventDefault();
      handleCambiarMarca(alumno, dia, 'P');
    } else if (key === 'a') {
      e.preventDefault();
      handleCambiarMarca(alumno, dia, 'A');
    } else if (key === 'j') {
      e.preventDefault();
      handleCambiarMarca(alumno, dia, 'J');
    } else if (key === 'e') {
      e.preventDefault();
      handleCambiarMarca(alumno, dia, 'E');
    } else if (key === 't') {
      e.preventDefault();
      handleCambiarMarca(alumno, dia, 'IT');
    } else if (key === 'r') {
      e.preventDefault();
      handleCambiarMarca(alumno, dia, 'RA');
    } else if (key === 'backspace' || key === 'delete') {
      e.preventDefault();
      handleCambiarMarca(alumno, dia, 'P');
    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      if (alumnoIndex < alumnos.length - 1) {
        enfocarCelda(alumnoIndex + 1, dia);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (alumnoIndex > 0) {
        enfocarCelda(alumnoIndex - 1, dia);
      }
    } else if (e.key === 'ArrowRight' || e.key === 'Tab') {
      e.preventDefault();
      if (dia < diasEnElMes) {
        enfocarCelda(alumnoIndex, dia + 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (dia > 1) {
        enfocarCelda(alumnoIndex, dia - 1);
      }
    }
  };

  const handleGuardarCambios = async () => {
    if (saving || guardadoBloqueado) return;
    setSaving(true);
    try {
      const cambiosNovedades: Array<{
        inscripcionId: string;
        fecha: string;
        estado: TipoEstadoAsistencia | null;
      }> = [];

      for (const key of celdasModificadas) {
        const [inscripcionId, diaStr] = key.split('_');
        const diaNum = Number(diaStr);
        const diaPad = String(diaNum).padStart(2, '0');
        const fechaIso = `${ano}-${mesPad}-${diaPad}`;
        const nuevoEstado = marcasLocales.get(key) || 'P';

        cambiosNovedades.push({
          inscripcionId,
          fecha: fechaIso,
          estado: nuevoEstado === 'P' ? null : nuevoEstado,
        });
      }

      await registroAsistenciaCursoService.guardarCambios(registro, cambiosNovedades, observacionesCurso);

      message.success('Asistencias y observaciones guardadas exitosamente.');
      setCeldasModificadas(new Set());
      setMarcasLocales(new Map());
      onCambiosPendientes?.(false);
      onRecargar();
    } catch (error) {
      if (error instanceof ClientResponseError && error.status === 400) {
        message.error(error.response.message || 'Revisá los datos de asistencia. No se guardaron cambios.');
      } else {
        setGuardadoBloqueado(error instanceof ClientResponseError && error.status === 409
          ? 'Otra sesión cambió el registro, calendario o nómina. Tus cambios locales se conservan; cargá la versión actual antes de volver a editar.'
          : 'No se pudo confirmar el guardado. Tus cambios locales se conservan; cargá la versión guardada para verificar el resultado.');
      }
    } finally {
      setSaving(false);
    }
  };

  const dias = Array.from({ length: diasEnElMes }, (_, i) => i + 1);

  const getCellClass = (marca: string, esModificada: boolean) => {
    let base = styles.cell;
    if (marca === 'P') base += ` ${styles.cellP}`;
    else if (marca === 'A') base += ` ${styles.cellA}`;
    else if (marca === 'J') base += ` ${styles.cellJ}`;
    else if (marca === 'E') base += ` ${styles.cellE}`;
    else if (marca === 'IT') base += ` ${styles.cellIT}`;
    else if (marca === 'RA') base += ` ${styles.cellRA}`;
    else if (marca === '---') base += ` ${styles.cellDash}`;

    if (esModificada) base += ` ${styles.cellDirty}`;
    return base;
  };

  const diasHabilesSet = new Set<number>();
  for (const d of dias) {
    const fechaObj = dayjs(`${ano}-${mesPad}-${String(d).padStart(2, '0')}`);
    const dow = fechaObj.day();
    const esFinde = dow === 0 || dow === 6;
    const evento = eventosPorDia.get(d);
    if (!esFinde && !evento) {
      diasHabilesSet.add(d);
    }
  }

  const calcularPresentesDia = (dia: number): number => {
    if (!diasHabilesSet.has(dia)) return 0;
    let count = 0;
    for (const alu of alumnos) {
      const marca = obtenerMarcaActual(alu, dia);
      if (marca === 'P' || marca === 'IT' || marca === 'RA') {
        count += 1;
      }
    }
    return count;
  };

  const calcularAsistenciasAlumno = (alumno: ResumenAsistenciaAlumno) => {
    let asistencias = 0;
    let inasistencias = 0;
    let tardanzas = 0;

    for (const d of dias) {
      if (!diasHabilesSet.has(d)) continue;
      const marca = obtenerMarcaActual(alumno, d);
      if (marca === 'P' || marca === 'IT' || marca === 'RA') {
        asistencias += 1;
      } else if (marca === 'A' || marca === 'J' || marca === 'E') {
        inasistencias += 1;
      }
      if (marca === 'IT') {
        tardanzas += 1;
      }
    }
    return { asistencias, inasistencias, tardanzas };
  };

  let totalAsistenciasGrilla = 0;
  let totalInasistenciasGrilla = 0;
  for (const alu of alumnos) {
    const stats = calcularAsistenciasAlumno(alu);
    totalAsistenciasGrilla += stats.asistencias;
    totalInasistenciasGrilla += stats.inasistencias;
  }
  const totalPosiblesGrilla = totalAsistenciasGrilla + totalInasistenciasGrilla;
  const porcentajeAsistenciaGrilla =
    totalPosiblesGrilla > 0
      ? Math.round((totalAsistenciasGrilla / totalPosiblesGrilla) * 100)
      : 0;
  const asistenciaMediaGrilla =
    mesCalendario.totalDiasHabiles > 0
      ? Math.round(totalAsistenciasGrilla / mesCalendario.totalDiasHabiles)
      : 0;

  return (
    <div className={styles.container}>
      {guardadoBloqueado && <Alert type="warning" showIcon title="Es necesario volver a cargar el registro" description={guardadoBloqueado}
        action={<Button onClick={() => modal.confirm({
          title: '¿Cargar la versión guardada?', content: 'Se descartarán los cambios locales y se consultará el registro actual.',
          okText: 'Cargar versión guardada', cancelText: 'Conservar cambios',
          onOk: () => { onCambiosPendientes?.(false); onRecargar(); },
        })}>Cargar versión guardada</Button>} />}
      <div className={styles.toolbar}>
        <Space wrap size="middle">
          <Tag color="blue" style={{ fontSize: 14, padding: '4px 10px' }}>
            Grado: <strong>{curso.nombre}</strong> (Turno {curso.turno})
          </Tag>
          <Tag color="cyan" style={{ fontSize: 14, padding: '4px 10px' }}>
            Días hábiles: <strong>{mesCalendario.totalDiasHabiles}</strong> (Acumulados:{' '}
            {mesCalendario.diasHabilesAcumulados})
          </Tag>
          <Button icon={<CalendarOutlined />} onClick={onAbrirAperturaMes} disabled={hayCambiosPendientes || saving || Boolean(guardadoBloqueado)}>
            Configurar Mes / Calendario
          </Button>
        </Space>

        <Space wrap>
          {onImprimirA4 && (
            <Button
              icon={<PrinterOutlined />}
              onClick={onImprimirA4}
              disabled={hayCambiosPendientes || saving || Boolean(guardadoBloqueado)}
            >
              Imprimir / Vista Previa A4
            </Button>
          )}
          {hayCambiosPendientes && <Button disabled={saving} onClick={() => {
            setMarcasLocales(new Map());
            setCeldasModificadas(new Set());
            setObservacionesCurso(registro.observacionesAdicionales || '');
          }}>Descartar cambios</Button>}
          <Badge count={celdasModificadas.size}>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleGuardarCambios}
              loading={saving}
              disabled={Boolean(guardadoBloqueado) || !hayCambiosPendientes}
            >
              Guardar Cambios
            </Button>
          </Badge>
        </Space>
      </div>

      <div className={styles.keyboardGuide}>
        <Text type="secondary">
          Atajos de teclado en la celda: <strong>P</strong> (Presente), <strong>A</strong> (Ausente),{' '}
          <strong>J</strong> (Justificado), <strong>E</strong> (Enfermedad), <strong>T</strong> (Llegada Tarde),{' '}
          <strong>R</strong> (Retiro Anticipado). Use <strong>Flechas</strong> o <strong>Enter</strong> para moverse como en Excel.
        </Text>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.matrixTable} style={{ minWidth: 520 + diasEnElMes * 28 }}>
          <colgroup>
            <col style={{ width: 36 }} />
            <col style={{ width: 220 }} />
            {dias.map((d) => <col key={d} />)}
            <col style={{ width: 56 }} />
            <col style={{ width: 56 }} />
            <col style={{ width: 56 }} />
            <col style={{ width: 96 }} />
          </colgroup>
          <thead>
            <tr>
              <th className={styles.stickyColLeft1}>N°</th>
              <th className={styles.stickyColLeft2}>Estudiante</th>
              {dias.map((d) => {
                const fechaObj = dayjs(`${ano}-${mesPad}-${String(d).padStart(2, '0')}`);
                const dow = fechaObj.day();
                const esFinde = dow === 0 || dow === 6;
                const evento = eventosPorDia.get(d);
                const diaNombres = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

                let thClass = '';
                if (esFinde) thClass = styles.weekendCol;
                else if (evento) thClass = styles.eventCol;

                return (
                  <th key={d} className={thClass}>
                    <div className={styles.dayHeader}>
                      <span className={styles.dayNum}>{d}</span>
                      <span className={styles.dayName}>{diaNombres[dow]}</span>
                    </div>
                  </th>
                );
              })}
              <th className={styles.summaryCol}>Asist.</th>
              <th className={styles.summaryCol}>Inasist.</th>
              <th className={styles.summaryCol}>Tard.</th>
              <th className={styles.obsCol}>Observ.</th>
            </tr>
          </thead>
          <tbody>
            {alumnos.map((alumno, aIndex) => {
              const stats = calcularAsistenciasAlumno(alumno);
              return (
                <tr key={alumno.inscripcionId}>
                  <td className={styles.stickyColLeft1}>{alumno.numeroOrden ?? '—'}</td>
                  <td className={styles.stickyColLeft2}>
                    <div className={styles.studentLabel}>
                      <span title={alumno.apellidoYNombre}>{alumno.apellidoYNombre}</span>
                      {alumno.observacion && (
                        <Tag color={alumno.observacion.includes('311') ? 'gold' : 'blue'} style={{ fontSize: 10 }}>
                          {alumno.observacion.split(' - ')[0]}
                        </Tag>
                      )}
                    </div>
                  </td>

                  {dias.map((d) => {
                    const fechaObj = dayjs(`${ano}-${mesPad}-${String(d).padStart(2, '0')}`);
                    const dow = fechaObj.day();
                    const esFinde = dow === 0 || dow === 6;
                    const evento = eventosPorDia.get(d);
                    const marca = obtenerMarcaActual(alumno, d);
                    const esModificada = celdasModificadas.has(`${alumno.inscripcionId}_${d}`);
                    const cellKey = `${aIndex}_${d}`;

                    if (esFinde) {
                      return <td key={d} className={styles.weekendCol}></td>;
                    }

                    if (evento) {
                      if (aIndex === 0) {
                        return (
                          <td
                            key={d}
                            rowSpan={alumnos.length}
                            className={styles.eventCol}
                            title={evento.descripcionObservaciones || evento.textoCeldaVertical}
                          >
                            <span className={styles.verticalEventText}>
                              {evento.textoCeldaVertical || evento.tipo}
                            </span>
                          </td>
                        );
                      }
                      return null;
                    }

                    if (marca === '---') {
                      return (
                        <td key={d} className={styles.cellDash} title="Día no cursado">
                          ---
                        </td>
                      );
                    }

                    return (
                      <Popover
                        key={d}
                        trigger="click"
                        open={celdaAbierta === cellKey && !saving && !guardadoBloqueado}
                        onOpenChange={(open) => setCeldaAbierta((actual) => open ? cellKey : actual === cellKey ? null : actual)}
                        title={`Asistencia Día ${d}`}
                        content={
                          <Space orientation="vertical" size="small">
                            {OPCIONES_ESTADO.map((opt) => (
                              <Button
                                key={opt.estado}
                                size="small"
                                block
                                type={marca === opt.estado ? 'primary' : 'default'}
                                onClick={() => {
                                  handleCambiarMarca(alumno, d, opt.estado);
                                  cellRefs.current.get(cellKey)?.focus();
                                }}
                              >
                                {opt.etiqueta}
                              </Button>
                            ))}
                          </Space>
                        }
                      >
                        <td
                          ref={(el) => {
                            if (el) cellRefs.current.set(cellKey, el);
                            else cellRefs.current.delete(cellKey);
                          }}
                          tabIndex={0}
                          className={getCellClass(marca, esModificada)}
                          onKeyDown={(e) => handleKeyDown(e, alumno, aIndex, d)}
                        >
                          {marca || 'P'}
                        </td>
                      </Popover>
                    );
                  })}

                  <td className={styles.summaryCol}>{stats.asistencias}</td>
                  <td className={styles.summaryCol}>{stats.inasistencias}</td>
                  <td className={styles.summaryCol}>{stats.tardanzas}</td>
                  <td className={styles.obsCol} title={alumno.observacion}>
                    {alumno.observacion}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className={styles.footerRow}>
              <td colSpan={2} style={{ textAlign: 'right' }}>
                PRESENTES
              </td>
              {dias.map((d) => {
                const esHabil = diasHabilesSet.has(d);
                if (!esHabil) {
                  return <td key={d} className={styles.weekendCol}></td>;
                }
                const presentes = calcularPresentesDia(d);
                return (
                  <td key={d} style={{ fontWeight: 700 }}>
                    {presentes}
                  </td>
                );
              })}
              <td className={styles.summaryCol}>{totalAsistenciasGrilla}</td>
              <td className={styles.summaryCol}>{totalInasistenciasGrilla}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" title="Inscripción ( 1 + 2 - 3 = 4 )">
            <Space orientation="vertical" size={2} style={{ width: '100%' }}>
              <div>
                (1) Inscriptos 1er día: <strong>{inscripcion.inscriptosPrimerDia.t}</strong> (V:{' '}
                {inscripcion.inscriptosPrimerDia.v}, M: {inscripcion.inscriptosPrimerDia.m})
              </div>
              <div>
                (2) Entrados en el mes: <strong>{inscripcion.entradosPosteriormente.total.t}</strong>
              </div>
              <div>
                (3) Salidos en el mes: <strong>{inscripcion.salidosEnElMes.total.t}</strong>
              </div>
              <div>
                (4) Quedan último día: <strong>{inscripcion.quedanUltimoDia.t}</strong> (V:{' '}
                {inscripcion.quedanUltimoDia.v}, M: {inscripcion.quedanUltimoDia.m})
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card size="small" title="Resumen Asistencia">
            <Row gutter={8}>
              <Col span={12}>
                <Statistic title="Total Asist." value={totalAsistenciasGrilla} />
              </Col>
              <Col span={12}>
                <Statistic title="Total Inasist." value={totalInasistenciasGrilla} />
              </Col>
            </Row>
            <Row gutter={8} style={{ marginTop: 8 }}>
              <Col span={12}>
                <Statistic title="Asist. Media" value={asistenciaMediaGrilla} />
              </Col>
              <Col span={12}>
                <Statistic title="% Asistencia" value={`${porcentajeAsistenciaGrilla}%`} />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card size="small" title="Edades y Nacionalidad">
            <Space orientation="vertical" size={2} style={{ width: '100%' }}>
              <Text strong>Edades:</Text>
              {edades.filas.map((f) => (
                <div key={f.edad}>
                  {f.edad} años: <strong>{f.t}</strong> (V: {f.v}, M: {f.m})
                </div>
              ))}
              <div style={{ marginTop: 6 }}>
                <Text strong>Nacionalidad:</Text>
              </div>
              <div>
                Argentinos: <strong>{nacionalidad.argentinos.t}</strong> | Extranjeros:{' '}
                <strong>{nacionalidad.extranjeros.t}</strong>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card size="small" title="Observaciones del Mes">
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
              {registro.observacionesDelMes.length > 0 && (
                <div style={{ maxHeight: 80, overflowY: 'auto' }}>
                  {registro.observacionesDelMes.map((obs, idx) => (
                    <div key={idx} style={{ fontSize: 12 }}>
                      <CheckCircleOutlined style={{ marginRight: 4, color: '#10b981' }} />
                      {obs}
                    </div>
                  ))}
                </div>
              )}
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Notas adicionales del curso:
                </Text>
                <TextArea
                  rows={2}
                  value={observacionesCurso}
                  disabled={saving || Boolean(guardadoBloqueado)}
                  onChange={(e) => setObservacionesCurso(e.target.value)}
                  placeholder="Observaciones manuales al pie..."
                  style={{ marginTop: 4, fontSize: 12 }}
                />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
