import { build } from 'vite';
import react from '@vitejs/plugin-react';

await build({
  configFile: false,
  plugins: [react()],
  define: { 'import.meta.env.VITE_DOCUMENT_RENDER': JSON.stringify('true') },
  build: { outDir: 'dist-render', rollupOptions: { input: 'boletin-render.html' } },
});
