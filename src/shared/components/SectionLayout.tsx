import type { ReactNode } from 'react';
import { PageHeader } from './PageHeader';
import styles from './SectionLayout.module.css';

interface SectionLayoutProps {
  title: string;
  icon: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Estructura canónica del contenido de una sección dentro de MainLayout.
 * Centraliza encabezado, acciones y ritmo vertical sin asumir navegación,
 * chrome de aplicación ni responsabilidades de routing.
 */
export const SectionLayout = ({ title, icon, actions, children }: SectionLayoutProps) => (
  <div className={styles.section}>
    <PageHeader title={title} icon={icon} actions={actions} />
    {children}
  </div>
);
