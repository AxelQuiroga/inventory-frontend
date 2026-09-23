import { E2E_API_URL, E2E_ADMIN } from './e2e-constants'

// Helpers del e2e: hablan con el backend REAL por HTTP (Node fetch, no el
// browser). Mismo espíritu que createProductViaApi del e2e backend, pero por
// HTTP de verdad en vez de app.inject.

export async function apiLogin(email: string, password: string): Promise<string> {
  const res = await fetch(`${E2E_API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (res.status !== 200) throw new Error(`apiLogin failed (${res.status}): ${await res.text()}`)
  const body = (await res.json()) as { token: string }
  return body.token
}

let skuCounter = 0
export function uniqueSku(prefix = 'E2E-BROWSER') {
  skuCounter += 1
  return `${prefix}-${Date.now()}-${skuCounter}`
}

export async function createProductViaApi(
  token: string,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string }> {
  const res = await fetch(`${E2E_API_URL}/products`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: 'E2E Browser', sku: uniqueSku(), category: 'E2E', price: 10, ...overrides }),
  })
  if (res.status !== 201) throw new Error(`createProductViaApi failed (${res.status}): ${await res.text()}`)
  const body = (await res.json()) as { id: string }
  return { id: body.id }
}

// Token que la app ACEPTA (payload decodificable con exp futuro) pero el
// BACKEND rechaza (firma inválida): el interceptor 401 tiene que limpiar la
// sesión y redirigir al login tras el fetch real. Mismo formato que
// session.ts decodifica (base64url: - y _ sin padding).
export function deadToken(): string {
  const payload = btoa(JSON.stringify({ email: E2E_ADMIN.email, role: 'ADMIN', exp: Math.floor(Date.now() / 1000) + 3600 }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `header.${payload}.firma-invalida`
}