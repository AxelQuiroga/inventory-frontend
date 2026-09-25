import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import { describe, it, expect, beforeEach } from 'vitest'

import { server } from '../../test/test-utils'
import { ProductDetailPage } from './ProductDetailPage'
import { saveToken, clearToken } from '../auth/tokenStore'

function tokenFor(role: string) {
  return `x.${btoa(JSON.stringify({ email: 'a@b.c', role }))}.y`
}

const PRODUCT = {
  id: 'p1',
  name: 'Martillo',
  sku: 'MAR-1',
  category: 'Herramientas',
  price: 25.5,
  stock: 26,
  minStock: 5,
  active: true,
  description: 'Martillo de acero 25cm',
}

const HISTORY = [
  { id: 'm2', productId: 'p1', userId: 'user-operator', type: 'OUT', quantity: 4, reason: 'Venta mostrador', createdAt: '2026-09-19T10:00:00Z' },
  { id: 'm1', productId: 'p1', userId: 'user-admin', type: 'IN', quantity: 30, reason: 'Compra a proveedor', createdAt: '2026-09-19T09:00:00Z' },
]

// Más de un tamaño de página: fuerza la aparición de "Siguiente" y ejercita
// page 1 (llena, 20) → page 2 (parcial, 2).
const HISTORY_PAGED = Array.from({ length: 22 }, (_, i) => ({
  id: `m-p${i + 1}`,
  productId: 'p1',
  userId: 'user-admin',
  type: 'IN' as const,
  quantity: i + 1,
  reason: `Movimiento ${i + 1}`,
  createdAt: `2026-09-19T10:00:${String(i).padStart(2, '0')}Z`,
}))

function renderAt(path = '/products/p1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/products" element={<div>listado de productos</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  saveToken(tokenFor('ADMIN'))
  server.use(
    http.get('*/products/:id', () => HttpResponse.json(PRODUCT)),
    http.get('*/movements/history/:productId', () =>
      HttpResponse.json({ data: HISTORY, total: HISTORY.length }),
    ),
  )
})

describe('ProductDetailPage — la ficha', () => {
  it('muestra todos los datos del producto', async () => {
    renderAt()

    expect(await screen.findByText('Martillo')).toBeInTheDocument()
    expect(screen.getByText('MAR-1')).toBeInTheDocument()
    expect(screen.getByText('Herramientas')).toBeInTheDocument()
    expect(screen.getByText(/25[.,]50/)).toBeInTheDocument() // precio es-AR
    expect(screen.getByText('26')).toBeInTheDocument() // stock actual
    expect(screen.getByText('5')).toBeInTheDocument() // stock mínimo
    expect(screen.getByText('Activo')).toBeInTheDocument()
  })

  it('la descripción guardada aparece en el detalle', async () => {
    renderAt()

    // El claim central del feature: lo que el listado oculta, acá se ve.
    expect(await screen.findByText('Martillo de acero 25cm')).toBeInTheDocument()
  })

  it('sin descripción muestra un placeholder', async () => {
    server.use(
      http.get('*/products/:id', () =>
        HttpResponse.json({
          id: PRODUCT.id,
          name: PRODUCT.name,
          sku: PRODUCT.sku,
          category: PRODUCT.category,
          price: PRODUCT.price,
          stock: PRODUCT.stock,
          minStock: PRODUCT.minStock,
          active: PRODUCT.active,
        }),
      ),
    )
    renderAt()

    expect(await screen.findByText('Sin descripción.')).toBeInTheDocument()
  })

  it('marca estado inactivo y stock bajo con badges', async () => {
    server.use(
      http.get('*/products/:id', () =>
        HttpResponse.json({ ...PRODUCT, active: false, stock: 3 }),
      ),
    )
    renderAt()

    // Dos "Inactivo": el badge de la cabecera de la ficha y el Estado del dl.
    const inactivos = await screen.findAllByText('Inactivo')
    expect(inactivos).toHaveLength(2)
    expect(screen.getByText('Stock bajo')).toBeInTheDocument()
  })

  it('error del producto (404) muestra el mensaje y el link de vuelta', async () => {
    server.use(
      http.get('*/products/:id', () =>
        HttpResponse.json({ message: 'Producto no encontrado' }, { status: 404 }),
      ),
    )
    renderAt()

    expect(await screen.findByText('Producto no encontrado')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /volver a productos/i })).toHaveAttribute('href', '/products')
  })
})

