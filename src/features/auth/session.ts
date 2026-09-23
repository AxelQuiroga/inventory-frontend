import { getToken } from './tokenStore'

// Usuario de la sesión decodificado del payload del JWT. Sin estado global:
// la fuente de verdad es el token persistido.
export interface SessionUser {
  email: string
  role: string
}

// Los JWTs usan base64url: '-' en vez de '+', '_' en vez de '/', y sin
// padding '='. atob() NO entiende ese alfabeto: con tokens estándar (que
// tengan esos caracteres o les falte padding) tira una excepción y la sesión
// se leía como null aunque el token fuera válido. El fix es volver a base64
// estándar antes de decodificar.
function decodeBase64UrlSegment(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  return atob(padded)
}

export function getSessionUser(): SessionUser | null {
  const token = getToken()
  if (!token) return null
  try {
    const payload = JSON.parse(decodeBase64UrlSegment(token.split('.')[1] ?? '')) as Partial<SessionUser> & {
      exp?: number
    }
    if (!payload.email) return null
    // JWT expirado (exp vino en segundos): el token sigue en el storage pero
    // la sesión ya murió. Sin este check la UI mostraría un usuario logueado
    // cuyo token el server rechaza con 401 en la primera llamada.
    if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) return null
    return { email: payload.email, role: payload.role ?? '' }
  } catch {
    return null
  }
}