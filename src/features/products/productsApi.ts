import { api } from '../../shared/api/api'
import { getToken } from '../auth/tokenStore'
import type { Paginated } from '../../shared/api/paginated'

export interface Product {
  id: string
  name: string
  sku: string
  category: string
  price: number
  description?: string
  stock: number
  minStock: number
  active: boolean
}

export interface ListProductsParams {
  search?: string
  category?: string
  lowStock?: boolean
  includeInactive?: boolean
  // Ordenamiento respetando la whitelist del backend (buildOrder):
  // name|price|stock|createdAt, order asc|desc.
  sortBy?: 'name' | 'price' | 'stock' | 'createdAt'
  order?: 'asc' | 'desc'
  limit?: number
  page?: number
}

// Authorization solo cuando hay sesión (sin token no se manda el header).
function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { authorization: `Bearer ${token}` } : {}
}

// Payload de creación según createProductSchema del backend (zod).
export interface CreateProductInput {
  name: string
  sku: string
  category: string
  price: number
  description?: string
  minStock?: number
}

// Payload de edición según updateProductSchema: todos los campos opcionales.
export type UpdateProductInput = Partial<CreateProductInput>

// Proyección agregada del dashboard: GET /products/summary → { total, totalStock, lowStock }.
// Es un caso de uso distinto del listado (agregados, no filas): traer todos
// los productos al cliente para sumar stock no escala.
export interface ProductSummary {
  total: number
  totalStock: number
  lowStock: number
}

export const productsApi = {
  // Listado paginado: { data, total } — data es la página, total es el conteo
  // global (un KPI del dashboard NO se deriva de data.length).
  list(params: ListProductsParams = {}): Promise<Paginated<Product>> {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.category) query.set('category', params.category)
    if (params.lowStock) query.set('lowStock', 'true')
    if (params.includeInactive) query.set('includeInactive', 'true')
    if (params.limit !== undefined) query.set('limit', String(params.limit))
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.sortBy) query.set('sortBy', params.sortBy)
    if (params.order) query.set('order', params.order)

    const qs = query.toString()
    return api(`/products${qs ? `?${qs}` : ''}`, { headers: authHeaders() })
  },

  summary(): Promise<ProductSummary> {
    return api('/products/summary', { headers: authHeaders() })
  },

  getById(id: string): Promise<Product> {
    return api(`/products/${id}`, { headers: authHeaders() })
  },

  create(data: CreateProductInput): Promise<Product> {
    return api('/products', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
  },

  update(id: string, data: UpdateProductInput): Promise<Product> {
    return api(`/products/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
  },

  // setActive mapea a los contratos reales: deactivate/reactivate son POST
  // con path explícito (no hay PATCH ni toggle en la API).
  setActive(id: string, active: boolean): Promise<Product> {
    return api(`/products/${id}/${active ? 'reactivate' : 'deactivate'}`, {
      method: 'POST',
      headers: authHeaders(),
    })
  },
}
