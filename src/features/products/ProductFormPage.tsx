import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../shared/api/api'
import { productsApi, type Product } from './productsApi'

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

export function ProductFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const editing = Boolean(id)

  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(editing)

  useEffect(() => {
    if (!editing) return
    productsApi
      .getById(id!)
      .then((p: Product) =>
        setForm({
          name: p.name,
          sku: p.sku,
          category: p.category,
          unit: p.unit,
          price: String(p.price),
          description: p.description ?? '',
          minStock: String(p.minStock),
        }),
      )
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor'),
      )
      .finally(() => setLoading(false))
  }, [editing, id])

  function set(field: keyof typeof emptyForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
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
      if (editing) {
        // PUT con diff: el backend acepta campos opcionales (updateProductSchema)
        const original = await productsApi.getById(id!)
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
      navigate('/products')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p>Cargando...</p>

  return (
    <>
      <h1>{editing ? 'Editar producto' : 'Nuevo producto'}</h1>

      <form onSubmit={handleSubmit}>
        <label htmlFor="name">Nombre</label>
        <input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} required />

        <label htmlFor="sku">SKU</label>
        <input id="sku" value={form.sku} onChange={(e) => set('sku', e.target.value)} required />

        <label htmlFor="category">Categoría</label>
        <input id="category" value={form.category} onChange={(e) => set('category', e.target.value)} required />

        <label htmlFor="unit">Unidad</label>
        <input id="unit" value={form.unit} onChange={(e) => set('unit', e.target.value)} required />

        <label htmlFor="price">Precio</label>
        <input
          id="price"
          type="number"
          min="0.01"
          step="0.01"
          value={form.price}
          onChange={(e) => set('price', e.target.value)}
          required
        />

        <label htmlFor="description">Descripción</label>
        <textarea id="description" value={form.description} onChange={(e) => set('description', e.target.value)} />

        <label htmlFor="minStock">Stock mínimo</label>
        <input
          id="minStock"
          type="number"
          min="0"
          step="1"
          value={form.minStock}
          onChange={(e) => set('minStock', e.target.value)}
        />

        {error && (
          <p role="alert" style={{ color: 'red' }}>{error}</p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear producto'}
        </button>
        <Link to="/products">Cancelar</Link>
      </form>
    </>
  )
}
