import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../shared/api/api'
import { productsApi } from '../products/productsApi'
import { movementsApi } from './movementsApi'

// Formulario de movimientos: una sola página para entrada y salida.
// El contrato del backend exige quantity > 0 y reason; el stock no se
// escribe directamente: solo vía /movements/entry y /movements/exit.
export function MovementFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [product, setProduct] = useState<Awaited<ReturnType<typeof productsApi.getById>> | null>(null)
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    productsApi
      .getById(id!)
      .then(setProduct)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor'),
      )
  }, [id])

  async function register(type: 'IN' | 'OUT') {
    setError(null)
    setSubmitting(true)
    try {
      await movementsApi.register({ type, productId: id!, quantity: Number(quantity), reason: reason.trim() })
      navigate('/products')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor')
    } finally {
      setSubmitting(false)
    }
  }

  if (error && !product) return <p role="alert">{error}</p>
  if (!product) return <p>Cargando...</p>

  return (
    <>
      <h1>Registrar movimiento</h1>

      <section style={{ marginBottom: '1rem' }}>
        <strong>{product.name}</strong>
        <div>{product.sku}</div>
        <div>
          Stock actual: {product.stock} {product.stock <= product.minStock && <strong>(stock bajo)</strong>}
          {!product.active && <span style={{ opacity: 0.6 }}> (inactivo)</span>}
        </div>
      </section>

      <form onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="quantity">Cantidad</label>
        <input
          id="quantity"
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />

        <label htmlFor="reason">Motivo</label>
        <input
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />

        {error && (
          <p role="alert" style={{ color: 'red' }}>{error}</p>
        )}

        {/* Ambos contratos son siempre visibles: el server decide si la
            operación es válida (stock suficiente, producto activo). */}
        <button type="button" disabled={submitting || quantity === ''} onClick={() => register('IN')}>
          {submitting ? '...' : 'Registrar entrada'}
        </button>
        <button type="button" disabled={submitting || quantity === ''} onClick={() => register('OUT')}>
          {submitting ? '...' : 'Registrar salida'}
        </button>

        <Link to="/products">Cancelar</Link>
      </form>
    </>
  )
}
