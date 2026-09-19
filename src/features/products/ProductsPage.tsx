import { useEffect, useState } from 'react'
import { ApiError } from '../../shared/api/api'
import { productsApi, type Product } from './productsApi'

export function ProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    productsApi
      .list()
      .then(setProducts)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor'),
      )
  }, [])

  if (error) return <p role="alert">{error}</p>
  if (!products) return <p>Cargando...</p>
  if (products.length === 0) return <p>No hay productos</p>

  return (
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th>SKU</th>
          <th>Stock</th>
          <th>Precio</th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => (
          <tr key={p.id} style={p.stock <= p.minStock ? { color: 'red' } : undefined}>
            <td>{p.name}</td>
            <td>{p.sku}</td>
            <td>
              {p.stock} {p.stock <= p.minStock ? '(stock bajo)' : ''}
            </td>
            <td>{p.price}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
