import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Alert, Badge, Card, EmptyState, PageHeader, Spinner, Table } from '../../shared/ui'
import { ApiError } from '../../shared/api/api'
import { productsApi, type Product } from '../products/productsApi'
import { movementsApi, type Movement } from './movementsApi'
import './movement-history-page.css'

// Historial por producto: lectura para cualquier rol autenticado.
// El server devuelve los movimientos más-reciente-primero y conserva el
// userId de quien hizo cada operación (trazabilidad). Limitación conocida:
// el contrato no expone el nombre del usuario, solo su id.
export function MovementHistoryPage() {
  const { productId } = useParams()

  const [product, setProduct] = useState<Product | null>(null)
  const [history, setHistory] = useState<Movement[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!productId) return
    let cancelled = false
    Promise.all([productsApi.getById(productId), movementsApi.history(productId)])
      .then(([p, movements]) => {
        if (cancelled) return
        setProduct(p)
        setHistory(movements)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor')
        }
      })
    return () => {
      cancelled = true
    }
  }, [productId])

  if (error) {
    return (
      <>
        <PageHeader title="Historial de movimientos" />
        <Alert tone="error">{error}</Alert>
      </>
    )
  }

  if (!product || !history) return <Spinner label="Cargando historial" />

  return (
    <>
      <PageHeader title="Historial de movimientos" />

      <Card className="History-product">
        <strong>{product.name}</strong>
        <span>{product.sku}</span>
        <span>Stock actual: {product.stock}</span>
      </Card>

      {history.length === 0 ? (
        <EmptyState
          title="Sin movimientos registrados"
          description="Cuando se registren entradas o salidas de este producto, van a aparecer acá."
        />
      ) : (
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Th>Fecha</Table.Th>
              <Table.Th>Tipo</Table.Th>
              <Table.Th>Cantidad</Table.Th>
              <Table.Th>Motivo</Table.Th>
              <Table.Th>Usuario</Table.Th>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {history.map((m) => (
              <Table.Row key={m.id}>
                <Table.Td>{new Date(m.createdAt).toLocaleString()}</Table.Td>
                <Table.Td>
                  <Badge tone={m.type === 'IN' ? 'success' : 'info'}>
                    {m.type === 'IN' ? 'Entrada' : 'Salida'}
                  </Badge>
                </Table.Td>
                <Table.Td>{m.quantity}</Table.Td>
                <Table.Td>{m.reason}</Table.Td>
                <Table.Td>{m.userId}</Table.Td>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      <Link to="/products" className="History-back">
        Volver a productos
      </Link>
    </>
  )
}
