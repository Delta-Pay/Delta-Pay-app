import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@components/Header'
import { apiClient } from '@utils/apiClient'
import type { User } from '@/types'

const LandingPage = () => {
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [showAccountModal, setShowAccountModal] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const response = await apiClient.get<{ users: User[] }>('/api/users/all')
      if (response.success && response.data) {
        setUsers(response.data.users)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handlePaymentViewClick = () => {
    setShowAccountModal(true)
  }

  const handleBackendViewClick = () => {
    navigate('/login')
  }

  const handleAccountSelect = (username: string) => {
    const user = users.find(u => u.username === username)
    if (user) {
      sessionStorage.setItem('selectedUser', JSON.stringify(user))
      setShowAccountModal(false)
      navigate('/make-payment')
    }
  }

  const closeAccountModal = () => {
    setShowAccountModal(false)
  }

  return (
    <div>
      <Header />
      <main className="main-container">
        <div className="options-container">
          <button
            className="option-button payment-option"
            onClick={handlePaymentViewClick}
          >
            <div className="option-content">
              <h2>Payment View</h2>
              <p>Make international payments</p>
            </div>
          </button>

          <button
            className="option-button backend-option"
            onClick={handleBackendViewClick}
          >
            <div className="option-content">
              <h2>Backend View</h2>
              <p>Administrative dashboard</p>
            </div>
          </button>
        </div>
      </main>

      {showAccountModal && (
        <div className="account-modal-overlay active" id="accountSelectionModal">
          <div className="account-modal">
            <div className="account-modal-header">
              <h3>Select Your Account</h3>
              <p>Choose your user account to access the payment system</p>
            </div>
            <div className="account-modal-body">
              <div className="account-grid">
                {users.map((user) => {
                  const letter = user.full_name.charAt(0).toUpperCase()
                  const maskedAccount = `****${user.account_number.slice(-4)}`

                  return (
                    <div
                      key={user.id}
                      className="account-card"
                      onClick={() => handleAccountSelect(user.username)}
                    >
                      <div className="account-icon">{letter}</div>
                      <div className="account-details">
                        <h4>{user.full_name}</h4>
                        <p>ID: {user.id_number}</p>
                        <p className="account-number">Account: {maskedAccount}</p>
                        <p className="account-balance">
                          {user.currency} {user.account_balance.toLocaleString()}
                        </p>
                        <p className="account-type">{user.account_type}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="account-modal-footer">
              <button
                className="btn-cancel"
                onClick={closeAccountModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LandingPage
