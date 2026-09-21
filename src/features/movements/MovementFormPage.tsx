import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Alert, Badge, Button, Card, Input, PageHeader, Spinner } from '../../shared/ui'
import { ApiError } from '../../shared/api/api'
import { productsApi } from '../products/productsApi'
import { movementsApi } from './movementsApi'
import './movement-form-page.css'

// fieldErrors por campo (contrato 400 del backend sobre registerMovementSchema:
// quantity/reason). Null = sin error. Los errores de negocio (Insufficient
// stock, Product is inactive) no tienen campo: van al Alert general.
type FieldErrors = Record<string, string | null>

function extractFieldErrors(error: unknown): FieldErrors | null {
  if (!(error instanceof ApiError) || !error.fieldErrors) return null
  const result: FieldErrors = {}
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    result[field] = messages[0] ?? null
  }
  return result
}

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  // Guard síncrono: los dos botones comparten la operación en curso.
  const inFlight = useRef(false)

  useEffect(() => {
    let cancelled = false
    productsApi
      .getById(id!)
      .then((p) => {
        if (!cancelled) setProduct(p)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  async function register(type: 'IN' | 'OUT') {
    if (inFlight.current) return
    inFlight.current = true

    setError(null)
    setFieldErrors({}) // cada envío parte limpio
    setSubmitting(true)
    try {
      await movementsApi.register({ type, productId: id!, quantity: Number(quantity), reason: reason.trim() })
      // Post/redirect: feedback de éxito en el listado destino.
      navigate('/products', { state: { success: 'Movimiento registrado' } })
    } catch (err) {
      // Error general y field errors conviven (mismo contrato que ProductForm).
      const fields = extractFieldErrors(err)
      if (fields) setFieldErrors(fields)
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor')
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Registrar movimiento" />
        <Spinner label="Cargando producto" />
      </>
    )
  }

  if (error && !product) {
    return (
      <>
        <PageHeader title="Registrar movimiento" />
        <Alert tone="error">{error}</Alert>
      </>
    )
  }

  if (!product) return null

  return (
    <>
      <PageHeader title="Registrar movimiento" description="Entrada o salida de stock del producto" />

      <Card className="MovementForm-card">
        <section className="MovementForm-product">
          <strong>{product.name}</strong>
          <span className="MovementForm-sku">{product.sku}</span>
          <span className="MovementForm-stock">
            <span>Stock actual: {product.stock}</span>
            {product.stock <= product.minStock && <Badge tone="warning">Stock bajo</Badge>}
            {!product.active && <Badge tone="neutral">Inactivo</Badge>}
          </span>
        </section>

        <form onSubmit={(e) => e.preventDefault()} className="MovementForm-form">
          <Input
            id="quantity"
            label="Cantidad"
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            error={fieldErrors.quantity ?? undefined}
            required
          />

          <Input
            id="reason"
            label="Motivo"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={fieldErrors.reason ?? undefined}
            required
          />

          {error && <Alert tone="error">{error}</Alert>}

          {/* Ambos contratos son siempre visibles: el server decide si la
              operación es válida (stock suficiente, producto activo). */}
          <div className="MovementForm-actions">
            <Button
              variant="secondary"
              loading={submitting}
              disabled={quantity === ''}
              onClick={() => register('IN')}
            >
              Registrar entrada
            </Button>
            <Button
              variant="danger"
              loading={submitting}
              disabled={quantity === ''}
              onClick={() => register('OUT')}
            >
              Registrar salida
            </Button>
            <Link to="/products">
              <Button variant="ghost">Cancelar</Button>
            </Link>
          </div>
        </form>
      </Card>
    </>
  )
}
