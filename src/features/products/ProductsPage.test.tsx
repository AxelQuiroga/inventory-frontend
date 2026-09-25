import { useEffect } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
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
    server.use(http.get('*/products', () => HttpResponse.json({ data: [], total: 0 })))
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
        return HttpResponse.json({ data: [testProducts[0]], total: 1 })
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
        const filtered = testProducts.filter((p) => p.stock <= p.minStock)
        return HttpResponse.json({ data: filtered, total: filtered.length })
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
        const withInactive = [...testProducts, { ...testProducts[0], id: 'p9', sku: 'MAR-9', active: false }]
        return HttpResponse.json({ data: withInactive, total: withInactive.length })
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

describe('ProductsPage — ordenamiento por columnas (sortBy/order del backend)', () => {
  it('click en Stock ordena asc y recarga con ?sortBy=stock&order=asc', async () => {
    const user = userEvent.setup()
    let capturedUrl = ''
    server.use(
      http.get('*/products', ({ request }) => {
        capturedUrl = request.url
        const url = new URL(request.url)
        if (url.searchParams.get('sortBy') === 'stock') {
          const sorted = [...testProducts].sort((a, b) => a.stock - b.stock)
          return HttpResponse.json({ data: url.searchParams.get('order') === 'desc' ? sorted.reverse() : sorted, total: testProducts.length })
        }
        return HttpResponse.json({ data: testProducts, total: testProducts.length })
      }),
    )
    renderPage()

    // Carga inicial: orden original del server (Martillo primero)
    await screen.findByText('Martillo')
    expect(screen.getAllByRole('row')[1]!.textContent).toContain('MAR-1')

    await user.click(screen.getByRole('button', { name: /ordenar por stock/i }))

    await waitFor(() => expect(capturedUrl).toContain('sortBy=stock'))
    expect(capturedUrl).toContain('order=asc')

    // El server "ordenó": Tornillos (stock 0) primero
    expect(screen.getAllByRole('row')[1]!.textContent).toContain('TOR-1')
    // Indicador de dirección asc visible
    expect(screen.getByRole('button', { name: /ordenar por stock/i }).textContent).toContain('↑')
  })

  it('segundo click en la misma columna invierte a desc', async () => {
    const user = userEvent.setup()
    let capturedUrl = ''
    server.use(
      http.get('*/products', ({ request }) => {
        capturedUrl = request.url
        const url = new URL(request.url)
        if (url.searchParams.get('sortBy') === 'stock') {
          const sorted = [...testProducts].sort((a, b) => a.stock - b.stock)
          return HttpResponse.json({ data: url.searchParams.get('order') === 'desc' ? sorted.reverse() : sorted, total: testProducts.length })
        }
        return HttpResponse.json({ data: testProducts, total: testProducts.length })
      }),
    )
    renderPage()

    await screen.findByText('Martillo')
    const stockHeader = screen.getByRole('button', { name: /ordenar por stock/i })

    await user.click(stockHeader)
    await waitFor(() => expect(capturedUrl).toContain('order=asc'))
    expect(stockHeader.textContent).toContain('↑')

    await user.click(screen.getByRole('button', { name: /ordenar por stock/i }))

    await waitFor(() => expect(capturedUrl).toContain('order=desc'))
    // Invertido: Pintura (stock 390) primero
    expect(screen.getAllByRole('row')[1]!.textContent).toContain('PIE-1')
    expect(screen.getByRole('button', { name: /ordenar por stock/i }).textContent).toContain('↓')
  })

  it('click en otra columna cambia el campo y vuelve a asc', async () => {
    const user = userEvent.setup()
    const requested: string[] = []
    server.use(
      http.get('*/products', ({ request }) => {
        requested.push(new URL(request.url).search)
        return HttpResponse.json({ data: testProducts, total: testProducts.length })
      }),
    )
    renderPage()

    await screen.findByText('Martillo')
    await user.click(screen.getByRole('button', { name: /ordenar por stock/i }))
    await waitFor(() => expect(requested[requested.length - 1]).toContain('sortBy=stock'))

    await user.click(screen.getByRole('button', { name: /ordenar por precio/i }))

    await waitFor(() => expect(requested[requested.length - 1]).toContain('sortBy=price'))
    expect(requested[requested.length - 1]).toContain('order=asc')
  })

  it('el filtro stock bajo se mantiene al ordenar (la URL es la fuente de verdad)', async () => {
    const user = userEvent.setup()
    let capturedUrl = ''
    server.use(
      http.get('*/products', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json({ data: testProducts, total: testProducts.length })
      }),
    )
    renderPage()
    await screen.findByText('Martillo')

    await user.click(screen.getByRole('checkbox', { name: /solo stock bajo/i }))
    await waitFor(() => expect(capturedUrl).toContain('lowStock=true'))

    await user.click(screen.getByRole('button', { name: /ordenar por precio/i }))

    await waitFor(() => expect(capturedUrl).toContain('sortBy=price'))
    expect(capturedUrl).toContain('order=asc')
    expect(capturedUrl).toContain('lowStock=true') // el filtro no se pierde
  })
})

