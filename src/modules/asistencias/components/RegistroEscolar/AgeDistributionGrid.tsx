import type { RegistroEscolarData } from './types';

export function AgeDistributionGrid({ data }: { data: RegistroEscolarData }) {
  if (!data.ageDistribution) return null;
  const rows = data.ageDistribution.rows.filter(row => row.t > 0).sort((a, b) => a.edad - b.edad);
  const older = data.ageDistribution.older;
  const hasOlder = older && older.t > 0;
  const count = Math.max(1, rows.length + (hasOlder ? 1 : 0));
  const top = 383.0403;
  const bodyTop = 400.9299;
  const rowHeight = Math.min(9.79667, (518.5 - bodyTop - 9.79667) / count);
  const totalTop = bodyTop + count * rowHeight;
  const bottom = totalTop + 9.79667;
  const edges = [295.9273, 331.7064, 343.6328, 355.5592, 367.4856];
  const size = Math.min(6.6447, rowHeight * 0.6783);
  const rowValues = rows.map(row => ({ label: String(row.edad), v: row.v, m: row.m, t: row.t }));
  if (hasOlder) rowValues.push({ label: 'OTROS', ...older });

  return <g data-age-table="true" fontFamily="Arial, Helvetica, sans-serif" fill="#000000">
    <rect x={295.6} y={382.7} width={72.2} height={Math.max(499.4, bottom + 0.3) - 382.7} fill="#ffffff" />
    <rect x={edges[0]} y={top} width={edges[4] - edges[0]} height={8.9448} fill="#efefef" />
    <g stroke="#000000" strokeWidth={0.4259} fill="none">
      <rect x={edges[0]} y={top} width={edges[4] - edges[0]} height={bottom - top} />
      {edges.slice(1, 4).map(x => <line key={x} x1={x} x2={x} y1={391.9851} y2={bottom} />)}
      {[391.9851, bodyTop, ...Array.from({ length: count }, (_, row) => bodyTop + (row + 1) * rowHeight)].map(y => <line key={y} x1={edges[0]} x2={edges[4]} y1={y} y2={y} />)}
    </g>
    <text x={(edges[0] + edges[4]) / 2} y={389.6298} textAnchor="middle" fontSize={6.091}>ALUMNOS POR EDAD</text>
    {['AÑOS', 'V', 'M', 'T'].map((label, col) => <text key={label} x={(edges[col] + edges[col + 1]) / 2} y={398.5746} textAnchor="middle" fontSize={6.091}>{label}</text>)}
    {rowValues.map((row, index) => <g key={row.label} data-age={row.label}>
      {[row.label, row.v || '-', row.m || '-', row.t || '-'].map((value, col) => <text key={col} data-field={`ages.${index}.${col}`}
        x={(edges[col] + edges[col + 1]) / 2} y={bodyTop + index * rowHeight + rowHeight * 0.74785} textAnchor="middle" fontSize={size}>{value}</text>)}
    </g>)}
    {['TOTAL', data.footer?.t1139 ?? '-', data.footer?.t1140 ?? '-', data.footer?.t1141 ?? '-'].map((value, col) => <text key={col}
      data-field={col ? `footer.t${1138 + col}` : undefined} x={(edges[col] + edges[col + 1]) / 2} y={totalTop + 7.324} textAnchor="middle" fontSize={col ? 6.6447 : 6.091}>{value}</text>)}
  </g>;
}
