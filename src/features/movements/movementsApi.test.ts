import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'

import { server } from '../../test/test-utils'
import { saveToken, clearToken } from '../auth/tokenStore'
import { movementsApi } from './movementsApi'

const TOKEN = `x.${btoa(JSON.stringify({ email: 'a@b.c', role: 'OPERATOR' }))}.y`
const base = import.meta.env.VITE_API_URL

const HISTORY = [
  { id: 'm2', productId: 'p1', userId: 'u2', type: 'OUT', quantity: 4, reason: 'Venta', createdAt: '2026-09-19T10:00:00Z' },
  { id: 'm1', productId: 'p1', userId: 'u1', type: 'IN', quantity: 30, reason: 'Compra', createdAt: '2026-09-19T09:00:00Z' },
]

describe('movementsApi — history (contrato GET /movements/history/:productId)', () => {
  beforeEach(() => {
    saveToken(TOKEN)
  })

  it('history hace GET a la URL correcta con el token y devuelve la lista', async () => {
    let capturedUrl = ''
    let capturedAuth: string | null = null
    server.use(
      http.get('*/movements/history/:productId', ({ request }) => {
        capturedUrl = request.url
        capturedAuth = request.headers.get('authorization')
        return HttpResponse.json(HISTORY)
      }),
    )

    const history = await movementsApi.history('p1')

    expect(history).toHaveLength(2)
    expect(history[0]!.type).toBe('OUT') // más reciente primero
    expect(capturedUrl).toBe(`${base}/movements/history/p1`)
    expect(capturedAuth).toBe(`Bearer ${TOKEN}`)
  })

  it('propaga el error 404 de producto inexistente', async () => {
    server.use(
      http.get('*/movements/history/:productId', () =>
        HttpResponse.json({ message: 'Internal server error' }, { status: 500 }),
      ),
    )

    await expect(movementsApi.history('no-existe')).rejects.toMatchObject({ status: 500 })
  })

  it('sin token va sin authorization header', async () => {
    clearToken()
    let sawAuthHeader: string | null = 'sentinel'
    server.use(
      http.get('*/movements/history/:productId', ({ request }) => {
        sawAuthHeader = request.headers.get('authorization')
        return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
      }),
    )

    await expect(movementsApi.history('p1')).rejects.toMatchObject({ status: 401 })
    expect(sawAuthHeader).toBeNull()
  })
})
