import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Alert, Button, Card, Input, PageHeader } from '../../shared/ui'
import { ApiError } from '../../shared/api/api'
import { productsApi, type Product } from './productsApi'
import './product-form-page.css'

// Modo crear y modo editar en un solo componente: la ruta decide.
// Crear → POST con createProductSchema; Editar → PUT solo con campos cambiados.
const emptyForm = {
  name: '',
  sku: '',
  category: '',
  unit: '',
  price: '',
  description: '',
  minStock: '5',
}

// fieldErrors por campo (contrato 400 del backend). Null = sin error.
type FieldErrors = Record<string, string | null>

// Toma solo el primer mensaje de cada campo: es el que se muestra bajo el Input.
function extractFieldErrors(error: unknown): FieldErrors | null {
  if (!(error instanceof ApiError) || !error.fieldErrors) return null
  const result: FieldErrors = {}
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    result[field] = messages[0] ?? null
  }
  return result
}

export function ProductFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const editing = Boolean(id)

  const [form, setForm] = useState(emptyForm)
  const [original, setOriginal] = useState<Product | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(editing)
  // Guard síncrono contra doble submit: el re-render de disabled puede llegar
  // tarde ante dos clicks casi simultáneos; el ref es infalible.
  const inFlight = useRef(false)

  useEffect(() => {
    if (!editing) return
    let cancelled = false
    productsApi
      .getById(id!)
      .then((p: Product) => {
        if (cancelled) return
        // Se conserva el producto original: el diff del submit lo usa sin
        // volver a pedirlo (un solo GET por edición).
        setOriginal(p)
        setForm({
          name: p.name,
          sku: p.sku,
          category: p.category,
          unit: p.unit,
          price: String(p.price),
          description: p.description ?? '',
          minStock: String(p.minStock),
        })
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
  }, [editing, id])

  function set(field: keyof typeof emptyForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (inFlight.current) return
    inFlight.current = true

    setError(null)
    setFieldErrors({}) // cada envío parte limpio
    setSubmitting(true)

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      category: form.category.trim(),
      unit: form.unit.trim(),
      price: Number(form.price),
      ...(form.description ? { description: form.description } : {}),
      minStock: Number(form.minStock),
    }

    try {
      if (editing && original) {
        // PUT con diff contra el producto precargado (updateProductSchema acepta
        // campos opcionales). Ningún GET extra en el submit.
        const changes: Record<string, unknown> = {}
        if (payload.name !== original.name) changes.name = payload.name
        if (payload.sku !== original.sku) changes.sku = payload.sku
        if (payload.category !== original.category) changes.category = payload.category
        if (payload.unit !== original.unit) changes.unit = payload.unit
        if (payload.price !== original.price) changes.price = payload.price
        if (payload.minStock !== original.minStock) changes.minStock = payload.minStock
        if (form.description !== (original.description ?? '')) changes.description = form.description
        if (Object.keys(changes).length > 0) await productsApi.update(id!, changes)
      } else {
        await productsApi.create(payload)
      }
      // Post/redirect: el mensaje de éxito viaja al listado via location.state
      // y se muestra una sola vez (el destino lo consume y limpia).
      navigate('/products', { state: { success: editing ? 'Cambios guardados' : 'Producto creado' } })
    } catch (err) {
      // Error general (Alert) y errores por campo conviven: el general da
      // contexto (ej: "Invalid data"), los de campo indican qué corregir.
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
        <PageHeader title={editing ? 'Editar producto' : 'Nuevo producto'} />
        <Card>Cargando producto…</Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={editing ? 'Editar producto' : 'Nuevo producto'}
        description={
          editing ? 'Modificá solo los campos que necesitás cambiar' : 'Completá los datos del producto'
        }
      />

      <Card className="ProductForm-card">
        <form onSubmit={handleSubmit} className="ProductForm-form" noValidate>
          <div className="ProductForm-grid">
            <Input
              id="name"
              label="Nombre"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              error={fieldErrors.name ?? undefined}
              required
            />

            <Input
              id="sku"
              label="SKU"
              value={form.sku}
              onChange={(e) => set('sku', e.target.value)}
              error={fieldErrors.sku ?? undefined}
              required
            />

            <Input
              id="category"
              label="Categoría"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              error={fieldErrors.category ?? undefined}
              required
            />

            <Input
              id="unit"
              label="Unidad"
              value={form.unit}
              onChange={(e) => set('unit', e.target.value)}
              error={fieldErrors.unit ?? undefined}
              required
            />

            <Input
              id="price"
              label="Precio"
              type="number"
              min={0.01}
              step={0.01}
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              error={fieldErrors.price ?? undefined}
              required
            />

            <Input
              id="minStock"
              label="Stock mínimo"
              type="number"
              min={0}
              step={1}
              value={form.minStock}
              onChange={(e) => set('minStock', e.target.value)}
              error={fieldErrors.minStock ?? undefined}
            />

            <div className="ProductForm-full">
              <label className="Input-label" htmlFor="description">Descripción</label>
              <textarea
                id="description"
                className="Input-field ProductForm-textarea"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>
          </div>

          {error && <Alert tone="error">{error}</Alert>}

          <div className="ProductForm-actions">
            <Button type="submit" loading={submitting}>
              {editing ? 'Guardar cambios' : 'Crear producto'}
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
