import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiClient } from '@utils/apiClient'
import type { AuthState, User, LoginCredentials, RegisterData } from '@/types'

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials, userType: 'user' | 'employee') => Promise<{ success: boolean; message?: string }>
  register: (data: RegisterData) => Promise<{ success: boolean; message?: string }>
  logout: () => void
  authenticatePassword: (username: string, password: string) => Promise<{ success: boolean; message?: string; user?: User; csrfToken?: string }>
  refreshCsrfToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    employee: null,
    userType: null,
    token: null,
    csrfToken: null
  })

  useEffect(() => {
    const token = apiClient.getToken()
    const csrfToken = apiClient.getCsrfToken()

    if (token) {
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: true,
        token,
        csrfToken
      }))
    }
  }, [])

  const login = async (credentials: LoginCredentials, userType: 'user' | 'employee') => {
    const endpoint = userType === 'user' ? '/api/auth/login/user' : '/api/auth/login/employee'

    const response = await apiClient.post(endpoint, credentials)

    if (response.success && response.token) {
      apiClient.setToken(response.token)

      if (response.csrfToken) {
        apiClient.setCsrfToken(response.csrfToken)
      }

      setAuthState({
        isAuthenticated: true,
        user: response.user || null,
        employee: response.employee || null,
        userType,
        token: response.token,
        csrfToken: response.csrfToken || null
      })

      return { success: true }
    }

    return { success: false, message: response.message || 'Login failed' }
  }

  const register = async (data: RegisterData) => {
    const response = await apiClient.post('/api/auth/register', data)

    if (response.success) {
      return { success: true, message: response.message }
    }

    return { success: false, message: response.message || 'Registration failed' }
  }

  const authenticatePassword = async (username: string, password: string) => {
    const response = await apiClient.post('/api/auth/authenticate-password', {
      username,
      password
    })

    if (response.success && response.token && response.user) {
      apiClient.setToken(response.token)

      if (response.csrfToken) {
        apiClient.setCsrfToken(response.csrfToken)
      }

      setAuthState({
        isAuthenticated: true,
        user: response.user,
        employee: null,
        userType: 'user',
        token: response.token,
        csrfToken: response.csrfToken || null
      })

      return {
        success: true,
        user: response.user,
        csrfToken: response.csrfToken
      }
    }

    return { success: false, message: response.message || 'Authentication failed' }
  }

  const refreshCsrfToken = async () => {
    const response = await apiClient.get('/api/auth/csrf-token')

    if (response.success && response.csrfToken) {
      apiClient.setCsrfToken(response.csrfToken)
      setAuthState(prev => ({
        ...prev,
        csrfToken: response.csrfToken || null
      }))
    }
  }

  const logout = () => {
    apiClient.clearAuth()
    setAuthState({
      isAuthenticated: false,
      user: null,
      employee: null,
      userType: null,
      token: null,
      csrfToken: null
    })
  }

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        register,
        logout,
        authenticatePassword,
        refreshCsrfToken
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
