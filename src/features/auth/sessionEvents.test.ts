import { describe, it, expect, afterEach, vi } from 'vitest'

import { registerSessionExpiredHandler, SESSION_EXPIRED_EVENT } from './sessionEvents'
import { saveToken } from './tokenStore'

// El wiring del 401 pasivo: el evento que emite el cliente HTTP (api()) dispara
// la política de expiración (limpiar token + navegar a /login) desde la capa
// de auth, no desde el cliente.
describe('sessionEvents — expiración de sesión', () => {
  afterEach(() => {
    localStorage.removeItem('inventory_token')
  })

  it('el handler registrado limpia el token y navega a /login', () => {
    saveToken('x.y.z')
    const assign = vi.fn()
    // jsdom no implementa navegación real: el spy captura el intento.
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign },
      writable: true,
    })

    const cleanup = registerSessionExpiredHandler()
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))

    expect(localStorage.getItem('inventory_token')).toBeNull()
    expect(assign).toHaveBeenCalledWith('/login')
    cleanup()
  })

  it('el cleanup desregistra el handler: el evento ya no expira la sesión', () => {
    const assign = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign },
      writable: true,
    })

    const cleanup = registerSessionExpiredHandler()
    cleanup()
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))

    expect(assign).not.toHaveBeenCalled()
  })
})