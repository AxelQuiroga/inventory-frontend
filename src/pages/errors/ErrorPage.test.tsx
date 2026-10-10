import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ErrorPage } from './ErrorPage'

describe('ErrorPage', () => {
  it('shows the error code, explanation and recovery link', () => {
    render(
      <MemoryRouter>
        <ErrorPage
          code="404"
          title="No encontramos esa página"
          description="La dirección no existe."
          actionLabel="Ir al inicio"
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No encontramos esa página' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/')
  })

  it('supports a forbidden error with a recovery destination', () => {
    render(
      <MemoryRouter>
        <ErrorPage
          code="403"
          title="Acceso denegado"
          description="No tenés permisos."
          actionLabel="Volver al dashboard"
          to="/"
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('403')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al dashboard' })).toHaveAttribute('href', '/')
  })
})