describe('ProductsPage — RBAC visible', () => {
  it('ADMIN ve Nuevo producto y el menú de fila con Editar y Desactivar', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('link', { name: /nuevo producto/i })).toBeInTheDocument()
    // El listado default tiene un solo Martillo: su fila es la que se prueba
    await user.click(await screen.findByRole('button', { name: /acciones de martillo/i }))
    const menu = screen.getByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: 'Editar' })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Desactivar' })).toBeInTheDocument()
  })

  it('OPERATOR no ve Nuevo producto ni escritura, y sí movimiento', async () => {
    const user = userEvent.setup()
    saveToken(tokenFor('OPERATOR'))
    renderPage()

    await screen.findByText('Martillo')
    expect(screen.queryByRole('link', { name: /nuevo producto/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /acciones de martillo/i }))
    const menu = screen.getByRole('menu')
    expect(within(menu).queryByRole('menuitem', { name: 'Editar' })).not.toBeInTheDocument()
    expect(within(menu).queryByRole('menuitem', { name: 'Desactivar' })).not.toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Entrada' })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Salida' })).toBeInTheDocument()
  })

  it('VIEWER tampoco ve acciones de escritura ni movimiento', async () => {
    const user = userEvent.setup()
    saveToken(tokenFor('VIEWER'))
    renderPage()

    await screen.findByText('Martillo')
    await user.click(screen.getByRole('button', { name: /acciones de martillo/i }))
    const menu = screen.getByRole('menu')
    expect(within(menu).queryByRole('menuitem', { name: 'Editar' })).not.toBeInTheDocument()
    expect(within(menu).queryByRole('menuitem', { name: 'Desactivar' })).not.toBeInTheDocument()
    expect(within(menu).queryByRole('menuitem', { name: 'Entrada' })).not.toBeInTheDocument()
    expect(within(menu).queryByRole('menuitem', { name: 'Salida' })).not.toBeInTheDocument()
  })

  it('ADMIN ve Entrada y Salida en el menú de cada producto', async () => {
    const user = userEvent.setup()
    // ADMIN ya está logueado por el beforeEach
    renderPage()
    await screen.findByText('Martillo')
    await user.click(screen.getByRole('button', { name: /acciones de martillo/i }))
    const menu = screen.getByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: 'Entrada' })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Salida' })).toBeInTheDocument()
  })

  it('el item Ver historial apunta a la ruta del historial del producto', async () => {
    // Lectura: el backend permite history a todos los roles
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Martillo')
    await user.click(screen.getByRole('button', { name: /acciones de martillo/i }))
    const menu = screen.getByRole('menu')
    const historial = within(menu).getByRole('menuitem', { name: 'Ver historial' })
    expect(historial).toHaveAttribute('href', expect.stringMatching(/\/products\/.+\/history$/))
  })

  it('VIEWER también ve Ver historial en el menú de cada fila', async () => {
    const user = userEvent.setup()
    saveToken(tokenFor('VIEWER'))
    renderPage()
    await screen.findByText('Martillo')
    await user.click(screen.getByRole('button', { name: /acciones de martillo/i }))
    expect(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Ver historial' })).toBeInTheDocument()
  })
})

