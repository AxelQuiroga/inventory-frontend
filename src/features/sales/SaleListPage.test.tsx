import { useEffect } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { http, HttpResponse } from 'msw'
import { describe, it, expect, beforeEach } from 'vitest'

import { server } from '../../test/test-utils'
import { SaleListPage } from './SaleListPage'
import { saveToken } from '../auth/tokenStore'

function tokenFor(role: string) {
  return `x.${btoa(JSON.stringify({ email: 'a@b.c', role }))}.y`
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SaleListPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  saveToken(tokenFor('ADMIN'))
})

describe('SaleListPage — listado y estados', () => {
  it('renderiza las ventas que devuelve el API', async () => {
    renderPage()

    expect(await screen.findByText(/2 productos/)).toBeInTheDocument()
    expect(screen.getByText(/124,50/)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /ver detalle/i }).length).toBeGreaterThan(0)
  })

  it('lista vacía muestra un mensaje propio', async () => {
    server.use(http.get('*/sales', () => HttpResponse.json([])))
    renderPage()

    expect(await screen.findByText(/no hay ventas/i)).toBeInTheDocument()
  })

  it('error del API muestra un mensaje de error', async () => {
    server.use(
      http.get('*/sales', () => HttpResponse.json({ message: 'Internal server error' }, { status: 500 })),
    )
    renderPage()

    expect(await screen.findByText('Internal server error')).toBeInTheDocument()
  })

  it('consume el mensaje de éxito post/redirect y no lo repite al refrescar', async () => {
    let probe: { pathname: string; state: unknown } | null = null
    function LocationProbe() {
      const location = useLocation()
      useEffect(() => {
        probe = { pathname: location.pathname, state: location.state }
      }, [location])
      return null
    }
    render(
      <MemoryRouter initialEntries={[{ pathname: '/sales', state: { success: 'Venta registrada' } }]}>
        <LocationProbe />
        <Routes>
          <Route path="/sales" element={<SaleListPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('status')).toHaveTextContent('Venta registrada')
    await waitFor(() => expect(probe?.state).toBeNull())
  })
})

describe('SaleListPage — RBAC visible', () => {
  it('ADMIN y OPERATOR ven el botón Nueva venta y NO el aviso de solo lectura', async () => {
    renderPage()
    expect(await screen.findByRole('link', { name: /nueva venta/i })).toBeInTheDocument()
    expect(screen.queryByText(/solo lectura/i)).not.toBeInTheDocument()

    saveToken(tokenFor('OPERATOR'))
    renderPage()
    expect((await screen.findAllByRole('link', { name: /nueva venta/i })).length).toBeGreaterThan(0)
    expect(screen.queryByText(/solo lectura/i)).not.toBeInTheDocument()
  })

  it('VIEWER ve el listado, un aviso de solo lectura y NO el botón Nueva venta', async () => {
    saveToken(tokenFor('VIEWER'))
    renderPage()

    await screen.findByText(/2 productos/)
    expect(screen.getByText(/estás como Lector \(solo lectura\)/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /nueva venta/i })).not.toBeInTheDocument()
  })
})