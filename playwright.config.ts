import { defineConfig } from '@playwright/test'

// E2E real del ERP: Chromium headless navega la app (vite dev real) contra el
// backend REAL (Fastify + TEST DB) en 127.0.0.1:3210. Sin mocks: browser →
// vite → React → fetch → Fastify → use cases → PostgreSQL.
//
// Ambos servers los levanta y mata playwright (webServer), así la suite es
// autocontenida y reproducible en CI.
export default defineConfig({
  testDir: './e2e',
  // Los specs comparten UNA TEST DB: un worker por archivo, secuencial.
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  // En CI un retry convierte flakes transitorios (arranque de servers,
  // cold start de Postgres) en evidencia útil: con trace retenida se puede
  // ver el frame exacto del fallo.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4310',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      // La app: vite dev con VITE_API_URL apuntando al backend de PRUEBA.
      // --host 127.0.0.1: con Node 24, vite v8 bindea SOLO IPv6 (::1) si no se
      // fuerza el host, y el healthcheck de Playwright (IPv4) nunca lo vería.
      command: 'npx vite --port 4310 --strictPort --host 127.0.0.1',
      url: 'http://127.0.0.1:4310',
      reuseExistingServer: false,
      timeout: 60_000,
      env: { ...process.env, VITE_API_URL: 'http://127.0.0.1:3210' },
    },
    {
      // El backend real de test (mismo script que levanta los e2e, en el
      // puerto 3210). tsx es dependencia del backend.
      command: 'npx tsx scripts/e2e-server.ts',
      url: 'http://127.0.0.1:3210/health',
      reuseExistingServer: false,
      timeout: 60_000,
      cwd: '../backend',
      env: { ...process.env, E2E_HOST: '127.0.0.1', E2E_PORT: '3210' },
    },
  ],
})