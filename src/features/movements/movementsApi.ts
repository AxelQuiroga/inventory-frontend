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

export interface RegisterMovementInput {
  productId: string
  quantity: number
  reason: string
  type: 'IN' | 'OUT'
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
}
