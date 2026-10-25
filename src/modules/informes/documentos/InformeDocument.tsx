import React, { useMemo } from 'react';
import { isNoCorrespondeOption, type ItemPlantillaInforme } from '../models/informe.model';
import type { InformeDocumentSnapshotDatos } from './informeSnapshot.model';
import { HeaderDecorations } from './HeaderDecorations';
import styles from './InformeDocument.module.css';

interface InformeDocumentProps {
  data: InformeDocumentSnapshotDatos;
  mostrarSubtituloColegio?: boolean;
}

interface PageRowEntry {
  item: ItemPlantillaInforme;
  showBlockCell: boolean;
  blockRowSpan: number;
}

const ESPECIALES_ILLUSTRATIONS = [
  '/informes/artes-visuales/personaje_01.png',
  '/informes/artes-visuales/personaje_02.png',
  '/informes/artes-visuales/personaje_03.png',
  '/informes/artes-visuales/personaje_04.png',
  '/informes/artes-visuales/personaje_05.png',
  '/informes/artes-visuales/personaje_06.png',
  '/informes/artes-visuales/personaje_07.png',
  '/informes/artes-visuales/personaje_08.png',
];

export const InformeDocument: React.FC<InformeDocumentProps> = ({
  data,
  mostrarSubtituloColegio = true,
}) => {
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

  const hasObservaciones = Boolean(
    evaluacion.observaciones &&
    evaluacion.observaciones.trim() !== '' &&
    evaluacion.observaciones.trim() !== '-' &&
    evaluacion.observaciones.trim() !== '--',
  );

  const illustrations = useMemo(() => {
    if (isSpecialCycleFinal) {
      return ESPECIALES_ILLUSTRATIONS;
    }
    return [];
  }, [isSpecialCycleFinal]);

  const renderHeader = () => (
    <>
      <div className={styles.headerWrapper}>
        <HeaderDecorations />
        <div className={styles.headerBanner}>
          <div className={styles.headerLeft}>
            <h1 className={styles.informeTitle}>INFORME</h1>
            <div className={styles.informeSubRow}>
              <span className={styles.categoryBadgeModern}>
                {isSpecialCycleFinal ? 'ESPECIALES' : 'MAESTRAS'}
              </span>
              <span className={styles.subRowDivider} />
              <span className={styles.instanceLabel}>{instanceTitle}</span>
              <span className={styles.subRowDivider} />
              <span className={styles.yearLabel}>{ciclo.ano}</span>
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.brandTextLockup}>
              <span className={styles.brandSchoolName}>COLEGIO CRECER Y SER</span>
              {mostrarSubtituloColegio && (
                <span className={styles.brandSchoolTagline}>EDUCACIÓN INICIAL Y PRIMARIA</span>
              )}
            </div>
            <img src="/escudo-circular.png" alt="Escudo del Colegio Crecer y Ser" className={styles.brandLogo} />
          </div>
        </div>
        <div className={styles.headerDividingBar}>
          <div className={styles.barBlue} />
          <div className={styles.barRed} />
        </div>
      </div>

      <div className={styles.studentAndSubjectBar}>
        <div className={styles.studentCard}>
          <div className={styles.studentRow}>
            <div className={styles.dataField}>
              <span className={styles.dataLabel}>APELLIDO:</span>
              <span className={styles.dataValue}>{alumno.apellidos}</span>
            </div>
            <div className={styles.dataField}>
              <span className={styles.dataLabel}>GRADO:</span>
              <span className={styles.dataValue}>{curso.gradoNumero}º</span>
            </div>
          </div>
          <div className={styles.studentRow}>
            <div className={styles.dataField}>
              <span className={styles.dataLabel}>NOMBRE:</span>
              <span className={styles.dataValue}>{alumno.nombres}</span>
            </div>
            <div className={styles.dataField}>
              <span className={styles.dataLabel}>TURNO:</span>
              <span className={styles.dataValue}>{curso.turno}</span>
            </div>
          </div>
        </div>

        <div className={styles.subjectBox}>
          <svg viewBox="0 0 60 40" className={styles.subjectCardDec} aria-hidden="true">
            <path
              d="M 44,0 C 44,14 50,26 60,32"
              stroke="#b91c1c"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 52,0 C 52,9 56,18 60,22"
              stroke="#1a4480"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <span className={styles.subjectTitleScript}>
            {rightSubjectLabel}
          </span>
          <div className={styles.subjectLine} />
          <span className={styles.subjectSubtitle}>EDUCACIÓN PRIMARIA</span>
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

                <div className={styles.tableAndIllustrationsLayout}>
                  {illustrations.length > 0 && (
                    <div className={styles.illustrationsColumn} aria-hidden="true">
                      {illustrations.map((src) => (
                        <img
                          key={src}
                          src={src}
                          alt=""
                          className={styles.illustrationImage}
                        />
                      ))}
                    </div>
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
                </div>

                {isLastItemsPage && plantilla.requiereDesempenoGeneral && (
                  <div
                    className={`${styles.desempenoCard} ${
                      hasObservaciones
                        ? styles.desempenoCardExtended
                        : styles.desempenoCardRegular
                    }`}
                  >
                    <div className={styles.desempenoRow}>
                      <img
                        src="/informes/ninos-lectores.png"
                        alt=""
                        className={styles.desempenoKidsIllustration}
                      />
                      <div className={styles.desempenoCenter}>
                        <span className={styles.desempenoHeading}>Desempeño General</span>
                        <span className={styles.desempenoSub}>
                          E. Primaria &nbsp;&nbsp; {rightSubjectLabel}
                        </span>
                      </div>
                      <span className={styles.desempenoValue}>
                        {evaluacion.desempenoGeneralEtiqueta ||
                          evaluacion.desempenoGeneralCodigo ||
                          '-'}
                      </span>
                      <img
                        src="/escudo-circular.png"
                        alt="Escudo Colegio Crecer y Ser"
                        className={styles.desempenoSeal}
                      />
                    </div>
                    {hasObservaciones && (
                      <div className={styles.observacionesContainer}>
                        <p className={styles.observacionesNote}>{evaluacion.observaciones}</p>
                      </div>
                    )}
                  </div>
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
