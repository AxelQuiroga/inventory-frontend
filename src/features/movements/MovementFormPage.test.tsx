import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { http, HttpResponse } from 'msw'
import { describe, it, expect, beforeEach } from 'vitest'

import { server } from '../../test/test-utils'
import { MovementFormPage } from './MovementFormPage'
import { RoleRoute } from '../auth/RoleRoute'
import { saveToken, clearToken } from '../auth/tokenStore'

function tokenFor(role: string) {
  return `x.${btoa(JSON.stringify({ email: 'a@b.c', role }))}.y`
}

const PRODUCT = {
  id: 'p1', name: 'Martillo', sku: 'MAR-1', category: 'Herramientas',
  price: 25.5, stock: 10, minStock: 5, active: true,
}

// Stub del listado: muestra el success que llega por location.state
// (igual que la ProductsPage real).
function ListStub() {
  const { state } = useLocation()
  return (
    <>
      <div>listado de productos</div>
      {(state as { success?: string } | null)?.success && (
        <div role="status">{(state as { success?: string }).success}</div>
      )}
    </>
  )
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        {/* Composición igual a la del App real: ADMIN + OPERATOR */}
        <Route
          path="/products/:id/movement"
          element={
            <RoleRoute roles={['ADMIN', 'OPERATOR']}>
              <MovementFormPage />
            </RoleRoute>
          }
        />
        <Route path="/" element={<div>inicio (redirect)</div>} />
        <Route path="/products" element={<ListStub />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  saveToken(tokenFor('OPERATOR'))
  server.use(http.get('*/products/:id', () => HttpResponse.json(PRODUCT)))
})

