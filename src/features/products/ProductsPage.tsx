import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ApiError } from '../../shared/api/api'
import { getSessionUser } from '../auth/session'
import { productsApi, type Product } from './productsApi'

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [busyId, setBusyId] = useState<string | null>(null)

  // RBAC visible, leído en cada render: la sesión vive en el token
  // persistido y la página se monta después del login.
  //  - escritura de productos: ADMIN (create/update/deactivate/reactivate)
  //  - movimientos de stock: ADMIN + OPERATOR (matriz del backend)
  const role = getSessionUser()?.role
  const isAdmin = role === 'ADMIN'
  const canMoveStock = role === 'ADMIN' || role === 'OPERATOR'

  const load = useCallback(async () => {
    setError(null)
    try {
      const params = Object.fromEntries(searchParams.entries())
      setProducts(await productsApi.list(params))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor')
    }
  }, [searchParams])

  useEffect(() => {
    void load()
  }, [load])

  async function setActive(product: Product, active: boolean) {
    setBusyId(product.id)
    setError(null)
    try {
      await productsApi.setActive(product.id, active)
      await load() // refresco desde el server: la UI nunca inventa estado
    } catch (err) {
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

  return (
    <>
      <h1>Productos</h1>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
        <label htmlFor="search">Buscar</label>
        <input
          id="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilter({ search })}
        />
        <button type="button" onClick={() => applyFilter({ search })}>
          Buscar
        </button>

        <label>
          <input
            type="checkbox"
            checked={searchParams.get('lowStock') === 'true'}
            onChange={(e) => applyFilter({ lowStock: e.target.checked ? 'true' : '' })}
          />{' '}
          Solo stock bajo
        </label>

        {/* includeInactive es ADMIN-only en el backend */}
        {isAdmin && (
          <label>
            <input
              type="checkbox"
              checked={searchParams.get('includeInactive') === 'true'}
              onChange={(e) => applyFilter({ includeInactive: e.target.checked ? 'true' : '' })}
            />{' '}
            Ver inactivos
          </label>
        )}

        {isAdmin && (
          <Link to="/products/new" style={{ marginLeft: 'auto' }}>
            + Nuevo producto
          </Link>
        )}
      </div>

      {error && (
        <p role="alert" style={{ color: 'red' }}>{error}</p>
      )}

      {!products && !error && <p>Cargando...</p>}

      {products && products.length === 0 && <p>No hay productos</p>}

      {products && products.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Producto</th>
              <th>Stock</th>
              <th>Precio</th>
              <th>Historial</th>
              {canMoveStock && <th>Movimientos</th>}
              {isAdmin && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.sku}</td>
                <td>
                  {p.name}
                  {!p.active && (
                    <span style={{ marginLeft: '0.5rem', opacity: 0.6 }}>(inactivo)</span>
                  )}
                </td>
                <td>
                  {p.stock} {p.stock <= p.minStock && <strong>(stock bajo)</strong>}
                </td>
                <td>{p.price}</td>
                {/* Lectura: cualquier rol autenticado */}
                <td>
                  <Link to={`/products/${p.id}/history`}>Historial</Link>
                </td>
                {canMoveStock && (
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link to={`/products/${p.id}/movement`}>Entrada</Link>
                    <Link to={`/products/${p.id}/movement`}>Salida</Link>
                  </td>
                )}
                {isAdmin && (
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link to={`/products/${p.id}/edit`}>Editar</Link>
                    {p.active ? (
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => setActive(p, false)}
                      >
                        {busyId === p.id ? '...' : 'Desactivar'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => setActive(p, true)}
                      >
                        {busyId === p.id ? '...' : 'Reactivar'}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
