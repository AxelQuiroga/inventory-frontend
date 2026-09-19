import { Navigate } from 'react-router'
import { getToken } from './tokenStore'

// Rutas protegidas: si no hay sesión, el router manda a /login.
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
