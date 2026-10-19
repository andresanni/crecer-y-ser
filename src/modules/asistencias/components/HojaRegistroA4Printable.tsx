import type { RegistroMensualCompleto } from '../models/estadisticasAsistencia.model';
import { RegistroEscolar, adaptarRegistroEscolar } from './RegistroEscolar';

interface HojaRegistroA4PrintableProps {
  registro: RegistroMensualCompleto;
}

export const HojaRegistroA4Printable = ({ registro }: HojaRegistroA4PrintableProps) => {
  const data = adaptarRegistroEscolar(registro);
  return <RegistroEscolar data={data} />;
};

export default HojaRegistroA4Printable;
