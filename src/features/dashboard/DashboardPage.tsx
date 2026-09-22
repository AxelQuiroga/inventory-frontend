import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Alert, Badge, Card, PageHeader, Spinner, Table } from '../../shared/ui'
import { ApiError } from '../../shared/api/api'
import { productsApi, type Product } from '../products/productsApi'
import { movementsApi } from '../movements/movementsApi'
import './dashboard-page.css'

interface Totals {
  total: number
  lowStock: number
  stock: number
  movements: number
}

export function DashboardPage() {
  const [recent, setRecent] = useState<Product[] | null>(null)
  const [totals, setTotals] = useState<Totals | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // KPIs con los endpoints existentes:
    //  - total de productos (activos): GET /products?limit=1000 → array.length
    //    (limitación: sin metadata de paginación en el contrato, válido hasta 1000)
    //  - stock bajo: GET /products?lowStock=true → array.length
    //  - stock total: suma del mismo listado
    //  - movimientos globales: GET /movements?limit=1000 → array.length (misma
    //    limitación; la redacción de autoría es server-side, aquí solo cuenta)
    const all = productsApi.list({ limit: 1000 })
    const low = productsApi.list({ lowStock: true })
    const movements = movementsApi.list({ limit: 1000 })

    Promise.all([all, low, movements])
      .then(([allList, lowList, movementsList]) => {
        setTotals({
          total: allList.length,
          lowStock: lowList.length,
          stock: allList.reduce((sum, p) => sum + p.stock, 0),
          movements: movementsList.length,
        })
        setRecent(allList.slice(0, 5))
      })
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor'),
      )
  }, [])

  if (error) return <Alert tone="error">{error}</Alert>
  if (!totals || !recent) return <Spinner label="Cargando dashboard" />

  return (
    <>
      <PageHeader title="Dashboard" description="Resumen general del inventario" />

      <section className="Dashboard-kpis">
        <Link to="/products" className="Dashboard-kpiLink">
          <Card>
            <div className="Dashboard-kpiValue">{totals.total}</div>
            <div className="Dashboard-kpiLabel">Total de productos</div>
          </Card>
        </Link>
        <Link to="/products?lowStock=true" className="Dashboard-kpiLink">
          <Card>
            <div className="Dashboard-kpiValue">{totals.lowStock}</div>
            <div className="Dashboard-kpiLabel">Stock bajo</div>
          </Card>
        </Link>
        <Card>
          <div className="Dashboard-kpiValue">{totals.stock}</div>
          <div className="Dashboard-kpiLabel">Stock total</div>
        </Card>
        <Link to="/movements" className="Dashboard-kpiLink">
          <Card>
            <div className="Dashboard-kpiValue">{totals.movements}</div>
            <div className="Dashboard-kpiLabel">Movimientos</div>
          </Card>
        </Link>
      </section>

      <PageHeader title="Productos recientes" action={<Link to="/products">ver todos</Link>} />

      {recent.length === 0 ? (
        <p>No hay productos registrados.</p>
      ) : (
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Th>SKU</Table.Th>
              <Table.Th>Producto</Table.Th>
              <Table.Th>Stock</Table.Th>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {recent.map((p) => (
              <Table.Row key={p.id}>
                <Table.Td>{p.sku}</Table.Td>
                <Table.Td>{p.name}</Table.Td>
                <Table.Td align="right">
                  {p.stock} {p.stock <= p.minStock && <Badge tone="warning">Stock bajo</Badge>}
                </Table.Td>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </>
  )
}
