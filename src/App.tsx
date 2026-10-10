import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router'
import { Layout } from './shared/layout/Layout'
import { LoginPage } from './features/auth/LoginPage'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { RoleRoute } from './features/auth/RoleRoute'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { ProductsPage } from './features/products/ProductsPage'
import { ProductFormPage } from './features/products/ProductFormPage'
import { ProductDetailPage } from './features/products/ProductDetailPage'
import { MovementFormPage } from './features/movements/MovementFormPage'
import { MovementsPage } from './features/movements/MovementsPage'
import { SaleListPage } from './features/sales/SaleListPage'
import { SaleFormPage } from './features/sales/SaleFormPage'
import { SaleDetailPage } from './features/sales/SaleDetailPage'
import { UserListPage } from './features/users/UserListPage'
import { UserFormPage } from './features/users/UserFormPage'
import { ForbiddenPage } from './pages/errors/ForbiddenPage'
import { NotFoundPage } from './pages/errors/NotFoundPage'

// Redirect de la ruta vieja del historial (/products/:productId/history) al
// detalle, donde el historial ahora vive embebido. Navigate no interpola
// params, así que el destino se arma con useParams.
function HistoryRedirect() {
  const { productId } = useParams()
  return <Navigate to={`/products/${productId}`} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
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
          {/* Detalle: lectura para cualquier rol autenticado. */}
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/products/:productId/history" element={<HistoryRedirect />} />
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
          <Route path="/movements" element={<MovementsPage />} />
          <Route path="/sales" element={<SaleListPage />} />
          <Route path="/sales/:id" element={<SaleDetailPage />} />
          <Route
            path="/sales/new"
            element={
              <RoleRoute roles={['ADMIN', 'OPERATOR']}>
                <SaleFormPage />
              </RoleRoute>
            }
          />
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
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
