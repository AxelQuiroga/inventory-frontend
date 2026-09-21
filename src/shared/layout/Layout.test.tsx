import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, it, expect, beforeEach } from 'vitest'

import { Layout } from './Layout'
import { saveToken } from '../../features/auth/tokenStore'

function tokenFor(role: string) {
  return `x.${btoa(JSON.stringify({ email: 'a@b.c', role }))}.y`
}

function renderLayout(role: string) {
  saveToken(tokenFor(role))
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
})