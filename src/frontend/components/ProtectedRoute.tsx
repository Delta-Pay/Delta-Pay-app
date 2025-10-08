import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  requiredUserType?: 'user' | 'employee'
}

export const ProtectedRoute = ({ children, requiredUserType }: ProtectedRouteProps) => {
  const { isAuthenticated, userType } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (requiredUserType && userType !== requiredUserType) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
