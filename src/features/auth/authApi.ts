import { api } from '../../shared/api/api'

// Contratos según auth-schema.ts del backend
export interface LoginInput {
  email: string
  password: string
}

export const authApi = {
  login(data: LoginInput): Promise<{ token: string }> {
    return api('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
      // El 401 de login son credenciales inválidas, flujo normal de la UI: no
      // debe disparar la expiración de sesión global (opt-out explícito, no
      // por hardcodear la ruta en el cliente HTTP).
      skipAuthRedirect: true,
    })
  },
}
