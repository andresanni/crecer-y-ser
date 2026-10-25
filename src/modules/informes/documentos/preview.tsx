import { createRoot } from 'react-dom/client';
import { InformePreview } from './InformePreview';

if (import.meta.env.DEV) {
  createRoot(document.getElementById('root')!).render(<InformePreview />);
}
