import { getToken } from './tokenStore'

// Usuario de la sesión decodificado del payload del JWT. Sin estado global:
// la fuente de verdad es el token persistido.
export interface SessionUser {
  email: string
  role: string
}

export function getSessionUser(): SessionUser | null {
  const token = getToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as Partial<SessionUser>
    if (!payload.email) return null
    return { email: payload.email, role: payload.role ?? '' }
  } catch {
    return null
  }
}
