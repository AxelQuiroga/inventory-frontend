// Cliente HTTP mínimo tipado. Centraliza el manejo de errores del backend:
// status + message del contrato REST (ej: 401 { message: 'Invalid credentials' }).
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// URL base de la API. Default de desarrollo explícito: si falta .env la app
// sigue funcionando en dev en vez de tirar "Error inesperado" con la URL
// "undefined/...". En producción/deploy se setea VITE_API_URL siempre.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { 'content-type': 'application/json' },
      ...options,
    })
  } catch {
    // Fallo de red (server caído, CORS, DNS): mensaje propio, no el crudo.
    throw new ApiError(0, 'No se pudo conectar con el servidor')
  }

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(response.status, body?.message ?? 'Error inesperado')
  }
  return body as T
}
