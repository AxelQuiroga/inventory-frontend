import { cleanup, render } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { afterEach, beforeAll, afterAll } from 'vitest'
import { allHandlers } from './msw-handlers'

// Servidor MSW compartido: intercepta fetch en cada test. Cada test puede
// sobrescribir handlers con server.use(...) para forzar escenarios.
export const server = setupServer(...allHandlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  localStorage.clear() // jsdom comparte localStorage entre tests: sin esto, el token de un test contamina al siguiente
  server.resetHandlers()
})
afterAll(() => server.close())

export function renderWithProviders(ui: React.ReactElement) {
  return render(ui)
}
