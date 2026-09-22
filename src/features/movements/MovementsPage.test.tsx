import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import { describe, it, expect, beforeEach } from 'vitest'

import { server } from '../../test/test-utils'
import { MovementsPage } from './MovementsPage'
import { saveToken } from '../auth/tokenStore'

const ADMIN_TOKEN = `x.${btoa(JSON.stringify({ email: 'admin@inv.com', role: 'ADMIN' }))}.y`
const OPERATOR_TOKEN = `x.${btoa(JSON.stringify({ email: 'op@inv.com', role: 'OPERATOR' }))}.y`
const VIEWER_TOKEN = `x.${btoa(JSON.stringify({ email: 'viewer@inv.com', role: 'VIEWER' }))}.y`

// El handler MSW global de GET /movements (movementsHandlers) replica la
// política: la autoría viaja solo para el ADMIN (los demás reciben null).
function renderPage(initialEntry = '/movements') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/movements" element={<MovementsPage />} />
        <Route path="/products/:productId/history" element={<div>historial</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MovementsPage — vista global de movimientos', () => {
  beforeEach(() => {
    saveToken(ADMIN_TOKEN)
  })

  it('ADMIN ve los movimientos con la autoría (Operador) en el payload', async () => {
    renderPage()

    expect(await screen.findByRole('table')).toBeInTheDocument()
    // El seed del handler tiene 3 movimientos con userName: el ADMIN los ve.
    expect(screen.getByText('Admin Usuario')).toBeInTheDocument()
    expect(screen.getByText('Op Usuario')).toBeInTheDocument()
    expect(screen.getByText('Vis Usuario')).toBeInTheDocument()
    // La columna Operador existe para el ADMIN.
    expect(screen.getByRole('columnheader', { name: 'Operador' })).toBeInTheDocument()
  })

  it('OPERATOR ve los movimientos SIN autoría (campo null redactado y columna oculta)', async () => {
    saveToken(OPERATOR_TOKEN)
    renderPage()

    const table = await screen.findByRole('table')
    // Datos generales sí llegan: producto, tipo, cantidad (acotado a la
    // tabla: el select de filtro también tiene opciones "Entrada"/"Salida").
    expect(within(table).getAllByText('Entrada')).toHaveLength(2)
    expect(within(table).getByText('Venta')).toBeInTheDocument()
    // La autoría no viaja: no hay columna Operador ni nombres de usuarios.
    expect(screen.queryByRole('columnheader', { name: 'Operador' })).not.toBeInTheDocument()
    expect(screen.queryByText('Admin Usuario')).not.toBeInTheDocument()
    expect(screen.queryByText('Op Usuario')).not.toBeInTheDocument()
  })

  it('VIEWER ve la misma vista sin autoría que OPERATOR', async () => {
    saveToken(VIEWER_TOKEN)
    renderPage()

    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Operador' })).not.toBeInTheDocument()
  })

  it('filtra por tipo desde la URL (?type=OUT)', async () => {
    renderPage('/movements?type=OUT')

    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row')
    // header + 1 fila: solo el movimiento OUT del seed
    expect(rows).toHaveLength(2)
    expect(within(table).getByText('Venta')).toBeInTheDocument()
    expect(within(table).queryByText('Compra')).not.toBeInTheDocument()
  })

  it('filtra por producto desde la URL (?productId=p2)', async () => {
    renderPage('/movements?productId=p2')

    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row')
    // header + 1 fila: solo el movimiento del Taladro (p2)
    expect(rows).toHaveLength(2)
    expect(within(table).getByText('Taladro (TAL-1)')).toBeInTheDocument()
    expect(within(table).queryByText('Martillo (MAR-1)')).not.toBeInTheDocument()
  })

  it('muestra EmptyState cuando no hay movimientos con los filtros', async () => {
    renderPage('/movements?type=OUT&productId=p2') // el OUT del seed es de p1

    expect(await screen.findByText('Sin movimientos con esos filtros')).toBeInTheDocument()
  })

  it('paginación: Siguiente deshabilitado con menos de una página completa', async () => {
    renderPage()

    await screen.findByRole('table')
    const next = screen.getByRole('button', { name: /siguiente/i })
    expect(next).toBeDisabled()
    // Anterior deshabilitado en la primera página
    expect(screen.getByRole('button', { name: /anterior/i })).toBeDisabled()
  })

  it('el link del producto en la fila apunta al historial', async () => {
    renderPage()

    const table = await screen.findByRole('table')
    // El seed tiene dos movimientos del Martillo (p1): cualquiera apunta al
    // historial del mismo producto.
    const cell = within(table).getAllByText('Martillo (MAR-1)')[0]!
    expect(cell.closest('a')).toHaveAttribute('href', '/products/p1/history')
  })
})

describe('MovementsPage — sin movimientos (estado vacío global)', () => {
  beforeEach(() => {
    saveToken(ADMIN_TOKEN)
  })

  it('muestra el EmptyState global cuando el listado viene vacío', async () => {
    server.use(http.get('*/movements', () => HttpResponse.json([])))
    renderPage()

    expect(await screen.findByText('Sin movimientos registrados')).toBeInTheDocument()
  })

  it('error del API muestra el mensaje del server', async () => {
    server.use(
      http.get('*/movements', () =>
        HttpResponse.json({ message: 'Internal server error' }, { status: 500 }),
      ),
    )
    renderPage()

    expect(await screen.findByText('Internal server error')).toBeInTheDocument()
  })
})