describe('ProductsPage — desactivar y reactivar (ADMIN)', () => {
  it('Desactivar pide confirmación con contexto y al confirmar ejecuta el contrato', async () => {
    const user = userEvent.setup()
    let deactivateCalled = false
    // El mock simula el estado real del server: el POST muta lo que devuelve el GET
    let active = true
    server.use(
      http.get('*/products', () => HttpResponse.json({ data: [{ ...testProducts[0], active }], total: 1 })),
      http.post('*/products/:id/deactivate', () => {
        deactivateCalled = true
        active = false
        return HttpResponse.json({ ...testProducts[0], active: false })
      }),
    )
    renderPage()

    await user.click(await screen.findByRole('button', { name: /acciones de martillo/i }))
    await user.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Desactivar' }))

    // El diálogo aparece con el producto en contexto y aún NO desactiva
    expect(deactivateCalled).toBe(false)
    const dialog = screen.getByRole('dialog', { name: /desactivar producto/i })
    expect(dialog).toBeInTheDocument()
    expect(dialog.textContent).toMatch(/MAR-1/) // contexto: el producto correcto

    await user.click(within(dialog).getByRole('button', { name: /desactivar/i }))

    await waitFor(() => expect(deactivateCalled).toBe(true))
    // La fila quedó inactiva: al reabrir el menú muestra Reactivar
    await waitFor(() => expect(screen.getByRole('button', { name: /acciones de martillo/i })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: /acciones de martillo/i }))
    expect(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Reactivar' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('cancelar la confirmación cierra el diálogo sin desactivar', async () => {
    const user = userEvent.setup()
    let deactivateCalled = false
    server.use(
      http.post('*/products/:id/deactivate', () => {
        deactivateCalled = true
        return HttpResponse.json({})
      }),
    )
    renderPage()

    // El listado default trae varias filas: el menú de la fila del Martillo
    await screen.findByText('Martillo')
    await user.click(screen.getByRole('button', { name: /acciones de martillo/i }))
    await user.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Desactivar' }))

    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /cancelar/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(deactivateCalled).toBe(false)
  })

  it('Reactivar llama al contrato y la fila vuelve a activo', async () => {
    const user = userEvent.setup()
    let reactivateCalled = false
    let active = false
    server.use(
      http.get('*/products', () => HttpResponse.json({ data: [{ ...testProducts[0], active }], total: 1 })),
      http.post('*/products/:id/reactivate', () => {
        reactivateCalled = true
        active = true
        return HttpResponse.json({ ...testProducts[0], active: true })
      }),
    )
    renderPage()

    await user.click(await screen.findByRole('button', { name: /acciones de martillo/i }))
    await user.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Reactivar' }))

    await waitFor(() => expect(reactivateCalled).toBe(true))
    // La fila volvió a activa: al reabrir el menú muestra Desactivar
    await waitFor(() => expect(screen.getByRole('button', { name: /acciones de martillo/i })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: /acciones de martillo/i }))
    expect(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Desactivar' })).toBeInTheDocument()
  })

  it('consume el mensaje de éxito post/redirect y no lo repite al refrescar', async () => {
    // Simula volver de un formulario que navegó con state.success.
    // LocationProbe expone el estado real del router (window.history es
    // null con MemoryRouter).
    let probe: { pathname: string; state: unknown } | null = null
    function LocationProbe() {
      const location = useLocation()
      useEffect(() => {
        probe = { pathname: location.pathname, state: location.state }
      }, [location])
      return null
    }
    render(
      <MemoryRouter initialEntries={[{ pathname: '/products', state: { success: 'Producto creado' } }]}>
        <LocationProbe />
        <Routes>
          <Route path="/products" element={<ProductsPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('status')).toHaveTextContent('Producto creado')
    // El estado se limpió vía replace: la location actual ya no lo lleva
    await waitFor(() => expect(probe?.state).toBeNull())
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
    await user.click(screen.getByRole('button', { name: /acciones de martillo/i }))
    await user.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Desactivar' }))

    // La acción real se ejecuta al confirmar dentro del diálogo
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /desactivar/i }))

    expect(await screen.findByText('Forbidden')).toBeInTheDocument()
  })
})
