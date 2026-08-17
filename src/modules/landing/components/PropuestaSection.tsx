import React from 'react';
import { Row, Col, Typography, Card, Tag } from 'antd';
import { BookOutlined, HeartOutlined, RocketOutlined, TrophyOutlined } from '@ant-design/icons';
import { landingData } from '../data/landingData';

const { Title, Paragraph } = Typography;

const iconMap = {
  book: <BookOutlined />,
  rocket: <RocketOutlined />,
  heart: <HeartOutlined />,
  trophy: <TrophyOutlined />,
};

export const PropuestaSection: React.FC = () => {
  return (
    <section id="propuesta" className="landing-section">
      <div className="landing-section-inner">
        <div className="section-header text-center">
          <Tag color="blue" className="section-tag">NUESTRA PROPUESTA</Tag>
          <Title level={2} className="section-title">Pilares de Nuestra Educación</Title>
          <Paragraph className="section-description">
            Brindamos una formación sólida sustentada en el pensamiento crítico, la calidez humana y la incorporación activa de la tecnología.
          </Paragraph>
        </div>

        <Row gutter={[24, 24]}>
          {landingData.propuestas.map((pilar) => (
            <Col key={pilar.id} xs={24} sm={12} lg={6}>
              <Card className="feature-card" bordered={false}>
                <div className={`feature-icon-box ${pilar.colorTheme}`}>
                  {iconMap[pilar.iconName]}
                </div>
                <Title level={4} className="feature-title">{pilar.title}</Title>
                <Paragraph className="feature-text">
                  {pilar.description}
                </Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </section>
  );
};
