import type { ReactNode } from 'react';
import { Card, Statistic, Typography } from 'antd';
import styles from './MetricCard.module.css';

interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
  tone?: 'primary' | 'success' | 'warning' | 'error';
  loading?: boolean;
  children?: ReactNode;
}

export const MetricCard = ({ title, value, description, tone = 'primary', loading, children }: MetricCardProps) => (
  <Card loading={loading} className={`${styles.card} ${styles[tone]}`} classNames={{ body: styles.body }}>
    <Statistic title={title} value={value} />
    <Typography.Text type="secondary">{description}</Typography.Text>
    {children}
  </Card>
);
