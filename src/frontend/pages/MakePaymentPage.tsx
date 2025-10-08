import { useState, useEffect, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Header } from '@components/Header'
import { apiClient } from '@utils/apiClient'

const MakePaymentPage = () => {
  const navigate = useNavigate()
  const { user, authenticatePassword, csrfToken, refreshCsrfToken } = useAuth()
  const [showPasswordModal, setShowPasswordModal] = useState(true)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [password, setPassword] = useState('')
  const [cvv, setCvv] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authenticatedUser, setAuthenticatedUser] = useState(user)
  const [currentCharge] = useState(() => {
    const min = 50
    const max = 5000
    const randomAmount = Math.floor(Math.random() * (max - min + 1)) + min
    const cents = Math.floor(Math.random() * 100)
    return parseFloat(`${randomAmount}.${cents.toString().padStart(2, '0')}`)
  })
  const [paymentReference] = useState(() => {
    const timestamp = Date.now().toString()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `REF-${timestamp.slice(-6)}${random}`
  })

  useEffect(() => {
    const selectedUserData = sessionStorage.getItem('selectedUser')
    if (!selectedUserData) {
      navigate('/')
      return
    }
  }, [navigate])

  useEffect(() => {
    if (!csrfToken && authenticatedUser) {
      refreshCsrfToken()
    }
  }, [csrfToken, authenticatedUser, refreshCsrfToken])

  const handlePasswordAuth = async (e: FormEvent) => {
    e.preventDefault()

    if (!password) {
      alert('Please enter your password')
      return
    }

    const selectedUserData = JSON.parse(sessionStorage.getItem('selectedUser') || '{}')

    const result = await authenticatePassword(selectedUserData.username, password)

    if (result.success && result.user) {
      setAuthenticatedUser(result.user)
      setShowPasswordModal(false)
    } else {
      alert(result.message || 'Authentication failed')
      setPassword('')
    }
  }

  const handlePaymentSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!authenticatedUser || !currentCharge) {
      alert('Authentication required')
      return
    }

    if (!cvv || cvv.length !== 3 || !/^\d{3}$/.test(cvv)) {
      alert('Please enter a valid 3-digit CVV')
      return
    }

    if (!termsAccepted) {
      alert('Please accept the Terms of Service')
      return
    }

    setLoading(true)

    try {
      const response = await apiClient.post('/api/user/payments', {
        amount: Number(currentCharge).toFixed(2),
        currency: authenticatedUser.currency,
        provider: 'WIRE',
        recipientAccount: 'DELTAPAYPROC01',
        notes: `Payment processing fee - Reference: ${paymentReference}`
      })

      if (response.success) {
        setShowSuccessModal(true)
        setTimeout(() => {
          sessionStorage.removeItem('selectedUser')
          navigate('/')
        }, 5000)
      } else {
        alert(response.message || 'Payment failed')
      }
    } catch (error) {
      alert('Payment processing failed')
    } finally {
      setLoading(false)
    }
  }

  const maskCardNumber = (cardNumber: string) => {
    return `•••• •••• •••• ${cardNumber.slice(-4)}`
  }

  const maskAccountNumber = (accountNumber: string) => {
    return `••••••••••••${accountNumber.slice(-4)}`
  }

  if (!authenticatedUser) {
    return null
  }

  return (
    <div>
      <Header showUserIcon />
      <main className="main-container">
        {!showPasswordModal ? (
          <div className="payment-container">
            <div className="payment-header">
              <button onClick={() => navigate('/')} className="back-button">
                ← Back
              </button>
              <h1>Process Payment</h1>
            </div>

            <div className="payment-details-card">
              <div className="account-info">
                <div className="account-avatar">
                  {authenticatedUser.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3>{authenticatedUser.full_name}</h3>
                  <p>{maskAccountNumber(authenticatedUser.account_number)}</p>
                  <p className="balance">
                    {authenticatedUser.currency} {authenticatedUser.account_balance.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="payment-amount-section">
                <h2>Payment Amount</h2>
                <div className="amount-display">
                  {authenticatedUser.currency} {currentCharge.toFixed(2)}
                </div>
                <p className="service-description">International Payment Processing Fee</p>
                <p className="payment-reference">Reference: {paymentReference}</p>
              </div>

              <form onSubmit={handlePaymentSubmit} className="payment-form">
                <div className="card-details-section">
                  <h3>Card Details</h3>
                  <div className="card-info-display">
                    <p><strong>Card Number:</strong> {maskCardNumber(authenticatedUser.card_number)}</p>
                    <p><strong>Expiry Date:</strong> {authenticatedUser.card_expiry}</p>
                    <p><strong>Cardholder:</strong> {authenticatedUser.card_holder_name}</p>
                  </div>

                  <div className="form-group">
                    <label htmlFor="cvv">CVV *</label>
                    <input
                      type="password"
                      id="cvv"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 3))}
                      className="form-input"
                      maxLength={3}
                      required
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="billing-address">
                  <h3>Billing Address</h3>
                  <p>{authenticatedUser.address_line_1}</p>
                  {authenticatedUser.address_line_2 && <p>{authenticatedUser.address_line_2}</p>}
                  <p>{authenticatedUser.city}, {authenticatedUser.state_province} {authenticatedUser.postal_code}</p>
                  <p>{authenticatedUser.country}</p>
                </div>

                <div className="terms-section">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                    />
                    I accept the Terms of Service and Privacy Policy
                  </label>
                </div>

                <button
                  type="submit"
                  className={`submit-button payment-button ${cvv.length === 3 && termsAccepted ? 'ready' : ''}`}
                  disabled={cvv.length !== 3 || !termsAccepted || loading}
                >
                  <div className="button-content">
                    <span className="button-text">
                      {loading ? 'Processing...' : 'Secure Payment'}
                    </span>
                    <span className="button-amount">
                      {authenticatedUser.currency} {currentCharge.toFixed(2)}
                    </span>
                  </div>
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </main>

      {showPasswordModal && (
        <div className="modal-overlay active">
          <div className="modal password-modal">
            <h3>Authenticate</h3>
            <p>Please enter your password to continue</p>
            <form onSubmit={handlePasswordAuth}>
              <div className="form-group">
                <label htmlFor="authPassword">Password</label>
                <input
                  type="password"
                  id="authPassword"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  required
                  autoFocus
                />
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => navigate('/')} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Authenticate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="modal-overlay active success-modal">
          <div className="modal success-content">
            <div className="checkmark-circle animate">
              <svg viewBox="0 0 52 52" className="checkmark">
                <circle cx="26" cy="26" r="25" fill="none" />
                <path fill="none" d="M14 27l7.5 7.5L38 18" />
              </svg>
            </div>
            <h2>Payment Successful!</h2>
            <p className="success-amount">
              {authenticatedUser.currency} {currentCharge.toFixed(2)}
            </p>
            <p className="success-reference">Reference: {paymentReference}</p>
            <p>You will be redirected shortly...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default MakePaymentPage
