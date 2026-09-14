import type { ReactNode } from 'react';
import { CheckOutlined } from '@ant-design/icons';
import { Modal, Steps, Typography } from 'antd';
import type { ModalProps } from 'antd';
import styles from './FormModal.module.css';

const { Text, Title } = Typography;

type FormModalProps = Omit<ModalProps, 'children' | 'title'> & {
  children: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  icon: ReactNode;
  extra?: ReactNode;
  tone?: 'primary' | 'info';
};

export interface FormModalStep {
  title: ReactNode;
  content?: ReactNode;
  icon: ReactNode;
}

interface FormModalStepsProps {
  current: number;
  items: FormModalStep[];
  onChange?: (step: number) => void;
}

export const FormModal = ({
  children,
  title,
  description,
  icon,
  extra,
  tone = 'primary',
  className,
  ...modalProps
}: FormModalProps) => (
  <Modal
    {...modalProps}
    className={[styles.modal, className].filter(Boolean).join(' ')}
    title={
      <div className={styles.header}>
        <div className={styles.identity}>
          <span className={`${styles.icon} ${styles[tone]}`}>{icon}</span>
          <div className={styles.heading}>
            <Title level={2} className={styles.title}>{title}</Title>
            {description && <Text type="secondary" className={styles.description}>{description}</Text>}
          </div>
        </div>
        {extra && <div className={styles.extra}>{extra}</div>}
      </div>
    }
  >
    {children}
  </Modal>
);

export const FormModalSteps = ({ current, items, onChange }: FormModalStepsProps) => (
  <Steps
    current={current}
    onChange={onChange}
    size="small"
    className={styles.steps}
    items={items.map((item, index) => ({
      title: item.title,
      content: item.content,
      icon: (
        <span
          className={[
            styles.stepIcon,
            index < current ? styles.stepComplete : index === current ? styles.stepCurrent : styles.stepPending,
          ].join(' ')}
        >
          {index < current ? <CheckOutlined /> : item.icon}
        </span>
      ),
    }))}
  />
);
