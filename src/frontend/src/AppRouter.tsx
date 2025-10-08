import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '@components/ProtectedRoute'
import LandingPage from '@pages/LandingPage'
import LoginPage from '@pages/LoginPage'
import RegisterPage from '@pages/RegisterPage'
import MakePaymentPage from '@pages/MakePaymentPage'
import ViewPaymentsPage from '@pages/ViewPaymentsPage'
import SecurityLogsPage from '@pages/SecurityLogsPage'

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/make-payment"
        element={
          <ProtectedRoute requiredUserType="user">
            <MakePaymentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/view-payments"
        element={
          <ProtectedRoute requiredUserType="employee">
            <ViewPaymentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/security-logs"
        element={
          <ProtectedRoute requiredUserType="employee">
            <SecurityLogsPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default AppRouter
