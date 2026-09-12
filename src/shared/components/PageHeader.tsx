import type { ReactNode } from 'react';
import { Typography } from 'antd';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  icon: ReactNode;
  actions?: ReactNode;
}

export const PageHeader = ({ title, icon, actions }: PageHeaderProps) => (
  <header className={styles.header}>
    <div className={styles.identity}>
      <span className={styles.icon} aria-hidden="true">{icon}</span>
      <Typography.Title level={1} className={`${styles.title} section-title`}>{title}</Typography.Title>
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </header>
);
