export interface User {
  id: number
  username: string
  full_name: string
  id_number: string
  account_number: string
  account_type: string
  email: string
  phone_number: string
  address_line_1: string
  address_line_2?: string
  city: string
  state_province: string
  postal_code: string
  country: string
  currency: string
  account_balance: number
  card_number: string
  card_expiry: string
  card_holder_name: string
}

export interface Employee {
  id: number
  username: string
  fullName: string
}

export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  employee: Employee | null
  userType: 'user' | 'employee' | null
  token: string | null
  csrfToken: string | null
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  fullName: string
  idNumber: string
  accountNumber: string
  username: string
  password: string
}

export interface Payment {
  id: number
  user_id: number
  amount: number
  currency: string
  provider: string
  recipient_account_number: string
  recipient_name: string
  swift_code: string
  status: string
  created_at: string
}

export interface SecurityLog {
  id: number
  user_id?: number
  employee_id?: number
  action: string
  ip_address: string
  user_agent?: string
  details?: string
  severity: 'info' | 'warning' | 'error'
  timestamp: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  token?: string
  csrfToken?: string
  user?: User
  employee?: Employee
}
