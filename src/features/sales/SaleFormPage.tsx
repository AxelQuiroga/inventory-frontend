import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Alert, Badge, Button, Card, EmptyState, Input, PageHeader, Spinner } from '../../shared/ui'
import { ApiError } from '../../shared/api/api'
import { productsApi, type Product } from '../products/productsApi'
import { salesApi } from './salesApi'
import styles from './SaleFormPage.module.css'

// Línea del carrito: el producto completo (para mostrar precio y stock)
// + la cantidad que el vendedor quiere despachar en esta venta.
interface CartLine {
  product: Product
  quantity: number
}

function formatMoney(value: number): string {
  return value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })
}

// Venta multi-producto. El carrito es SOLO del navegador: el stock no se
// toca hasta confirmar (POST /sales), donde el server descuenta TODO de
// forma atómica. Regla de negocio: "Disponible" = stock real − lo que ya
// lleva el carrito, así NO se vende el doble de lo que hay.
export function SaleFormPage() {
  const navigate = useNavigate()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const inFlight = useRef(false)

  // Carga única de productos activos: el selector trabaja sobre la copia en
  // memoria (búsqueda local, zero roundtrips por tipeo).
  useEffect(() => {
    let cancelled = false
    productsApi
      .list({ limit: 100 })
      .then((list) => {
        if (!cancelled) setProducts(list.data)
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
  }, [])

  // El corazón de la regla de negocio: disponible = stock real − lo que ya
  // se cargó en el carrito para ESE producto.
  function available(product: Product): number {
    const inCart = cart.filter((l) => l.product.id === product.id).reduce((sum, l) => sum + l.quantity, 0)
    return product.stock - inCart
  }

  function addToCart(product: Product) {
    const requested = Number(quantityInputs[product.id] ?? '')
    const remaining = available(product)
    // Solo cantidades válidas: entera, al menos 1 y jamás más del remanente.
    if (!Number.isInteger(requested) || requested < 1 || requested > remaining) return

    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id)
      if (existing) {
        return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + requested } : l))
      }
      return [...prev, { product, quantity: requested }]
    })
    setQuantityInputs((prev) => ({ ...prev, [product.id]: '' }))
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId))
  }

  function changeQuantity(line: CartLine, next: number) {
    const remaining = available(line.product) + line.quantity // disponible global + lo propio
    if (next < 1 || next > remaining) return
    setCart((prev) => prev.map((l) => (l.product.id === line.product.id ? { ...l, quantity: next } : l)))
  }

  const total = cart.reduce((sum, l) => sum + l.product.price * l.quantity, 0)
  const hasStock = products.length > 0

  const visibleProducts = products.filter((p) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
  })

  async function confirmSale() {
    if (inFlight.current) return
    inFlight.current = true
    setError(null)
    setSubmitting(true)

    try {
      const sale = await salesApi.create({
        items: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      })
      // Post/redirect al detalle: el mensaje de éxito viaja en location.state
      navigate(`/sales/${sale.id}`, { state: { success: 'Venta registrada' } })
    } catch (err) {
      // El server es la última barrera: si DOS terminales intentaron vender
      // el mismo stock, acá aparece "Insufficient stock".
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor')
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Nueva venta" />
        <Spinner label="Cargando productos" />
      </>
    )
  }

  return (
    <>
      <PageHeader title="Nueva venta" description="Seleccioná los productos y la cantidad a vender" />

      <div className={styles.grid}>
        <Card className={styles.card}>
          <h2 className={styles.title}>Productos</h2>

          <Input
            id="search"
            label="Buscar producto"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Por nombre o SKU"
          />

          {error && <Alert tone="error">{error}</Alert>}

          {!error && !hasStock ? (
            <EmptyState
              title="No hay productos"
              description="Necesitás productos creados para armar una venta."
            />
          ) : (
            <ul className={styles.list} aria-label="Productos disponibles">
              {visibleProducts.map((product) => {
                const remaining = available(product)
                const soldOut = remaining <= 0
                // Si no hay stock remanente, NO se puede agregar: la regla
                // del vendedor contra vender el doble. Se muestra pero
                // bloqueado (el producto no "desaparece" del catálogo).
                return (
                  <li key={product.id} className={styles.product}>
                    <div className={styles.productInfo}>
                      <strong>{product.name}</strong>
                      <span className={styles.meta}>{product.sku}</span>
                      <span className={styles.meta}>
                        Precio: {formatMoney(product.price)} · Disponible: {remaining}
                      </span>
                      {soldOut && <Badge tone="neutral">0 disponibles</Badge>}
                    </div>
                    <div className={styles.add}>
                      <Input
                        id={`quantity-${product.id}`}
                        label={`Cantidad de ${product.name}`}
                        hideLabel
                        type="number"
                        min={1}
                        max={remaining}
                        step={1}
                        value={quantityInputs[product.id] ?? ''}
                        onChange={(e) =>
                          setQuantityInputs((prev) => ({ ...prev, [product.id]: e.target.value }))
                        }
                        disabled={soldOut}
                      />
                      <Button
                        variant="secondary"
                        disabled={
                          soldOut ||
                          !Number.isInteger(Number(quantityInputs[product.id])) ||
                          Number(quantityInputs[product.id]) < 1 ||
                          Number(quantityInputs[product.id]) > remaining
                        }
                        onClick={() => addToCart(product)}
                      >
                        Agregar
                      </Button>
                    </div>
                  </li>
                )
              })}
              {visibleProducts.length === 0 && <li className={styles.empty}>Sin resultados para “{search}”</li>}
            </ul>
          )}
        </Card>

        <Card className={styles.card}>
          <h2 className={styles.title}>Carrito</h2>

          {cart.length === 0 ? (
            <p className={styles.empty}>Todavía no hay productos en esta venta.</p>
          ) : (
            <ul className={styles.cart} aria-label="Líneas de la venta">
              {cart.map((line) => (
                <li key={line.product.id} className={styles.cartLine}>
                  <div className={styles.productInfo}>
                    <strong>{line.product.name}</strong>
                    <span className={styles.meta}>
                      {line.quantity} × {formatMoney(line.product.price)}
                    </span>
                  </div>
                  <div className={styles.cartLineActions}>
                    <Input
                      id={`cart-quantity-${line.product.id}`}
                      label={`Cantidad de ${line.product.name} en la venta`}
                      hideLabel
                      type="number"
                      min={1}
                      max={available(line.product) + line.quantity}
                      step={1}
                      value={line.quantity}
                      onChange={(e) => changeQuantity(line, Number(e.target.value))}
                    />
                    <Button variant="ghost" onClick={() => removeFromCart(line.product.id)}>
                      Quitar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className={styles.total} aria-live="polite">
            Total: <strong>{formatMoney(total)}</strong>
          </div>

          <div className={styles.actions}>
            <Button
              loading={submitting}
              disabled={cart.length === 0}
              onClick={confirmSale}
            >
              Confirmar venta
            </Button>
            <Button variant="ghost" onClick={() => navigate('/sales')}>
              Cancelar
            </Button>
          </div>
          {cart.length === 0 && <p className={styles.hint}>Agregá al menos un producto para confirmar.</p>}
        </Card>
      </div>
    </>
  )
}