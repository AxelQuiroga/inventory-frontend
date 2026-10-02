import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
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
// Stub del listado: muestra lo que llega por location.state (igual que hace
// la ProductsPage real con el Alert de éxito).
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
        <Route path="/products" element={<ListStub />} />
        <Route path="*" element={<div>no encontrado</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProductFormPage — modo crear', () => {
  beforeEach(() => {
    saveToken(tokenFor('ADMIN'))
  })

  it('organiza el formulario como piensa el vendedor', () => {
    renderForm()

    // Lo primero: qué se vende y a cuánto
    const datos = screen.getByRole('group', { name: 'Datos del producto' })
    expect(within(datos).getByLabelText('Nombre')).toBeInTheDocument()
    expect(within(datos).getByLabelText('Categoría')).toBeInTheDocument()
    expect(within(datos).getByLabelText('Precio de venta')).toBeInTheDocument()

    // Inventario: lenguaje del negocio, con la consecuencia explicada
    const inventario = screen.getByRole('group', { name: 'Inventario' })
    expect(within(inventario).getByLabelText('Stock actual')).toBeInTheDocument()
    expect(
      within(inventario).getByText(/cuántas unidades tenés hoy/i),
    ).toBeInTheDocument()
    expect(
      within(inventario).getByLabelText(/avisarme cuando quedan menos de/i),
    ).toBeInTheDocument()
    expect(
      within(inventario).getByText(/deja 0 si no querés alertas de stock bajo/i),
    ).toBeInTheDocument()

    // Lo técnico, apartado al final
    const adicionales = screen.getByRole('group', { name: 'Datos adicionales' })
    expect(within(adicionales).getByLabelText('SKU')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /crear/i })).toBeInTheDocument()
  })

  it('al crear, vuelve al listado mostrando el mensaje de éxito', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/products', () =>
        HttpResponse.json({ id: 'nuevo', stock: 0, active: true }, { status: 201 }),
      ),
    )
    renderForm()

    await user.type(screen.getByLabelText('Nombre'), 'Lijadora')
    await user.type(screen.getByLabelText('SKU'), 'LIJ-1')
    await user.type(screen.getByLabelText('Categoría'), 'Herramientas')
    await user.type(screen.getByLabelText('Precio de venta'), '150')
    await user.click(screen.getByRole('button', { name: /crear/i }))

    // El listado muestra el feedback: la operación terminó correctamente
    expect(await screen.findByText('Producto creado')).toBeInTheDocument()
    expect(screen.getByText('listado de productos')).toBeInTheDocument()
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
    await user.type(screen.getByLabelText('Precio de venta'), '150')
    await user.type(screen.getByLabelText('Stock actual'), '40')
    await user.click(screen.getByRole('button', { name: /crear/i }))

    await waitFor(() => expect(screen.getByText('listado de productos')).toBeInTheDocument())
    expect(capturedBody).toMatchObject({ name: 'Lijadora', sku: 'LIJ-1', price: 150, initialStock: 40 })
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
    await user.type(screen.getByLabelText('Precio de venta'), '10')
    await user.click(screen.getByRole('button', { name: /crear/i }))

    expect(await screen.findByText('SKU already exists')).toBeInTheDocument()
  })

  it('mapea los fieldErrors del backend debajo de cada campo', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/products', () =>
        HttpResponse.json(
          {
            message: 'Invalid data',
            errors: {
              formErrors: [],
              fieldErrors: {
                name: ['Name is required'],
                price: ['Price must be positive'],
              },
            },
          },
          { status: 400 },
        ),
      ),
    )
    renderForm()

    await user.type(screen.getByLabelText('SKU'), 'FE-1')
    await user.type(screen.getByLabelText('Categoría'), 'Cat')
    // price 0 → inválido en el server
    await user.type(screen.getByLabelText('Precio de venta'), '0')
    await user.click(screen.getByRole('button', { name: /crear/i }))

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('Price must be positive')).toBeInTheDocument()
    // El error de un campo no borra el resto: ambos visibles a la vez
  })

  it('muestra error general y field errors simultáneamente', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/products', () =>
        HttpResponse.json(
          {
            message: 'Invalid data',
            errors: { formErrors: [], fieldErrors: { sku: ['SKU is required'] } },
          },
          { status: 400 },
        ),
      ),
    )
    renderForm()

    await user.type(screen.getByLabelText('Nombre'), 'Algo')
    await user.type(screen.getByLabelText('Categoría'), 'Cat')
    await user.type(screen.getByLabelText('Precio de venta'), '10')
    await user.click(screen.getByRole('button', { name: /crear/i }))

    expect(await screen.findByText('Invalid data')).toBeInTheDocument() // Alert general
    expect(screen.getByText('SKU is required')).toBeInTheDocument() // bajo el campo
  })

  it('el fieldError de description (tope de 500 chars) se muestra bajo el textarea', async () => {
    const user = userEvent.setup()
    // El schema del backend (product-schema.ts) limita description a 500 chars:
    // este 400 es lo que el server devuelve de verdad ante el exceso.
    server.use(
      http.post('*/products', () =>
        HttpResponse.json(
          {
            message: 'Invalid data',
            errors: {
              formErrors: [],
              fieldErrors: {
                description: ['Description must be 500 characters or less'],
              },
            },
          },
          { status: 400 },
        ),
      ),
    )
    renderForm()

    await user.type(screen.getByLabelText('Nombre'), 'Lijadora')
    await user.type(screen.getByLabelText('SKU'), 'DESC-1')
    await user.type(screen.getByLabelText('Categoría'), 'Herramientas')
    await user.type(screen.getByLabelText('Precio de venta'), '150')
    await user.click(screen.getByRole('button', { name: /crear/i }))

    // El error se pinta BAJO el campo Descripción y se le asocia por a11y
    expect(
      await screen.findByText('Description must be 500 characters or less'),
    ).toBeInTheDocument()
    const textarea = screen.getByLabelText('Descripción')
    expect(textarea).toBeInvalid()
    expect(textarea).toHaveAccessibleDescription('Description must be 500 characters or less')
  })

  it('al reenviar, los fieldErrors anteriores se limpian y el submit válido navega', async () => {
    const user = userEvent.setup()
    let calls = 0
    server.use(
      http.post('*/products', async ({ request }) => {
        calls += 1
        const body = (await request.json()) as { name?: string }
        if (calls === 1) {
          return HttpResponse.json(
            { message: 'Invalid data', errors: { formErrors: [], fieldErrors: { name: ['Name is required'] } } },
            { status: 400 },
          )
        }
        return HttpResponse.json({ id: 'nuevo', name: body.name }, { status: 201 })
      }),
    )
    renderForm()

    // 1er submit: falla con fieldError en name (los otros campos completos)
    await user.type(screen.getByLabelText('SKU'), 'RE-1')
    await user.type(screen.getByLabelText('Categoría'), 'Cat')
    await user.type(screen.getByLabelText('Precio de venta'), '10')
    await user.click(screen.getByRole('button', { name: /crear/i }))
    expect(await screen.findByText('Name is required')).toBeInTheDocument()

    // 2do submit corregido: el error del campo ya no está y navega al listado
    await user.type(screen.getByLabelText('Nombre'), 'Producto OK')
    await user.click(screen.getByRole('button', { name: /crear/i }))

    await waitFor(() => expect(screen.getByText('listado de productos')).toBeInTheDocument())
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument()
  })

  it('loading del submit evita el doble POST', async () => {
    const user = userEvent.setup()
    let calls = 0
    server.use(
      http.post('*/products', async () => {
        calls += 1
        await new Promise((r) => setTimeout(r, 300)) // latencia simulada
        return HttpResponse.json({ id: 'nuevo' }, { status: 201 })
      }),
    )
    renderForm()

    await user.type(screen.getByLabelText('Nombre'), 'Unico')
    await user.type(screen.getByLabelText('SKU'), 'DS-1')
    await user.type(screen.getByLabelText('Categoría'), 'Cat')
    await user.type(screen.getByLabelText('Precio de venta'), '10')

    const submit = screen.getByRole('button', { name: /crear/i })
    await user.click(submit)
    await user.click(submit) // segundo click mientras está pending

    await waitFor(() => expect(calls).toBe(1)) // el doble click solo generó un POST
    await waitFor(() => expect(screen.getByText('listado de productos')).toBeInTheDocument())
  })
})

