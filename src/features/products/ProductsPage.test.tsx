import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { http, HttpResponse } from 'msw'
import { describe, it, expect } from 'vitest'

import { server } from '../../test/test-utils'
import { ProductsPage } from './ProductsPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <ProductsPage />
    </MemoryRouter>,
  )
}

describe('ProductsPage', () => {
  it('renderiza los productos que devuelve el API', async () => {
    server.use(
      http.get('*/products', () =>
        HttpResponse.json([
          { id: '1', name: 'Martillo', sku: 'MAR-1', stock: 10, minStock: 5, price: 25.5, active: true },
          { id: '2', name: 'Taladro', sku: 'TAL-1', stock: 0, minStock: 5, price: 99, active: true },
        ]),
      ),
    )
    renderPage()

    expect(await screen.findByText('Martillo')).toBeInTheDocument()
    expect(screen.getByText('Taladro')).toBeInTheDocument()
    expect(screen.getByText('MAR-1')).toBeInTheDocument()
  })

  it('lista vacía muestra un mensaje propio', async () => {
    server.use(http.get('*/products', () => HttpResponse.json([])))
    renderPage()

    expect(await screen.findByText(/no hay productos/i)).toBeInTheDocument()
  })

  it('error del API muestra un mensaje de error', async () => {
    server.use(
      http.get('*/products', () => HttpResponse.json({ message: 'Internal server error' }, { status: 500 })),
    )
    renderPage()

    expect(await screen.findByText('Internal server error')).toBeInTheDocument()
  })
})
