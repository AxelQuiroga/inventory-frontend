import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'

import { server } from '../../test/test-utils'
import { api, ApiError } from './api'
import { SESSION_EXPIRED_EVENT } from '../../features/auth/sessionEvents'

// Contratos del cliente HTTP contra msw (server HTTP simulado, no mocks de
// funciones): el request sale con los headers correctos y la respuesta del
// backend sobrevive hasta el caller.

describe('api() — conservación de headers', () => {
  afterEach(() => {
    localStorage.removeItem('inventory_token')
  })

  it('conserva content-type Y Authorization cuando la llamada aporta headers propios', async () => {
    let captured: Headers | undefined
    server.use(
      http.post('*/products', ({ request }) => {
        captured = request.headers
        return HttpResponse.json({ id: '1' }, { status: 201 })
      }),
    )

    await api('/products', {
      method: 'POST',
      headers: { authorization: 'Bearer token-de-test' },
      body: JSON.stringify({ name: 'X' }),
    })

    // El bug real: el spread de options pisaba el content-type default.
    expect(captured?.get('content-type')).toBe('application/json')
    expect(captured?.get('authorization')).toBe('Bearer token-de-test')
  })

  it('sin headers propios, manda content-type igual (camino del login)', async () => {
    let captured: Headers | undefined
    server.use(
      http.post('*/auth/login', ({ request }) => {
        captured = request.headers
        return HttpResponse.json({ token: 't' })
      }),
    )

    await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@b.c', password: 'secret' }),
    })

    expect(captured?.get('content-type')).toBe('application/json')
    expect(captured?.get('authorization')).toBeNull()
  })
})

describe('ApiError — propagación de fieldErrors', () => {
  it('transporta fieldErrors del contrato 400 { message, errors }', async () => {
    server.use(
      http.post('*/products', () =>
        HttpResponse.json(
          {
            message: 'Invalid data',
            errors: {
              formErrors: [],
              fieldErrors: {
                name: ['Name is required'],
                price: ['Price must be positive'],
              },
            },
          },
          { status: 400 },
        ),
      ),
    )

    const error = await api('/products', {
      method: 'POST',
      body: JSON.stringify({ name: '', price: 0 }),
    }).catch((err: unknown) => err)

    expect(error).toBeInstanceOf(ApiError)
    const apiError = error as ApiError
    expect(apiError.status).toBe(400)
    expect(apiError.message).toBe('Invalid data')
    expect(apiError.fieldErrors).toEqual({
      name: ['Name is required'],
      price: ['Price must be positive'],
    })
  })

  it('errores sin fieldErrors (401/404/500) dejan el campo en undefined', async () => {
    server.use(
      http.get('*/products/no-existe', () =>
        HttpResponse.json({ message: 'Product not found' }, { status: 404 }),
      ),
    )

    const error = await api('/products/no-existe').catch((err: unknown) => err)

    expect(error).toBeInstanceOf(ApiError)
    const apiError = error as ApiError
    expect(apiError.status).toBe(404)
    expect(apiError.message).toBe('Product not found')
    expect(apiError.fieldErrors).toBeUndefined()
  })

  it('respuestas sin body (fallo de red) no rompen la construcción del error', async () => {
    server.use(
      http.get('*/products', () => HttpResponse.error()),
    )

    const error = await api('/products').catch((err: unknown) => err)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(0)
    expect((error as ApiError).fieldErrors).toBeUndefined()
  })
})

describe('api() — 401 global (sesión expirada)', () => {
  const TOKEN = 'x.y.z'
  const onSessionExpired = vi.fn()

  // Escucha de prueba del evento que api() emite: la navegación en sí no es
  // responsabilidad del cliente HTTP (la hace sessionEvents en el bootstrap),
  // acá se verifica que la expiración se delega por evento.
  beforeAll(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
  })
  afterAll(() => {
    window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
  })
  beforeEach(() => {
    onSessionExpired.mockClear()
  })
  afterEach(() => {
    localStorage.removeItem('inventory_token')
  })

  it('401 en un endpoint protegido emite el evento de expiración y lanza ApiError', async () => {
    localStorage.setItem('inventory_token', TOKEN)
    server.use(
      http.get('*/movements', () => HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })),
    )

    // El ApiError(401) es el contrato con el caller...
    const error = await api('/movements').catch((err: unknown) => err)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(401)
    expect((error as ApiError).message).toBe('Unauthorized')
    // ...y la expiración (clearToken + /login) queda delegada a la capa de auth.
    expect(onSessionExpired).toHaveBeenCalledTimes(1)
  })

  it('401 de /auth/login con skipAuthRedirect (credenciales inválidas) NO emite el evento: es flujo normal de la UI', async () => {
    localStorage.setItem('inventory_token', TOKEN)
    server.use(
      http.post('*/auth/login', () => HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })),
    )

    const error = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@b.c', password: 'mal' }),
      skipAuthRedirect: true,
    }).catch((err: unknown) => err)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(401)
    expect((error as ApiError).message).toBe('Invalid credentials')
    expect(localStorage.getItem('inventory_token')).toBe(TOKEN) // no limpió
    expect(onSessionExpired).not.toHaveBeenCalled() // no expiró
  })

  it('401 sin token en storage: igual emite el evento (no hay nada que limpiar y no explota)', async () => {
    server.use(
      http.get('*/products', () => HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })),
    )

    const error = await api('/products').catch((err: unknown) => err)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(401)
    expect(onSessionExpired).toHaveBeenCalledTimes(1)
  })
})

describe('api() — content-type solo con body JSON real', () => {
  it('POST sin body (deactivate/reactivate) NO manda content-type: Fastify rechaza application/json vacío con 400', async () => {
    let captured: Headers | undefined
    server.use(
      http.post('*/products/:id/deactivate', ({ request }) => {
        captured = request.headers
        return HttpResponse.json({ id: '1', active: false })
      }),
    )

    const result = await api('/products/1/deactivate', { method: 'POST' })

    expect(result).toEqual({ id: '1', active: false })
    expect(captured?.get('content-type')).toBeNull()
  })

  it('POST con FormData no fuerza application/json: el runtime agrega su boundary multipart', async () => {
    let captured: Headers | undefined
    server.use(
      http.post('*/uploads', ({ request }) => {
        captured = request.headers
        return HttpResponse.json({ ok: true }, { status: 201 })
      }),
    )

    const form = new FormData()
    form.append('file', new Blob(['x']), 'x.txt')

    await api('/uploads', { method: 'POST', body: form })

    // Si el cliente forzara application/json sobre FormData el boundary no
    // existiría y el servidor no podría parsear el multipart. El guard del
    // borde deja que el runtime genere el content-type con su boundary.
    expect(captured?.get('content-type')).toMatch(/^multipart\/form-data; boundary=/)
  })
})

describe('api() — 204 No Content', () => {
  it('204 resuelve null sin intentar parsear el cuerpo vacío', async () => {
    server.use(
      http.post('*/archivar', () => new HttpResponse(null, { status: 204 })),
    )

    const result = await api('/archivar', { method: 'POST' })

    expect(result).toBeNull()
  })
})
