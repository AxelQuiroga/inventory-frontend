import { NavLink, Outlet, useNavigate } from 'react-router'
import { getSessionUser } from '../../features/auth/session'
import { clearToken } from '../../features/auth/tokenStore'
import { Button } from '../ui'
import './layout.css'

// Secciones pendientes del MVP: se muestran deshabilitadas (no links falsos).
const disabledItems = ['Inventario', 'Movimientos']

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
