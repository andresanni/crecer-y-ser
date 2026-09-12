import type { ReactNode } from 'react';
import { PageHeader } from './PageHeader';
import styles from './SectionLayout.module.css';

interface SectionLayoutProps {
  title: string;
  icon: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}






export const SectionLayout = ({ title, icon, actions, children }: SectionLayoutProps) => (
  <div className={styles.section}>
    <PageHeader title={title} icon={icon} actions={actions} />
    {children}
  </div>
);
