import { api } from '../../shared/api/api'

// Contratos según auth-schema.ts del backend
export interface LoginInput {
  email: string
  password: string
}

export const authApi = {
  login(data: LoginInput): Promise<{ token: string }> {
    return api('/auth/login', { method: 'POST', body: JSON.stringify(data) })
  },
}
