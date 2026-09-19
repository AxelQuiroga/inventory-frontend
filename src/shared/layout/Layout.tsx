import { NavLink, Outlet } from 'react-router'
import { getSessionUser } from '../../features/auth/session'
import { clearToken } from '../../features/auth/tokenStore'

// Secciones pendientes del MVP: se muestran deshabilitadas (no links falsos).
const disabledItems = ['Inventario', 'Movimientos']

export function Layout() {
  const user = getSessionUser()

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '100vh' }}>
      <aside style={{ borderRight: '1px solid #ddd', padding: '1rem' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '1.5rem' }}>📦 Inventory ERP</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/products">Productos</NavLink>
          {disabledItems.map((label) => (
            <span key={label} style={{ opacity: 0.4, cursor: 'not-allowed' }} title="Próximamente">
              {label}
            </span>
          ))}
        </nav>
      </aside>

      <div>
        <header
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #ddd',
          }}
        >
          {user && <span title={user.role}>👤 {user.email}</span>}
          <button type="button" onClick={() => { clearToken(); location.assign('/login') }}>
            Salir
          </button>
        </header>

        <main style={{ padding: '1rem' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
