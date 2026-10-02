import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'

import { E2E_ADMIN, E2E_API_URL } from './e2e-constants'
import { apiLogin, createProductViaApi, deadToken, uniqueSku } from './api-helpers'

// E2E real del ERP: Chromium headless + Fastify REAL + TEST DB. Sin MSW, sin
// mocks: el recorrido completo es browser → vite dev → React → fetch →
// Fastify → use cases → PostgreSQL.
//
// El escenario central es el bug de Fase 1: el dashboard con KPIs reales
// (antes: limit:1000 → 400 por el cap del server → dashboard roto). En vez
// de asumir los números, las aserciones leen el summary real del server y
// verifican que la UI muestre EXACTAMENTE eso: el e2e valida el contrato
// completo UI ↔ API.

// El server (webServer) resetea la TEST DB al arrancar; el seed de productos
// acá es el fixture del escenario: sano (8/2), bajo (0/5) y con stock (40/15).
// SKUs ÚNICOS (uniqueSku), no fijos: si el CI re-corre el beforeAll (retry),
// los SKUs fijos chocaban con 409 "SKU already exists" contra la DB que ya
// quedó sembrada del intento anterior.
test.beforeAll(async () => {
  const token = await apiLogin(E2E_ADMIN.email, E2E_ADMIN.password)
  await createProductViaApi(token, { name: 'Martillo E2E', sku: uniqueSku('E2E-MAR'), minStock: 2, initialStock: 8 })
  await createProductViaApi(token, { name: 'Tornillos E2E', sku: uniqueSku('E2E-TOR'), minStock: 5, initialStock: 0 })
  await createProductViaApi(token, { name: 'Pintura E2E', sku: uniqueSku('E2E-PIN'), minStock: 15, initialStock: 40 })
})

async function loginViaUi(page: Page) {
  await page.goto('/login')
  // exact:true — getByLabel matchea por substring por defecto, y el aria-label
  // "Copiar email/contraseña de demostración" de los botones copiar colisiona
  // con 'Email'/'Contraseña' (strict mode violation). El match exacto apunta
  // SOLO al <label> del input.
  await page.getByLabel('Email', { exact: true }).fill(E2E_ADMIN.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(E2E_ADMIN.password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  // El login exitoso navega a /products (SPA, sin reload).
  await expect(page).toHaveURL(/\/products/)
}

async function readDashboardSource(request: APIRequestContext): Promise<{ totalProducts: number; totalStock: number; lowStock: number; totalMovements: number }> {
  // Los KPIs del server real (contrato de Fase 1): la UI debe mostrar lo mismo.
  const token = await apiLogin(E2E_ADMIN.email, E2E_ADMIN.password)
  const summary = await request.get(`${E2E_API_URL}/products/summary`, {
    headers: { authorization: `Bearer ${token}` },
  })
  expect(summary.ok()).toBeTruthy()
  const { total, totalStock, lowStock } = (await summary.json()) as { total: number; totalStock: number; lowStock: number }

  const movements = await request.get(`${E2E_API_URL}/movements?limit=1`, {
    headers: { authorization: `Bearer ${token}` },
  })
  expect(movements.ok()).toBeTruthy()
  const { total: totalMovements } = (await movements.json()) as { total: number }

  return { totalProducts: total, totalStock, lowStock, totalMovements }
}

test('login real por la UI contra el server real y listado cargado', async ({ page }) => {
  await loginViaUi(page)
  // La lista de productos viene del server real ({ data, total }): los 3 del
  // seed están en la página.
  await expect(page.getByText('Martillo E2E')).toBeVisible()
  await expect(page.getByText('Pintura E2E')).toBeVisible()
})

test('dashboard muestra los KPIs reales de la TEST DB (sin el 400 de limit:1000)', async ({ page, request }) => {
  const expected = await readDashboardSource(request)
  await loginViaUi(page)
  await page.goto('/')

  // KPIs con accessible name: el valor que el server REAL devolvió en
  // /products/summary tiene que aparecer en la UI (UI ↔ API contract).
  // totalStock es un Card sin link: matcheo por texto exacto.
  await expect(page.getByRole('link', { name: `${expected.totalProducts} Total de productos` })).toBeVisible()
  await expect(page.getByRole('link', { name: `${expected.lowStock} Stock bajo` })).toBeVisible()
  await expect(page.getByText(String(expected.totalStock), { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: `${expected.totalMovements} Movimientos` })).toBeVisible()

  // Recientes: GET /products?limit=5 → data del contrato paginado.
  await expect(page.getByText('Pintura E2E')).toBeVisible()
})

test('401 con token que el server rechaza: limpieza de sesión + redirect al login', async ({ page }) => {
  // El token "muerto" pasa el check de la app (ProtectedRoute solo mira que
  // exista) pero el server responde 401 → el interceptor de api() limpia y
  // redirige. Sin el interceptor, la página quedaría en / con el spinner.
  await page.addInitScript((token) => localStorage.setItem('inventory_token', token), deadToken())

  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
})