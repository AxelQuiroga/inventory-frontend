import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import { describe, it, expect, beforeEach } from 'vitest'

import { server } from '../../test/test-utils'
import { ProductFormPage } from './ProductFormPage'
import { AdminRoute } from '../auth/AdminRoute'
import { saveToken, clearToken } from '../auth/tokenStore'

function tokenFor(role: string) {
  return `x.${btoa(JSON.stringify({ email: 'a@b.c', role }))}.y`
}

// Composición igual a la del App real: las rutas del formulario cuelgan
// del guard ADMIN-only.
function renderForm(id?: string) {
  return render(
    <MemoryRouter initialEntries={[id ? `/products/${id}/edit` : '/products/new']}>
      <Routes>
        <Route
          path="/products/new"
          element={
            <AdminRoute>
              <ProductFormPage />
            </AdminRoute>
          }
        />
        <Route
          path="/products/:id/edit"
          element={
            <AdminRoute>
              <ProductFormPage />
            </AdminRoute>
          }
        />
        <Route path="/" element={<div>inicio (redirect del guard)</div>} />
        <Route path="/products" element={<div>listado de productos</div>} />
        <Route path="*" element={<div>no encontrado</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProductFormPage — modo crear', () => {
  beforeEach(() => {
    saveToken(tokenFor('ADMIN'))
  })

  it('renderiza los campos del createProductSchema', () => {
    renderForm()
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
    expect(screen.getByLabelText('SKU')).toBeInTheDocument()
    expect(screen.getByLabelText('Categoría')).toBeInTheDocument()
    expect(screen.getByLabelText('Unidad')).toBeInTheDocument()
    expect(screen.getByLabelText('Precio')).toBeInTheDocument()
    expect(screen.getByLabelText('Stock mínimo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /crear/i })).toBeInTheDocument()
  })

  it('submit válido hace POST y navega al listado', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown
    server.use(
      http.post('*/products', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ id: 'nuevo', stock: 0, active: true }, { status: 201 })
      }),
    )
    renderForm()

    await user.type(screen.getByLabelText('Nombre'), 'Lijadora')
    await user.type(screen.getByLabelText('SKU'), 'LIJ-1')
    await user.type(screen.getByLabelText('Categoría'), 'Herramientas')
    await user.type(screen.getByLabelText('Unidad'), 'unit')
    await user.type(screen.getByLabelText('Precio'), '150')
    await user.click(screen.getByRole('button', { name: /crear/i }))

    await waitFor(() => expect(screen.getByText('listado de productos')).toBeInTheDocument())
    expect(capturedBody).toMatchObject({ name: 'Lijadora', sku: 'LIJ-1', price: 150 })
  })

  it('409 SKU duplicado muestra el mensaje del server', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/products', () =>
        HttpResponse.json({ message: 'SKU already exists' }, { status: 409 }),
      ),
    )
    renderForm()

    await user.type(screen.getByLabelText('Nombre'), 'Duplicado')
    await user.type(screen.getByLabelText('SKU'), 'DUP-1')
    await user.type(screen.getByLabelText('Categoría'), 'Cat')
    await user.type(screen.getByLabelText('Unidad'), 'unit')
    await user.type(screen.getByLabelText('Precio'), '10')
    await user.click(screen.getByRole('button', { name: /crear/i }))

    expect(await screen.findByText('SKU already exists')).toBeInTheDocument()
  })
})

describe('ProductFormPage — modo editar', () => {
  beforeEach(() => {
    saveToken(tokenFor('ADMIN'))
    server.use(
      http.get('*/products/:id', () =>
        HttpResponse.json({
          id: 'p1', name: 'Martillo', sku: 'MAR-1', category: 'Herramientas',
          unit: 'unit', price: 25.5, minStock: 10, description: 'Acero', stock: 120, active: true,
        }),
      ),
    )
  })

  it('precarga los datos del producto por id', async () => {
    renderForm('p1')

    expect(await screen.findByLabelText('Nombre')).toHaveValue('Martillo')
    expect(screen.getByLabelText('SKU')).toHaveValue('MAR-1')
    expect(screen.getByLabelText('Precio')).toHaveValue(25.5)
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument()
  })

  it('submit hace PUT con los campos modificados y vuelve al listado', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown
    server.use(
      http.put('*/products/:id', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ id: 'p1', name: 'Martillo Pro' })
      }),
    )
    renderForm('p1')

    const name = await screen.findByLabelText('Nombre')
    await user.clear(name)
    await user.type(name, 'Martillo Pro')
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => expect(screen.getByText('listado de productos')).toBeInTheDocument())
    expect(capturedBody).toEqual({ name: 'Martillo Pro' })
  })
})

describe('ProductFormPage — RBAC', () => {
  it('OPERATOR es redirigido al inicio (la ruta es ADMIN-only)', () => {
    saveToken(tokenFor('OPERATOR'))
    renderForm()
    expect(screen.getByText('inicio (redirect del guard)')).toBeInTheDocument()
    expect(screen.queryByText('Nuevo producto')).not.toBeInTheDocument()
    clearToken()
  })
})
