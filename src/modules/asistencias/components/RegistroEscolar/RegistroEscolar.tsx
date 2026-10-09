import { useId } from 'react';
import layout from './reference-layout.json';
import type { RegistroEscolarProps } from './types';
import { textWidth, wrapText } from './textLayout';
import { EvaluationGrid } from './EvaluationGrid';
import { AgeDistributionGrid } from './AgeDistributionGrid';
import { observationsWithDays } from './cyclePresentation';
import styles from './RegistroEscolar.module.css';

const GRID_LEFT = 146.848;
const GRID_RIGHT = 516.565;
const BODY_TOP = 147.068;
const NUMBERED_BOTTOM = 352.7984;
const BODY_BOTTOM = 364.299;
const TOTAL_BOTTOM = 374.096;
const TOTAL_EDGES = [516.565, 528.918, 540.418, 551.919];
const HEADER_BOXES: Record<string, readonly [number, number]> = {
  month: [74.01, 140.03], workingDays: [230.33, 248.65],
  accumulatedWorkingDays: [409.23, 427.12], grade: [528.92, 540.85],
  section: [683.11, 703.13], shift: [847.52, 889.26], year: [950.17, 985.1],
};
const SOURCE_CELLS: Readonly<Record<string, { x: number; y: number; size: number; width: number; text: string }>> = layout.cells;

function Cell({ field, value, x, y, size = 6.6447, anchor = 'middle', fill = '#000000', width, clip, useSource = true }: {
  field: string; value: string | number; x: number; y: number; size?: number;
  anchor?: 'start' | 'middle'; fill?: string; width?: number; clip?: string; useSource?: boolean;
}) {
  const source = useSource ? SOURCE_CELLS[field] : undefined;
  const unchanged = source && String(value) === source.text;
  const actualSize = unchanged ? source.size : size;
  const fittedWidth = width && textWidth(String(value), actualSize) > width ? width : undefined;
  return <text data-field={field} x={unchanged ? source.x : x} y={unchanged ? source.y : y}
    fontSize={actualSize} textAnchor={unchanged ? 'start' : anchor}
    textLength={unchanged && source.text.trim() ? source.width : fittedWidth}
    lengthAdjust="spacingAndGlyphs" fill={fill} clipPath={clip}>{value}</text>;
}

function isCalendarText(run: { x: number; y: number; field?: string }) {
  return (run.x > GRID_LEFT && run.x < GRID_RIGHT && run.y > BODY_TOP && run.y < TOTAL_BOTTOM)
    || run.field?.startsWith('monthlyTotals.') || run.field?.startsWith('dailyTotals.');
}

