import React from 'react';
import { Row, Col, Typography, Card } from 'antd';
import { BookOutlined, HeartOutlined, RocketOutlined, TrophyOutlined } from '@ant-design/icons';
import { landingData } from '../data/landingData';

const { Title, Paragraph } = Typography;

const iconMap = {
  book: <BookOutlined />,
  rocket: <RocketOutlined />,
  heart: <HeartOutlined />,
  trophy: <TrophyOutlined />,
};

const pillarSubtitleMap: Record<string, string> = {
  excelencia: 'Proyecto Curricular',
  innovacion: 'Competencias Digitales',
  emocional: 'Convivencia y Valores',
  deportes: 'Vida Estudiantil',
};

export const PropuestaSection: React.FC = () => {
  return (
    <section id="propuesta" className="landing-section propuesta-section">
      <div className="propuesta-backdrop" aria-hidden="true" />
      <div className="landing-section-inner propuesta-content">
        <div className="section-header text-center">
          <Title level={2} className="section-title">
            Pilares de Nuestra <span className="section-title-accent">Educación</span>
          </Title>
          <Paragraph className="section-description">
            Brindamos una formación sólida sustentada en el pensamiento crítico, la calidez humana y la incorporación activa de la tecnología.
          </Paragraph>
        </div>

        <Row gutter={[24, 24]}>
          {landingData.propuestas.map((pilar) => (
            <Col key={pilar.id} xs={24} sm={12} lg={6}>
              <Card className={`feature-card ${pilar.colorTheme}`} bordered={false}>
                <div className="feature-card-top">
                  <div className={`feature-icon-box ${pilar.colorTheme}`}>
                    {iconMap[pilar.iconName]}
                  </div>
                  <span className={`feature-domain-label ${pilar.colorTheme}`}>
                    {pillarSubtitleMap[pilar.id] || 'Eje Pedagógico'}
                  </span>
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
