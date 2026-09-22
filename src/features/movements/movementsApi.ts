import { api } from '../../shared/api/api'
import { getToken } from '../auth/tokenStore'

export interface Movement {
  id: string
  productId: string
  userId: string
  type: 'IN' | 'OUT'
  quantity: number
  reason: string
  createdAt: string
}

// Read model de la vista global (GET /movements): el producto viaja siempre
// unido (sku + nombre); la autoría (userId/userName) SOLO viaja para el ADMIN
// — el backend la redacta a null para OPERATOR/VIEWER.
export interface GlobalMovement {
  id: string
  productId: string
  productSku: string
  productName: string
  userId: string | null
  userName: string | null
  type: 'IN' | 'OUT'
  quantity: number
  reason: string
  createdAt: string
}

export interface RegisterMovementInput {
  productId: string
  quantity: number
  reason: string
  type: 'IN' | 'OUT'
}

export interface ListMovementsParams {
  page?: number
  limit?: number
  type?: 'IN' | 'OUT'
  productId?: string
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { authorization: `Bearer ${token}` } : {}
}

export const movementsApi = {
  // El backend expone dos contratos explícitos (entry/exit), no un toggle:
  // el tipo de movimiento decide la ruta.
  register({ type, productId, quantity, reason }: RegisterMovementInput): Promise<Movement> {
    return api(`/movements/${type === 'IN' ? 'entry' : 'exit'}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ productId, quantity, reason }),
    })
  },

  // Historial de un producto: lectura para cualquier rol autenticado.
  // El server lo devuelve ordenado más-reciente-primero y pagina con
  // page/limit (defaults 1/20; limit máx 100).
  history(productId: string, params: { page?: number; limit?: number } = {}): Promise<Movement[]> {
    const query = new URLSearchParams()
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.limit !== undefined) query.set('limit', String(params.limit))
    const qs = query.toString()
    return api(`/movements/history/${productId}${qs ? `?${qs}` : ''}`, { headers: authHeaders() })
  },

  // Vista global: mismo orden (más reciente primero) y paginación, con los
  // filtros del contrato. userId solo es parte del contrato para el ADMIN;
  // el frontend no lo envía (el backend igual lo descarta para otros roles).
  list(params: ListMovementsParams = {}): Promise<GlobalMovement[]> {
    const query = new URLSearchParams()
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.limit !== undefined) query.set('limit', String(params.limit))
    if (params.type !== undefined) query.set('type', params.type)
    if (params.productId !== undefined) query.set('productId', params.productId)
    const qs = query.toString()
    return api(`/movements${qs ? `?${qs}` : ''}`, { headers: authHeaders() })
  },
}
