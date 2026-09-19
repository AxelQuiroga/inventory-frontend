import { Navigate } from 'react-router'
import { getSessionUser } from './session'

// Guard de rol: las rutas de escritura de productos son ADMIN-only en el
// backend (create/update/deactivate/reactivate). El frontend lo refleja
// como defensa en profundidad; la API re-valida siempre.
export function AdminRoute({ children }: { children: React.ReactNode }) {
  if (getSessionUser()?.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
