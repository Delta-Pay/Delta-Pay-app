import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@components/Header'
import { apiClient } from '@utils/apiClient'

interface Transaction {
  id: number
  createdAt: string
  userFullName: string
  userUsername: string
  amount: number
  currency: string
  provider: string
  recipientAccount: string
  status: string
  processedByFullName?: string
}

const ViewPaymentsPage = () => {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showDenyModal, setShowDenyModal] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null)
  const [denyReason, setDenyReason] = useState('')

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get<{ transactions: Transaction[] }>('/api/admin/transactions')
      if (response.success && response.data) {
        setTransactions(response.data.transactions)
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: number) => {
    try {
      const response = await apiClient.put(`/api/admin/transactions/${id}/approve`, {})
      if (response.success) {
        showToast('Transaction approved', 'success')
        loadTransactions()
      } else {
        showToast('Failed to approve transaction', 'error')
      }
    } catch (error) {
      showToast('Error approving transaction', 'error')
    }
  }

  const handleDenyClick = (id: number) => {
    setSelectedTransactionId(id)
    setShowDenyModal(true)
  }

  const handleDenySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTransactionId || !denyReason.trim()) return

    try {
      const response = await apiClient.put(`/api/admin/transactions/${selectedTransactionId}/deny`, {
        reason: denyReason
      })
      if (response.success) {
        showToast('Transaction denied', 'success')
        setShowDenyModal(false)
        setDenyReason('')
        loadTransactions()
      } else {
        showToast('Failed to deny transaction', 'error')
      }
    } catch (error) {
      showToast('Error denying transaction', 'error')
    }
  }

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    const container = document.getElementById('toastContainer')
    if (!container) return

    const toast = document.createElement('div')
    toast.className = `toast toast-${type}`
    toast.innerHTML = `
      <div class="toast-message">${message}</div>
      <button class="toast-close">×</button>
    `

    const closeBtn = toast.querySelector('.toast-close')
    closeBtn?.addEventListener('click', () => container.removeChild(toast))

    container.appendChild(toast)
    setTimeout(() => {
      if (toast.parentElement === container) container.removeChild(toast)
    }, 3000)
  }

  return (
    <div>
      <Header />
      <div id="toastContainer" className="toast-container"></div>
      <main className="main-container">
        <div className="admin-container">
          <div className="admin-header">
            <h1>Transaction Management</h1>
            <div className="admin-actions">
              <button onClick={() => navigate('/security-logs')} className="btn-secondary">
                Security Logs
              </button>
              <button onClick={loadTransactions} className="btn-primary">
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">Loading transactions...</div>
          ) : (
            <div className="table-container">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Provider</th>
                    <th>Recipient</th>
                    <th>Status</th>
                    <th>Processed By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center' }}>
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>{tx.id}</td>
                        <td>{new Date(tx.createdAt).toLocaleString()}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong>{tx.userFullName}</strong>
                            <span style={{ opacity: 0.8, fontSize: '0.85rem' }}>
                              @{tx.userUsername}
                            </span>
                          </div>
                        </td>
                        <td>
                          {tx.currency} {Number(tx.amount).toFixed(2)}
                        </td>
                        <td>{tx.provider}</td>
                        <td>{tx.recipientAccount}</td>
                        <td>
                          <span className={`status-badge status-${tx.status.toLowerCase()}`}>
                            {tx.status}
                          </span>
                        </td>
                        <td>{tx.processedByFullName || '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="option-button"
                              style={{
                                padding: '0.4rem 0.6rem',
                                minWidth: '90px',
                                ...(tx.status !== 'pending' && {
                                  opacity: 0.5,
                                  pointerEvents: 'none'
                                })
                              }}
                              onClick={() => handleApprove(tx.id)}
                              disabled={tx.status !== 'pending'}
                            >
                              Approve
                            </button>
                            <button
                              className="option-button backend-option"
                              style={{
                                padding: '0.4rem 0.6rem',
                                minWidth: '90px',
                                ...(tx.status !== 'pending' && {
                                  opacity: 0.5,
                                  pointerEvents: 'none'
                                })
                              }}
                              onClick={() => handleDenyClick(tx.id)}
                              disabled={tx.status !== 'pending'}
                            >
                              Deny
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showDenyModal && (
        <div className="modal-overlay active">
          <div className="modal">
            <h3>Deny Transaction</h3>
            <form onSubmit={handleDenySubmit}>
              <div className="form-group">
                <label htmlFor="denyReason">Reason for denial</label>
                <textarea
                  id="denyReason"
                  value={denyReason}
                  onChange={(e) => setDenyReason(e.target.value)}
                  className="form-input"
                  rows={4}
                  required
                />
              </div>
              <div className="modal-buttons">
                <button
                  type="button"
                  onClick={() => {
                    setShowDenyModal(false)
                    setDenyReason('')
                  }}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Deny Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ViewPaymentsPage
