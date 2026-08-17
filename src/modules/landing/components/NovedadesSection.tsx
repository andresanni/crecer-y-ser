import React from 'react';
import { Row, Col, Typography, Card, Tag } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { landingData } from '../data/landingData';

const { Title, Paragraph } = Typography;

export const NovedadesSection: React.FC = () => {
  return (
    <section id="novedades" className="landing-section">
      <div className="landing-section-inner">
        <div className="section-header text-center">
          <Tag color="purple" className="section-tag">COMUNIDAD</Tag>
          <Title level={2} className="section-title">Últimas Novedades</Title>
          <Paragraph className="section-description">
            Mantenete al tanto de los eventos, fechas importantes y proyectos institucionales de nuestra comunidad educativa.
          </Paragraph>
        </div>

        <Row gutter={[24, 24]}>
          {landingData.novedades.map((item) => (
            <Col key={item.id} xs={24} md={8}>
              <Card className="news-card" hoverable>
                <Tag color={item.tagColor} className="news-tag">{item.tag}</Tag>
                <div className="news-date">
                  <ClockCircleOutlined /> {item.date}
                </div>
                <Title level={4} className="news-title">{item.title}</Title>
                <Paragraph className="news-excerpt">
                  {item.excerpt}
                </Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </section>
  );
};
