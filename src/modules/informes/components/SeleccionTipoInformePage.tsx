import React from 'react';
import { FileTextOutlined } from '@ant-design/icons';
import { Card, Empty, Spin } from 'antd';
import { SectionLayout } from '../../../shared/components/SectionLayout';
import { NavigationCard, NavigationCardGrid } from '../../../shared/components/NavigationCard';
import { useAppStore } from '../../../store/appStore';
import { TIPOS_INFORME_LIST, type TipoInforme } from '../models/informe.model';
import ui from '../../../shared/styles/ui.module.css';

interface SeleccionTipoInformePageProps {
  onSelectTipo: (tipoInforme: TipoInforme) => void;
}

export const SeleccionTipoInformePage: React.FC<SeleccionTipoInformePageProps> = ({
  onSelectTipo,
}) => {
  const { cicloActual, isCicloLoading } = useAppStore();

  return (
    <SectionLayout title="Informes" icon={<FileTextOutlined />}>
      {isCicloLoading ? (
        <Card className={ui.loadingPanel}>
          <Spin description="Cargando ciclo lectivo..." />
        </Card>
      ) : !cicloActual ? (
        <Card className={ui.emptyPanel}>
          <Empty description="No hay un ciclo lectivo activo configurado." />
        </Card>
      ) : (
        <NavigationCardGrid>
          {TIPOS_INFORME_LIST.map((meta) => (
            <NavigationCard
              key={meta.codigo}
              title={meta.tituloCorto}
              marker={meta.numeroOrden}
              status={{
                color: meta.requiereMateriaEspecial ? 'blue' : 'green',
                label: meta.responsable,
              }}
              onClick={() => onSelectTipo(meta.codigo)}
            />
          ))}
        </NavigationCardGrid>
      )}
    </SectionLayout>
  );
};
