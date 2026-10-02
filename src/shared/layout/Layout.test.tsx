import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, it, expect, beforeEach } from 'vitest'

import { Layout } from './Layout'
import { saveToken } from '../../features/auth/tokenStore'

function tokenFor(role: string) {
  return `x.${btoa(JSON.stringify({ email: 'a@b.c', role }))}.y`
}

function renderLayout(role: string) {
  saveToken(tokenFor(role))
  // Cada render monta un container propio: sin cleanup entre renders del
  // mismo test, el DOM acumula layouts y getByRole ve duplicados.
  cleanup()
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<div>dashboard</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  saveToken(tokenFor('ADMIN'))
})

describe('Layout — navegación por rol', () => {
  it('el ADMIN ve el link Usuarios', () => {
    renderLayout('ADMIN')

    expect(screen.getByRole('link', { name: /usuarios/i })).toBeInTheDocument()
  })

  it('OPERATOR y VIEWER NO ven el link Usuarios (gestión exclusiva del ADMIN)', () => {
    renderLayout('OPERATOR')
    expect(screen.queryByRole('link', { name: /usuarios/i })).not.toBeInTheDocument()

    renderLayout('VIEWER')
    expect(screen.queryByRole('link', { name: /usuarios/i })).not.toBeInTheDocument()
  })

  it('el link Movimientos es visible para todos los roles (lectura global)', () => {
    renderLayout('ADMIN')
    expect(screen.getByRole('link', { name: /movimientos/i })).toBeInTheDocument()

    renderLayout('OPERATOR')
    expect(screen.getByRole('link', { name: /movimientos/i })).toBeInTheDocument()

    renderLayout('VIEWER')
    expect(screen.getByRole('link', { name: /movimientos/i })).toBeInTheDocument()
  })

  it('Inventario ya no aparece en la navegación (sección eliminada del MVP)', () => {
    renderLayout('ADMIN')

    expect(screen.queryByRole('link', { name: /inventario/i })).not.toBeInTheDocument()
    expect(screen.queryByText('Inventario')).not.toBeInTheDocument()
  })

  it('la topbar muestra el nombre del rol como texto visible (Admin / Operador / Lector)', () => {
    renderLayout('ADMIN')
    expect(screen.getByText('Admin')).toBeInTheDocument()

    renderLayout('OPERATOR')
    expect(screen.getByText('Operador')).toBeInTheDocument()

    renderLayout('VIEWER')
    expect(screen.getByText('Lector')).toBeInTheDocument()
  })
})