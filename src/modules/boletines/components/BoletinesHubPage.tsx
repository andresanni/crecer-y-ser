import { ArrowRightOutlined, CalendarOutlined, ScheduleOutlined, SettingOutlined } from '@ant-design/icons';
import { Col, Row } from 'antd';
import { Link } from 'react-router-dom';
import { SectionLayout } from '../../../shared/components/SectionLayout';
import styles from './BoletinesHubPage.module.css';

const sections = [
  {
    title: 'Bimestres',
    description: 'Carga, seguimiento y revisión de boletines por período.',
    icon: <CalendarOutlined />,
    route: '/app/boletines/calificaciones',
  },
  {
    title: 'Constructor',
    description: 'Materias, criterios y períodos del ciclo lectivo.',
    icon: <SettingOutlined />,
    route: '/app/boletines/constructor',
  },
];

export const BoletinesHubPage = () => (
  <SectionLayout title="Boletines" icon={<ScheduleOutlined />}>
    <Row gutter={[16, 16]}>
      {sections.map((section) => (
        <Col xs={24} md={12} key={section.route}>
          <Link className={styles.accessCard} to={section.route}>
            <span className={styles.icon} aria-hidden="true">{section.icon}</span>
            <span className={styles.content}>
              <span className={styles.title}>{section.title}</span>
              <span className={styles.description}>{section.description}</span>
            </span>
            <ArrowRightOutlined className={styles.arrow} aria-hidden="true" />
          </Link>
        </Col>
      ))}
    </Row>
  </SectionLayout>
);
