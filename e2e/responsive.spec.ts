import { test, expect, type Page } from '@playwright/test'
import { E2E_ADMIN } from './e2e-constants'

// Smoke check responsive del shell: en cada viewport se valida (1) que el
// login renderiza sin overflow horizontal, (2) que el login por UI funciona y
// (3) que la app (sidebar/nav + dashboard) no desborda. Los screenshots se
// guardan en test-results/responsive/ para revisión visual humana.
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
]

// El overflow horizontal es el bug responsive clásico: contenido que estira
// el viewport y obliga a scrollear de costado. Margen de 1px por redondeo.
async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, `overflow horizontal de ${overflow}px en ${page.viewportSize()?.width}x${page.viewportSize()?.height}`).toBeLessThanOrEqual(1)
}

for (const vp of VIEWPORTS) {
  test.describe(`responsive ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    test('login: sin overflow y con el form visible', async ({ page }) => {
      await page.goto('/login')
      await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
      await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
      // La autoría (links de GitHub/LinkedIn) existe en todos los viewports
      await expect(page.getByRole('link', { name: 'AxelQuiroga' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Sebastián Quiroga' })).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await page.screenshot({ path: `test-results/responsive/login-${vp.name}.png`, fullPage: true })
    })

    test('login por UI funciona y la app no desborda', async ({ page }) => {
      await page.goto('/login')
      await page.getByLabel('Email', { exact: true }).fill(E2E_ADMIN.email)
      await page.getByLabel('Contraseña', { exact: true }).fill(E2E_ADMIN.password)
      await page.getByRole('button', { name: 'Iniciar sesión' }).click()
      await expect(page).toHaveURL(/\/products/, { timeout: 10_000 })

      // El nav del sidebar existe en todas las modalidades (columna o franja)
      await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible()

      // Dashboard: contenido denso sin overflow
      await page.goto('/')
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await page.screenshot({ path: `test-results/responsive/app-${vp.name}.png`, fullPage: true })

      // Una página densa más (tabla de productos)
      await page.goto('/products')
      await expectNoHorizontalOverflow(page)
      await page.screenshot({ path: `test-results/responsive/products-${vp.name}.png`, fullPage: true })
    })
  })
}