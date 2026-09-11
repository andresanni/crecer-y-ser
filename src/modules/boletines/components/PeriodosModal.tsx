import { useModalSessionKey } from '../../../shared/hooks/useModalSessionKey';
import ui from '../../../shared/styles/ui.module.css';
import React, { useState, useEffect } from 'react';
import { Modal, Button, List, Typography, Space, App, Tag, Empty, Spin, Alert } from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { boletinService } from '../services/boletin.service';
import type { Periodo } from '../models/boletin.model';
import { useAppStore } from '../../../store/appStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const PeriodosModal: React.FC<Props> = (props) => {
  const sessionKey = useModalSessionKey(props.open);
  const cicloId = useAppStore((state) => state.cicloActual?.id);
  return <PeriodosModalSession key={sessionKey + ':' + cicloId} {...props} />;
};

const PeriodosModalSession: React.FC<Props> = ({ open, onClose }) => {
  const { message } = App.useApp();
  const { cicloActual } = useAppStore();
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    if (!open || !cicloActual?.id) return;
    let active = true;
    boletinService.getPeriodosByCiclo(cicloActual.id)
      .then((data) => { if (active) setPeriodos(data); })
      .catch((err) => {
        if (!active) return;
        console.error(err);
        message.error('Error al cargar los períodos del ciclo lectivo');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, cicloActual?.id, message]);

  const handleInitDefault = async () => {
    if (!cicloActual?.id) {
      message.error('No hay un ciclo lectivo activo seleccionado');
      return;
    }

    try {
      setInitializing(true);
      const result = await boletinService.initDefaultPeriodos(cicloActual.id);
      setPeriodos(result);
      message.success('Los 4 Bimestres oficiales fueron inicializados correctamente');
    } catch (err) {
      console.error(err);
      message.error('Error al inicializar los bimestres');
    } finally {
      setInitializing(false);
    }
  };

  const hasAllBimestres = periodos.length === 4;

  return (
    <Modal
      title={
        <Space size={8}>
          <CalendarOutlined className={ui.primary} />
          <span>Configuración de Períodos Escolares</span>
          {cicloActual && <Tag color="green">Ciclo {cicloActual.ano}</Tag>}
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cerrar" onClick={onClose}>
          Cerrar
        </Button>,
      ]}
      width={540}
      destroyOnClose
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
        {!cicloActual ? (
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            message="No hay un ciclo lectivo activo marcado en el sistema."
            description="Debe existir un registro activo en 'ciclos_lectivos' para asociar los períodos."
          />
        ) : (
          <>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 13 }}>
              El Documento de Evaluación y los Boletines Oficiales se estructuran en{' '}
              <strong>4 Bimestres</strong> correspondientes al ciclo escolar {cicloActual.ano}.
            </Typography.Paragraph>

            {hasAllBimestres ? (
              <Alert
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                message="Estructura Completa"
                description="Los 4 bimestres reglamentarios ya están configurados para este ciclo lectivo."
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 12,
                  background: 'var(--cys-color-fill-quaternary, #f8fafc)',
                  borderRadius: 10,
                  border: "1px dashed var(--cys-color-border, var(--cys-color-border))",
                }}
              >
                <div>
                  <Typography.Text strong style={{ display: 'block', fontSize: 13 }}>
                    Inicialización Automática
                  </Typography.Text>
                  <Typography.Text type="secondary" className={ui.caption}>
                    Crea los 4 bimestres reglamentarios (1° a 4° Bimestre)
                  </Typography.Text>
                </div>
                <Button
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  onClick={handleInitDefault}
                  loading={initializing}
                >
                  Inicializar 4 Bimestres
                </Button>
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <Spin tip="Cargando períodos..." />
              </div>
            ) : periodos.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No hay períodos configurados para este ciclo"
              />
            ) : (
              <List
                size="small"
                bordered
                dataSource={periodos}
                renderItem={(periodo) => (
                  <List.Item key={periodo.id}>
                    <Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Space>
                        <Tag color="blue">Período {periodo.numeroPeriodo}</Tag>
                        <Typography.Text strong>{periodo.nombre}</Typography.Text>
                      </Space>
                      <Tag color="cyan">Ciclo {cicloActual.ano}</Tag>
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
