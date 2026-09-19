import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError } from '../../shared/api/api'
import { productsApi, type Product } from '../products/productsApi'
import { movementsApi, type Movement } from './movementsApi'

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
    Promise.all([productsApi.getById(productId), movementsApi.history(productId)])
      .then(([p, movements]) => {
        setProduct(p)
        setHistory(movements)
      })
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor'),
      )
  }, [productId])

  if (error) return <p role="alert">{error}</p>
  if (!product || !history) return <p>Cargando...</p>

  return (
    <>
      <h1>Historial de movimientos</h1>

      <section style={{ marginBottom: '1rem' }}>
        <strong>{product.name}</strong>
        <div>{product.sku}</div>
        <div>Stock actual: {product.stock}</div>
      </section>

      {history.length === 0 ? (
        <p>Sin movimientos registrados</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Motivo</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {history.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.createdAt).toLocaleString()}</td>
                <td>{m.type === 'IN' ? 'Entrada' : 'Salida'}</td>
                <td>{m.quantity}</td>
                <td>{m.reason}</td>
                <td>{m.userId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Link to="/products">Volver a productos</Link>
    </>
  )
}
