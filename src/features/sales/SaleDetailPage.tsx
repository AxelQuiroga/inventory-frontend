import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Alert, Button, PageHeader, Spinner, Table } from '../../shared/ui'
import { ApiError } from '../../shared/api/api'
import { salesApi, type Sale } from './salesApi'
import './sales-page.css'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-AR')
}

function formatMoney(value: number): string {
  return value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })
}

export function SaleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [sale, setSale] = useState<Sale | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Mensaje de éxito que trae SaleFormPage tras confirmar la venta.
  const location = useLocation()
  const navigate = useNavigate()
  const [success] = useState<string | null>(
    (location.state as { success?: string } | null)?.success ?? null,
  )
  useEffect(() => {
    if (location.state?.success) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state, location.pathname, navigate])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    salesApi
      .getById(id)
      .then((found) => {
        if (!cancelled) setSale(found)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor')
        }
      })
    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <>
      <PageHeader title="Detalle de venta" description={sale ? `Venta ${sale.id}` : undefined} />

      {success && <Alert tone="success">{success}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      {sale === null && !error && <Spinner label="Cargando venta" />}

      {sale && (
        <>
          <p className="Sales-detailMeta">Registrada el {formatDate(sale.createdAt)}</p>

          <Table>
            <Table.Head>
              <Table.Row>
                <Table.Th>Producto</Table.Th>
                <Table.Th>SKU</Table.Th>
                <Table.Th align="right">Cantidad</Table.Th>
                <Table.Th align="right">Precio unitario</Table.Th>
                <Table.Th align="right">Subtotal</Table.Th>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {sale.items.map((item) => (
                <Table.Row key={item.id}>
                  <Table.Td>{item.productName}</Table.Td>
                  <Table.Td>{item.productSku}</Table.Td>
                  <Table.Td align="right">{item.quantity}</Table.Td>
                  <Table.Td align="right">{formatMoney(item.unitPrice)}</Table.Td>
                  <Table.Td align="right">{formatMoney(item.total)}</Table.Td>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>

          <p className="Sales-detailTotal">Total: <strong>{formatMoney(sale.total)}</strong></p>

          <Link to="/sales">
            <Button variant="secondary">Volver a ventas</Button>
          </Link>
        </>
      )}
    </>
  )
}