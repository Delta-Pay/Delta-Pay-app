import { useAuth } from '@/contexts/AuthContext'

interface HeaderProps {
  showUserIcon?: boolean
}

export const Header = ({ showUserIcon = false }: HeaderProps) => {
  const { user, employee, userType } = useAuth()

  const getUserInitial = () => {
    if (userType === 'user' && user) {
      return user.full_name.charAt(0).toUpperCase()
    }
    if (userType === 'employee' && employee) {
      return employee.fullName.charAt(0).toUpperCase()
    }
    return 'U'
  }

  return (
    <header className="header">
      <div className="logo">
        <svg viewBox="0 0 120 120">
          <line
            x1="9"
            y1="102"
            x2="62"
            y2="17"
            stroke="#AB92BF"
            strokeWidth="5"
          />
          <line
            x1="11"
            y1="102"
            x2="108"
            y2="102"
            stroke="#AB92BF"
            strokeWidth="2.5"
          />
          <line
            x1="64"
            y1="14"
            x2="112"
            y2="101"
            stroke="#AB92BF"
            strokeWidth="10"
          />
        </svg>
      </div>
      <div className="logo-container">
        <span className="logo-text">DeltaΔPay</span>
      </div>
      <div className="tagline">Secure Payment Gateway</div>
      {showUserIcon && (user || employee) && (
        <div className="user-icon" id="userIcon">
          {getUserInitial()}
        </div>
      )}
    </header>
  )
}
