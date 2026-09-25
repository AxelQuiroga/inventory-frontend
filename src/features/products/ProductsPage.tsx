import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Alert, Badge, Button, ConfirmDialog, EmptyState, Input, Menu, PageHeader, Spinner, Table } from '../../shared/ui'
import { ApiError } from '../../shared/api/api'
import { getSessionUser } from '../auth/session'
import { productsApi, type Product, type ListProductsParams } from './productsApi'
import './products-page.css'

// RBAC visible, leído en cada render: la sesión vive en el token persistido.
//  - escritura de productos: ADMIN (create/update/deactivate/reactivate)
//  - movimientos de stock: ADMIN + OPERATOR (matriz del backend)
function usePermissions() {
  const role = getSessionUser()?.role
  return {
    isAdmin: role === 'ADMIN',
    canMoveStock: role === 'ADMIN' || role === 'OPERATOR',
  }
}

// Carga de productos aislada del effect: el effect solo sincroniza con la
// URL (sistema externo), la función es reutilizable por filtros y acciones.
function useProductList(searchParams: URLSearchParams) {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const params = Object.fromEntries(searchParams.entries()) as ListProductsParams
      const list = await productsApi.list(params)
      setProducts(list.data) // setState en callback async: fuera del render, sin warning
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor')
    }
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setError(null)
      try {
        const params = Object.fromEntries(searchParams.entries()) as ListProductsParams
        const list = await productsApi.list(params)
        if (!cancelled) setProducts(list.data)
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

  return { products, error, setError, refresh: load }
}

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { products, error, setError, refresh } = useProductList(searchParams)
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<Product | null>(null)
  const { isAdmin, canMoveStock } = usePermissions()

  // Feedback de éxito post/redirect: los formularios navegan con
  // location.state.success; se lee una sola vez al montar y el navigate
  // replace lo limpia del historial (no hay otro camino de escritura).
  const location = useLocation()
  const navigate = useNavigate()
  const [success] = useState<string | null>(
    (location.state as { success?: string } | null)?.success ?? null,
  )
  useEffect(() => {
    // Converge: tras el replace el state queda null y el efecto es no-op.
    if (location.state?.success) {
      navigate(location.pathname + location.search, { replace: true, state: null })
    }
  }, [location.state, location.pathname, location.search, navigate])

  async function setActive(product: Product, active: boolean) {
    setBusyId(product.id)
    setError(null)
    try {
      await productsApi.setActive(product.id, active)
      setConfirmTarget(null) // cerrar el diálogo de confirmación al terminar
      await refresh() // refresco desde el server: la UI nunca inventa estado
    } catch (err) {
      setConfirmTarget(null) // cerrar: el error se muestra en el Alert del listado
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor')
    } finally {
      setBusyId(null)
    }
  }

  function applyFilter(next: Record<string, string>) {
    const merged = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value)
      else merged.delete(key)
    }
    setSearchParams(merged)
  }

  // Ordenamiento por columnas visibles. SKU y createdAt NO se exponen: la
  // whitelist del backend es name|price|stock|createdAt y la tabla no
  // muestra createdAt.
  type SortField = 'name' | 'price' | 'stock'

  function toggleSort(field: SortField) {
    const current = searchParams.get('sortBy')
    // Mismo campo → toggle asc/desc; campo nuevo → empieza en asc.
    const order = current === field && searchParams.get('order') !== 'desc' ? 'desc' : 'asc'
    applyFilter({ sortBy: field, order })
  }

  function sortIndicator(field: SortField) {
    if (searchParams.get('sortBy') !== field) return null
    return searchParams.get('order') === 'desc' ? ' ↓' : ' ↑'
  }

  const isEmpty = products !== null && products.length === 0

  return (
    <>
      <PageHeader
        title="Productos"
        description="Gestioná los productos del inventario"
        action={isAdmin ? <Link to="/products/new"><Button>Nuevo producto</Button></Link> : undefined}
      />

      <div className="Products-filters">
        <Input
          id="search"
          label="Buscar"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilter({ search })}
        />
        <Button variant="secondary" onClick={() => applyFilter({ search })}>
          Buscar
        </Button>

        <label className="Products-check">
          <input
            type="checkbox"
            checked={searchParams.get('lowStock') === 'true'}
            onChange={(e) => applyFilter({ lowStock: e.target.checked ? 'true' : '' })}
          />{' '}
          Solo stock bajo
        </label>

        {/* includeInactive es ADMIN-only en el backend */}
        {isAdmin && (
          <label className="Products-check">
            <input
              type="checkbox"
              checked={searchParams.get('includeInactive') === 'true'}
              onChange={(e) => applyFilter({ includeInactive: e.target.checked ? 'true' : '' })}
            />{' '}
            Ver inactivos
          </label>
        )}
      </div>

      {success && <Alert tone="success">{success}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      {products === null && !error && <Spinner label="Cargando productos" />}

      {isEmpty && (
        <EmptyState
          title="No hay productos"
          description={search || searchParams.toString() ? 'Probá ajustar los filtros de búsqueda.' : 'Creá el primer producto para empezar.'}
          action={isAdmin ? <Link to="/products/new"><Button variant="secondary">Nuevo producto</Button></Link> : undefined}
        />
      )}

      {products !== null && products.length > 0 && (
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Th>SKU</Table.Th>
              <Table.Th>
                <button
                  type="button"
                  className="Products-sort"
                  aria-label="Ordenar por Producto"
                  onClick={() => toggleSort('name')}
                >
                  Producto{sortIndicator('name')}
                </button>
              </Table.Th>
              <Table.Th>
                <button
                  type="button"
                  className="Products-sort"
                  aria-label="Ordenar por Stock"
                  onClick={() => toggleSort('stock')}
                >
                  Stock{sortIndicator('stock')}
                </button>
              </Table.Th>
              <Table.Th>
                <button
                  type="button"
                  className="Products-sort"
                  aria-label="Ordenar por Precio"
                  onClick={() => toggleSort('price')}
                >
                  Precio{sortIndicator('price')}
                </button>
              </Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {products.map((p) => (
              <Table.Row key={p.id}>
                <Table.Td>{p.sku}</Table.Td>
                <Table.Td>
                  {p.name} {!p.active && <Badge tone="neutral">Inactivo</Badge>}
                </Table.Td>
                <Table.Td>
                  {p.stock} {p.stock <= p.minStock && <Badge tone="warning">Stock bajo</Badge>}
                </Table.Td>
                <Table.Td align="right">{p.price}</Table.Td>
                {/* Menú de acciones por fila: los items visibles dependen del
                    rol (lectura para todos, escritura según la matriz del
                    backend). Entrada y Salida apuntan a la misma ruta: el
                    tipo se elige dentro del formulario de movimiento. */}
                <Table.Td>
                  <Menu buttonLabel={`Acciones de ${p.name}`} disabled={busyId === p.id}>
                    <Menu.Item to={`/products/${p.id}/history`}>Ver historial</Menu.Item>
                    {canMoveStock && (
                      <>
                        <Menu.Item to={`/products/${p.id}/movement`}>Entrada</Menu.Item>
                        <Menu.Item to={`/products/${p.id}/movement`}>Salida</Menu.Item>
                      </>
                    )}
                    {isAdmin && <Menu.Item to={`/products/${p.id}/edit`}>Editar</Menu.Item>}
                    {isAdmin &&
                      (p.active ? (
                        // Acción destructiva: pasa por confirmación (evita el
                        // click accidental); la operación corre con loading.
                        <Menu.Item danger onSelect={() => setConfirmTarget(p)}>
                          Desactivar
                        </Menu.Item>
                      ) : (
                        <Menu.Item onSelect={() => setActive(p, true)}>Reactivar</Menu.Item>
                      ))}
                  </Menu>
                </Table.Td>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

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
