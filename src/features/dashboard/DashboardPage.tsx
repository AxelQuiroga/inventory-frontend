import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ApiError } from '../../shared/api/api'
import { productsApi, type Product } from '../products/productsApi'

export function DashboardPage() {
  const [recent, setRecent] = useState<Product[] | null>(null)
  const [totals, setTotals] = useState<{ total: number; lowStock: number; stock: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // KPIs con los endpoints existentes:
    //  - total de productos (activos): GET /products?limit=1000 → array.length
    //    (limitación: sin metadata de paginación en el contrato, válido hasta 1000)
    //  - stock bajo: GET /products?lowStock=true → array.length
    //  - stock total: suma del mismo listado (el KPI "movimientos" no existe
    //    aún en la API: GET /movements es global-only-pendiente; se informa).
    const all = productsApi.list({ limit: 1000 })
    const low = productsApi.list({ lowStock: true })

    Promise.all([all, low])
      .then(([allList, lowList]) => {
        setTotals({
          total: allList.length,
          lowStock: lowList.length,
          stock: allList.reduce((sum, p) => sum + p.stock, 0),
        })
        // Recientes: primeros 5 del listado por createdAt desc (orden default del server)
        setRecent(allList.slice(0, 5))
      })
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor'),
      )
  }, [])

  if (error) return <p role="alert">{error}</p>
  if (!totals || !recent) return <p>Cargando...</p>

  return (
    <>
      <h1>Dashboard</h1>

      <section style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <Kpi label="Total de productos" value={totals.total} to="/products" />
        <Kpi label="Stock bajo" value={totals.lowStock} to="/products?lowStock=true" />
        <Kpi label="Stock total" value={totals.stock} />
      </section>

      <h2>
        Productos recientes{' '}
        <Link to="/products" style={{ fontSize: '0.85rem' }}>
          ver todos
        </Link>
      </h2>
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Producto</th>
            <th>Stock</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((p) => (
            <tr key={p.id}>
              <td>{p.sku}</td>
              <td>{p.name}</td>
              <td>{p.stock}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function Kpi({ label, value, to }: { label: string; value: number; to?: string }) {
  const content = (
    <>
      <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{value}</div>
      <div>{label}</div>
    </>
  )
  return to ? (
    <Link to={to} style={{ border: '1px solid #ddd', padding: '1rem', minWidth: '160px' }}>
      {content}
    </Link>
  ) : (
    <div style={{ border: '1px solid #ddd', padding: '1rem', minWidth: '160px' }}>{content}</div>
  )
}
