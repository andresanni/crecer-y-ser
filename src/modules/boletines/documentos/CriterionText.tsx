import { useLayoutEffect, useRef } from 'react';
import styles from './BoletinDocument.module.css';

export function CriterionText({ texto, materia }: { texto: string; materia: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const container = ref.current;
    const content = container?.firstElementChild;
    if (!container || !(content instanceof HTMLElement)) return;
    let active = true;
    const ajustar = () => {
      if (!active) return;
      container.dataset.fit = 'normal';
      const cabe = () => {
        const style = getComputedStyle(container);
        const availableHeight = container.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        return content.getBoundingClientRect().height <= availableHeight + 0.5
          && content.scrollWidth <= content.clientWidth + 1;
      };
      if (!cabe()) container.dataset.fit = 'compacto';
      const overflow = !cabe();
      container.dataset.textOverflow = String(overflow);
      container.title = overflow ? 'La consigna no cabe a 9 pt: requiere revisión antes de emitir.' : '';
    };
    ajustar();
    const observer = new ResizeObserver(ajustar);
    observer.observe(container);
    void document.fonts.ready.then(ajustar);
    document.fonts.addEventListener('loadingdone', ajustar);
    window.addEventListener('beforeprint', ajustar);
    return () => {
      active = false;
      observer.disconnect();
      document.fonts.removeEventListener('loadingdone', ajustar);
      window.removeEventListener('beforeprint', ajustar);
    };
  }, [texto]);

  return <span ref={ref} className={styles.textoCriterio} data-dynamic-field={`${materia}: concepto evaluativo`}>
    <span className={styles.contenidoCriterio}>{texto}</span>
  </span>;
}
