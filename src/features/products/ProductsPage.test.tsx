import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { http, HttpResponse } from 'msw'
import { describe, it, expect, beforeEach } from 'vitest'

import { server } from '../../test/test-utils'
import { testProducts } from '../../test/msw-handlers'
import { ProductsPage } from './ProductsPage'
import { saveToken, clearToken } from '../auth/tokenStore'

function tokenFor(role: string) {
  return `x.${btoa(JSON.stringify({ email: 'a@b.c', role }))}.y`
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ProductsPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  saveToken(tokenFor('ADMIN'))
})

describe('ProductsPage — listado y estados', () => {
  it('renderiza los productos que devuelve el API', async () => {
    renderPage()

    expect(await screen.findByText('Martillo')).toBeInTheDocument()
    expect(screen.getByText('Taladro')).toBeInTheDocument()
    expect(screen.getByText('MAR-1')).toBeInTheDocument()
  })

  it('marca visualmente los productos con stock bajo (stock <= minStock)', async () => {
    renderPage()

    // Taladro (3/5) y Tornillos (0/20) están bajo el mínimo; Martillo y Pintura no
    expect(await screen.findByText(/stock bajo/i)).toBeInTheDocument()
    const rows = screen.getAllByRole('row')
    const taladroRow = rows.find((r) => r.textContent?.includes('TAL-1'))
    const martilloRow = rows.find((r) => r.textContent?.includes('MAR-1'))
    expect(taladroRow?.textContent).toMatch(/stock bajo/i)
    expect(martilloRow?.textContent).not.toMatch(/stock bajo/i)
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

describe('ProductsPage — búsqueda y filtros (query real del backend)', () => {
  it('buscar recarga con ?search= (ilike del server)', async () => {
    const user = userEvent.setup()
    let capturedUrl = ''
    server.use(
      http.get('*/products', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json([testProducts[0]])
      }),
    )
    renderPage()

    await screen.findByText('Martillo')
    await user.type(screen.getByLabelText(/buscar/i), 'martillo')
    await user.click(screen.getByRole('button', { name: /buscar/i }))

    await waitFor(() => expect(capturedUrl).toContain('search=martillo'))
  })

  it('filtro stock bajo recarga con ?lowStock=true', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Martillo') // carga inicial completa

    let capturedUrl = ''
    server.use(
      http.get('*/products', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json(testProducts.filter((p) => p.stock <= p.minStock))
      }),
    )
    await user.click(screen.getByRole('checkbox', { name: /solo stock bajo/i }))

    await waitFor(() => expect(capturedUrl).toContain('lowStock=true'))
    expect(await screen.findByText('Tornillos x100')).toBeInTheDocument()
    expect(screen.queryByText('Pintura blanca 4L')).not.toBeInTheDocument()
  })

  it('ADMIN puede ver inactivos con ?includeInactive=true', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Martillo') // carga inicial completa

    let capturedUrl = ''
    server.use(
      http.get('*/products', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json([...testProducts, { ...testProducts[0], id: 'p9', sku: 'MAR-9', active: false }])
      }),
    )
    await user.click(screen.getByRole('checkbox', { name: /ver inactivos/i }))

    await waitFor(() => expect(capturedUrl).toContain('includeInactive=true'))
    expect(await screen.findByText('MAR-9')).toBeInTheDocument()
    // El producto inactivo se marca como tal
    const row = screen.getAllByRole('row').find((r) => r.textContent?.includes('MAR-9'))
    expect(row?.textContent).toMatch(/inactivo/i)
  })
})

describe('ProductsPage — RBAC visible', () => {
  it('ADMIN ve link Nuevo producto, Editar y Desactivar/Reactivar', async () => {
    renderPage()

    expect(await screen.findByRole('link', { name: /nuevo producto/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /editar/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /desactivar/i }).length).toBeGreaterThan(0)
  })

  it('OPERATOR no ve acciones de escritura ni Nuevo producto', async () => {
    saveToken(tokenFor('OPERATOR'))
    renderPage()

    await screen.findByText('Martillo')
    expect(screen.queryByRole('link', { name: /nuevo producto/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /editar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /desactivar/i })).not.toBeInTheDocument()
  })

  it('VIEWER tampoco ve acciones de escritura', async () => {
    saveToken(tokenFor('VIEWER'))
    renderPage()

    await screen.findByText('Martillo')
    expect(screen.queryByRole('button', { name: /desactivar/i })).not.toBeInTheDocument()
  })

  it('ADMIN ve links Entrada/Salida por producto', async () => {
    // ADMIN ya está logueado por el beforeEach
    renderPage()
    await screen.findByText('Martillo')
    expect(screen.getAllByRole('link', { name: /^entrada$/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /^salida$/i }).length).toBeGreaterThan(0)
  })

  it('OPERATOR también ve los links de movimiento', async () => {
    clearToken()
    saveToken(tokenFor('OPERATOR'))
    renderPage()
    await screen.findByText('Martillo')
    expect(screen.getAllByRole('link', { name: /^entrada$/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /^salida$/i }).length).toBeGreaterThan(0)
  })

  it('VIEWER no ve links de movimiento (solo lectura)', async () => {
    clearToken()
    saveToken(tokenFor('VIEWER'))
    renderPage()
    await screen.findByText('Martillo')
    expect(screen.queryByRole('link', { name: /^entrada$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^salida$/i })).not.toBeInTheDocument()
  })
})

describe('ProductsPage — desactivar y reactivar (ADMIN)', () => {
  it('Desactivar llama al contrato y la fila pasa a inactivo', async () => {
    const user = userEvent.setup()
    let deactivateCalled = false
    // El mock simula el estado real del server: el POST muta lo que devuelve el GET
    let active = true
    server.use(
      http.get('*/products', () => HttpResponse.json([{ ...testProducts[0], active }])),
      http.post('*/products/:id/deactivate', () => {
        deactivateCalled = true
        active = false
        return HttpResponse.json({ ...testProducts[0], active: false })
      }),
    )
    renderPage()

    await user.click(await screen.findByRole('button', { name: /desactivar/i }))

    await waitFor(() => expect(deactivateCalled).toBe(true))
    // Tras la acción y el refetch, la fila muestra botón Reactivar
    expect(await screen.findByRole('button', { name: /reactivar/i })).toBeInTheDocument()
  })

  it('Reactivar llama al contrato y la fila vuelve a activo', async () => {
    const user = userEvent.setup()
    let reactivateCalled = false
    let active = false
    server.use(
      http.get('*/products', () => HttpResponse.json([{ ...testProducts[0], active }])),
      http.post('*/products/:id/reactivate', () => {
        reactivateCalled = true
        active = true
        return HttpResponse.json({ ...testProducts[0], active: true })
      }),
    )
    renderPage()

    await user.click(await screen.findByRole('button', { name: /reactivar/i }))

    await waitFor(() => expect(reactivateCalled).toBe(true))
    expect(await screen.findByRole('button', { name: /desactivar/i })).toBeInTheDocument()
  })

  it('si la API rechaza (403), el error queda visible', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Martillo') // carga inicial completa

    server.use(
      http.post('*/products/:id/deactivate', () =>
        HttpResponse.json({ message: 'Forbidden' }, { status: 403 }),
      ),
    )
    await user.click((await screen.findAllByRole('button', { name: /desactivar/i }))[0]!)

    expect(await screen.findByText('Forbidden')).toBeInTheDocument()
  })
})
