import { Navigate } from 'react-router'
import { getSessionUser } from './session'

// Guard por roles: refleja la matriz de autorización del backend
// (movimientos = ADMIN + OPERATOR). La API re-valida siempre.
export function RoleRoute({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const role = getSessionUser()?.role
  if (!role || !roles.includes(role)) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
