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
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
