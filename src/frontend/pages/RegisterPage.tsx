import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSecureInput } from '@hooks/useSecureInput'
import { Header } from '@components/Header'

const RegisterPage = () => {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const fullName = useSecureInput({ fieldName: 'fullName' })
  const idNumber = useSecureInput({ fieldName: 'idNumber' })
  const accountNumber = useSecureInput({ fieldName: 'accountNumber' })
  const username = useSecureInput({ fieldName: 'username' })
  const password = useSecureInput({ fieldName: 'password' })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!fullName.validate() || !idNumber.validate() ||
        !accountNumber.validate() || !username.validate() ||
        !password.validate()) {
      setErrorMessage('Please fix validation errors')
      return
    }

    setLoading(true)

    try {
      const result = await register({
        fullName: fullName.value,
        idNumber: idNumber.value,
        accountNumber: accountNumber.value,
        username: username.value,
        password: password.value
      })

      if (result.success) {
        setSuccessMessage('Registration successful! You can now select your account to make payments.')
        setTimeout(() => {
          navigate('/')
        }, 2500)
      } else {
        setErrorMessage(result.message || 'Registration failed')
      }
    } catch (error) {
      setErrorMessage('An error occurred during registration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Header />
      <main className="main-container">
        <div className="form-container">
          <h2>Register</h2>
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                value={fullName.value}
                onChange={fullName.handleChange}
                className="form-input"
                required
                autoComplete="name"
              />
              {fullName.error && <span className="error-text">{fullName.error}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="idNumber">ID Number (13 digits)</label>
              <input
                type="text"
                id="idNumber"
                value={idNumber.value}
                onChange={idNumber.handleChange}
                className="form-input"
                required
                maxLength={13}
              />
              {idNumber.error && <span className="error-text">{idNumber.error}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="accountNumber">Account Number</label>
              <input
                type="text"
                id="accountNumber"
                value={accountNumber.value}
                onChange={accountNumber.handleChange}
                className="form-input"
                required
              />
              {accountNumber.error && <span className="error-text">{accountNumber.error}</span>}
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
                autoComplete="new-password"
              />
              {password.error && <span className="error-text">{password.error}</span>}
              <small className="form-hint">
                Must be 8+ characters with uppercase, lowercase, digit, and special character
              </small>
            </div>

            {errorMessage && (
              <div className="error-message">{errorMessage}</div>
            )}

            {successMessage && (
              <div className="success-message">{successMessage}</div>
            )}

            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register'}
            </button>

            <div className="form-footer">
              <Link to="/">Back to Home</Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

export default RegisterPage
