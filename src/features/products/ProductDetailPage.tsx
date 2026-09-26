import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, PageHeader, Pagination, Spinner, Table } from '../../shared/ui'
import { ApiError } from '../../shared/api/api'
import { getSessionUser } from '../auth/session'
import { productsApi, type Product } from './productsApi'
import { movementsApi, type Movement } from '../movements/movementsApi'
import type { Paginated } from '../../shared/api/paginated'
import styles from './ProductDetailPage.module.css'

// El server pagina con page/limit y el contrato expone { data, total }:
// "Siguiente" se decide con el total exacto, no adivinando por tamaño de página.
const HISTORY_PAGE_SIZE = 20

function formatMoney(value: number): string {
  return value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })
}

// RBAC visible, leído en cada render (misma matriz que ProductsPage):
// escritura de producto ADMIN; movimientos ADMIN + OPERATOR.
function usePermissions() {
  const role = getSessionUser()?.role
  return {
    isAdmin: role === 'ADMIN',
    canMoveStock: role === 'ADMIN' || role === 'OPERATOR',
  }
}

// Pantalla única de contexto del producto: ficha completa — incluida la
// descripción, que el listado no muestra —, acciones por rol según la matriz
// del backend y el historial de movimientos embebido con paginación.
// Reemplazó a /products/:id/history (la ruta vieja redirige acá).
export function ProductDetailPage() {
  const { id } = useParams()
  const { isAdmin, canMoveStock } = usePermissions()

  const [product, setProduct] = useState<Product | null>(null)
  const [productError, setProductError] = useState<string | null>(null)
  const [history, setHistory] = useState<Paginated<Movement> | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<Product | null>(null)

  // Carga inicial: promise-chain con guard de cancelación (patrón
  // SaleDetailPage) — sin setState sincrónico dentro del effect.
  useEffect(() => {
    if (!id) return
    let cancelled = false
    productsApi
      .getById(id)
      .then((found) => {
        if (!cancelled) setProduct(found)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setProductError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor')
        }
      })
    return () => {
      cancelled = true
    }
  }, [id])

  // El historial depende de la página actual. El reset del error va en el
  // .then (microtask, no sincrónico): la ficha nunca pestañea entre páginas.
  useEffect(() => {
    if (!id) return
    let cancelled = false
    movementsApi
      .history(id, { page, limit: HISTORY_PAGE_SIZE })
      .then((movements) => {
        if (cancelled) return
        setHistoryError(null)
        setHistory(movements)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setHistoryError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor')
        }
      })
    return () => {
      cancelled = true
    }
  }, [id, page])

  async function setActive(product: Product, active: boolean) {
    setBusyId(product.id)
    setProductError(null)
    try {
      await productsApi.setActive(product.id, active)
      setConfirmTarget(null) // cerrar el diálogo de confirmación al terminar
      // Refresco desde el server: la UI nunca inventa estado.
      setProduct(await productsApi.getById(product.id))
    } catch (err) {
      setConfirmTarget(null) // cerrar: el error se muestra en el Alert de la ficha
      setProductError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor')
    } finally {
      setBusyId(null)
    }
  }

  if (productError && !product) {
    return (
      <>
        <PageHeader title="Detalle de producto" />
        <Alert tone="error">{productError}</Alert>
        <Link to="/products" className={styles.back}>
          Volver a productos
        </Link>
      </>
    )
  }

  if (!product) return <Spinner label="Cargando producto" />

  return (
    <>
      <PageHeader title="Detalle de producto" description={`${product.name} · ${product.sku}`} />

      {/* El error de una acción (p. ej. falló la desactivación) se muestra
          sobre la ficha intacta: la pantalla no se pierde por un fallo. */}
      {productError && <Alert tone="error">{productError}</Alert>}

      <Card className={styles.card}>
        <div className={styles.head}>
          <strong className={styles.name}>{product.name}</strong>
          <div className={styles.badges}>
            {!product.active && <Badge tone="neutral">Inactivo</Badge>}
            {product.stock <= product.minStock && <Badge tone="warning">Stock bajo</Badge>}
          </div>
        </div>

        <dl className={styles.grid}>
          <div className={styles.item}>
            <dt>SKU</dt>
            <dd>{product.sku}</dd>
          </div>
          <div className={styles.item}>
            <dt>Categoría</dt>
            <dd>{product.category}</dd>
          </div>
          <div className={styles.item}>
            <dt>Precio</dt>
            <dd>{formatMoney(product.price)}</dd>
          </div>
          <div className={styles.item}>
            <dt>Stock actual</dt>
            <dd>{product.stock}</dd>
          </div>
          <div className={styles.item}>
            <dt>Stock mínimo</dt>
            <dd>{product.minStock}</dd>
          </div>
          <div className={styles.item}>
            <dt>Estado</dt>
            <dd>{product.active ? 'Activo' : 'Inactivo'}</dd>
          </div>
        </dl>

        {/* El motivo del feature: la descripción se guarda con el producto
            pero el listado no la muestra; acá es un bloque visible. */}
        <section className={styles.description}>
          <h3>Descripción</h3>
          <p className={product.description ? '' : styles.muted}>
            {product.description || 'Sin descripción.'}
          </p>
        </section>

        {/* Acciones según la matriz del backend; la desactivación (destructiva)
            pasa por ConfirmDialog, igual que en el listado. */}
        <div className={styles.actions}>
          {isAdmin && (
            <Link to={`/products/${product.id}/edit`}>
              <Button variant="secondary">Editar</Button>
            </Link>
          )}
          {canMoveStock && (
            <Link to={`/products/${product.id}/movement`}>
              <Button>Registrar movimiento</Button>
            </Link>
          )}
          {isAdmin &&
            (product.active ? (
              <Button variant="danger" onClick={() => setConfirmTarget(product)}>
                Desactivar
              </Button>
            ) : (
              <Button
                variant="secondary"
                loading={busyId === product.id}
                onClick={() => setActive(product, true)}
              >
                Reactivar
              </Button>
            ))}
        </div>
      </Card>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Historial de movimientos</h3>

        {historyError && <Alert tone="error">{historyError}</Alert>}

        {!history && !historyError && <Spinner label="Cargando historial" />}

        {history && history.data.length === 0 && (
          <EmptyState
            title="Sin movimientos registrados"
            description="Cuando se registren entradas o salidas de este producto, van a aparecer acá."
          />
        )}

        {history && history.data.length > 0 && (
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
                {history.data.map((m) => (
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

            <Pagination
              page={page}
              total={history.total}
              pageSize={HISTORY_PAGE_SIZE}
              onPageChange={(next) => setPage(next)}
            />
          </>
        )}

        <Link to="/products" className={styles.back}>
          Volver a productos
        </Link>
      </section>

      <ConfirmDialog
        open={confirmTarget !== null}
        title="Desactivar producto"
        description={
          confirmTarget
            ? `Vas a desactivar "${confirmTarget.name}" (SKU ${confirmTarget.sku}). Dejará de aceptar movimientos.`
            : undefined
        }
        confirmLabel="Desactivar"
        tone="danger"
        pending={busyId !== null}
        onConfirm={() => confirmTarget && setActive(confirmTarget, false)}
        onCancel={() => setConfirmTarget(null)}
      />
    </>
  )
}