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

export const productsApi = {
  list(): Promise<Product[]> {
    return api('/products', {
      headers: { authorization: `Bearer ${getToken() ?? ''}` },
    })
  },
}
