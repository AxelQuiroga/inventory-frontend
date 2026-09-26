import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Alert, Badge, Button, ConfirmDialog, EmptyState, PageHeader, Spinner, Table } from '../../shared/ui'
import { ApiError } from '../../shared/api/api'
import { getSessionUser } from '../auth/session'
import { usersApi, type ManagedUser } from './usersApi'

const ROLE_LABELS: Record<string, string> = {
  OPERATOR: 'Operador',
  VIEWER: 'Lector',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR')
}

// Gestión de usuarios (USERS_POLICY.MD): solo el ADMIN desde la ruta, pero la
// página se defiende sola igual que el backend (la API re-valida siempre).
export function UserListPage() {
  const [users, setUsers] = useState<ManagedUser[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<ManagedUser | null>(null)

  useEffect(() => {
    let cancelled = false
    usersApi
      .list()
      .then((list) => {
        if (!cancelled) setUsers(list)
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

  async function setActive(user: ManagedUser, active: boolean) {
    setBusyId(user.id)
    setError(null)
    try {
      const updated = active ? await usersApi.reactivate(user.id) : await usersApi.deactivate(user.id)
      // Se actualiza local con la respuesta del server (sin re-fetch): el
      // loading queda por fila, el resto de la tabla se mantiene estable.
      setUsers((prev) => prev?.map((u) => (u.id === updated.id ? updated : u)) ?? prev)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor')
    } finally {
      setBusyId(null)
      setConfirmTarget(null)
    }
  }

  const isEmpty = users !== null && users.length === 0
  const isAdmin = getSessionUser()?.role === 'ADMIN'

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Cuentas internas de OPERATOR y VIEWER"
        action={isAdmin ? <Link to="/users/new"><Button>Nuevo usuario</Button></Link> : undefined}
      />

      {error && <Alert tone="error">{error}</Alert>}

      {users === null && !error && <Spinner label="Cargando usuarios" />}

      {isEmpty && (
        <EmptyState
          title="No hay usuarios"
          description="Creá la primera cuenta de OPERATOR o VIEWER."
          action={<Link to="/users/new"><Button variant="secondary">Nuevo usuario</Button></Link>}
        />
      )}

      {users !== null && users.length > 0 && (
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Th>Nombre</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Rol</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Alta</Table.Th>
              {isAdmin && <Table.Th>Acciones</Table.Th>}
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {users.map((user) => (
              <Table.Row key={user.id}>
                <Table.Td>{user.name}</Table.Td>
                <Table.Td>{user.email}</Table.Td>
                <Table.Td>{ROLE_LABELS[user.role] ?? user.role}</Table.Td>
                <Table.Td>
                  {user.active ? (
                    <Badge tone="success">Activo</Badge>
                  ) : (
                    <Badge tone="danger">Inactivo</Badge>
                  )}
                </Table.Td>
                <Table.Td>{formatDate(user.createdAt)}</Table.Td>
                {isAdmin && (
                  <Table.Td>
                    {user.active ? (
                      // Acción destructiva (deja a la persona sin acceso):
                      // pasa por confirmación; cancelar es la opción segura.
                      <Button variant="danger" onClick={() => setConfirmTarget(user)}>
                        Desactivar
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        loading={busyId === user.id}
                        onClick={() => setActive(user, true)}
                      >
                        Reactivar
                      </Button>
                    )}
                  </Table.Td>
                )}
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      <ConfirmDialog
        open={confirmTarget !== null}
        title="Desactivar usuario"
        description={
          confirmTarget
            ? `Vas a desactivar a "${confirmTarget.name}" (${confirmTarget.email}). No podrá iniciar sesión; su historial se conserva.`
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