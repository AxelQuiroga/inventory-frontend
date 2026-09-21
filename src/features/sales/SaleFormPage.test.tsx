import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { http, HttpResponse } from 'msw'
import { describe, it, expect, beforeEach } from 'vitest'

import { server } from '../../test/test-utils'
import { SaleFormPage } from './SaleFormPage'
import { RoleRoute } from '../auth/RoleRoute'
import { saveToken, clearToken } from '../auth/tokenStore'

function tokenFor(role: string) {
  return `x.${btoa(JSON.stringify({ email: 'a@b.c', role }))}.y`
}

// Stub del detalle: expone pathname y el success que llega por
// location.state (composición igual a la del App real).
function DetailStub() {
  const { pathname, state } = useLocation()
  return (
    <>
      <div>ruta: {pathname}</div>
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
        <Route
          path="/sales/new"
          element={
            <RoleRoute roles={['ADMIN', 'OPERATOR']}>
              <SaleFormPage />
            </RoleRoute>
          }
        />
        <Route path="/sales/:id" element={<DetailStub />} />
        <Route path="/" element={<div>inicio (redirect)</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

// Fila del selector correspondiente a un producto: útil para tipear la
// cantidad y clickear "Agregar" sin depender de los otros productos.
function productRow(name: string) {
  return screen.getByText(name).closest('li')!
}

beforeEach(() => {
  saveToken(tokenFor('OPERATOR'))
})

describe('SaleFormPage — selector y regla de disponibilidad', () => {
  it('muestra los productos con precio y stock disponible', async () => {
    renderAt('/sales/new')

    expect(await screen.findByText('Martillo')).toBeInTheDocument()
    expect(screen.getByText(/Disponible: 120$/)).toBeInTheDocument()
    expect(screen.getByText(/Disponible: 3$/)).toBeInTheDocument()
  })

  it('producto con stock 0 queda BLOQUEADO con "0 disponibles"', async () => {
    renderAt('/sales/new')
    await screen.findByText('Martillo')

    const tornillos = productRow('Tornillos x100')
    expect(within(tornillos).getByText('0 disponibles')).toBeInTheDocument()
    expect(within(tornillos).getByLabelText(/cantidad de tornillos/i)).toBeDisabled()
    expect(within(tornillos).getByRole('button', { name: /agregar/i })).toBeDisabled()
  })

  it('disponible = stock real − lo que ya lleva el carrito', async () => {
    const user = userEvent.setup()
    renderAt('/sales/new')
    await screen.findByText('Martillo')

    // Taladro tiene stock 3: agrego 2 y el selector debe pasar a "Disponible: 1"
    const taladro = productRow('Taladro')
    await user.type(within(taladro).getByLabelText(/cantidad de taladro/i), '2')
    await user.click(within(taladro).getByRole('button', { name: /agregar/i }))

    expect(await screen.findByText(/Disponible: 1$/)).toBeInTheDocument()
  })

  it('meter TODO el stock deja el producto bloqueado con 0 disponibles', async () => {
    const user = userEvent.setup()
    renderAt('/sales/new')
    await screen.findByText('Martillo')

    const taladro = productRow('Taladro')
    await user.type(within(taladro).getByLabelText(/cantidad de taladro/i), '3')
    await user.click(within(taladro).getByRole('button', { name: /agregar/i }))

    expect(await within(taladro).findByText('0 disponibles')).toBeInTheDocument()
    expect(within(taladro).getByRole('button', { name: /agregar/i })).toBeDisabled()
    // La línea del carrito sigue ahí: el producto no desaparece de la venta
    expect(screen.getByText(/3 ×/)).toBeInTheDocument()
  })

  it('no permite agregar más de lo disponible ni cantidades inválidas', async () => {
    const user = userEvent.setup()
    renderAt('/sales/new')
    await screen.findByText('Martillo')

    const taladro = productRow('Taladro')
    // 99 > stock 3 → el botón Agregar queda deshabilitado
    await user.type(within(taladro).getByLabelText(/cantidad de taladro/i), '99')
    expect(within(taladro).getByRole('button', { name: /agregar/i })).toBeDisabled()
    // Y no se sumó ninguna línea al carrito
    expect(screen.getByText(/todavía no hay productos/i)).toBeInTheDocument()
  })
})

describe('SaleFormPage — carrito, total y confirmación', () => {
  it('agregar líneas actualiza el total en vivo y arma el POST correcto', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown
    server.use(
      http.post('*/sales', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(
          {
            id: 'sale-42',
            userId: 'user-admin',
            items: [],
            total: 51,
            createdAt: new Date().toISOString(),
          },
          { status: 201 },
        )
      }),
    )
    renderAt('/sales/new')
    await screen.findByText('Martillo')

    // 2 Martillos (25.50 c/u) + 1 Taladro (99.99) = 150.99
    const martillo = productRow('Martillo')
    await user.type(within(martillo).getByLabelText(/cantidad de martillo/i), '2')
    await user.click(within(martillo).getByRole('button', { name: /agregar/i }))

    const taladro = productRow('Taladro')
    await user.type(within(taladro).getByLabelText(/cantidad de taladro/i), '1')
    await user.click(within(taladro).getByRole('button', { name: /agregar/i }))

    expect(screen.getByText(/Total:/)).toHaveTextContent('150,99')

    await user.click(screen.getByRole('button', { name: /confirmar venta/i }))

    await waitFor(() => expect(capturedBody).toEqual({
      items: [
        { productId: 'p1', quantity: 2 },
        { productId: 'p2', quantity: 1 },
      ],
    }))
    // Post/redirect al detalle con el mensaje de éxito
    expect(await screen.findByText('ruta: /sales/sale-42')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Venta registrada')
  })

  it('no permite confirmar con el carrito vacío', async () => {
    renderAt('/sales/new')
    await screen.findByText('Martillo')

    expect(screen.getByRole('button', { name: /confirmar venta/i })).toBeDisabled()
  })

  it('quitar una línea la saca del carrito y del total', async () => {
    const user = userEvent.setup()
    renderAt('/sales/new')
    await screen.findByText('Martillo')

    const martillo = productRow('Martillo')
    await user.type(within(martillo).getByLabelText(/cantidad de martillo/i), '2')
    await user.click(within(martillo).getByRole('button', { name: /agregar/i }))
    expect(screen.getByText(/Total:/)).toHaveTextContent('51,00')

    await user.click(screen.getByRole('button', { name: /quitar/i }))

    expect(await screen.findByText(/todavía no hay productos/i)).toBeInTheDocument()
    expect(screen.getByText(/Total:/)).toHaveTextContent('0,00')
  })

  it('muestra "Insufficient stock" si el server rechaza (doble venta entre terminales)', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/sales', () => HttpResponse.json({ message: 'Insufficient stock' }, { status: 400 })),
    )
    renderAt('/sales/new')
    await screen.findByText('Martillo')

    const martillo = productRow('Martillo')
    await user.type(within(martillo).getByLabelText(/cantidad de martillo/i), '1')
    await user.click(within(martillo).getByRole('button', { name: /agregar/i }))
    await user.click(screen.getByRole('button', { name: /confirmar venta/i }))

    expect(await screen.findByText('Insufficient stock')).toBeInTheDocument()
    // Sigue en el form: la venta no se registró
    expect(screen.getByRole('button', { name: /confirmar venta/i })).toBeInTheDocument()
  })

  it('VIEWER es redirigido (ruta ADMIN/OPERATOR)', async () => {
    clearToken()
    saveToken(tokenFor('VIEWER'))
    renderAt('/sales/new')

    expect(await screen.findByText('inicio (redirect)')).toBeInTheDocument()
    expect(screen.queryByText('Confirmar venta')).not.toBeInTheDocument()
  })
})

describe('SaleFormPage — búsqueda local de productos', () => {
  it('filtra por nombre o SKU sin roundtrips', async () => {
    const user = userEvent.setup()
    renderAt('/sales/new')
    await screen.findByText('Martillo')

    await user.type(screen.getByLabelText(/buscar producto/i), 'tal')

    expect(screen.getByText('Taladro')).toBeInTheDocument()
    expect(screen.queryByText('Martillo')).not.toBeInTheDocument()
    expect(screen.queryByText('Pintura blanca 4L')).not.toBeInTheDocument()

    await user.clear(screen.getByLabelText(/buscar producto/i))
    await user.type(screen.getByLabelText(/buscar producto/i), 'MAR-1')
    expect(screen.getByText('Martillo')).toBeInTheDocument()
    expect(screen.queryByText('Taladro')).not.toBeInTheDocument()
  })
})