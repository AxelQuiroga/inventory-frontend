import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Alert, Badge, Card, PageHeader, Spinner, Table } from '../../shared/ui'
import { ApiError } from '../../shared/api/api'
import { productsApi, type Product } from '../products/productsApi'
import { movementsApi } from '../movements/movementsApi'
import styles from './DashboardPage.module.css'

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
    // KPIs desde el contrato { data, total } + agregados del server:
    //  - total de productos (activos): GET /products/summary → total
    //  - stock bajo: GET /products/summary → lowStock (contado server-side,
    //    no derivado de un listado traído al cliente)
    //  - stock total: GET /products/summary → totalStock (agregado SQL; traer
    //    todos los productos y sumar en el cliente no escala)
    //  - movimientos globales: GET /movements?limit=1 → total (conteo exacto,
    //    sin depender de traer filas para contarlas)
    //  - recientes: GET /products?limit=5 → data (5 filas, no 1000)
    const summary = productsApi.summary()
    const movements = movementsApi.list({ limit: 1 })
    const recent = productsApi.list({ limit: 5 })

    Promise.all([summary, movements, recent])
      .then(([summaryData, movementsPage, recentPage]) => {
        setTotals({
          total: summaryData.total,
          lowStock: summaryData.lowStock,
          stock: summaryData.totalStock,
          movements: movementsPage.total,
        })
        setRecent(recentPage.data)
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

      <section className={styles.kpis}>
        <Link to="/products" className={styles.kpiLink}>
          <Card>
            <div className={styles.kpiValue}>{totals.total}</div>
            <div className={styles.kpiLabel}>Total de productos</div>
          </Card>
        </Link>
        <Link to="/products?lowStock=true" className={styles.kpiLink}>
          <Card>
            <div className={styles.kpiValue}>{totals.lowStock}</div>
            <div className={styles.kpiLabel}>Stock bajo</div>
          </Card>
        </Link>
        <Card>
          <div className={styles.kpiValue}>{totals.stock}</div>
          <div className={styles.kpiLabel}>Stock total</div>
        </Card>
        <Link to="/movements" className={styles.kpiLink}>
          <Card>
            <div className={styles.kpiValue}>{totals.movements}</div>
            <div className={styles.kpiLabel}>Movimientos</div>
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
