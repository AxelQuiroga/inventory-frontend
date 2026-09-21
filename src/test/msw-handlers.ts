import { http, HttpResponse } from 'msw'
import type { SetupWorker } from 'msw/browser'

// Contratos según el backend real:
//   POST /auth/login → 200 { token } | 401 { message } | 400 { message, errors }
//   GET  /products?lowStock&limit → 200 Product[] (activos; lowStock: stock <= minStock)
type HttpHandler = Parameters<SetupWorker['use']>[0]

// Datos de prueba consistentes para dashboard y productos:
// 4 productos, 2 con stock bajo (stock <= minStock), stock total 513.
export const testProducts = [
  { id: 'p1', name: 'Martillo', sku: 'MAR-1', category: 'Herramientas', price: 25.5, stock: 120, minStock: 10, active: true },
  { id: 'p2', name: 'Taladro', sku: 'TAL-1', category: 'Herramientas', price: 99.99, stock: 3, minStock: 5, active: true },
  { id: 'p3', name: 'Tornillos x100', sku: 'TOR-1', category: 'Ferretería', price: 8, stock: 0, minStock: 20, active: true },
  { id: 'p4', name: 'Pintura blanca 4L', sku: 'PIE-1', category: 'Pinturería', price: 45, stock: 390, minStock: 15, active: true },
]

export const loginHandlers: HttpHandler[] = [
  http.post('*/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }

    if (body.email === 'admin@inventory.com' && body.password === 'admin123') {
      return HttpResponse.json({ token: 'jwt-de-prueba' }, { status: 200 })
    }
    // El backend valida email y password>=6 (zod). La validación nativa del
    // navegador ya cubre el formato de email, así que el contrato 400 se
    // ejercita con una password corta que la pasa pero falla en el server.
    if (body.password === '123') {
      return HttpResponse.json(
        { message: 'Invalid data', errors: { fieldErrors: { password: ['Password must be at least 6 characters'] } } },
        { status: 400 },
      )
    }
    return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
  }),
]

export const productsHandlers: HttpHandler[] = [
  http.get('*/products', ({ request }) => {
    const url = new URL(request.url)
    let result = testProducts

    if (url.searchParams.get('lowStock') === 'true') {
      // Igual que el server: stock <= minStock
      result = result.filter((p) => p.stock <= p.minStock)
    }

    const limit = url.searchParams.get('limit')
    if (limit) {
      result = result.slice(0, Number(limit))
    }

    return HttpResponse.json(result)
  }),
]

export const allHandlers = [...loginHandlers, ...productsHandlers]
