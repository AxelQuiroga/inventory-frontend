import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { E2E_ADMIN } from './e2e-constants'
import { apiLogin, apiSetActive, createProductViaApi, uniqueSku } from './api-helpers'

// E2E real del ciclo de productos inactivos por la UI contra el server real
// (Fastify + TEST DB, sin mocks). Dos escenarios:
//   1) ADMIN: desactivar (menú + confirmación) → sale del listado activo →
//      "Ver inactivos" (includeInactive) lo trae de vuelta con badge →
//      reactivar → vuelve a la lista activa.
//   2) VIEWER: ve el checkbox "Ver inactivos" y el listado de inactivos
//      (listar es solo lectura para cualquier rol), pero NO tiene el menú
//      de gestión (desactivar/reactivar siguen siendo admin-only).
// El unit del frontend y el integration del backend prueban cada punta por
// separado; acá el contrato UI ↔ API se valida por el browser real.

test.beforeAll(async () => {
  const token = await apiLogin(E2E_ADMIN.email, E2E_ADMIN.password)
  // Fixture del escenario: un producto sano que el test va a desactivar.
  await createProductViaApi(token, { name: 'Guantes E2E', sku: uniqueSku('E2E-GUA'), minStock: 3, initialStock: 12 })
})

async function loginViaUi(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(E2E_ADMIN.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(E2E_ADMIN.password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/products/)
}

test('ciclo completo: desactivar → ver inactivos → reactivar (server real)', async ({ page }) => {
  const name = 'Guantes E2E'
  const rowLink = page.getByRole('link', { name })

  await loginViaUi(page)

  // 1. El producto recién creado está activo en el listado.
  await expect(rowLink).toBeVisible()

  // 2. Desactivar por el menú de la fila + diálogo de confirmación.
  await page.getByRole('button', { name: `Acciones de ${name}` }).click()
  await page.getByRole('menuitem', { name: 'Desactivar' }).click()
  await expect(page.getByRole('button', { name: 'Desactivar' })).toBeVisible() // ConfirmDialog
  await page.getByRole('button', { name: 'Desactivar' }).click()

  // 3. El listado activo ya no lo muestra (refresh desde el server).
  await expect(rowLink).not.toBeVisible()

  // 4. "Ver inactivos" (ADMIN) lo trae de vuelta con el badge.
  // click() en vez de check(): el checkbox es controlado por la URL
  // (searchParams) — check() valida el estado del input antes del commit de
  // React y daba falso positivo. El resultado real es la URL + la lista.
  await page.getByLabel('Ver inactivos').click()
  await expect(page).toHaveURL(/includeInactive=true/)
  await expect(rowLink).toBeVisible()
  await expect(page.getByText('Inactivo', { exact: true })).toBeVisible()

  // 5. Reactivar desde el menú: queda activo al instante.
  await page.getByRole('button', { name: `Acciones de ${name}` }).click()
  await page.getByRole('menuitem', { name: 'Reactivar' }).click()
  await expect(page.getByText('Inactivo', { exact: true })).toHaveCount(0)

  // 6. Con el filtro de inactivos apagado sigue listado (está activo de nuevo).
  await page.getByLabel('Ver inactivos').click()
  await expect(page).not.toHaveURL(/includeInactive=true/)
  await expect(rowLink).toBeVisible()
})

test('VIEWER ve inactivos con el checkbox, sin menú de gestión (server real)', async ({ page }) => {
  // Fixture aislado: un inactivo propio, creado y desactivado vía API (admin),
  // para no depender del orden de ejecución respecto del test de ciclo.
  const adminToken = await apiLogin(E2E_ADMIN.email, E2E_ADMIN.password)
  const { id } = await createProductViaApi(adminToken, {
    name: 'Repuesto E2E',
    sku: uniqueSku('E2E-REP'),
    minStock: 2,
    initialStock: 6,
  })
  await apiSetActive(adminToken, id, false)

  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill('viewer@inventory.com')
  await page.getByLabel('Contraseña', { exact: true }).fill('admin123')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/products/)

  // Listar inactivos es solo lectura: el checkbox existe para VIEWER.
  await expect(page.getByLabel('Ver inactivos')).toBeVisible()
  await page.getByLabel('Ver inactivos').click()
  await expect(page).toHaveURL(/includeInactive=true/)

  // El desactivado aparece con su badge...
  await expect(page.getByRole('link', { name: 'Repuesto E2E' })).toBeVisible()
  await expect(page.getByText('Inactivo', { exact: true })).toBeVisible()

  // ...pero el menú de la fila es de solo lectura para VIEWER: puede ver el
  // detalle, pero no las acciones de gestión (Editar/Reactivar son admin-only).
  await page.getByRole('button', { name: 'Acciones de Repuesto E2E' }).click()
  await expect(page.getByRole('menuitem', { name: 'Ver detalle' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Reactivar' })).toHaveCount(0)
  await expect(page.getByRole('menuitem', { name: 'Editar' })).toHaveCount(0)

  // Cleanup: reactivar para no acoplar el estado con el test de ciclo admin.
  await apiSetActive(adminToken, id, true)
})