import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@components/Header'
import { apiClient } from '@utils/apiClient'
import type { SecurityLog } from '@/types'

const SecurityLogsPage = () => {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<SecurityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSeverity, setFilterSeverity] = useState<string>('all')

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get<{ logs: SecurityLog[] }>('/api/security/logs')
      if (response.success && response.data) {
        setLogs(response.data.logs)
      }
    } catch (error) {
      console.error('Error loading security logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = filterSeverity === 'all'
    ? logs
    : logs.filter(log => log.severity === filterSeverity)

  return (
    <div>
      <Header />
      <main className="main-container">
        <div className="admin-container">
          <div className="admin-header">
            <h1>Security Logs</h1>
            <div className="admin-actions">
              <button onClick={() => navigate('/view-payments')} className="btn-secondary">
                Back to Transactions
              </button>
              <button onClick={loadLogs} className="btn-primary">
                Refresh
              </button>
            </div>
          </div>

          <div className="filter-section">
            <label htmlFor="severityFilter">Filter by Severity:</label>
            <select
              id="severityFilter"
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="form-input"
            >
              <option value="all">All</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>

          {loading ? (
            <div className="loading-state">Loading logs...</div>
          ) : (
            <div className="table-container">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>User/Employee</th>
                    <th>IP Address</th>
                    <th>Severity</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center' }}>
                        No logs found
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{log.id}</td>
                        <td>{new Date(log.timestamp).toLocaleString()}</td>
                        <td>{log.action}</td>
                        <td>
                          {log.user_id && `User #${log.user_id}`}
                          {log.employee_id && `Employee #${log.employee_id}`}
                          {!log.user_id && !log.employee_id && '-'}
                        </td>
                        <td>{log.ip_address}</td>
                        <td>
                          <span className={`severity-badge severity-${log.severity}`}>
                            {log.severity}
                          </span>
                        </td>
                        <td>
                          <div className="log-details">
                            {log.details || '-'}
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
    </div>
  )
}

export default SecurityLogsPage
