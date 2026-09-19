import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'

import { server } from '../../test/test-utils'
import { saveToken } from '../auth/tokenStore'
import { movementsApi } from './movementsApi'

const TOKEN = `x.${btoa(JSON.stringify({ email: 'a@b.c', role: 'OPERATOR' }))}.y`
const base = import.meta.env.VITE_API_URL

describe('movementsApi — contratos del backend', () => {
  beforeEach(() => {
    saveToken(TOKEN)
  })

  it('entry hace POST /movements/entry con body {productId, quantity, reason}', async () => {
    let capturedUrl = ''
    let capturedBody: unknown
    server.use(
      http.post('*/movements/entry', async ({ request }) => {
        capturedUrl = request.url
        capturedBody = await request.json()
        return HttpResponse.json({ id: 'm1', type: 'IN', quantity: 30 }, { status: 201 })
      }),
    )

    const movement = await movementsApi.register({ productId: 'p1', quantity: 30, reason: 'Compra', type: 'IN' })

    expect(movement.type).toBe('IN')
    expect(capturedUrl).toBe(`${base}/movements/entry`)
    expect(capturedBody).toEqual({ productId: 'p1', quantity: 30, reason: 'Compra' })
  })

  it('exit hace POST /movements/exit', async () => {
    let capturedUrl = ''
    server.use(
      http.post('*/movements/exit', async ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json({ id: 'm2', type: 'OUT', quantity: 4 }, { status: 201 })
      }),
    )

    const movement = await movementsApi.register({ productId: 'p1', quantity: 4, reason: 'Venta', type: 'OUT' })

    expect(movement.type).toBe('OUT')
    expect(capturedUrl).toBe(`${base}/movements/exit`)
  })

  it('propaga 400 Insufficient stock', async () => {
    server.use(
      http.post('*/movements/exit', () =>
        HttpResponse.json({ message: 'Insufficient stock' }, { status: 400 }),
      ),
    )

    await expect(
      movementsApi.register({ productId: 'p1', quantity: 999, reason: 'Venta', type: 'OUT' }),
    ).rejects.toMatchObject({ status: 400, message: 'Insufficient stock' })
  })

  it('propaga 400 Product is inactive', async () => {
    server.use(
      http.post('*/movements/entry', () =>
        HttpResponse.json({ message: 'Product is inactive' }, { status: 400 }),
      ),
    )

    await expect(
      movementsApi.register({ productId: 'p1', quantity: 1, reason: 'X', type: 'IN' }),
    ).rejects.toMatchObject({ status: 400, message: 'Product is inactive' })
  })

  it('propaga 403 Forbidden (VIEWER intenta mover stock)', async () => {
    server.use(
      http.post('*/movements/entry', () => HttpResponse.json({ message: 'Forbidden' }, { status: 403 })),
    )

    await expect(
      movementsApi.register({ productId: 'p1', quantity: 1, reason: 'X', type: 'IN' }),
    ).rejects.toMatchObject({ status: 403, message: 'Forbidden' })
  })
})
