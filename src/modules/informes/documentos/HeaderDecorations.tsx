import React from 'react';
import styles from './InformeDocument.module.css';

export const HeaderDecorations: React.FC = () => {
  return (
    <div className={styles.decorationsContainer} aria-hidden="true">
      <svg viewBox="0 0 140 100" className={styles.decTopLeft}>
        <path d="M 0,0 L 95,0 C 70,30 35,60 0,65 Z" fill="#1a4480" />
        <path d="M 0,65 C 35,60 70,30 95,0 L 125,0 C 95,45 45,85 0,90 Z" fill="#90cdf4" />
        <path
          d="M 12,94 C 45,88 85,60 122,25"
          stroke="#b91c1c"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
};
