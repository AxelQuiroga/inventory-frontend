import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, it, expect, vi } from 'vitest'

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

describe('LoginPage', () => {
  it('renderiza el formulario con email, password y botón', () => {
    renderLogin()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contraseña|password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar sesión|login/i })).toBeInTheDocument()
  })

  it('login exitoso guarda el token y navega a /products', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText(/email/i), 'admin@inventory.com')
    await user.type(screen.getByLabelText(/contraseña|password/i), 'admin123')
    await user.click(screen.getByRole('button', { name: /iniciar sesión|login/i }))

    await waitFor(() => {
      expect(tokenStore.getToken()).toBe('jwt-de-prueba')
    })
    expect(navigate).toHaveBeenCalledWith('/products')
  })

  it('401 muestra "Invalid credentials" y no guarda token', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText(/email/i), 'admin@inventory.com')
    await user.type(screen.getByLabelText(/contraseña|password/i), 'incorrecta')
    await user.click(screen.getByRole('button', { name: /iniciar sesión|login/i }))

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
    expect(tokenStore.getToken()).toBeNull()
  })

  it('400 muestra el mensaje de validación del servidor', async () => {
    const user = userEvent.setup()
    renderLogin()

    // Email válido (la validación nativa lo exige) pero password corta:
    // pasa la validación nativa y falla en el server con 400.
    await user.type(screen.getByLabelText(/email/i), 'admin@inventory.com')
    await user.type(screen.getByLabelText(/contraseña|password/i), '123')
    await user.click(screen.getByRole('button', { name: /iniciar sesión|login/i }))

    expect(await screen.findByText('Invalid data')).toBeInTheDocument()
  })

  it('error de red muestra un mensaje propio', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/auth/login', () => HttpResponse.error()),
    )
    renderLogin()

    await user.type(screen.getByLabelText(/email/i), 'admin@inventory.com')
    await user.type(screen.getByLabelText(/contraseña|password/i), 'admin123')
    await user.click(screen.getByRole('button', { name: /iniciar sesión|login/i }))

    expect(await screen.findByText(/no se pudo conectar/i)).toBeInTheDocument()
    expect(tokenStore.getToken()).toBeNull()
  })
})
