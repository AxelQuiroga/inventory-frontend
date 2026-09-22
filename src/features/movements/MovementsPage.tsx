import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Alert, Badge, Button, EmptyState, PageHeader, Spinner, Table } from '../../shared/ui'
import { ApiError } from '../../shared/api/api'
import { getSessionUser } from '../auth/session'
import { productsApi, type Product } from '../products/productsApi'
import { movementsApi, type GlobalMovement } from './movementsApi'
import './movements-page.css'

// El server pagina con page/limit: el cliente muestra una página a la vez.
// Una página "llena" (== tamaño) puede tener más atrás → Siguiente habilitado.
const MOVEMENTS_PAGE_SIZE = 20

// Vista global de movimientos (GET /movements): cualquier rol autenticado.
// Política de visibilidad (server-side, replicada en el contrato):
//  - ADMIN: ve la autoría (userId/userName) y esta llega en el payload.
//  - OPERATOR/VIEWER: la autoría viaja null (redactada en el backend) y la
//    UI directamente no muestra la columna: no hay dato que pintar.
export function MovementsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const isAdmin = getSessionUser()?.role === 'ADMIN'

  const [movements, setMovements] = useState<GlobalMovement[] | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState<string | null>(null)

  // listado paginado + filtros leídos de la URL (filtros compartibles).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      setError(null)
      try {
        const params = {
          page: Number(searchParams.get('page') ?? '1'),
          limit: MOVEMENTS_PAGE_SIZE,
          type: (searchParams.get('type') ?? undefined) as 'IN' | 'OUT' | undefined,
          productId: searchParams.get('productId') ?? undefined,
        }
        const list = await movementsApi.list(params)
        if (!cancelled) setMovements(list)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams])

  // Opciones del filtro de producto: el listado completo para el select.
  // Los productos activos alcanzan (default del backend), límite 1000.
  useEffect(() => {
    let cancelled = false
    productsApi
      .list({ limit: 1000 })
      .then((list) => {
        if (!cancelled) setProducts(list)
      })
      .catch(() => {
        // El filtro de producto queda vacío; el resto de la página sigue.
        // El alert de error del listado ya cubre fallos del server.
      })
    return () => {
      cancelled = true
    }
  }, [])

  // applyFilter respeta el contrato del frontend: a la URL SOLO van los
  // filtros que el backend expone { type, productId }; nunca userId.
  function applyFilter(next: Record<string, string>) {
    const merged = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value)
      else merged.delete(key)
    }
    // Nuevo filtro → volver a la primera página.
    merged.delete('page')
    setSearchParams(merged)
  }

  const page = Number(searchParams.get('page') ?? '1')
  const hasFilters = searchParams.get('type') !== null || searchParams.get('productId') !== null

  return (
    <>
      <PageHeader title="Movimientos" description="Todas las entradas y salidas del inventario" />

      <div className="Movements-filters">
        <label className="Movements-filter">
          <span>Tipo</span>
          <select
            value={searchParams.get('type') ?? ''}
            onChange={(e) => applyFilter({ type: e.target.value })}
          >
            <option value="">Todos</option>
            <option value="IN">Entrada</option>
            <option value="OUT">Salida</option>
          </select>
        </label>

        <label className="Movements-filter">
          <span>Producto</span>
          <select
            value={searchParams.get('productId') ?? ''}
            onChange={(e) => applyFilter({ productId: e.target.value })}
          >
            <option value="">Todos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {movements === null && !error && <Spinner label="Cargando movimientos" />}

      {movements !== null && movements.length === 0 && (
        <EmptyState
          title={hasFilters ? 'Sin movimientos con esos filtros' : 'Sin movimientos registrados'}
          description={
            hasFilters
              ? 'Probá ajustar los filtros de búsqueda.'
              : 'Cuando se registren entradas o salidas van a aparecer acá.'
          }
        />
      )}

      {movements !== null && movements.length > 0 && (
        <>
          <Table>
            <Table.Head>
              <Table.Row>
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Producto</Table.Th>
                <Table.Th>Cantidad</Table.Th>
                <Table.Th>Motivo</Table.Th>
                {/* La columna de autoría existe SOLO para el ADMIN: el resto
                      ni la recibe (null en el payload). */}
                {isAdmin && <Table.Th>Operador</Table.Th>}
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {movements.map((m) => (
                <Table.Row key={m.id}>
                  <Table.Td>{new Date(m.createdAt).toLocaleString()}</Table.Td>
                  <Table.Td>
                    <Badge tone={m.type === 'IN' ? 'success' : 'info'}>
                      {m.type === 'IN' ? 'Entrada' : 'Salida'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Link to={`/products/${m.productId}/history`}>
                      {m.productName} ({m.productSku})
                    </Link>
                  </Table.Td>
                  <Table.Td align="right">{m.quantity}</Table.Td>
                  <Table.Td>{m.reason}</Table.Td>
                  {isAdmin && <Table.Td>{m.userName ?? m.userId}</Table.Td>}
                </Table.Row>
              ))}
            </Table.Body>
          </Table>

          <div className="Movements-pagination">
            <Button
              variant="secondary"
              onClick={() => applyFilter({ page: String(page - 1) })}
              disabled={page <= 1}
            >
              Anterior
            </Button>
            <span className="Movements-page-indicator" aria-live="polite">
              Página {page}
            </span>
            <Button
              variant="secondary"
              onClick={() => applyFilter({ page: String(page + 1) })}
              disabled={movements.length < MOVEMENTS_PAGE_SIZE}
            >
              Siguiente
            </Button>
          </div>
        </>
      )}
    </>
  )
}