import { describe, it, expect, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'

import { server } from '../../test/test-utils'
import { api, ApiError } from './api'

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
