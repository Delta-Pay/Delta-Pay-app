import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSecureInput } from '@hooks/useSecureInput'
import { Header } from '@components/Header'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [userType, setUserType] = useState<'user' | 'employee'>('employee')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const username = useSecureInput({ fieldName: 'username' })
  const password = useSecureInput({ fieldName: 'password' })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!username.validate() || !password.validate()) {
      setErrorMessage('Please provide valid credentials')
      return
    }

    setLoading(true)

    try {
      const result = await login(
        { username: username.value, password: password.value },
        userType
      )

      if (result.success) {
        if (userType === 'employee') {
          navigate('/view-payments')
        } else {
          navigate('/make-payment')
        }
      } else {
        setErrorMessage(result.message || 'Login failed')
      }
    } catch (error) {
      setErrorMessage('An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Header />
      <main className="main-container">
        <div className="form-container">
          <h2>Login</h2>
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>User Type</label>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value as 'user' | 'employee')}
                className="form-input"
              >
                <option value="employee">Employee</option>
                <option value="user">Customer</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={username.value}
                onChange={username.handleChange}
                className="form-input"
                required
                autoComplete="username"
              />
              {username.error && <span className="error-text">{username.error}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password.value}
                onChange={password.handleChange}
                className="form-input"
                required
                autoComplete="current-password"
              />
              {password.error && <span className="error-text">{password.error}</span>}
            </div>

            {errorMessage && (
              <div className="error-message">{errorMessage}</div>
            )}

            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            {userType === 'user' && (
              <div className="form-footer">
                <p>
                  Don't have an account? <Link to="/register">Register</Link>
                </p>
              </div>
            )}

            <div className="form-footer">
              <Link to="/">Back to Home</Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

export default LoginPage
