import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Alert, Button, EmptyState, PageHeader, Spinner, Table } from '../../shared/ui'
import { ApiError } from '../../shared/api/api'
import { getSessionUser } from '../auth/session'
import { salesApi, type SaleSummary } from './salesApi'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-AR')
}

function formatMoney(value: number): string {
  return value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })
}

// Registro de ventas. Crear ventas es ADMIN + OPERATOR (matriz del backend);
// el resto de roles ve el listado en modo lectura.
function usePermissions() {
  const role = getSessionUser()?.role
  return { canSell: role === 'ADMIN' || role === 'OPERATOR' }
}

export function SaleListPage() {
  const [sales, setSales] = useState<SaleSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { canSell } = usePermissions()

  // Feedback de éxito post/redirect: SaleFormPage navega con
  // location.state.success; se lee una sola vez y se limpia con replace.
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
    let cancelled = false
    salesApi
      .list()
      .then((list) => {
        if (!cancelled) setSales(list)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const isEmpty = sales !== null && sales.length === 0

  return (
    <>
      <PageHeader
        title="Ventas"
        description="Todas las ventas registradas"
        action={canSell ? <Link to="/sales/new"><Button>Nueva venta</Button></Link> : undefined}
      />

      {success && <Alert tone="success">{success}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      {sales === null && !error && <Spinner label="Cargando ventas" />}

      {isEmpty && (
        <EmptyState
          title="No hay ventas"
          description="Cuando registres la primera venta, aparece acá."
          action={canSell ? <Link to="/sales/new"><Button variant="secondary">Nueva venta</Button></Link> : undefined}
        />
      )}

      {sales !== null && sales.length > 0 && (
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Th>Fecha</Table.Th>
              <Table.Th>Productos</Table.Th>
              <Table.Th align="right">Total</Table.Th>
              <Table.Th>Detalle</Table.Th>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {sales.map((sale) => (
              <Table.Row key={sale.id}>
                <Table.Td>{formatDate(sale.createdAt)}</Table.Td>
                <Table.Td>
                  {sale.itemCount} {sale.itemCount === 1 ? 'producto' : 'productos'}
                </Table.Td>
                <Table.Td align="right">{formatMoney(sale.total)}</Table.Td>
                <Table.Td>
                  <Link to={`/sales/${sale.id}`}>
                    <Button variant="ghost">Ver detalle</Button>
                  </Link>
                </Table.Td>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </>
  )
}