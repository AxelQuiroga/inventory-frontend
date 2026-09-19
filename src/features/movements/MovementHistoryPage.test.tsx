import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import { describe, it, expect, beforeEach } from 'vitest'

import { server } from '../../test/test-utils'
import { MovementHistoryPage } from './MovementHistoryPage'
import { saveToken, clearToken } from '../auth/tokenStore'

const TOKEN = `x.${btoa(JSON.stringify({ email: 'a@b.c', role: 'VIEWER' }))}.y`

const HISTORY = [
  { id: 'm2', productId: 'p1', userId: 'user-operator', type: 'OUT', quantity: 4, reason: 'Venta mostrador', createdAt: '2026-09-19T10:00:00Z' },
  { id: 'm1', productId: 'p1', userId: 'user-admin', type: 'IN', quantity: 30, reason: 'Compra a proveedor', createdAt: '2026-09-19T09:00:00Z' },
]

function renderAt(path = '/products/p1/history') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/products/:productId/history" element={<MovementHistoryPage />} />
        <Route path="/products" element={<div>listado de productos</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  saveToken(TOKEN)
  server.use(
    http.get('*/products/:id', () =>
      HttpResponse.json({
        id: 'p1', name: 'Martillo', sku: 'MAR-1', category: 'Herramientas', unit: 'unit',
        price: 25.5, stock: 26, minStock: 5, active: true,
      }),
    ),
    http.get('*/movements/history/:productId', () => HttpResponse.json(HISTORY)),
  )
})

describe('MovementHistoryPage', () => {
  it('muestra el producto y su stock actual', async () => {
    renderAt()

    expect(await screen.findByText('Martillo')).toBeInTheDocument()
    expect(screen.getByText('MAR-1')).toBeInTheDocument()
    expect(screen.getByText(/stock actual: 26/i)).toBeInTheDocument()
  })

  it('muestra el historial en orden (más reciente primero) con tipo y cantidad', async () => {
    renderAt()

    const rows = (await screen.findAllByRole('row')).filter(
      (r) => r.textContent?.includes('Venta') || r.textContent?.includes('Compra'),
    )
    expect(rows).toHaveLength(2)
    expect(rows[0]!.textContent).toContain('Venta mostrador') // OUT más reciente
    expect(rows[1]!.textContent).toContain('Compra a proveedor')
    expect(rows[0]!.textContent).toMatch(/salida/i)
    expect(rows[1]!.textContent).toMatch(/entrada/i)
  })

  it('conserva el userId de cada movimiento (trazabilidad)', async () => {
    renderAt()

    expect(await screen.findByText('user-operator')).toBeInTheDocument()
    expect(screen.getByText('user-admin')).toBeInTheDocument()
  })

  it('historial vacío muestra un mensaje propio', async () => {
    server.use(http.get('*/movements/history/:productId', () => HttpResponse.json([])))
    renderAt()

    expect(await screen.findByText(/sin movimientos/i)).toBeInTheDocument()
  })

  it('error del API muestra el mensaje del server', async () => {
    server.use(
      http.get('*/movements/history/:productId', () =>
        HttpResponse.json({ message: 'Internal server error' }, { status: 500 }),
      ),
    )
    renderAt()

    expect(await screen.findByText('Internal server error')).toBeInTheDocument()
  })

  it('tiene link de vuelta al listado de productos', async () => {
    renderAt()

    expect((await screen.findByRole('link', { name: /volver/i })).getAttribute('href')).toBe('/products')
  })

  it('es accesible para VIEWER (solo lectura)', async () => {
    clearToken()
    saveToken(`x.${btoa(JSON.stringify({ email: 'v@b.c', role: 'VIEWER' }))}.y`)
    renderAt()

    expect(await screen.findByText('Martillo')).toBeInTheDocument()
  })
})
