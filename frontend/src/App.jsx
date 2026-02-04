import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout/Layout'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Dashboard from './pages/Dashboard/Dashboard'
import PropertiesList from './pages/Properties/PropertiesList'
import PropertyDetail from './pages/Properties/PropertyDetail'
import PropertyForm from './pages/Properties/PropertyForm'
import ContractsList from './pages/Contracts/ContractsList'
import ContractDetail from './pages/Contracts/ContractDetail'
import ContractForm from './pages/Contracts/ContractForm'
import PaymentsList from './pages/Payments/PaymentsList'
import PaymentDetailPage from './pages/Payments/PaymentDetailPage'
import PaymentScheduler from './pages/Payments/PaymentScheduler'
import Settings from './pages/Settings/Settings'
import NotFound from './pages/NotFound'

// Componente para rutas protegidas
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

// Componente para redirigir si ya está autenticado
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }
  
  return children
}

function App() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login" element={
        <PublicOnlyRoute>
          <Login />
        </PublicOnlyRoute>
      } />
      <Route path="/register" element={
        <PublicOnlyRoute>
          <Register />
        </PublicOnlyRoute>
      } />
      
      {/* Rutas protegidas */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="properties" element={<PropertiesList />} />
        <Route path="properties/new" element={<PropertyForm />} />
        <Route path="properties/:id" element={<PropertyDetail />} />
        <Route path="properties/:id/edit" element={<PropertyForm />} />
        <Route path="contracts" element={<ContractsList />} />
        <Route path="contracts/new" element={<ContractForm />} />
        <Route path="contracts/:id" element={<ContractDetail />} />
        <Route path="contracts/:id/edit" element={<ContractForm />} />
        <Route path="payments" element={<PaymentsList />} />
        <Route path="payments/schedule" element={<PaymentScheduler />} />
        <Route path="payments/:id" element={<PaymentDetailPage />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
