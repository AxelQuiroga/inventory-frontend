// Cliente HTTP mínimo tipado. Centraliza el manejo de errores del backend:
// status + message del contrato REST (ej: 401 { message: 'Invalid credentials' }),
// y fieldErrors del contrato de validación 400 { message, errors: { fieldErrors } }
// para que los formularios puedan mostrar el error junto a cada campo (Slice C).
import { clearToken } from '../../features/auth/tokenStore'
export class ApiError extends Error {
  status: number
  // Opcional: solo el 400 de validación lo trae. 401/404/500 no tienen por qué.
  fieldErrors?: Record<string, string[]>

  constructor(status: number, message: string, fieldErrors?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

// URL base de la API. Default de desarrollo explícito: si falta .env la app
// sigue funcionando en dev en vez de tirar "Error inesperado" con la URL
// "undefined/...". En producción/deploy se setea VITE_API_URL siempre.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// Guardia mínima: los fieldErrors del backend son { campo: string[] }.
// Evita transportar basura si algún endpoint devuelve errors con otra forma.
function isFieldErrors(value: unknown): value is Record<string, string[]> {
  if (typeof value !== 'object' || value === null) return false
  return Object.values(value).every((v) => Array.isArray(v))
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Los headers se separan del resto de options: un spread de options después
  // del merge volvería a pisar el content-type default con el original de la
  // llamada (el body saldría text/plain y el backend lo rechaza).
  const { headers, ...rest } = options
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: { 'content-type': 'application/json', ...headers },
    })
  } catch {
    // Fallo de red (server caído, CORS, DNS): mensaje propio, no el crudo.
    throw new ApiError(0, 'No se pudo conectar con el servidor')
  }

  const body = await response.json().catch(() => null)

  if (response.status === 401 && !path.startsWith('/auth/')) {
    // Sesión expirada o token inválido: la sesión persistida murió → limpiar
    // y volver al login. El 401 de /auth/login (credenciales incorrectas) es
    // un caso NORMAL de la UI: NO dispara el redirect porque ya estamos en el
    // login y el formulario es quien muestra el error.
    clearToken()
    window.location.assign('/login')
  }

  if (!response.ok) {
    const fieldErrors = isFieldErrors(body?.errors?.fieldErrors)
      ? body.errors.fieldErrors
      : undefined
    throw new ApiError(response.status, body?.message ?? 'Error inesperado', fieldErrors)
  }
  return body as T
}
