import { NavLink, Outlet, useNavigate } from 'react-router'
import { getSessionUser } from '../../features/auth/session'
import { clearToken } from '../../features/auth/tokenStore'
import { Button } from '../ui'
import './layout.css'

// Secciones pendientes del MVP: se muestran deshabilitadas (no links falsos).
const disabledItems = ['Inventario']

export function Layout() {
  const user = getSessionUser()
  const navigate = useNavigate()

  function handleLogout() {
    clearToken()
    navigate('/login', { replace: true })
  }

  return (
    <div className="Layout">
      <aside className="Layout-sidebar">
        <div className="Layout-brand">📦 Inventory ERP</div>
        <nav className="Layout-nav" aria-label="Navegación principal">
          <NavLink to="/" end className={({ isActive }) => `Layout-navLink${isActive ? ' Layout-navLink--active' : ''}`}>
            Dashboard
          </NavLink>
          <NavLink to="/products" className={({ isActive }) => `Layout-navLink${isActive ? ' Layout-navLink--active' : ''}`}>
            Productos
          </NavLink>
          <NavLink to="/sales" className={({ isActive }) => `Layout-navLink${isActive ? ' Layout-navLink--active' : ''}`}>
            Ventas
          </NavLink>
          {/* Movimientos globales: lectura para cualquier rol autenticado.
              La política de autoría se resuelve server-side; el link no está
              condicionado por rol porque la página es accesible para todos. */}
          <NavLink to="/movements" className={({ isActive }) => `Layout-navLink${isActive ? ' Layout-navLink--active' : ''}`}>
            Movimientos
          </NavLink>
          {/* Gestión de usuarios: link visible solo para el ADMIN (la ruta
              también está protegida; esto es para no mostrar una acción que
              el rol no puede usar) */}
          {user?.role === 'ADMIN' && (
            <NavLink to="/users" className={({ isActive }) => `Layout-navLink${isActive ? ' Layout-navLink--active' : ''}`}>
              Usuarios
            </NavLink>
          )}
          {disabledItems.map((label) => (
            <span key={label} className="Layout-navDisabled" title="Próximamente">
              {label}
            </span>
          ))}
        </nav>
      </aside>

      <div>
        <header className="Layout-topbar">
          {user && (
            <span className="Layout-user" title={user.role}>
              👤 {user.email}
            </span>
          )}
          <Button variant="secondary" onClick={handleLogout}>
            Salir
          </Button>
        </header>

        <main className="Layout-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
