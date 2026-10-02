import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import { describe, it, expect, beforeEach } from 'vitest'

import { server } from '../../test/test-utils'
import { productsHandlers } from '../../test/msw-handlers'
import { Layout } from '../../shared/layout/Layout'
import { DashboardPage } from './DashboardPage'
import { saveToken } from '../auth/tokenStore'

const TOKEN = `x.${btoa(JSON.stringify({ email: 'seb@inventory.com', role: 'ADMIN' }))}.y`

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    server.use(...productsHandlers)
    saveToken(TOKEN)
  })

  it('muestra los KPIs con datos de los endpoints existentes', async () => {
    renderPage()

    expect(await screen.findByText('4')).toBeInTheDocument() // total de productos
    expect(screen.getByText('2')).toBeInTheDocument() // stock bajo (server: stock <= minStock)
    expect(screen.getByText('513')).toBeInTheDocument() // stock total (suma)
    // KPI de movimientos: el link agrupa valor + label (accessible name)
    expect(screen.getByRole('link', { name: '3 Movimientos' })).toBeInTheDocument()
    expect(screen.getByText('Total de productos')).toBeInTheDocument()
    // El KPI de stock bajo es un link al listado filtrado (el Badge del mismo
    // nombre vive en la tabla de recientes, por eso se busca por rol)
    expect(screen.getByRole('link', { name: /stock bajo/i })).toBeInTheDocument()
    expect(screen.getByText('Stock total')).toBeInTheDocument()
  })

  it('muestra productos recientes (máx 5) con SKU y stock', async () => {
    renderPage()

    expect(await screen.findByText('Martillo')).toBeInTheDocument()
    expect(screen.getByText('MAR-1')).toBeInTheDocument()
    expect(screen.getByText('TAL-1')).toBeInTheDocument()
    expect(screen.getByText('TOR-1')).toBeInTheDocument()
    expect(screen.getByText('PIE-1')).toBeInTheDocument()
    expect(screen.queryByText('No hay productos')).not.toBeInTheDocument()
  })

  it('muestra la navegación y el usuario de la sesión', () => {
    renderPage()

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Productos' })).toBeInTheDocument()
    // La sección Inventario del MVP se eliminó: no debe haber links falsos
    expect(screen.queryByText('Inventario')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Movimientos' })).toBeInTheDocument()
    expect(screen.getByText(/seb@inventory.com/)).toBeInTheDocument()
  })

  it('con el API vacío muestra KPIs en cero', async () => {
    server.use(http.get('*/products/summary', () => HttpResponse.json({ total: 0, totalStock: 0, lowStock: 0 })))
    server.use(http.get('*/products', () => HttpResponse.json({ data: [], total: 0 })))
    server.use(http.get('*/movements', () => HttpResponse.json({ data: [], total: 0 })))
    renderPage()

    await screen.findByText('Total de productos')
    // Los cuatro KPIs (total, stock bajo, stock total, movimientos) en 0
    expect(screen.getAllByText('0')).toHaveLength(4)
  })

  it('error del API muestra un mensaje de error', async () => {
    server.use(
      http.get('*/products', () => HttpResponse.json({ message: 'Internal server error' }, { status: 500 })),
    )
    renderPage()

    expect(await screen.findByText('Internal server error')).toBeInTheDocument()
  })
})
