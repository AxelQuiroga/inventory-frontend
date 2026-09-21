import { api } from '../../shared/api/api'
import { getToken } from '../auth/tokenStore'

// Contratos del backend (sales module):
//   POST /sales → 201 Sale | 400 { message } (Insufficient stock, Product is
//                 inactive) | 404 Product not found | 403 (rol)
//   GET  /sales → 200 SaleSummary[]
//   GET  /sales/:id → 200 Sale | 404
export interface SaleItem {
  id: string
  saleId: string
  productId: string
  productName?: string
  productSku?: string
  quantity: number
  unitPrice: number // precio congelado al momento de la venta
  total: number // derivado: quantity * unitPrice
}

export interface Sale {
  id: string
  userId: string
  items: SaleItem[]
  total: number
  createdAt: string
}

export interface SaleSummary {
  id: string
  userId: string
  itemCount: number
  total: number
  createdAt: string
}

// La venta llega por líneas { productId, quantity }: el precio NO viaja en
// el request. El server lee el precio actual del producto, lo congela en la
// línea y descuenta el stock de forma atómica (todo o nada).
export interface CreateSaleInput {
  items: { productId: string; quantity: number }[]
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { authorization: `Bearer ${token}` } : {}
}

export const salesApi = {
  create(data: CreateSaleInput): Promise<Sale> {
    return api('/sales', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
  },

  getById(id: string): Promise<Sale> {
    return api(`/sales/${id}`, { headers: authHeaders() })
  },

  list(): Promise<SaleSummary[]> {
    return api('/sales', { headers: authHeaders() })
  },
}