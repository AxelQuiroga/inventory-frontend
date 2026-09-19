import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { describe, it, expect } from 'vitest'

import { ProtectedRoute } from './ProtectedRoute'
import { saveToken, clearToken } from './tokenStore'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>pagina de login</div>} />
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <div>contenido protegido</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('sin token redirige a /login', () => {
    clearToken()
    renderAt('/products')
    expect(screen.getByText('pagina de login')).toBeInTheDocument()
    expect(screen.queryByText('contenido protegido')).not.toBeInTheDocument()
  })

  it('con token renderiza el contenido protegido', () => {
    saveToken('jwt-de-prueba')
    renderAt('/products')
    expect(screen.getByText('contenido protegido')).toBeInTheDocument()
  })
})
