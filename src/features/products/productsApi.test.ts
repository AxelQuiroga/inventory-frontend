import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'

import { server } from '../../test/test-utils'
import { saveToken, clearToken } from '../auth/tokenStore'
import { productsApi } from './productsApi'

const TOKEN = `x.${btoa(JSON.stringify({ email: 'a@b.c', role: 'ADMIN' }))}.y`
const base = import.meta.env.VITE_API_URL

describe('productsApi — mutaciones (contratos backend)', () => {
  beforeEach(() => {
    saveToken(TOKEN)
  })

  it('create hace POST /products con el body del schema y el token', async () => {
    let captured: { auth?: string; body?: unknown } = {}
    server.use(
      http.post('*/products', ({ request }) => {
        captured = { auth: request.headers.get('authorization') ?? undefined, body: undefined }
        return request.json().then((b) => {
          captured.body = b
          return HttpResponse.json({ id: 'nuevo-id', ...(b as object) }, { status: 201 })
        })
      }),
    )

    const created = await productsApi.create({
      name: 'Nuevo', sku: 'NUE-1', category: 'Cat', price: 10, description: '', minStock: 5,
    })

    expect(created.id).toBe('nuevo-id')
    expect(captured.auth).toBe(`Bearer ${TOKEN}`)
    expect(captured.body).toEqual({
      name: 'Nuevo', sku: 'NUE-1', category: 'Cat', price: 10, description: '', minStock: 5,
    })
  })

  it('create propaga 409 SKU already exists', async () => {
    server.use(
      http.post('*/products', () =>
        HttpResponse.json({ message: 'SKU already exists' }, { status: 409 }),
      ),
    )

    await expect(
      productsApi.create({ name: 'X', sku: 'DUP', category: 'C', price: 1 }),
    ).rejects.toMatchObject({ status: 409, message: 'SKU already exists' })
  })

  it('update hace PUT /products/:id con solo los campos enviados', async () => {
    let capturedBody: unknown
    let capturedUrl = ''
    server.use(
      http.put('*/products/:id', async ({ request }) => {
        capturedBody = await request.json()
        capturedUrl = request.url
        return HttpResponse.json({ id: 'p1', name: 'Editado' })
      }),
    )

    await productsApi.update('p1', { name: 'Editado', price: 12 })

    expect(capturedUrl).toBe(`${base}/products/p1`)
    expect(capturedBody).toEqual({ name: 'Editado', price: 12 })
  })

  it('deactivate hace POST /products/:id/deactivate', async () => {
    let method = ''
    server.use(
      http.post('*/products/:id/deactivate', ({ request }) => {
        method = request.method
        return HttpResponse.json({ id: 'p1', active: false })
      }),
    )

    const updated = await productsApi.setActive('p1', false)
    expect(method).toBe('POST')
    expect(updated.active).toBe(false)
  })

  it('reactivate hace POST /products/:id/reactivate', async () => {
    let method = ''
    server.use(
      http.post('*/products/:id/reactivate', ({ request }) => {
        method = request.method
        return HttpResponse.json({ id: 'p1', active: true })
      }),
    )

    const updated = await productsApi.setActive('p1', true)
    expect(method).toBe('POST')
    expect(updated.active).toBe(true)
  })

  it('sin token las mutaciones van sin authorization y la API responde 401', async () => {
    clearToken()
    server.use(
      http.post('*/products', ({ request }) => {
        expect(request.headers.get('authorization')).toBeNull()
        return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
      }),
    )

    await expect(
      productsApi.create({ name: 'X', sku: 'Y', category: 'C', price: 1 }),
    ).rejects.toMatchObject({ status: 401, message: 'Unauthorized' })
  })
})