describe('ProductDetailPage — acciones por rol', () => {
  it('ADMIN ve Editar, Registrar movimiento y Desactivar', async () => {
    renderAt()
    await screen.findByText('Martillo')

    expect(screen.getByRole('link', { name: 'Editar' })).toHaveAttribute('href', '/products/p1/edit')
    expect(screen.getByRole('link', { name: 'Registrar movimiento' })).toHaveAttribute('href', '/products/p1/movement')
    expect(screen.getByRole('button', { name: 'Desactivar' })).toBeInTheDocument()
  })

  it('OPERATOR ve Registar movimiento pero no escritura de producto', async () => {
    clearToken()
    saveToken(tokenFor('OPERATOR'))
    renderAt()
    await screen.findByText('Martillo')

    expect(screen.getByRole('link', { name: 'Registrar movimiento' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument()
  })

  it('VIEWER es solo lectura', async () => {
    clearToken()
    saveToken(tokenFor('VIEWER'))
    renderAt()
    await screen.findByText('Martillo')

    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Registrar movimiento' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /volver a productos/i })).toBeInTheDocument()
  })

  it('Desactivar pide confirmación, ejecuta el contrato y la ficha refresca', async () => {
    const user = userEvent.setup()
    let deactivateCalled = false
    let active = true
    // El mock simula el estado real del server: el POST muta lo que devuelve el GET.
    server.use(
      http.get('*/products/:id', () => HttpResponse.json({ ...PRODUCT, active })),
      http.post('*/products/:id/deactivate', () => {
        deactivateCalled = true
        active = false
        return HttpResponse.json({ ...PRODUCT, active: false })
      }),
    )
    renderAt()

    await user.click(await screen.findByRole('button', { name: 'Desactivar' }))

    // El diálogo aparece con el producto en contexto y aún NO desactiva
    expect(deactivateCalled).toBe(false)
    const dialog = screen.getByRole('dialog', { name: /desactivar producto/i })
    expect(dialog.textContent).toMatch(/MAR-1/)

    await user.click(within(dialog).getByRole('button', { name: /desactivar/i }))

    await waitFor(() => expect(deactivateCalled).toBe(true))
    // La ficha se refrescó desde el server: ahora ofrece Reactivar
    expect(await screen.findByRole('button', { name: /reactivar/i })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('si la desactivación falla (403), el error queda visible sobre la ficha', async () => {
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Martillo')

    server.use(
      http.post('*/products/:id/deactivate', () =>
        HttpResponse.json({ message: 'Forbidden' }, { status: 403 }),
      ),
    )
    await user.click(screen.getByRole('button', { name: 'Desactivar' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /desactivar/i }))

    // El fallo no tira abajo la pantalla: el Alert aparece sobre la ficha.
    expect(await screen.findByText('Forbidden')).toBeInTheDocument()
    expect(screen.getByText('MAR-1')).toBeInTheDocument()
  })
})

describe('ProductDetailPage — historial embebido', () => {
  it('muestra los movimientos en orden (más reciente primero) con motivo y autor', async () => {
    renderAt()

    const rows = (await screen.findAllByRole('row')).filter(
      (r) => r.textContent?.includes('Venta') || r.textContent?.includes('Compra'),
    )
    expect(rows).toHaveLength(2)
    expect(rows[0]!.textContent).toContain('Venta mostrador') // OUT más reciente
    expect(rows[1]!.textContent).toContain('Compra a proveedor')
    expect(rows[0]!.textContent).toMatch(/salida/i)
    expect(rows[1]!.textContent).toMatch(/entrada/i)
    expect(screen.getByText('user-operator')).toBeInTheDocument()
    expect(screen.getByText('user-admin')).toBeInTheDocument()
  })

  it('historial vacío muestra un mensaje propio', async () => {
    server.use(
      http.get('*/movements/history/:productId', () => HttpResponse.json({ data: [], total: 0 })),
    )
    renderAt()

    expect(await screen.findByText(/sin movimientos/i)).toBeInTheDocument()
  })

  it('un error del historial no rompe la ficha', async () => {
    server.use(
      http.get('*/movements/history/:productId', () =>
        HttpResponse.json({ message: 'Internal server error' }, { status: 500 }),
      ),
    )
    renderAt()

    expect(await screen.findByText('Internal server error')).toBeInTheDocument()
    expect(screen.getByText('Martillo')).toBeInTheDocument() // la ficha sigue viva
  })

  it('pagina el historial: Siguiente y Anterior cambian de página', async () => {
    const requestedPage: string[] = []
    server.use(
      http.get('*/movements/history/:productId', ({ request }) => {
        const url = new URL(request.url)
        requestedPage.push(url.searchParams.get('page') ?? '1')
        const page = Number(url.searchParams.get('page') ?? 1)
        const limit = Number(url.searchParams.get('limit') ?? 20)
        const data = HISTORY_PAGED.slice((page - 1) * limit, page * limit)
        // total es el conteo global, ANTES del recorte de página.
        return HttpResponse.json({ data, total: HISTORY_PAGED.length })
      }),
    )
    renderAt()

    // Página 1: los primeros 20, Anterior deshabilitado
    expect(await screen.findByText('Movimiento 1')).toBeInTheDocument()
    expect(screen.getByText('Página 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))

    // Página 2: los últimos 2; la página quedó parcial → Siguiente se deshabilita
    expect(await screen.findByText('Movimiento 22')).toBeInTheDocument()
    expect(screen.getByText('Página 2')).toBeInTheDocument()
    expect(screen.queryByText('Movimiento 1')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }))

    expect(await screen.findByText('Movimiento 1')).toBeInTheDocument()
    expect(screen.getByText('Página 1')).toBeInTheDocument()
    expect(requestedPage).toEqual(['1', '2', '1'])
  })

  it('deshabilita Siguiente cuando la página trae menos del tamaño de página', async () => {
    renderAt() // beforeEach: solo 2 movimientos

    await screen.findByText('Venta mostrador')

    expect(screen.getByText('Página 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
  })
})