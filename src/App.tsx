import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { Layout } from './shared/layout/Layout'
import { LoginPage } from './features/auth/LoginPage'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { RoleRoute } from './features/auth/RoleRoute'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { ProductsPage } from './features/products/ProductsPage'
import { ProductFormPage } from './features/products/ProductFormPage'
import { MovementFormPage } from './features/movements/MovementFormPage'
import { MovementHistoryPage } from './features/movements/MovementHistoryPage'
import { SaleListPage } from './features/sales/SaleListPage'
import { SaleFormPage } from './features/sales/SaleFormPage'
import { SaleDetailPage } from './features/sales/SaleDetailPage'
import { UserListPage } from './features/users/UserListPage'
import { UserFormPage } from './features/users/UserFormPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route
            path="/products/new"
            element={
              <RoleRoute roles={['ADMIN']}>
                <ProductFormPage />
              </RoleRoute>
            }
          />
          <Route
            path="/products/:id/edit"
            element={
              <RoleRoute roles={['ADMIN']}>
                <ProductFormPage />
              </RoleRoute>
            }
          />
          <Route
            path="/products/:id/movement"
            element={
              <RoleRoute roles={['ADMIN', 'OPERATOR']}>
                <MovementFormPage />
              </RoleRoute>
            }
          />
          {/* Historial: lectura, cualquier rol autenticado */}
          <Route path="/products/:productId/history" element={<MovementHistoryPage />} />
          {/* Ventas: listar y ver detalle cualquier rol autenticado */}
          <Route path="/sales" element={<SaleListPage />} />
          <Route path="/sales/:id" element={<SaleDetailPage />} />
          {/* Registrar venta: ADMIN + OPERATOR (matriz del backend) */}
          <Route
            path="/sales/new"
            element={
              <RoleRoute roles={['ADMIN', 'OPERATOR']}>
                <SaleFormPage />
              </RoleRoute>
            }
          />
          {/* Gestión de usuarios: solo ADMIN (USERS_POLICY.MD) */}
          <Route
            path="/users"
            element={
              <RoleRoute roles={['ADMIN']}>
                <UserListPage />
              </RoleRoute>
            }
          />
          <Route
            path="/users/new"
            element={
              <RoleRoute roles={['ADMIN']}>
                <UserFormPage />
              </RoleRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
