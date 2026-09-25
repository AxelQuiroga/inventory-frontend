
import { SESSION_EXPIRED_EVENT } from '../../features/auth/sessionEvents'

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


const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

function isFieldErrors(value: unknown): value is Record<string, string[]> {
  if (typeof value !== 'object' || value === null) return false
  return Object.values(value).every(
    (v) => Array.isArray(v) && v.every((item) => typeof item === 'string'),
  )
}

interface ApiErrorBody {
  message?: unknown
  errors?: { fieldErrors?: unknown }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null
}

export interface ApiOptions extends RequestInit {

  skipAuthRedirect?: boolean
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {

  const { headers, skipAuthRedirect = false, ...rest } = options
  const hasJsonBody = rest.body != null && !(rest.body instanceof FormData)
  const requestHeaders: HeadersInit = {
    ...(hasJsonBody ? { 'content-type': 'application/json' } : {}),
    ...headers,
  }

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: requestHeaders,
    })
  } catch {
    // Fallo de red (server caído, CORS, DNS): mensaje propio, no el crudo.
    throw new ApiError(0, 'No se pudo conectar con el servidor')
  }

  // 204 No Content (y cualquier respuesta sin cuerpo): el borde resuelve null
  // y no intenta parsear. Los callers que esperan un objeto usan 200.
  if (response.status === 204) return null as T

  const body: unknown = await response.json().catch(() => null)

  if (response.status === 401 && !skipAuthRedirect) {
  
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
  }

  if (!response.ok) {
    const fieldErrors =
      isApiErrorBody(body) && isFieldErrors(body.errors?.fieldErrors)
        ? body.errors.fieldErrors
        : undefined
    const message =
      isApiErrorBody(body) && typeof body.message === 'string'
        ? body.message
        : 'Error inesperado'
    throw new ApiError(response.status, message, fieldErrors)
  }

  return body as T
}