import type { RegistroEscolarData } from './types';
import { textWidth, wrapText } from './textLayout';
import { displayAssessment, evaluationColumns, EVALUATION_LEFT, EVALUATION_RIGHT, EVALUATION_TOP, EVALUATION_HEADER_BOTTOM, EVALUATION_BOTTOM } from './cyclePresentation';

export function EvaluationGrid({ data, firstCycle, rowCount, rowHeight, rowSize }: {
  data: RegistroEscolarData; firstCycle: boolean; rowCount: number; rowHeight: number; rowSize: number;
}) {
  const columns = evaluationColumns(firstCycle);
  const observationLeft = columns.at(-1)!.right;
  const classroomLeft = columns.find(column => column.field === 'classroom')!.left;
  const coexistenceLeft = columns.find(column => column.field === 'coexistence')!.left;
  const groupBottom = 92.548;
  const rowY = (row: number) => EVALUATION_HEADER_BOTTOM + row * rowHeight + rowHeight * 0.74785;
  const observationWidth = EVALUATION_RIGHT - observationLeft - 3;

  return <g data-evaluation-cycle={firstCycle ? 'first' : 'second'} fontFamily="Arial, Helvetica, sans-serif" fill="#000000">
    <rect x={EVALUATION_LEFT} y={EVALUATION_TOP} width={EVALUATION_RIGHT - EVALUATION_LEFT} height={EVALUATION_BOTTOM - EVALUATION_TOP} fill="#ffffff" />
    <rect x={EVALUATION_LEFT} y={EVALUATION_TOP} width={EVALUATION_RIGHT - EVALUATION_LEFT} height={EVALUATION_HEADER_BOTTOM - EVALUATION_TOP} fill="#f2f2f2" />
    <g stroke="#000000" strokeWidth={0.4259} fill="none">
      <rect x={EVALUATION_LEFT} y={EVALUATION_TOP} width={EVALUATION_RIGHT - EVALUATION_LEFT} height={EVALUATION_BOTTOM - EVALUATION_TOP} />
      {columns.slice(1).map(column => <line key={column.key} x1={column.left} x2={column.left}
        y1={column.field === 'grades' || column.index === 0 ? EVALUATION_TOP : groupBottom} y2={EVALUATION_BOTTOM} />)}
      <line x1={observationLeft} x2={observationLeft} y1={EVALUATION_TOP} y2={EVALUATION_BOTTOM} />
      <line x1={classroomLeft} x2={observationLeft} y1={groupBottom} y2={groupBottom} />
      {[EVALUATION_HEADER_BOTTOM, ...Array.from({ length: rowCount }, (_, row) => EVALUATION_HEADER_BOTTOM + (row + 1) * rowHeight), 364.299].map((y, index) =>
        <line key={index} x1={EVALUATION_LEFT} x2={EVALUATION_RIGHT} y1={y} y2={y} />)}
    </g>
    <text x={(classroomLeft + coexistenceLeft) / 2} y={85.87} textAnchor="middle" fontSize={6.6447}>TRABAJO EN EL AULA</text>
    <text x={(coexistenceLeft + observationLeft) / 2} y={85.87} textAnchor="middle" fontSize={6.6447}>CONVIVENCIA</text>
    <text data-observation-header="true" x={(observationLeft + EVALUATION_RIGHT) / 2} y={112.65} textAnchor="middle" fontSize={6.6447}>OBSERV</text>
    {columns.map(column => {
      const center = (column.left + column.right) / 2;
      const top = column.field === 'grades' ? EVALUATION_TOP : groupBottom;
      const middle = (top + EVALUATION_HEADER_BOTTOM) / 2;
      const size = column.field === 'grades' ? column.key === 'world' ? 4.98 : column.labels.length > 1 ? 5.54 : 6.091 : 5.2;
      return <g key={column.key} data-assessment-column={column.key} data-column-left={column.left} data-column-right={column.right}>
        {column.labels.map((label, index) => {
          const x = center + (index - (column.labels.length - 1) / 2) * 6.1 + size * 0.32;
          return <text key={index} x={x} y={middle} textAnchor="middle" fontSize={size}
            textLength={Math.min(textWidth(label, size), EVALUATION_HEADER_BOTTOM - top - 4)} lengthAdjust="spacingAndGlyphs"
            transform={`rotate(-90 ${x} ${middle})`}>{label}</text>;
        })}
        {data.students.map((student, row) => {
          if (!student.name) return null;
          const value = displayAssessment(student[column.field][column.index] ?? '', firstCycle);
          const width = column.right - column.left - 1.5;
          return <text key={student.id} data-field={`students.${row}.${column.field}.${column.index}`}
            x={center} y={rowY(row)} fontSize={rowSize} textAnchor="middle"
            textLength={textWidth(value, rowSize) > width ? width : undefined} lengthAdjust="spacingAndGlyphs">{value}</text>;
        })}
      </g>;
    })}
    {data.students.map((student, row) => {
      if (!student.name) return null;
      const maxSize = Math.min(6.091, rowSize);
      const lines = wrapText(student.observation, observationWidth, maxSize);
      const twoLines = lines.length > 1;
      const size = twoLines ? Math.min(maxSize, (rowHeight - 1) / 2.1) : maxSize;
      const wrapped = lines;
      const fitSize = wrapped.length > 2 ? Math.min(size, (rowHeight - 1) / (wrapped.length * 1.05)) : size;
      return <text key={student.id} data-field={`students.${row}.observation`} x={(observationLeft + EVALUATION_RIGHT) / 2}
        y={twoLines ? EVALUATION_HEADER_BOTTOM + row * rowHeight + fitSize + 0.25 : rowY(row)}
        fontSize={fitSize} textAnchor="middle">
        {wrapped.map((line, index) => <tspan key={index} x={(observationLeft + EVALUATION_RIGHT) / 2} dy={index ? fitSize * 1.05 : 0}>{line}</tspan>)}
      </text>;
    })}
  </g>;
}
