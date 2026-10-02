import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, it, expect, vi } from 'vitest'

import { server } from '../../test/test-utils'
import { LoginPage } from './LoginPage'
import * as tokenStore from './tokenStore'

// El router real se agrega cuando haya más de una página; por ahora
// un spy reemplaza la navegación para observar el efecto del login.
const navigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => navigate }
})

function renderLogin() {
  return render(<LoginPage />)
}

// IMPORTANTE (causa raíz de un bug de tests): userEvent.setup() REEMPLAZA
// navigator.clipboard con su propio stub (Clipboard.js: attachClipboardStubToView).
// Por eso el mock debe definirse DESPUÉS del setup, no antes: si va antes, el
// setup lo pisa y el componente habla con el stub de user-event (que resuelve).
function mockClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
  return writeText
}

afterEach(() => {
  delete (navigator as unknown as Record<string, unknown>).clipboard
})

// Los aria-label de los botones "Copiar email/contraseña de demostración"
// colisionan con selectores de texto genéricos: las queries de los inputs
// deben apuntar al rol/etiqueta exactos, no a /email/i suelto.
function emailInput() {
  return screen.getByRole('textbox', { name: /email/i })
}

function passwordInput() {
  return screen.getByLabelText('Contraseña')
}

describe('LoginPage', () => {
  it('renderiza el formulario con email, password y botón', () => {
    renderLogin()
    expect(emailInput()).toBeInTheDocument()
    expect(passwordInput()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar sesión|login/i })).toBeInTheDocument()
  })

  it('muestra la cuenta de demostración pública (vitrina del portfolio)', () => {
    renderLogin()
    expect(screen.getByLabelText(/cuenta de demostración/i)).toBeInTheDocument()
    expect(screen.getByText('demo@inventory.com')).toBeInTheDocument()
    expect(screen.getByText('demo1234')).toBeInTheDocument()
  })

  // El setup de user-event DEBE ir antes de mockClipboard(): si mockClipboard va
// primero, userEvent.setup() pisa navigator.clipboard con su propio stub.
it('copia el email de demostración al portapapeles y muestra feedback', async () => {
    const user = userEvent.setup()
    const writeText = mockClipboard()
    renderLogin()

    await user.click(screen.getByRole('button', { name: /copiar email de demostración/i }))

    expect(writeText).toHaveBeenCalledWith('demo@inventory.com')
    expect(await screen.findByText('¡Copiado!')).toBeInTheDocument()
  })

  it('copia la contraseña de demostración al portapapeles', async () => {
    const user = userEvent.setup()
    const writeText = mockClipboard()
    renderLogin()

    await user.click(screen.getByRole('button', { name: /copiar contraseña de demostración/i }))

    expect(writeText).toHaveBeenCalledWith('demo1234')
  })

  it('no muestra feedback si el clipboard rechaza (permisos denegados)', async () => {
    const user = userEvent.setup()

    // Caso real del catch: writeText existe pero FALLA (contexto no seguro o
    // permiso denegado). El handler debe tragarlo sin feedback; el valor sigue
    // seleccionable a mano gracias al user-select: all del <code>.
    const writeText = vi.fn().mockRejectedValue(new Error('NotAllowedError'))
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    renderLogin()

    const emailCopy = screen.getByRole('button', { name: /copiar email de demostración/i })
    await user.click(emailCopy)

    expect(writeText).toHaveBeenCalledWith('demo@inventory.com')
    expect(emailCopy).toHaveTextContent('Copiar')
  })

  it('login exitoso guarda el token y navega a /products', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(emailInput(), 'admin@inventory.com')
    await user.type(passwordInput(), 'admin123')
    await user.click(screen.getByRole('button', { name: /iniciar sesión|login/i }))

    await waitFor(() => {
      expect(tokenStore.getToken()).toBe('jwt-de-prueba')
    })
    expect(navigate).toHaveBeenCalledWith('/products')
  })

  it('401 muestra "Invalid credentials" y no guarda token', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(emailInput(), 'admin@inventory.com')
    await user.type(passwordInput(), 'incorrecta')
    await user.click(screen.getByRole('button', { name: /iniciar sesión|login/i }))

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
    expect(tokenStore.getToken()).toBeNull()
  })

  it('400 muestra el mensaje de validación del servidor', async () => {
    const user = userEvent.setup()
    renderLogin()

    // Email válido (la validación nativa lo exige) pero password corta:
    // pasa la validación nativa y falla en el server con 400.
    await user.type(emailInput(), 'admin@inventory.com')
    await user.type(passwordInput(), '123')
    await user.click(screen.getByRole('button', { name: /iniciar sesión|login/i }))

    expect(await screen.findByText('Invalid data')).toBeInTheDocument()
  })

  it('error de red muestra un mensaje propio', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/auth/login', () => HttpResponse.error()),
    )
    renderLogin()

    await user.type(emailInput(), 'admin@inventory.com')
    await user.type(passwordInput(), 'admin123')
    await user.click(screen.getByRole('button', { name: /iniciar sesión|login/i }))

    expect(await screen.findByText(/no se pudo conectar/i)).toBeInTheDocument()
    expect(tokenStore.getToken()).toBeNull()
  })
})
