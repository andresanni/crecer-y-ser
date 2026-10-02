import type { Alumno } from '../models/alumno.model';
import { CursadaModal } from '../../inscripciones/components/CursadaModal';

interface Props {
  visible: boolean;
  alumno: Alumno | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const DarDeBajaModal = ({ visible, alumno, onClose, onSuccess }: Props) =>
  visible && alumno?.inscripcionId ? <CursadaModal inscripcionId={alumno.inscripcionId} registrarBaja onClose={onClose} onSuccess={onSuccess} /> : null;
