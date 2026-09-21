import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Spinner, Table } from '../../shared/ui'
import { ApiError } from '../../shared/api/api'
import { productsApi, type Product } from '../products/productsApi'
import { movementsApi, type Movement } from './movementsApi'
import './movement-history-page.css'

// El server pagina con page/limit: el cliente muestra una página a la vez.
// Una página "llena" (== tamaño) puede tener más atrás → Siguiente habilitado.
const HISTORY_PAGE_SIZE = 20

// Historial por producto: lectura para cualquier rol autenticado.
// El server devuelve los movimientos más-reciente-primero y conserva el
// userId de quien hizo cada operación (trazabilidad). Limitación conocida:
// el contrato no expone el nombre del usuario, solo su id.
export function MovementHistoryPage() {
  const { productId } = useParams()

  const [product, setProduct] = useState<Product | null>(null)
  const [history, setHistory] = useState<Movement[] | null>(null)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  // El producto se carga una vez por productId (no al cambiar de página).
  useEffect(() => {
    if (!productId) return
    let cancelled = false
    productsApi
      .getById(productId)
      .then((p) => {
        if (cancelled) return
        setProduct(p)
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

  // El historial depende de la página actual.
  useEffect(() => {
    if (!productId) return
    let cancelled = false
    movementsApi
      .history(productId, { page, limit: HISTORY_PAGE_SIZE })
      .then((movements) => {
        if (cancelled) return
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
  }, [productId, page])

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
        <>
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

          <div className="History-pagination">
            <Button variant="secondary" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
              Anterior
            </Button>
            <span className="History-page-indicator" aria-live="polite">
              Página {page}
            </span>
            <Button
              variant="secondary"
              onClick={() => setPage((p) => p + 1)}
              disabled={history.length < HISTORY_PAGE_SIZE}
            >
              Siguiente
            </Button>
          </div>
        </>
      )}

      <Link to="/products" className="History-back">
        Volver a productos
      </Link>
    </>
  )
}
