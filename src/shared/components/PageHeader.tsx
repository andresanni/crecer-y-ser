import type { ReactNode } from 'react';
import { Typography } from 'antd';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  description: string;
  icon: ReactNode;
  actions?: ReactNode;
}

export const PageHeader = ({ title, description, icon, actions }: PageHeaderProps) => (
  <header className={styles.header}>
    <div className={styles.identity}>
      <span className={styles.icon} aria-hidden="true">{icon}</span>
      <div>
        <Typography.Title level={1} className={styles.title}>{title}</Typography.Title>
        <Typography.Text type="secondary">{description}</Typography.Text>
      </div>
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </header>
);
