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

    const sortBy = url.searchParams.get('sortBy')
    const order = url.searchParams.get('order') ?? 'asc'
    if (sortBy === 'name' || sortBy === 'price' || sortBy === 'stock') {
      // Réplica del buildOrder del backend (columnMap name/price/stock/createdAt)
      const dir = order === 'desc' ? -1 : 1
      result = [...result].sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name) * dir
        return (a[sortBy] - b[sortBy]) * dir
      })
    }

    const limit = url.searchParams.get('limit')
    if (limit) {
      result = result.slice(0, Number(limit))
    }

    return HttpResponse.json(result)
  }),
]

// Réplica del servidor de ventas: congela el precio ACTUAL del producto y
// valida stock por línea. Devuelve la venta tipo-como-el-backend (el total
// va derivado de las líneas). No muta testProducts: cada test arranca limpio.
export const salesHandlers: HttpHandler[] = [
  http.post('*/sales', async ({ request }) => {
    const body = (await request.json()) as { items: { productId: string; quantity: number }[] }

    const items = body.items.map((line) => {
      const product = testProducts.find((p) => p.id === line.productId)
      if (!product) {
        throw HttpResponse.json({ message: 'Product not found' }, { status: 404 })
      }
      return { product, quantity: line.quantity }
    })

    // Misma regla que el backend: si CUALQUIER línea no alcanza, 400
    for (const { product, quantity } of items) {
      if (quantity > product.stock) {
        return HttpResponse.json({ message: 'Insufficient stock' }, { status: 400 })
      }
    }

    const saleItems = items.map(({ product, quantity }, index) => ({
      id: `sale-item-${index}`,
      saleId: 'sale-1',
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      quantity,
      unitPrice: product.price,
      total: product.price * quantity,
    }))

    return HttpResponse.json(
      {
        id: 'sale-1',
        userId: 'user-admin',
        items: saleItems,
        total: saleItems.reduce((sum, item) => sum + item.total, 0),
        createdAt: new Date().toISOString(),
      },
      { status: 201 },
    )
  }),

  http.get('*/sales', () => {
    return HttpResponse.json([
      {
        id: 'sale-1',
        userId: 'user-admin',
        itemCount: 2,
        total: 124.5,
        createdAt: '2026-09-21T14:00:00.000Z',
      },
    ])
  }),

  http.get('*/sales/:id', () => {
    return HttpResponse.json({
      id: 'sale-1',
      userId: 'user-admin',
      items: [
        { id: 'si-1', saleId: 'sale-1', productId: 'p1', productName: 'Martillo', productSku: 'MAR-1', quantity: 2, unitPrice: 25.5, total: 51 },
        { id: 'si-2', saleId: 'sale-1', productId: 'p2', productName: 'Taladro', productSku: 'TAL-1', quantity: 1, unitPrice: 99.99, total: 99.99 },
      ],
      total: 150.99,
      createdAt: '2026-09-21T14:00:00.000Z',
    })
  }),
]

// Réplica del módulo de usuarios (USERS_POLICY.MD):
//   GET  /users → ManagedUser[] (sin password, sin el ADMIN único)
//   POST /users/:id/deactivate|reactivate → estado mutado; 400 si el target
//        es el ADMIN; 404 si no existe
//   POST /auth/register → 201 sin password | 409 email duplicado | 400 (zod)
// El array es mutable: el estado activo/inactivo persiste dentro del flujo.
export const seedUsers = [
  {
    id: 'u-operator',
    email: 'chico@inventory.com',
    name: 'Chico Nuevo',
    role: 'OPERATOR',
    active: true,
    createdAt: '2026-09-20T10:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z',
  },
  {
    id: 'u-viewer',
    email: 'lector@inventory.com',
    name: 'Roberto',
    role: 'VIEWER',
    active: false,
    createdAt: '2026-09-19T10:00:00.000Z',
    updatedAt: '2026-09-19T10:00:00.000Z',
  },
]

// El ADMIN del sistema (creado por seed en el backend): existe para que los
// handlers puedan replicar el 400 'Cannot manage ADMIN user'.
const SYSTEM_ADMIN_ID = 'u-admin'

export const usersHandlers: HttpHandler[] = [
  http.get('*/users', () => {
    // Réplica del ListUsers del backend: sin el ADMIN único, sin password.
    return HttpResponse.json(seedUsers)
  }),

  http.post('*/users/:id/deactivate', ({ params }) => {
    const id = String(params.id)
    const user = seedUsers.find((u) => u.id === id)
    if (id === SYSTEM_ADMIN_ID) {
      return HttpResponse.json({ message: 'Cannot manage ADMIN user' }, { status: 400 })
    }
    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 })
    }
    user.active = false
    return HttpResponse.json({ ...user, active: false })
  }),

  http.post('*/users/:id/reactivate', ({ params }) => {
    const id = String(params.id)
    const user = seedUsers.find((u) => u.id === id)
    if (id === SYSTEM_ADMIN_ID) {
      return HttpResponse.json({ message: 'Cannot manage ADMIN user' }, { status: 400 })
    }
    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 })
    }
    user.active = true
    return HttpResponse.json({ ...user, active: true })
  }),

  http.post('*/auth/register', async ({ request }) => {
    const body = (await request.json()) as {
      name: string
      email: string
      role: string
      password: string
    }

    // Mismo orden que el backend real: zod valida primero (400), después el
    // duplicado (409). El 400 de password corta debe ganarle al 409.
    if (body.password.length < 6) {
      return HttpResponse.json(
        {
          message: 'Invalid data',
          errors: { fieldErrors: { password: ['Password must be at least 6 characters'] } },
        },
        { status: 400 },
      )
    }

    if (seedUsers.some((u) => u.email === body.email)) {
      return HttpResponse.json({ message: 'Email already registered' }, { status: 409 })
    }

    // Sin push a seedUsers: el array es compartido entre tests y resetHandlers()
    // no restaura sus mutaciones. El handler es determinista contra el seed.
    const created = {
      id: `u-${Date.now()}`,
      email: body.email,
      name: body.name,
      role: body.role === 'OPERATOR' ? 'OPERATOR' : 'VIEWER',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return HttpResponse.json(created, { status: 201 })
  }),
]

export const allHandlers = [
  ...loginHandlers,
  ...productsHandlers,
  ...salesHandlers,
  ...usersHandlers,
]
