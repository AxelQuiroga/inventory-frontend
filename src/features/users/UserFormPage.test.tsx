import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { http, HttpResponse } from 'msw'
import { describe, it, expect, beforeEach } from 'vitest'

import { server } from '../../test/test-utils'
import { UserFormPage } from './UserFormPage'
import { generatePassword } from './password'
import { saveToken } from '../auth/tokenStore'

function tokenFor(role: string) {
  return `x.${btoa(JSON.stringify({ email: 'a@b.c', role }))}.y`
}

function renderPage() {
  return render(
    <MemoryRouter>
      <UserFormPage />
    </MemoryRouter>,
  )
}

function fillForm(overrides: Partial<{ name: string; email: string; password: string }> = {}) {
  fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: overrides.name ?? 'Chico Nuevo' } })
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: overrides.email ?? 'chico@inventory.com' } })
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: overrides.password ?? 'Segura#123' } })
}

beforeEach(() => {
  saveToken(tokenFor('ADMIN'))
})

describe('generatePassword', () => {
  it('no incluye caracteres ambiguos (0, O, 1, l, I)', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generatePassword()).not.toMatch(/[0OIl1]/)
    }
  })

  it('incluye mayúscula, minúscula, dígito y símbolo, con 14 caracteres', () => {
    const password = generatePassword()
    expect(password).toHaveLength(14)
    expect(password).toMatch(/[A-Z]/)
    expect(password).toMatch(/[a-z]/)
    expect(password).toMatch(/[0-9]/)
    expect(password).toMatch(/[^A-Za-z0-9]/)
  })
})

describe('UserFormPage — formulario', () => {
  it('renderiza los campos y el rol OPERATOR por defecto', () => {
    renderPage()

    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByLabelText('Rol')).toHaveValue('OPERATOR')
    // La UI ofrece solo roles gestionables, nunca ADMIN (USERS_POLICY.MD)
    expect(screen.queryByRole('option', { name: /admin/i })).not.toBeInTheDocument()
  })

  it('el botón Generar rellena el campo con una password fuerte', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /generar/i }))

    const input = screen.getByLabelText('Contraseña') as HTMLInputElement
    expect(input.value).toHaveLength(14)
    expect(input.value).not.toMatch(/[0OIl1]/)
  })

  it('submit exitoso muestra las credenciales UNA sola vez (password en claro + aviso)', async () => {
    let captured: { role: string } | null = null
    server.use(
      http.post('*/auth/register', async ({ request }) => {
        const body = (await request.json()) as { role: string }
        captured = body
        return HttpResponse.json(
          {
            id: 'u-new',
            email: 'chico@inventory.com',
            name: 'Chico Nuevo',
            role: body.role,
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { status: 201 },
        )
      }),
    )
    renderPage()
    fillForm({ password: 'Segura#123' })

    fireEvent.click(screen.getByRole('button', { name: /crear usuario/i }))

    // Pantalla de credenciales: password en claro + aviso de una sola vez
    expect(await screen.findByText('Segura#123')).toBeInTheDocument()
    expect(screen.getByText(/una sola vez/i)).toBeInTheDocument()
    expect(screen.getByText('chico@inventory.com')).toBeInTheDocument()
    expect(captured?.role).toBe('OPERATOR')
    // El formulario ya no está
    expect(screen.queryByRole('button', { name: /crear usuario/i })).not.toBeInTheDocument()
  })

  it('envía el rol VIEWER cuando se selecciona', async () => {
    let captured: { role: string } | null = null
    server.use(
      http.post('*/auth/register', async ({ request }) => {
        const body = (await request.json()) as { role: string }
        captured = body
        return HttpResponse.json(
          {
            id: 'u-new',
            email: 'nuevo-viewer@inventory.com',
            name: 'Lector',
            role: body.role,
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { status: 201 },
        )
      }),
    )
    renderPage()
    fillForm({ email: 'nuevo-viewer@inventory.com', name: 'Lector' })
    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'VIEWER' } })

    fireEvent.click(screen.getByRole('button', { name: /crear usuario/i }))

    // 'una sola vez' ahora es EXCLUSIVO del aviso de credenciales (el helper
    // del formulario ya no usa esa frase): si esto aparece, la creación pasó.
    expect(await screen.findByText(/una sola vez/i)).toBeInTheDocument()
    expect(captured?.role).toBe('VIEWER')
  })

  it('email duplicado muestra el 409 del backend y mantiene el formulario', async () => {
    server.use(
      http.post('*/auth/register', () =>
        HttpResponse.json({ message: 'Email already registered' }, { status: 409 }),
      ),
    )
    renderPage()
    fillForm()

    fireEvent.click(screen.getByRole('button', { name: /crear usuario/i }))

    expect(await screen.findByText('Email already registered')).toBeInTheDocument()
    // Sigue en el formulario: no hay pantalla de credenciales
    expect(screen.getByRole('button', { name: /crear usuario/i })).toBeInTheDocument()
  })

  it('password corta muestra el error de campo del backend (validación del server)', async () => {
    // Usa el handler GLOBAL (sin server.use): el 400 de zod le gana al 409 por
    // duplicado, igual que el backend real. 'chico@inventory.com' está en el
    // seed y aun así recibe el error de campo: la password corta se valida primero.
    renderPage()
    fillForm({ password: '123' })

    fireEvent.click(screen.getByRole('button', { name: /crear usuario/i }))

    expect(await screen.findByText(/at least 6 characters/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /crear usuario/i })).toBeInTheDocument()
  })
})