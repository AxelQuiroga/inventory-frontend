import { api } from '../../shared/api/api'
import { getToken } from '../auth/tokenStore'

// Contratos del backend (users module + auth/register):
//   GET  /users                  → 200 ManagedUser[] (sin password, sin el ADMIN)
//   POST /users/:id/deactivate   → 200 ManagedUser | 400 Cannot manage ADMIN user | 404 | 403
//   POST /users/:id/reactivate   → 200 ManagedUser | 400 Cannot manage ADMIN user | 404 | 403
//   POST /auth/register          → 201 ManagedUser | 400 Invalid data | 409 Email already registered | 403
export interface ManagedUser {
  id: string
  email: string
  name: string
  role: 'OPERATOR' | 'VIEWER'
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateUserInput {
  name: string
  email: string
  role: 'OPERATOR' | 'VIEWER'
  password: string
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { authorization: `Bearer ${token}` } : {}
}

export const usersApi = {
  list(): Promise<ManagedUser[]> {
    return api('/users', { headers: authHeaders() })
  },

  create(data: CreateUserInput): Promise<ManagedUser> {
    // Register del backend = "crear usuario interno" (USERS_POLICY.MD):
    // nunca registro público. La UI siempre envía el rol explícito.
    return api('/auth/register', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
  },

  deactivate(id: string): Promise<ManagedUser> {
    return api(`/users/${id}/deactivate`, { method: 'POST', headers: authHeaders() })
  },

  reactivate(id: string): Promise<ManagedUser> {
    return api(`/users/${id}/reactivate`, { method: 'POST', headers: authHeaders() })
  },
}