export function RegistroEscolar({ data, className = '', showPresentMarks = false, title = 'Registro oficial de asistencia mensual' }: RegistroEscolarProps) {
  const uid = useId().replace(/:/g, '');
  const rowCount = Math.max(21, data.students.length);
  if (rowCount > 24) throw new RangeError('La hoja admite hasta 24 alumnos.');
  const rowHeight = (NUMBERED_BOTTOM - BODY_TOP) / rowCount;
  const rowSize = Math.min(6.6447, rowHeight * 0.6783);
  const rowY = (row: number) => BODY_TOP + row * rowHeight + rowHeight * 0.74785;
  const blocked = new Set(data.blockedDays);
  const firstCycle = data.firstCycle ?? /^[123](?:\D|$)/.test(data.header.grade.trim());
  const events = new Map<number, string[]>();
  for (const event of data.events) events.set(event.dia, [...(events.get(event.dia) ?? []), event.texto]);
  const baseLines = layout.lines.filter(line => line.stroke !== '#ff0000'
    && !(line.y1 === line.y2 && line.y1 > BODY_TOP + 0.1 && line.y1 < BODY_BOTTOM - 0.1));
  const baseTexts = layout.text.filter(run => {
    if (isCalendarText(run)) return false;
    if (run.x < 31 && run.y > BODY_TOP && run.y < BODY_BOTTOM && /^\d+$/.test(run.text)) return false;
    if (run.x > 865 && run.y > 395 && run.y < 520) return false;
    if (run.x > 30 && run.x < 140 && run.y > 400 && run.y < 450) return false;
    if (run.x >= 551.919 && run.y >= 73.806 && run.y < TOTAL_BOTTOM) return false;
    if (data.ageDistribution && run.x > 295 && run.x < 368 && run.y > 382 && run.y < 500) return false;
    return true;
  });
  const numberedObservations = observationsWithDays(data);
  const observationSize = [5.54, 5.2, 4.8, 4.43, 4.0].find(size =>
    numberedObservations.flatMap(text => wrapText(text, 113.7, size)).length * size * 1.15 <= 73) ?? 4.0;
  const observationLines = numberedObservations.flatMap(text => wrapText(text, 113.7, observationSize));
  const legend = firstCycle
    ? ['DESTACADO', 'AVANZADO', 'ALCANZADO', 'EN PROCESO', 'NO ALCANZÓ LOS OBJETIVOS']
    : ['DESTACADO 10', 'AVANZADO 9 - 8', 'ALCANZADO 7 - 6', 'EN PROCESO 5 - 4', 'NO ALCANZÓ LOS OBJETIVOS 1 - 2 - 3'];

  return <div className={styles.sheetWrapper}>
    <style media="print">{'@page { size: A4 landscape; margin: 0; }'}</style>
    <svg className={`${styles.registroEscolar} ${className}`.trim()} xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${layout.width} ${layout.height}`} width={layout.width} height={layout.height}
      role="img" aria-labelledby={`${uid}-title ${uid}-description`}>
      <title id={`${uid}-title`}>{title}</title>
      <desc id={`${uid}-description`}>Planilla de asistencia, calificaciones, trabajo en el aula y convivencia.</desc>
      <defs>
        {Array.from({ length: rowCount }, (_, row) => <g key={row}>
          <clipPath id={`${uid}-name-${row}`}><rect x={32} y={BODY_TOP + row * rowHeight} width={114.4} height={rowHeight} /></clipPath>
        </g>)}
        <clipPath id={`${uid}-observations`}><rect x={869.8} y={393} width={115} height={76.2} /></clipPath>
      </defs>
      <rect width={layout.width} height={layout.height} fill="#ffffff" />
      <g aria-hidden="true">
        {layout.rects.map((rect, i) => <rect key={i} {...rect} />)}
        {baseLines.map(({ dash, ...line }, i) => <line key={i} {...line} strokeDasharray={dash.length ? dash.join(' ') : undefined} />)}
        {Array.from({ length: rowCount }, (_, row) => <line key={`row-${row}`} x1={17.787} x2={990.213}
          y1={BODY_TOP + (row + 1) * rowHeight} y2={BODY_TOP + (row + 1) * rowHeight} stroke="#000000" strokeWidth={0.4259} />)}
        <rect x={GRID_LEFT} y={BODY_TOP + 0.22} width={GRID_RIGHT - GRID_LEFT} height={TOTAL_BOTTOM - BODY_TOP - 0.44} fill="#ffffff" />
        {Array.from({ length: 32 }, (_, day) => <line key={`day-border-${day}`} data-day-border={day}
          x1={GRID_LEFT + day * layout.dayWidth} x2={GRID_LEFT + day * layout.dayWidth}
          y1={BODY_TOP} y2={TOTAL_BOTTOM} stroke="#000000" strokeWidth={0.4259} />)}
        {Array.from({ length: 31 }, (_, i) => i + 1).filter(day => !blocked.has(day)).map(day => <g key={`day-rows-${day}`} data-day-rows={day}>
          {Array.from({ length: rowCount }, (_, row) => <line key={row}
            x1={GRID_LEFT + (day - 1) * layout.dayWidth} x2={GRID_LEFT + day * layout.dayWidth}
            y1={BODY_TOP + (row + 1) * rowHeight} y2={BODY_TOP + (row + 1) * rowHeight} stroke="#000000" strokeWidth={0.4259} />)}
        </g>)}
        <line x1={GRID_LEFT} x2={GRID_RIGHT} y1={BODY_BOTTOM} y2={BODY_BOTTOM} stroke="#000000" strokeWidth={0.4259} />
        {data.weekends.map(day => <line key={`weekend-${day}`} data-weekend={day}
          x1={GRID_LEFT + (day - 0.5) * layout.dayWidth} x2={GRID_LEFT + (day - 0.5) * layout.dayWidth}
          y1={BODY_TOP} y2={TOTAL_BOTTOM} stroke="#ff0000" strokeWidth={0.4259} />)}
      </g>
      <g fontFamily="Arial, Helvetica, sans-serif" fill="#000000">
        {baseTexts.map(run => {
          const field = 'field' in run ? run.field : undefined;
          const [section, key] = field?.split('.') ?? [];
          if (section === 'header') {
            const box = HEADER_BOXES[key];
            return <Cell key={run.id} field={field!} value={data.header[key as keyof typeof data.header] ?? run.text}
              x={(box[0] + box[1]) / 2} y={run.y} size={run.size} width={box[1] - box[0] - 2} useSource={false} />;
          }
          const value = section === 'footer' ? data.footer?.[key] ?? run.text : run.text;
          const unchanged = String(value) === run.text;
          return <text key={run.id} data-field={field} x={unchanged ? run.x : run.x + run.width / 2}
            y={run.y} fontSize={run.size} fill={run.fill} fontWeight={run.bold ? 700 : 400}
            textAnchor={unchanged ? 'start' : 'middle'}
            transform={run.rotate ? `rotate(${run.rotate} ${run.x} ${run.y})` : undefined}
            textLength={unchanged && run.text.trim() ? run.width : undefined} lengthAdjust="spacingAndGlyphs" xmlSpace="preserve">{value}</text>;
        })}
        {Array.from({ length: rowCount }, (_, row) => <text key={`number-${row}`} data-field={`students.${row}.order`} x={29.7} y={rowY(row)} textAnchor="end" fontSize={rowSize}>
          {data.students[row] && 'order' in data.students[row] ? data.students[row].order ?? '' : row + 1}
        </text>)}
        {[...events].map(([day, labels]) => {
          const characters = Array.from(labels.join(' / ').replace(/\s+/g, ' ').trim());
          const step = Math.min(7.5, (BODY_BOTTOM - BODY_TOP - 8) / Math.max(1, characters.length));
          const center = GRID_LEFT + (day - 0.5) * layout.dayWidth;
          const start = characters.length <= 5 ? (BODY_TOP + BODY_BOTTOM - (characters.length - 1) * step) / 2 : BODY_TOP + 8;
          return <g key={`event-${day}`} data-event-day={day}>
            {characters.map((char, index) => <text key={index} x={center} y={start + index * step}
              fontSize={Math.min(6.6447, step * 0.95)} textAnchor="middle">{char}</text>)}
          </g>;
        })}
        <g clipPath={`url(#${uid}-observations)`} data-observations="true">
          {observationLines.map((line, index) => <text key={index} x={870.8}
            y={399 + index * observationSize * 1.15} fontSize={observationSize}>{line}</text>)}
        </g>
        {legend.map((label, index) => <Cell key={`legend-${index}`} field={`legend.${index}`} value={label}
          x={83.27} y={408.3712 + index * layout.rowHeight} size={index === 4 ? 5.5372 : 6.091} width={106} useSource={false} />)}
        {Array.from({ length: 31 }, (_, i) => i + 1).filter(day => !blocked.has(day)).map(day => <Cell key={`daily-${day}`}
          field={`dailyTotals.${day}`} value={data.dailyTotals[day] ?? ''} x={GRID_LEFT + (day - 0.5) * layout.dayWidth} y={371.4} width={10} useSource={false} />)}
        {data.monthlyTotals.map((total, col) => <Cell key={`monthly-${col}`} field={`monthlyTotals.${col}`} value={total}
          x={(TOTAL_EDGES[col] + TOTAL_EDGES[col + 1]) / 2} y={371.4} width={10} useSource={false} />)}
        {data.students.map((student, row) => <g key={student.id} data-student-id={student.id}>
          {student.name && <>
            <Cell field={`students.${row}.name`} value={student.name} x={32.482} y={rowY(row)} size={rowSize} width={113.5}
              anchor="start" clip={`url(#${uid}-name-${row})`} useSource={rowCount === 21} />
            {Object.entries(student.attendance).map(([dayKey, mark]) => {
              const day = Number(dayKey);
              if (blocked.has(day) || day < 1 || day > 31 || !mark || (student.withdrawalFromDay && day >= student.withdrawalFromDay)) return null;
              return <Cell key={day} field={`students.${row}.attendance.${day}`} value={mark}
                x={GRID_LEFT + (day - 0.5) * layout.dayWidth} y={rowY(row)} size={rowSize} width={10.5}
                fill={mark === 'P' && !showPresentMarks ? '#ffffff' : '#000000'} useSource={rowCount === 21} />;
            })}
            {student.withdrawalFromDay && student.withdrawalFromDay <= 31 && <line data-withdrawal-from={student.withdrawalFromDay}
              x1={GRID_LEFT + (student.withdrawalFromDay - 1) * layout.dayWidth + 0.8} x2={GRID_RIGHT - 0.8}
              y1={BODY_TOP + (row + 0.5) * rowHeight} y2={BODY_TOP + (row + 0.5) * rowHeight}
              stroke="#000000" strokeWidth={0.6} />}
            {student.totals.map((total, col) => <Cell key={`total-${col}`} field={`students.${row}.totals.${col}`} value={total}
              x={(TOTAL_EDGES[col] + TOTAL_EDGES[col + 1]) / 2} y={rowY(row)} size={rowSize} width={10.5} useSource={rowCount === 21} />)}
          </>}
        </g>)}
      </g>
      <EvaluationGrid data={data} firstCycle={firstCycle} rowCount={rowCount} rowHeight={rowHeight} rowSize={rowSize} />
      <AgeDistributionGrid data={data} />
    </svg>
  </div>;
}

export default RegistroEscolar;
