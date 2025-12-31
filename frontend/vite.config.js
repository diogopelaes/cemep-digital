import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      fs: {
        // Permite servir arquivos de um nível acima (raiz do projeto)
        allow: ['..'],
      },
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    esbuild: {
      // Remove console.log e debugger apenas em produção
      drop: isProduction ? ['console', 'debugger'] : [],
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  }
})