describe('ProductFormPage — modo editar', () => {
  beforeEach(() => {
    saveToken(tokenFor('ADMIN'))
    server.use(
      http.get('*/products/:id', () =>
        HttpResponse.json({
          id: 'p1', name: 'Martillo', sku: 'MAR-1', category: 'Herramientas',
          price: 25.5, minStock: 10, description: 'Acero', stock: 120, active: true,
        }),
      ),
    )
  })

  it('precarga los datos del producto por id', async () => {
    renderForm('p1')

    expect(await screen.findByLabelText('Nombre')).toHaveValue('Martillo')
    expect(screen.getByLabelText('SKU')).toHaveValue('MAR-1')
    expect(screen.getByLabelText('Precio de venta')).toHaveValue(25.5)
    // El stock actual es de creación: en edición no existe el campo
    expect(screen.queryByLabelText('Stock actual')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument()
  })

  it('no repite el GET del producto durante el submit (usa el ya precargado)', async () => {
    const user = userEvent.setup()
    let getCalls = 0
    let putCalls = 0
    server.use(
      http.get('*/products/:id', () => {
        getCalls += 1
        return HttpResponse.json({
          id: 'p1', name: 'Martillo', sku: 'MAR-1', category: 'Herramientas',
          price: 25.5, minStock: 10, description: 'Acero', stock: 120, active: true,
        })
      }),
      http.put('*/products/:id', async ({ request }) => {
        putCalls += 1
        await request.json()
        return HttpResponse.json({ id: 'p1', name: 'Martillo Pro' })
      }),
    )
    renderForm('p1')
    await screen.findByLabelText('Nombre')

    const name = screen.getByLabelText('Nombre')
    await user.clear(name)
    await user.type(name, 'Martillo Pro')
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => expect(putCalls).toBe(1))
    expect(getCalls).toBe(1) // solo la precarga: ni diff ni submit re-descargan
    expect(screen.getByText('listado de productos')).toBeInTheDocument()
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

  it('al editar, vuelve al listado mostrando el mensaje de éxito', async () => {
    const user = userEvent.setup()
    server.use(
      http.put('*/products/:id', async ({ request }) => {
        await request.json()
        return HttpResponse.json({ id: 'p1', name: 'Martillo Pro' })
      }),
    )
    renderForm('p1')

    const name = await screen.findByLabelText('Nombre')
    await user.clear(name)
    await user.type(name, 'Martillo Pro')
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(await screen.findByText('Cambios guardados')).toBeInTheDocument()
    expect(screen.getByText('listado de productos')).toBeInTheDocument()
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
