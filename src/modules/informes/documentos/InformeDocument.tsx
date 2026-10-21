import React, { useMemo } from 'react';
import { isNoCorrespondeOption, type ItemPlantillaInforme } from '../models/informe.model';
import type { InformeDocumentSnapshotDatos } from './informeSnapshot.model';
import styles from './InformeDocument.module.css';

interface InformeDocumentProps {
  data: InformeDocumentSnapshotDatos;
}

interface PageRowEntry {
  item: ItemPlantillaInforme;
  showBlockCell: boolean;
  blockRowSpan: number;
}

export const InformeDocument: React.FC<InformeDocumentProps> = ({ data }) => {
  const {
    tipoInforme,
    ciclo,
    curso,
    materia,
    docente,
    direccion,
    alumno,
    plantilla,
    items,
    evaluacion,
  } = data;

  const respuestaByItemId = useMemo(
    () => new Map(evaluacion.respuestas.map((r) => [r.itemId, r.valorCodigo])),
    [evaluacion.respuestas],
  );

  const hasBlocks = useMemo(
    () => items.some((it) => Boolean(it.bloqueNombre)),
    [items],
  );

  const pages = useMemo(() => {
    const grouped = new Map<number, ItemPlantillaInforme[]>();
    for (const item of items) {
      const p = item.pagina || 1;
      const list = grouped.get(p) || [];
      list.push(item);
      grouped.set(p, list);
    }
    const pageNums = Array.from(grouped.keys()).sort((a, b) => a - b);
    return pageNums.map((pageNumber) => {
      const pageItems = grouped.get(pageNumber) || [];
      const rows: PageRowEntry[] = pageItems.map((item, idx) => {
        if (!hasBlocks) {
          return { item, showBlockCell: false, blockRowSpan: 1 };
        }
        const block = item.bloqueNombre || '';
        const prev = idx > 0 ? pageItems[idx - 1].bloqueNombre || '' : null;
        if (idx > 0 && block === prev) {
          return { item, showBlockCell: false, blockRowSpan: 0 };
        }
        let span = 1;
        while (
          idx + span < pageItems.length &&
          (pageItems[idx + span].bloqueNombre || '') === block
        ) {
          span += 1;
        }
        return { item, showBlockCell: true, blockRowSpan: span };
      });
      return { pageNumber, rows };
    });
  }, [hasBlocks, items]);

  const isSpecialCycleFinal = tipoInforme === 'CICLO_FINAL';
  const instanceTitle =
    tipoInforme === 'CICLO_FINAL'
      ? 'Ciclo Final'
      : tipoInforme === 'PRIMER_CUATRIMESTRE'
        ? 'Primer Cuatrimestre'
        : 'Primer Bimestre';

  const rightSubjectLabel = materia?.etiquetaPdf || 'Maestras';
  const visibleEscalaItems = useMemo(
    () => plantilla.escalaItems.filter((opt) => !isNoCorrespondeOption(opt.codigo, opt.etiqueta)),
    [plantilla.escalaItems],
  );
  const compactScaleHeader = visibleEscalaItems.every((opt) => opt.etiqueta.length <= 2);

  const renderHeader = () => (
    <>
      <div className={styles.headerBanner}>
        <div className={styles.headerLeft}>
          <h1 className={styles.informeTitle}>INFORME</h1>
          <div className={styles.informeSubRow}>
            <span>
              <span className={styles.badgeCircle}>{isSpecialCycleFinal ? 'E' : 'M'}</span>
              <span className={styles.categoryLabel}>
                {isSpecialCycleFinal ? 'speciales' : 'aestras'}
              </span>
            </span>
            <span className={styles.instanceLabel}>{instanceTitle}</span>
            <span className={styles.yearLabel}>{ciclo.ano}</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <img src="/logo.png" alt="Colegio Crecer y Ser" className={styles.brandLogo} />
        </div>
      </div>

      <div className={styles.studentAndSubjectBar}>
        <div className={styles.studentGrid}>
          <div className={styles.studentRow}>
            <span>APELLIDO: {alumno.apellidos}</span>
            <span>GRADO: {curso.gradoNumero}º</span>
          </div>
          <div className={styles.studentRow}>
            <span>NOMBRE: {alumno.nombres}</span>
            <span>TURNO: {curso.turno}</span>
          </div>
        </div>
        <div className={styles.subjectBox}>
          <span className={styles.subjectTitle}>{rightSubjectLabel}</span>
          <div className={styles.subjectUnderlineRow}>
            <span className={styles.subjectLine} />
            <span className={styles.subjectEp}>EP</span>
          </div>
        </div>
      </div>
    </>
  );

  const renderFooter = () => (
    <table className={styles.signaturesTable}>
      <thead>
        <tr>
          <th>MAESTRA</th>
          <th>DIRECCIÓN</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div className={`${styles.sigPartyGrid} ${styles.sigValuesRow}`}>
              <span>{docente.nombre}</span>
              <span>{docente.apellido}</span>
              <span />
            </div>
            <div className={`${styles.sigPartyGrid} ${styles.sigLabelsRow}`}>
              <span>NOMBRE</span>
              <span>APELLIDO</span>
              <span>FIRMA</span>
            </div>
          </td>
          <td>
            <div className={`${styles.sigPartyGrid} ${styles.sigValuesRow}`}>
              <span>{direccion.nombre}</span>
              <span>{direccion.apellido}</span>
              <span />
            </div>
            <div className={`${styles.sigPartyGrid} ${styles.sigLabelsRow}`}>
              <span>NOMBRE</span>
              <span>APELLIDO</span>
              <span>FIRMA</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );

  return (
    <div className={styles.documentRoot}>
      {pages.map((page, pageIdx) => {
        const isLastItemsPage = pageIdx === pages.length - 1;
        return (
          <section key={page.pageNumber} className={styles.page}>
            <div className={styles.topSection}>
              {renderHeader()}

              <div className={styles.bodyArea}>
                {pageIdx === 0 && plantilla.mostrarLeyendaEscala && (
                  <table className={styles.legendTable}>
                    <tbody>
                      {visibleEscalaItems.map((opt, idx) => (
                        <tr key={opt.codigo}>
                          {idx === 0 && (
                            <td
                              rowSpan={visibleEscalaItems.length}
                              className={styles.legendTitleCell}
                            >
                              Contenidos
                            </td>
                          )}
                          <td>{opt.descripcion || opt.etiqueta}</td>
                          <td className={styles.legendCodeCell}>{opt.codigo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <table className={styles.itemsTable}>
                  <thead>
                    <tr>
                      <th
                        colSpan={hasBlocks ? 2 : 1}
                        className={styles.itemsHeaderTitle}
                      >
                        {plantilla.tituloTabla}
                      </th>
                      {visibleEscalaItems.map((opt) => (
                        <th
                          key={opt.codigo}
                          className={
                            compactScaleHeader
                              ? styles.itemsHeaderOptionCompact
                              : styles.itemsHeaderOption
                          }
                        >
                          {opt.etiqueta}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {page.rows.map(({ item, showBlockCell, blockRowSpan }) => {
                      const selectedCode = respuestaByItemId.get(item.id) || '';
                      return (
                        <tr key={item.id}>
                          {hasBlocks && showBlockCell && (
                            <td rowSpan={blockRowSpan} className={styles.blockCell}>
                              {item.bloqueNombre}
                            </td>
                          )}
                          <td className={styles.itemTextCell}>{item.texto}</td>
                          {visibleEscalaItems.map((opt) => (
                            <td key={opt.codigo} className={styles.itemMarkCell}>
                              {selectedCode === opt.codigo ? 'X' : ''}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {isLastItemsPage && plantilla.requiereDesempenoGeneral && (
                  <>
                    <div className={styles.desempenoBox}>
                      <div className={styles.desempenoCenter}>
                        <span className={styles.desempenoHeading}>Desempeño General</span>
                        <span className={styles.desempenoSub}>
                          E. Primaria &nbsp; {rightSubjectLabel}
                        </span>
                      </div>
                      <span className={styles.desempenoValue}>
                        {evaluacion.desempenoGeneralEtiqueta ||
                          evaluacion.desempenoGeneralCodigo ||
                          '-'}
                      </span>
                      <img src="/isotype.png" alt="" className={styles.sealLogo} />
                    </div>
                    {evaluacion.observaciones.trim() !== '' && (
                      <p className={styles.observacionesNote}>{evaluacion.observaciones}</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {renderFooter()}
          </section>
        );
      })}

      {!plantilla.requiereDesempenoGeneral && plantilla.permiteObservaciones && (
        <section className={styles.page}>
          <div className={styles.topSection}>
            {renderHeader()}
            <div className={styles.bodyArea}>
              <div className={styles.observacionesSheet}>
                <strong>Observaciones:</strong>{' '}
                {evaluacion.observaciones.trim() !== '' ? evaluacion.observaciones : '-'}
              </div>
            </div>
          </div>
          {renderFooter()}
        </section>
      )}
    </div>
  );
};
