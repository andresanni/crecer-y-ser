import type { ReactNode } from 'react';
import { ArrowRightOutlined } from '@ant-design/icons';
import { Col, Row, Tag } from 'antd';
import type { TagProps } from 'antd';
import { Children, useId } from 'react';
import styles from './NavigationCard.module.css';

interface NavigationCardProps {
  title: string;
  marker: ReactNode;
  status?: Pick<TagProps, 'color' | 'icon'> & { label: string };
  onClick: () => void;
}

export const NavigationCard = ({ title, marker, status, onClick }: NavigationCardProps) => {
  const statusId = useId();
  return (
    <button type="button" className={styles.card} aria-label={title} aria-describedby={status ? statusId : undefined} onClick={onClick}>
      <span className={styles.top}>
        <span className={styles.marker} aria-hidden="true">{marker}</span>
        <ArrowRightOutlined className={styles.arrow} aria-hidden="true" />
      </span>
      <span className={styles.title}>{title}</span>
      {status && (
        <Tag id={statusId} className={styles.status} color={status.color} icon={status.icon}>
          {status.label}
        </Tag>
      )}
    </button>
  );
};

export const NavigationCardGrid = ({ children }: { children: ReactNode }) => (
  <Row gutter={[16, 16]}>
    {Children.map(children, (child) => (
      <Col xs={24} sm={12} lg={6}>{child}</Col>
    ))}
  </Row>
);
