import { NavLink, Outlet, useNavigate } from 'react-router'
import { getSessionUser } from '../../features/auth/session'
import { clearToken } from '../../features/auth/tokenStore'
import { Button } from '../ui'
import styles from './Layout.module.css'

export function Layout() {
  const user = getSessionUser()
  const navigate = useNavigate()

  function handleLogout() {
    clearToken()
    navigate('/login', { replace: true })
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img src="/logoinventario.png" alt="" className={styles.brandLogo} />
          <span>Inventory ERP</span>
        </div>
        <nav className={styles.nav} aria-label="Navegación principal">
          <NavLink to="/" end className={({ isActive }) => `${styles.navLink}${isActive ? ` ${styles.navLinkActive}` : ''}`}>
            Dashboard
          </NavLink>
          <NavLink to="/products" className={({ isActive }) => `${styles.navLink}${isActive ? ` ${styles.navLinkActive}` : ''}`}>
            Productos
          </NavLink>
          <NavLink to="/sales" className={({ isActive }) => `${styles.navLink}${isActive ? ` ${styles.navLinkActive}` : ''}`}>
            Ventas
          </NavLink>
          {/* Movimientos globales: lectura para cualquier rol autenticado.
              La política de autoría se resuelve server-side; el link no está
              condicionado por rol porque la página es accesible para todos. */}
          <NavLink to="/movements" className={({ isActive }) => `${styles.navLink}${isActive ? ` ${styles.navLinkActive}` : ''}`}>
            Movimientos
          </NavLink>
          {/* Gestión de usuarios: link visible solo para el ADMIN (la ruta
              también está protegida; esto es para no mostrar una acción que
              el rol no puede usar) */}
          {user?.role === 'ADMIN' && (
            <NavLink to="/users" className={({ isActive }) => `${styles.navLink}${isActive ? ` ${styles.navLinkActive}` : ''}`}>
              Usuarios
            </NavLink>
          )}
        </nav>
      </aside>

      <div>
        <header className={styles.topbar}>
          {user && (
            <span className={styles.user} title={user.role}>
              👤 {user.email}
            </span>
          )}
          <Button variant="secondary" onClick={handleLogout}>
            Salir
          </Button>
        </header>

        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
