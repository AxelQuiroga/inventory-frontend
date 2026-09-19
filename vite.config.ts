/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Los tests de componentes corren en un DOM simulado, con matchers de
    // jest-dom cargados en src/test/setup.ts.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    css: false,
    // Misma base URL que dev (del .env.example): hace determinísticas las
    // aserciones de URL en los tests del api client.
    env: { VITE_API_URL: 'http://localhost:3000' },
  },
})
