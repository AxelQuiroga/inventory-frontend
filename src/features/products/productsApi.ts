import { api } from '../../shared/api/api'
import { getToken } from '../auth/tokenStore'

export interface Product {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  minStock: number
  active: boolean
}

export interface ListProductsParams {
  search?: string
  category?: string
  lowStock?: boolean
  includeInactive?: boolean
  limit?: number
  page?: number
}

export const productsApi = {
  list(params: ListProductsParams = {}): Promise<Product[]> {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.category) query.set('category', params.category)
    if (params.lowStock) query.set('lowStock', 'true')
    if (params.includeInactive) query.set('includeInactive', 'true')
    if (params.limit !== undefined) query.set('limit', String(params.limit))
    if (params.page !== undefined) query.set('page', String(params.page))

    const qs = query.toString()
    return api(`/products${qs ? `?${qs}` : ''}`, {
      headers: { authorization: `Bearer ${getToken() ?? ''}` },
    })
  },
}
