// Puente entre el borde HTTP y la política de sesión, sin acoplar el cliente a
// rutas de la app: api() emite SESSION_EXPIRED_EVENT cuando el servidor
// devuelve un 401 no opt-out, y este handler (registrado en el bootstrap,
// main.tsx) expira la sesión: limpia el token y navega a /login. Es el único
// mecanismo de expiración pasiva — el logout explícito del usuario vive en
// Layout (useNavigate). Testeable sin montar React.
import { expireSession } from './session'

export const SESSION_EXPIRED_EVENT = 'auth:session-expired'

export function registerSessionExpiredHandler(): () => void {
  const handleSessionExpired = () => {
    expireSession()
  }
  window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
}