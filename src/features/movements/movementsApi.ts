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
  // El server lo devuelve ordenado más-reciente-primero.
  history(productId: string): Promise<Movement[]> {
    return api(`/movements/history/${productId}`, { headers: authHeaders() })
  },
}
