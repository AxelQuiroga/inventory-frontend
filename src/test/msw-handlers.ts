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

// KPIs que GET /products/summary debe devolver sobre el seed (mismo cálculo
// que el backend: SOLO activos, stock <= minStock como bajo):
//   total 4 · totalStock 513 · lowStock 2
export const testSummary = {
  total: 4,
  totalStock: 513,
  lowStock: 2,
}

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
  // GET /products/summary → agregados { total, totalStock, lowStock }.
  // Caso de uso distinto del listado: el dashboard no trae filas para sumar.
  http.get('*/products/summary', () => {
    return HttpResponse.json(testSummary)
  }),

  // GET /products → { data, total }: data es la página, total es el conteo
  // global de la query filtrada (ANTES del recorte de página). Réplica del
  // count(*) que el backend hace sobre los mismos filtros.
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

    // Contrato: total se calcula con la query completa ANTES de paginar.
    const total = result.length

    const page = Number(url.searchParams.get('page') ?? '1')
    const limit = Number(url.searchParams.get('limit') ?? '20')
    const data = result.slice((page - 1) * limit, (page - 1) * limit + limit)

    return HttpResponse.json({ data, total })
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

// Réplica del módulo global de movimientos (GET /movements):
//   Filtros: page/limit + type (IN|OUT) + productId. El filtro userId solo
//   aplica para ADMIN (redacción server-side: el frontend jamás lo envía, y
//   para otros roles el backend lo descarta igual).
//   Redacción: la autoría (userId/userName) viaja NULL salvo rol ADMIN —
//   mismo contrato que GlobalMovement del backend.
export const seedGlobalMovements = [
  {
    id: 'gm-3',
    productId: 'p1',
    productSku: 'MAR-1',
    productName: 'Martillo',
    userId: 'user-admin',
    userName: 'Admin Usuario',
    type: 'OUT',
    quantity: 2,
    reason: 'Venta',
    createdAt: '2026-09-21T10:00:00.000Z',
  },
  {
    id: 'gm-2',
    productId: 'p2',
    productSku: 'TAL-1',
    productName: 'Taladro',
    userId: 'user-operator',
    userName: 'Op Usuario',
    type: 'IN',
    quantity: 5,
    reason: 'Compra',
    createdAt: '2026-09-20T10:00:00.000Z',
  },
  {
    id: 'gm-1',
    productId: 'p1',
    productSku: 'MAR-1',
    productName: 'Martillo',
    userId: 'user-viewer',
    userName: 'Vis Usuario',
    type: 'IN',
    quantity: 10,
    reason: 'Compra',
    createdAt: '2026-09-19T10:00:00.000Z',
  },
]

// Extrae el rol del token de prueba `x.<b64 payload>.y` (mismo formato del
// login real). La sesión que llega al backend decodifica el JWT y lee `role`;
// aquí replicamos la SIGNA estadística: si no hay token, se trata como no
// autenticado (401).
function roleFromAuthHeader(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header) return null
  const token = header.replace(/^Bearer /, '')
  try {
    const payload = JSON.parse(atob(token.split('.')[1]!))
    return payload.role ?? null
  } catch {
    return null
  }
}

export const movementsHandlers: HttpHandler[] = [
  http.get('*/movements', ({ request }) => {
    const role = roleFromAuthHeader(request)
    if (!role) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    const productId = url.searchParams.get('productId')
    const userId = url.searchParams.get('userId')
    const page = Number(url.searchParams.get('page') ?? '1')
    const limit = Number(url.searchParams.get('limit') ?? '20')

    // Los filtros que el backend de verdad aplica: type/productId para todos;
    // userId SOLO si el rol ve la autoría (política USERS/POLICY).
    let rows = seedGlobalMovements
    if (type === 'IN' || type === 'OUT') rows = rows.filter((m) => m.type === type)
    if (productId) rows = rows.filter((m) => m.productId === productId)
    if (userId && role === 'ADMIN') rows = rows.filter((m) => m.userId === userId)

    rows = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    // Contrato: total se calcula sobre la query filtrada ANTES de paginar
    // (igual que el count(*) del backend).
    const total = rows.length

    const start = (page - 1) * limit
    const pageRows = rows.slice(start, start + limit)

    // Redacción server-side: la tabla solo lleva autoría si el rol es ADMIN.
    const data = pageRows.map((m) =>
      role === 'ADMIN' ? m : { ...m, userId: null, userName: null },
    )
    return HttpResponse.json({ data, total })
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
  ...movementsHandlers,
  ...usersHandlers,
]
