import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { localPdfPlugin } from './scripts/local-pdf-plugin.ts'


export default defineConfig(({ mode }) => ({
  plugins: [react(), localPdfPlugin(loadEnv(mode, process.cwd(), '').VITE_POCKETBASE_URL || '', loadEnv(mode, process.cwd(), '').CYS_PDF_WORKER_KEY || '')],
}))
