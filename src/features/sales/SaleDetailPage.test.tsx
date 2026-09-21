import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import { describe, it, expect, beforeEach } from 'vitest'

import { server } from '../../test/test-utils'
import { SaleDetailPage } from './SaleDetailPage'
import { saveToken } from '../auth/tokenStore'

function tokenFor(role: string) {
  return `x.${btoa(JSON.stringify({ email: 'a@b.c', role }))}.y`
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/sales/sale-1']}>
      <Routes>
        <Route path="/sales/:id" element={<SaleDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  saveToken(tokenFor('OPERATOR'))
})

describe('SaleDetailPage — detalle de venta', () => {
  it('muestra las líneas con nombre, SKU, cantidad, precio y subtotal', async () => {
    renderDetail()

    expect(await screen.findByText('Martillo')).toBeInTheDocument()
    expect(screen.getByText('MAR-1')).toBeInTheDocument()
    expect(screen.getByText('TAL-1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // cantidad del Martillo
    // Precio unitario y subtotal (25,50 y 51,00)
    expect(screen.getByText(/25,50/)).toBeInTheDocument()
    expect(screen.getByText(/51,00/)).toBeInTheDocument()
    // Total de la venta (2×25.50 + 1×99.99)
    expect(screen.getByText(/Total:/)).toHaveTextContent('150,99')
  })

  it('muestra el mensaje de éxito que trae el formulario tras confirmar', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/sales/sale-1', state: { success: 'Venta registrada' } }]}>
        <Routes>
          <Route path="/sales/:id" element={<SaleDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('status')).toHaveTextContent('Venta registrada')
  })

  it('muestra "Sale not found" si el id no existe', async () => {
    server.use(
      http.get('*/sales/:id', () => HttpResponse.json({ message: 'Sale not found' }, { status: 404 })),
    )
    renderDetail()

    expect(await screen.findByText('Sale not found')).toBeInTheDocument()
  })

  it('error del API muestra un mensaje de error', async () => {
    server.use(
      http.get('*/sales/:id', () => HttpResponse.json({ message: 'Internal server error' }, { status: 500 })),
    )
    renderDetail()

    expect(await screen.findByText('Internal server error')).toBeInTheDocument()
  })
})