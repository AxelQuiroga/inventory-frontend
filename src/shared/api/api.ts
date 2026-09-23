// Cliente HTTP mínimo tipado. Centraliza el manejo de errores del backend:
// status + message del contrato REST (ej: 401 { message: 'Invalid credentials' }),
// y fieldErrors del contrato de validación 400 { message, errors: { fieldErrors } }
// para que los formularios puedan mostrar el error junto a cada campo (Slice C).
//
// Responsabilidades de este borde: construir el request y traducir el response
// a T o ApiError. La política de sesión NO le pertenece: ante un 401 no opt-out
// emite SESSION_EXPIRED_EVENT y la capa de auth (main.tsx) decide cómo limpiar
// y a dónde ir. Acá no se hardcodea ningún path de la app.
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

// URL base de la API. Default de desarrollo explícito: si falta .env la app
// sigue funcionando en dev en vez de tirar "Error inesperado" con la URL
// "undefined/...". En producción/deploy se setea VITE_API_URL siempre.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// Guardia de campo: los fieldErrors del backend son { campo: string[] } y
// TODOS sus elementos son strings. Un errors con otra forma (o con valores
// no-string) NO se transporta al formulario.
function isFieldErrors(value: unknown): value is Record<string, string[]> {
  if (typeof value !== 'object' || value === null) return false
  return Object.values(value).every(
    (v) => Array.isArray(v) && v.every((item) => typeof item === 'string'),
  )
}

// Cuerpo de error del contrato REST. message/errors se tratan como unknown:
// solo se usan si pasan su guardia, así el borde no asume forma.
interface ApiErrorBody {
  message?: unknown
  errors?: { fieldErrors?: unknown }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null
}

export interface ApiOptions extends RequestInit {
  // El 401 de endpoints cuyo flujo lo espera (login con credenciales inválidas,
  // un futuro /auth/refresh) NO expira la sesión: el caller lo maneja como
  // error de dominio y opta out con esta flag. Sin la flag, un 401 expira la
  // sesión vía expireSession() y el request resuelve null.
  skipAuthRedirect?: boolean
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  // Los headers se separan del resto de options: un spread de options después
  // del merge volvería a pisar el content-type default con el original de la
  // llamada (el body saldría text/plain y el backend lo rechaza).
  // El cliente es JSON-only y el content-type se manda SOLO cuando hay un body
  // JSON real: un POST sin body (deactivate/reactivate) no puede llevarlo
  // (Fastify rechaza application/json vacío con 400) y un FormData tampoco
  // (fetch le agrega su propio boundary multipart).
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
    // Sesión expirada o token inválido: el borde HTTP NO navega ni limpia
    // (eso es política de la capa de auth). Emite el evento de expiración —
    // escuchado por registerSessionExpiredHandler() en el bootstrap — y cae
    // al bloque !ok de abajo: el ApiError(401) es el contrato con el caller,
    // y el logout (token + /login) ya lo dispara la capa de auth. El opt-out
    // (skipAuthRedirect) no emite nada: el 401 es flujo normal de esa UI.
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

  // Aserción de contrato, no validación runtime: T lo fija el caller según el
  // schema del endpoint; validar datos acá duplicaría zod en cada API module.
  return body as T
}