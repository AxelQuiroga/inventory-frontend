import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { describe, it, expect } from 'vitest'

import { RoleRoute } from './RoleRoute'
import { saveToken, clearToken } from './tokenStore'
import { ForbiddenPage } from '../../pages/errors/ForbiddenPage'

function tokenFor(role: string) {
  return `x.${btoa(JSON.stringify({ email: 'a@b.c', role }))}.y`
}

function renderProtected(roles: string[]) {
  return render(
    <MemoryRouter initialEntries={['/secreto']}>
      <Routes>
        <Route
          path="/secreto"
          element={
            <RoleRoute roles={roles}>
              <div>contenido restringido</div>
            </RoleRoute>
          }
        />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="/" element={<div>inicio</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RoleRoute', () => {
  it('renderiza el contenido si el rol está permitido (ADMIN)', () => {
    saveToken(tokenFor('ADMIN'))
    renderProtected(['ADMIN', 'OPERATOR'])
    expect(screen.getByText('contenido restringido')).toBeInTheDocument()
    clearToken()
  })

  it('renderiza el contenido si el rol está permitido (OPERATOR)', () => {
    saveToken(tokenFor('OPERATOR'))
    renderProtected(['ADMIN', 'OPERATOR'])
    expect(screen.getByText('contenido restringido')).toBeInTheDocument()
    clearToken()
  })

  it('muestra la página 403 si el rol no está permitido (VIEWER)', () => {
    saveToken(tokenFor('VIEWER'))
    renderProtected(['ADMIN', 'OPERATOR'])
    expect(screen.getByRole('heading', { name: 'No tenés permisos para entrar acá' })).toBeInTheDocument()
    expect(screen.queryByText('contenido restringido')).not.toBeInTheDocument()
    clearToken()
  })

  it('sin sesión redirige a /forbidden como fallback de guard', () => {
    clearToken()
    renderProtected(['ADMIN'])
    expect(screen.getByRole('heading', { name: 'No tenés permisos para entrar acá' })).toBeInTheDocument()
  })
})
