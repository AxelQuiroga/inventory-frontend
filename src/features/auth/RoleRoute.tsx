import { Navigate } from 'react-router'
import { getSessionUser } from './session'

// El frontend mejora la experiencia de navegación; la API sigue siendo la
// autoridad y vuelve a validar cada permiso.
export function RoleRoute({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const role = getSessionUser()?.role
  if (!role || !roles.includes(role)) {
    return <Navigate to="/forbidden" replace />
  }
  return <>{children}</>
}