describe('MovementFormPage', () => {
  it('precarga el producto y muestra su stock actual', async () => {
    renderAt('/products/p1/movement')

    expect(await screen.findByText('Martillo')).toBeInTheDocument()
    expect(screen.getByText('MAR-1')).toBeInTheDocument()
    expect(screen.getByText(/stock actual: 10/i)).toBeInTheDocument()
  })

  it('Entrada hace POST /movements/entry y vuelve al listado', async () => {
    let capturedUrl = ''
    let capturedBody: unknown
    server.use(
      http.post('*/movements/entry', async ({ request }) => {
        capturedUrl = request.url
        capturedBody = await request.json()
        return HttpResponse.json({ id: 'm1', type: 'IN', quantity: 30 }, { status: 201 })
      }),
    )
    renderAt('/products/p1/movement')

    await screen.findByText('Martillo')
    await userEvent.setup().type(screen.getByLabelText('Cantidad'), '30')
    await userEvent.setup().type(screen.getByLabelText('Motivo'), 'Compra a proveedor')
    await userEvent.setup().click(screen.getByRole('button', { name: /registrar entrada/i }))

    await waitFor(() => expect(screen.getByText('listado de productos')).toBeInTheDocument())
    expect(capturedUrl).toContain('/movements/entry')
    expect(capturedBody).toEqual({ productId: 'p1', quantity: 30, reason: 'Compra a proveedor' })
  })

  it('entrada exitosa vuelve al listado mostrando el mensaje de éxito', async () => {
    server.use(
      http.post('*/movements/entry', () =>
        HttpResponse.json({ id: 'm1', type: 'IN' }, { status: 201 }),
      ),
    )
    renderAt('/products/p1/movement')

    const user = userEvent.setup()
    await screen.findByText('Martillo')
    await user.type(screen.getByLabelText('Cantidad'), '5')
    await user.type(screen.getByLabelText('Motivo'), 'Compra')
    await user.click(screen.getByRole('button', { name: /registrar entrada/i }))

    expect(await screen.findByText('Movimiento registrado')).toBeInTheDocument()
    expect(screen.getByText('listado de productos')).toBeInTheDocument()
  })

  it('Salida hace POST /movements/exit', async () => {
    let capturedUrl = ''
    server.use(
      http.post('*/movements/exit', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json({ id: 'm2', type: 'OUT' }, { status: 201 })
      }),
    )
    renderAt('/products/p1/movement')

    await screen.findByText('Martillo')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Cantidad'), '3')
    await user.type(screen.getByLabelText('Motivo'), 'Venta mostrador')
    await user.click(screen.getByRole('button', { name: /registrar salida/i }))

    await waitFor(() => expect(screen.getByText('listado de productos')).toBeInTheDocument())
    expect(capturedUrl).toContain('/movements/exit')
  })

  it('muestra "Insufficient stock" si la API rechaza la salida', async () => {
    server.use(
      http.post('*/movements/exit', () =>
        HttpResponse.json({ message: 'Insufficient stock' }, { status: 400 }),
      ),
    )
    renderAt('/products/p1/movement')

    const user = userEvent.setup()
    await screen.findByText('Martillo')
    await user.type(screen.getByLabelText('Cantidad'), '999')
    await user.type(screen.getByLabelText('Motivo'), 'Oversell')
    await user.click(screen.getByRole('button', { name: /registrar salida/i }))

    expect(await screen.findByText('Insufficient stock')).toBeInTheDocument()
    // Sigue en el formulario: el movimiento no se registró
    expect(screen.getByRole('button', { name: /registrar salida/i })).toBeInTheDocument()
  })

  it('muestra "Product is inactive" para productos desactivados', async () => {
    server.use(
      http.get('*/products/:id', () => HttpResponse.json({ ...PRODUCT, active: false })),
      http.post('*/movements/entry', () =>
        HttpResponse.json({ message: 'Product is inactive' }, { status: 400 }),
      ),
    )
    renderAt('/products/p1/movement')

    const user = userEvent.setup()
    await screen.findByText(/inactivo/i)
    await user.type(screen.getByLabelText('Cantidad'), '1')
    await user.type(screen.getByLabelText('Motivo'), 'X')
    await user.click(screen.getByRole('button', { name: /registrar entrada/i }))

    expect(await screen.findByText('Product is inactive')).toBeInTheDocument()
  })

  it('mapea los fieldErrors del contrato (quantity/reason) bajo cada campo', async () => {
    // El server valida quantity/reason con zod y devuelve fieldErrors:
    // los botones son type=button (sin validación nativa), así que el caso
    // es alcanzable en producción. El mapping existe: no se inventa.
    server.use(
      http.post('*/movements/exit', () =>
        HttpResponse.json(
          {
            message: 'Invalid data',
            errors: {
              formErrors: [],
              fieldErrors: { quantity: ['Quantity must be positive'] },
            },
          },
          { status: 400 },
        ),
      ),
    )
    renderAt('/products/p1/movement')

    const user = userEvent.setup()
    await screen.findByText('Martillo')
    await user.type(screen.getByLabelText('Cantidad'), '0')
    await user.type(screen.getByLabelText('Motivo'), 'Venta')
    await user.click(screen.getByRole('button', { name: /registrar salida/i }))

    expect(await screen.findByText('Quantity must be positive')).toBeInTheDocument()
    expect(screen.getByText('Invalid data')).toBeInTheDocument() // error general convive
  })

  it('VIEWER es redirigido (ruta ADMIN/OPERATOR)', async () => {
    clearToken()
    saveToken(tokenFor('VIEWER'))
    renderAt('/products/p1/movement')

    expect(await screen.findByText('inicio (redirect)')).toBeInTheDocument()
    expect(screen.queryByText('Registrar movimiento')).not.toBeInTheDocument()
  })

  it('validación nativa: cantidad mínima 1 y motivo requerido', async () => {
    renderAt('/products/p1/movement')

    const quantity = await screen.findByLabelText('Cantidad')
    expect(quantity).toHaveAttribute('min', '1')
    expect(screen.getByLabelText('Motivo')).toBeRequired()
  })
})
