import React from 'react';
import { Tooltip } from 'antd';
import { BulbOutlined } from '@ant-design/icons';
import {
  type DisonanciaInformeItem,
  type InformeSemaforoTone,
  type SemaforoInformeResumen,
} from '../models/informe.model';
import styles from './InformesVisualIndicators.module.css';

const TONE_CLASS_MAP: Record<InformeSemaforoTone, string> = {
  verde: styles.toneVerde,
  amarillo: styles.toneAmarillo,
  rojo: styles.toneRojo,
  neutro: styles.toneNeutro,
};

interface InformeTonePillProps {
  tone: InformeSemaforoTone;
  label: string;
  compact?: boolean;
  className?: string;
}

export const InformeTonePill: React.FC<InformeTonePillProps> = ({
  tone,
  label,
  compact = false,
  className,
}) => (
  <span
    className={`${styles.pillBase} ${TONE_CLASS_MAP[tone]} ${compact ? styles.pillCompact : ''} ${className || ''}`}
  >
    <span className={styles.dot} aria-hidden="true" />
    <span>{label}</span>
  </span>
);

interface SemaforoStudentPillsProps {
  semaforo: SemaforoInformeResumen;
  compact?: boolean;
  showLabels?: boolean;
}

export const SemaforoStudentPills: React.FC<SemaforoStudentPillsProps> = ({
  semaforo,
  compact = false,
  showLabels = false,
}) => {
  const sizeClass = compact ? styles.pillCompact : '';
  return (
    <span className={styles.semaforoGroup}>
      <Tooltip title={`${semaforo.verde} indicador(es) en nivel logrado`}>
        <span className={`${styles.pillBase} ${sizeClass} ${semaforo.verde > 0 ? styles.toneVerde : styles.toneMuted}`}>
          <span className={styles.dot} aria-hidden="true" />
          <span>{showLabels ? `${semaforo.verde} logrados` : semaforo.verde}</span>
        </span>
      </Tooltip>
      <Tooltip title={`${semaforo.amarillo} indicador(es) en proceso`}>
        <span className={`${styles.pillBase} ${sizeClass} ${semaforo.amarillo > 0 ? styles.toneAmarillo : styles.toneMuted}`}>
          <span className={styles.dot} aria-hidden="true" />
          <span>{showLabels ? `${semaforo.amarillo} en proceso` : semaforo.amarillo}</span>
        </span>
      </Tooltip>
      <Tooltip title={`${semaforo.rojo} indicador(es) en nivel bajo o a observar`}>
        <span className={`${styles.pillBase} ${sizeClass} ${semaforo.rojo > 0 ? styles.toneRojo : styles.toneMuted}`}>
          <span className={styles.dot} aria-hidden="true" />
          <span>{showLabels ? `${semaforo.rojo} bajos` : semaforo.rojo}</span>
        </span>
      </Tooltip>
      {semaforo.neutro > 0 && (
        <Tooltip title={`${semaforo.neutro} indicador(es) marcado(s) como no trabajado (A)`}>
          <span className={`${styles.pillBase} ${sizeClass} ${styles.toneNeutro}`}>
            <span className={styles.dot} aria-hidden="true" />
            <span>{showLabels ? `${semaforo.neutro} sin trabajar` : `A: ${semaforo.neutro}`}</span>
          </span>
        </Tooltip>
      )}
    </span>
  );
};

interface MiniSemaforoIndicatorsProps {
  semaforo?: SemaforoInformeResumen;
  disonancias?: DisonanciaInformeItem[];
}

export const MiniSemaforoIndicators: React.FC<MiniSemaforoIndicatorsProps> = ({
  semaforo,
  disonancias,
}) => {
  if (!semaforo && !disonancias?.length) return null;
  return (
    <span className={styles.miniDotGroup}>
      {Boolean(disonancias?.length) && (
        <BulbOutlined className={styles.miniBulb} aria-label="Sugerencia de revisión" />
      )}
      {semaforo && (
        <>
          <span className={`${styles.miniDotItem} ${styles.miniVerde}`}>
            <span className={styles.miniDot} aria-hidden="true" />
            <span>{semaforo.verde}</span>
          </span>
          {semaforo.amarillo > 0 && (
            <span className={`${styles.miniDotItem} ${styles.miniAmarillo}`}>
              <span className={styles.miniDot} aria-hidden="true" />
              <span>{semaforo.amarillo}</span>
            </span>
          )}
          {semaforo.rojo > 0 && (
            <span className={`${styles.miniDotItem} ${styles.miniRojo}`}>
              <span className={styles.miniDot} aria-hidden="true" />
              <span>{semaforo.rojo}</span>
            </span>
          )}
        </>
      )}
    </span>
  );
};

interface DisonanciaHintBadgeProps {
  disonancias?: DisonanciaInformeItem[];
  label?: string;
}

export const DisonanciaHintBadge: React.FC<DisonanciaHintBadgeProps> = ({
  disonancias,
  label = 'Sugerencia de revisión',
}) => {
  if (!disonancias?.length) return null;
  return (
    <Tooltip title={disonancias.map((d) => d.mensaje).join(' · ')}>
      <span className={styles.suggestionPill}>
        <BulbOutlined />
        <span>{label}</span>
      </span>
    </Tooltip>
  );
};

interface DisonanciaSuggestionBannerProps {
  disonancias: DisonanciaInformeItem[];
}

export const DisonanciaSuggestionBanner: React.FC<DisonanciaSuggestionBannerProps> = ({
  disonancias,
}) => {
  if (disonancias.length === 0) return null;
  return (
    <div className={styles.suggestionBanner} role="note" aria-label="Sugerencia">
      <BulbOutlined className={styles.suggestionBannerIcon} aria-hidden="true" />
      <div className={styles.suggestionBannerBody}>
        <span className={styles.suggestionBannerTitle}>SUGERENCIA</span>
        {disonancias.length === 1 ? (
          <p className={styles.suggestionBannerSingle}>{disonancias[0].mensaje}</p>
        ) : (
          <ul className={styles.suggestionBannerList}>
            {disonancias.map((item) => (
              <li key={item.codigo}>{item.mensaje}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
