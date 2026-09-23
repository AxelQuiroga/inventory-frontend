// Constantes compartidas entre la config, los helpers y los specs.
// El backend real de prueba escucha en 127.0.0.1:3210 — distinto al dev
// (3000) para que los E2E puedan correr con el dev server levantado.
export const E2E_API_URL = 'http://127.0.0.1:3210'
export const E2E_BACKEND_HOST = '127.0.0.1'
export const E2E_BACKEND_PORT = 3210

// Credenciales sembradas por resetE2eDb() en la TEST DB (mismas del e2e
// backend: bcrypt real, contraseña compartida).
export const E2E_ADMIN = { email: 'admin@inventory.com', password: 'admin123' }