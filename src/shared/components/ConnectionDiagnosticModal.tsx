import React from 'react';
import { Modal, Descriptions, Tag, Button, Space, Typography } from 'antd';
import { ReloadOutlined, CloudServerOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import pb from '../../core/pocketbase';
import type { ServerHealthStatus } from '../hooks/useServerHealth';

const { Text } = Typography;

interface ConnectionDiagnosticModalProps {
  open: boolean;
  onClose: () => void;
  status: ServerHealthStatus;
  latencyMs: number | null;
  lastChecked: Date | null;
  onCheckAgain: () => Promise<void>;
}

export const ConnectionDiagnosticModal: React.FC<ConnectionDiagnosticModalProps> = ({
  open,
  onClose,
  status,
  latencyMs,
  lastChecked,
  onCheckAgain,
}) => {
  const isOnline = status === 'online';
  const isChecking = status === 'checking';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Cerrar
        </Button>,
        <Button
          key="refresh"
          type="primary"
          icon={<ReloadOutlined />}
          loading={isChecking}
          onClick={() => void onCheckAgain()}
        >
          Comprobar ahora
        </Button>,
      ]}
      title={
        <Space>
          <CloudServerOutlined />
          <span>Diagnóstico de conexión</span>
        </Space>
      }
      width={480}
    >
      <Descriptions
        bordered
        size="small"
        column={1}
        style={{ marginTop: 16 }}
      >
        <Descriptions.Item label="Servidor">
          <Text code copyable>{pb.baseUrl}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Estado">
          {isChecking ? (
            <Tag color="processing">Comprobando...</Tag>
          ) : isOnline ? (
            <Tag color="success">Operativo (HTTP 200)</Tag>
          ) : (
            <Tag color="error">Sin respuesta</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Latencia">
          {latencyMs !== null ? `${latencyMs} ms` : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Último chequeo">
          {lastChecked ? dayjs(lastChecked).format('HH:mm:ss') : '-'}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
};
