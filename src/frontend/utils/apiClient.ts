import DOMPurify from 'dompurify'
import Cookies from 'js-cookie'
import type { ApiResponse } from '@/types'

const API_BASE_URL = 'http://localhost:3623'

class ApiClient {
  private token: string | null = null
  private csrfToken: string | null = null

  setToken(token: string | null) {
    this.token = token
    if (token) {
      Cookies.set('auth_token', token, {
        secure: true,
        sameSite: 'strict',
        expires: 1
      })
    } else {
      Cookies.remove('auth_token')
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = Cookies.get('auth_token') || null
    }
    return this.token
  }

  setCsrfToken(token: string | null) {
    this.csrfToken = token
    if (token) {
      sessionStorage.setItem('csrf_token', token)
    } else {
      sessionStorage.removeItem('csrf_token')
    }
  }

  getCsrfToken(): string | null {
    if (!this.csrfToken) {
      this.csrfToken = sessionStorage.getItem('csrf_token')
    }
    return this.csrfToken
  }

  private sanitizeInput(data: unknown): unknown {
    if (typeof data === 'string') {
      return DOMPurify.sanitize(data, { ALLOWED_TAGS: [] })
    }
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeInput(item))
    }
    if (typeof data === 'object' && data !== null) {
      const sanitized: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeInput(value)
      }
      return sanitized
    }
    return data
  }

  async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (options.headers) {
      Object.assign(headers, options.headers)
    }

    const token = this.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    if (options.method && options.method !== 'GET') {
      const csrfToken = this.getCsrfToken()
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken
      }
    }

    let body: string | undefined = undefined
    if (options.body) {
      if (typeof options.body === 'string') {
        body = JSON.stringify(this.sanitizeInput(JSON.parse(options.body)))
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        body,
        credentials: 'include',
        mode: 'cors'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          success: false,
          message: 'Request failed'
        }))
        return errorData as ApiResponse<T>
      }

      const data = await response.json()

      if (data.token) {
        this.setToken(data.token)
      }

      if (data.csrfToken) {
        this.setCsrfToken(data.csrfToken)
      }

      return data as ApiResponse<T>
    } catch (error) {
      console.error('API request error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error'
      }
    }
  }

  async get<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T = unknown>(endpoint: string, data: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async put<T = unknown>(endpoint: string, data: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async delete<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  clearAuth() {
    this.setToken(null)
    this.setCsrfToken(null)
  }
}

export const apiClient = new ApiClient()
