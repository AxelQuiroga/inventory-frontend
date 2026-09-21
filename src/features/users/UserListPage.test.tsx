import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { http, HttpResponse } from 'msw'
import { describe, it, expect, beforeEach } from 'vitest'

import { server } from '../../test/test-utils'
import { UserListPage } from './UserListPage'
import { saveToken } from '../auth/tokenStore'
import type { ManagedUser } from './usersApi'

function tokenFor(role: string) {
  return `x.${btoa(JSON.stringify({ email: 'a@b.c', role }))}.y`
}

function renderPage() {
  return render(
    <MemoryRouter>
      <UserListPage />
    </MemoryRouter>,
  )
}

const baseUser: ManagedUser = {
  id: 'u-operator',
  email: 'chico@inventory.com',
  name: 'Chico Nuevo',
  role: 'OPERATOR',
  active: true,
  createdAt: '2026-09-20T10:00:00.000Z',
  updatedAt: '2026-09-20T10:00:00.000Z',
}

beforeEach(() => {
  saveToken(tokenFor('ADMIN'))
})

describe('UserListPage — listado y estados', () => {
  it('muestra los usuarios con rol y estado', async () => {
    renderPage()

    expect(await screen.findByText('Chico Nuevo')).toBeInTheDocument()
    expect(screen.getByText('chico@inventory.com')).toBeInTheDocument()
    expect(screen.getByText('Operador')).toBeInTheDocument()
    expect(screen.getByText('Activo')).toBeInTheDocument()
    expect(screen.getByText('Lector')).toBeInTheDocument()
    expect(screen.getByText('Inactivo')).toBeInTheDocument()
  })

  it('error del API muestra un mensaje propio', async () => {
    server.use(
      http.get('*/users', () => HttpResponse.json({ message: 'Internal server error' }, { status: 500 })),
    )
    renderPage()

    expect(await screen.findByText('Internal server error')).toBeInTheDocument()
  })

  it('ADMIN ve el botón de nuevo usuario', async () => {
    renderPage()

    expect(await screen.findByRole('link', { name: /nuevo usuario/i })).toBeInTheDocument()
  })

  it('un rol sin permiso no ve acciones de gestión (defensa en la UI)', async () => {
    saveToken(tokenFor('VIEWER'))
    renderPage()

    await screen.findByText('Chico Nuevo')
    expect(screen.queryByRole('button', { name: /desactivar|reactivar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /nuevo usuario/i })).not.toBeInTheDocument()
  })
})

describe('UserListPage — desactivar / reactivar', () => {
  it('desactivar pasa por confirmación y actualiza el badge a Inactivo', async () => {
    let active = true
    server.use(
      http.get('*/users', () => HttpResponse.json([{ ...baseUser, active }])),
      http.post('*/users/u-operator/deactivate', () => {
        active = false
        return HttpResponse.json({ ...baseUser, active: false })
      }),
    )
    renderPage()

    const deactivate = await screen.findByRole('button', { name: /desactivar/i })
    fireEvent.click(deactivate)

    // El diálogo pide confirmación (acción destructiva: la persona pierde acceso)
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/no podrá iniciar sesión/i)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Desactivar' }))

    expect(await screen.findByText('Inactivo')).toBeInTheDocument()
    expect(within(dialog).queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('cancelar el diálogo no desactiva al usuario', async () => {
    let active = true
    server.use(
      http.get('*/users', () => HttpResponse.json([{ ...baseUser, active }])),
      http.post('*/users/u-operator/deactivate', () => {
        active = false
        return HttpResponse.json({ ...baseUser, active: false })
      }),
    )
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /desactivar/i }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('Activo')).toBeInTheDocument()
    expect(screen.queryByText('Inactivo')).not.toBeInTheDocument()
  })

  it('reactivar es directo (sin confirmación) y actualiza el estado', async () => {
    let active = false
    server.use(
      http.get('*/users', () => HttpResponse.json([{ ...baseUser, active }])),
      http.post('*/users/u-operator/reactivate', () => {
        active = true
        return HttpResponse.json({ ...baseUser, active: true })
      }),
    )
    renderPage()

    const reactivate = await screen.findByRole('button', { name: /reactivar/i })
    fireEvent.click(reactivate)

    expect(await screen.findByText('Activo')).toBeInTheDocument()
    expect(screen.queryByText('Inactivo')).not.toBeInTheDocument()
  })

  it('el guard del backend (Cannot manage ADMIN user) se muestra como error', async () => {
    server.use(
      http.get('*/users', () => HttpResponse.json([baseUser])),
      http.post('*/users/u-operator/deactivate', () =>
        HttpResponse.json({ message: 'Cannot manage ADMIN user' }, { status: 400 }),
      ),
    )
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /desactivar/i }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Desactivar' }))

    expect(await screen.findByText('Cannot manage ADMIN user')).toBeInTheDocument()
  })
})