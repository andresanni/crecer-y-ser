import { createRoot } from 'react-dom/client';
import { DocumentPreview } from './DocumentPreview';

if (import.meta.env.DEV) {
  createRoot(document.getElementById('root')!).render(<DocumentPreview />);
}
