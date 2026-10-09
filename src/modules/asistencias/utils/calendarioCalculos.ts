import dayjs from 'dayjs';

interface MesConfigurado {
  mes: number;
  total_dias_habiles: number;
}

export const calcularDiasHabilesYAcumulado = (
  ano: number,
  mes: number,
  diasSinClase: number[],
  mesesConfigurados: MesConfigurado[],
) => {
  const inicio = dayjs(`${ano}-${String(mes).padStart(2, '0')}-01`);
  const excluidos = new Set(diasSinClase);
  let habiles = 0;
  for (let dia = 1; dia <= inicio.daysInMonth(); dia++) {
    const semana = inicio.date(dia).day();
    if (semana !== 0 && semana !== 6 && !excluidos.has(dia)) habiles++;
  }
  const anteriores = mesesConfigurados.filter((item) => item.mes >= 2 && item.mes < mes);
  const mesesPendientes = Array.from({ length: Math.max(0, mes - 2) }, (_, index) => index + 2)
    .filter((numero) => !anteriores.some((item) => item.mes === numero));
  return {
    habiles,
    acumulado: anteriores.reduce((total, item) => total + item.total_dias_habiles, habiles),
    mesesPendientes,
  };
};
