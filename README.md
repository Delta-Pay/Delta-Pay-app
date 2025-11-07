<div align="center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
  <img src="src/Icons/DeltaPayReadMELogo.svg" alt="Delta Pay Logo" width="1000" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));"/>
</div>



Delta pay is a mockup of an international payment solution. It features multiple security features and data security layers with a clean and structured layout. The live website can be found at https://deltapay.samsaraserver.space/

## Contributors

<table align="center">
  <tr>
    <td align="center">
      <a href="https://github.com/JMosselson">
        <img src="https://github.com/JMosselson.png" width="100px" alt="Jordan Mosselson"/><br/>
        <b>Jordan Mosselson</b>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/MatthewHubbard123">
        <img src="https://github.com/MatthewHubbard123.png" width="100px" alt="Matthew Hubbard"/><br/>
        <b>Matthew Hubbard</b>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/Max0xDay">
        <img src="https://github.com/Max0xDay.png" width="100px" alt="Max Day"/><br/>
        <b>Max Day</b>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/SharDai">
        <img src="https://github.com/ShortJai.png" width="100px" alt="Jaiyesh Pillay"/><br/>
        <b>Jaiyesh Pillay</b>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/Tashil10">
        <img src="https://github.com/Tashil10.png" width="100px" alt="Tashil Koseelan"/><br/>
        <b>Tashil Koseelan</b>
      </a>
    </td>
  </tr>
</table>

---
## Getting Started & Development

### Prerequisites

Before running Delta Pay, ensure you have the following installed:

- **Deno** (v1.30 or higher) - Backend runtime
  - Install: Visit [https://deno.land/#installation](https://deno.land/#installation)
  - Verify: `deno --version`
- **Node.js** (v16 or higher) - Frontend development
  - Install: Visit [https://nodejs.org/](https://nodejs.org/)
  - Verify: `node --version`

### Quick Start Scripts

Delta Pay includes convenient start scripts for different platforms:

#### Windows
```cmd
start.bat
```
This script will:
- Verify Deno installation
- Check for Node.js (warns if missing)
- Start the backend server on port 3623
- Display the server URL: `http://localhost:3623`

#### macOS/Linux
```bash
./start.sh
```
This script performs the same checks and starts the backend server.

## Access Control & User Roles

Delta Pay implements a role-based access control system with two distinct user types:

### Customer Users
- **Access:** Payment portal only (customer-facing interface)
- **Authentication:** Username, account number, and password (PBKDF2-hashed with 100,000 iterations)
- **Capabilities:**
  - Make international payments
  - Enter payment details and recipient information
  - Submit transactions for employee verification
- **Restrictions:** Cannot access the admin/backend portal

### Employee/Administrator Users
- **Access:** Backend/admin portal only
- **Registration:** Pre-registered in the system when employed (no self-registration)
- **Authentication:** Employee credentials with role verification
- **Capabilities:**
  - View all pending payment transactions
  - Approve or deny customer payments
  - Create new customer accounts via the "Create User" feature
  - Monitor security logs and suspicious activities
  - Track user behavior and IP addresses
  - Manage account lockouts and security events
- **Restrictions:** Dedicated employee interface separate from customer portal

> **Security Note:** In production, access to the backend/admin view is strictly enforced through authentication middleware, role-based session tokens, and CSRF protection. Regular customers will never see or be able to access administrative functions.

## UI Structure

### General Layout:
- Delta Pay logo in the top right corner of the page.
- text next to logo.
- text color for logo is #AB92BF while outline of the top bar is #655A7C
- any additional elements can either be #8da8c7ff or #CEF9F2
- background doesn't have to be white or black, can be either one of these colours mostly the purple ones
- Interfaces must be up to standard for both mobile and desktop views

### Landing page
- The landing page has 2 options: **Backend View** (Admin Only) and **Payment View** (Customer Portal)

> **Note:** The Backend View is restricted to administrators only. In production, regular users will not be able to access this view. Access control is enforced through role-based authentication and session management.

### Payment page
- The top right of the page displays a user icon with the first letter of the person's name
- **User Selection Flow (from Landing Page):**
  1. When navigating from landing page to payment view, user must first select one of the available user accounts (not bank accounts)
  2. After account selection, a custom (non-browser) popup prompts for password authentication
  3. Password is validated using the same Argon2/PBKDF2 hashing and salting as backend security features
  4. Only after successful authentication is the payment page displayed
- **Payment Interface:**
  - Standard payment gateway inputs with appropriate field masking for sensitive data (card numbers, CVV, etc.)
  - Multi-currency support with currency selection
  - SWIFT provider selection for international transfers
  - Account information and SWIFT code entry fields
  - All features expected from a modern, secure payment gateway
- **User Experience:**
  - Clean, smooth animations that don't overwhelm the user
  - Modern, secure visual design language
  - Upon clicking submit, a clean animated prompt appears with a checkmark/tick animation confirming "Payment Sent"
- Apply general layout formatting

### Backend view (Admin Portal - Access Restricted)
**Access Control:** This view is exclusively for pre-registered bank employees/administrators. Regular customers cannot access this portal in production. Authentication is enforced with employee-only credentials and role-based session tokens.

#### Features:
- **Payment Management:** View all pending international payments from customers and approve or deny them before forwarding to SWIFT
- **User Management:** Access the "Create User" feature to register new customer accounts
- **Security Monitoring:** Comprehensive security log displaying:
  - Failed login attempts and account lockouts
  - Suspicious activities and exploit attempts
  - User navigation patterns with IP address tracking
  - Account access history and user tracking
  - All security events with severity levels (info, warning, error)

#### Create User Feature:
The admin portal includes a comprehensive user registration system (`CreateUser.html`) that allows administrators to create new customer accounts. This feature includes:

**Personal Information:**
- Full name (letters only, 2-50 characters)
- ID number (13 digits)
- Date of birth (DD/MM/YYYY format)
- Nationality and occupation

**Account Details:**
- Username (3-20 alphanumeric characters)
- Account number (10-20 digits, auto-formatted)
- Password with real-time strength validation (minimum: Strong - 5/6 criteria)
  - Must include: lowercase, uppercase, number, special character
  - Minimum 8 characters (12+ recommended for "Very Strong")
- Account type (Standard/Premium/Business)
- Initial balance and annual income
- Multi-currency support (ZAR, USD, EUR, GBP, AUD, CAD, CHF, JPY)

**Contact Information:**
- Email address and phone number (international format: +XX-XX-XXX-XXXX)
- Full address (street, city, state/province, postal code, country)
- Preferred language

**Payment Card Information:**
- Card number (16 digits, auto-formatted with spaces)
- Card expiry (MM/YY format)
- Cardholder name (auto-fills from full name)

**Security Features:**
- Real-time input validation with RegEx whitelisting
- Password strength meter with visual feedback (Weak → Very Strong)
- Password visibility toggle for both password fields
- Submit button disabled until password meets minimum strength (Strong)
- All sensitive data is hashed with PBKDF2 (100,000 iterations) before storage
- Comprehensive error handling and user feedback via toast notifications
- CSRF token protection on form submission

> **Important:** Customer self-registration is not available. All user accounts must be created by administrators through this secure interface to ensure proper verification and compliance with banking regulations.


## Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/Delta-Pay-app.git
cd Delta-Pay-app
```

### 2. Install Dependencies

#### Frontend Dependencies
```bash
npm install
```

#### Backend Dependencies
Deno automatically manages dependencies. No additional installation required.

### 3. Environment Configuration

Create a `.env` file in the root directory with the following configuration:

```env
# Server Configuration
PORT=3623
NODE_ENV=production

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=24h
JWT_REFRESH_SECRET=your-refresh-token-secret-change-this
JWT_REFRESH_EXPIRATION=7d

# Database Configuration
DB_PATH=./database/deltapay.db

# Security Configuration
BCRYPT_ROUNDS=12
PBKDF2_ITERATIONS=100000
SESSION_SECRET=your-session-secret-change-this

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3623

# Rate Limiting (Express-Brute)
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900000

# SSL/TLS Configuration (Production)
SSL_CERT_PATH=./certificates/cert.pem
SSL_KEY_PATH=./certificates/key.pem

# Cloudflare Configuration (Optional)
CLOUDFLARE_TUNNEL_TOKEN=your-cloudflare-tunnel-token
```

> **Important Security Note:** Never commit your `.env` file to version control. The JWT secrets and session secrets should be long, randomly generated strings in production. Use a password generator to create secure secrets (minimum 32 characters).

### 4. SSL/TLS Certificate Setup

For HTTPS support, you need to configure SSL certificates:

#### Development (Self-Signed Certificates)
```bash
# Create certificates directory
mkdir certificates
cd certificates

# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

#### Production
Use certificates from a trusted Certificate Authority (CA) like Let's Encrypt:
```bash
# Using Certbot
certbot certonly --standalone -d yourdomain.com
```

Place your certificate files in the `certificates/` directory and update the paths in your `.env` file.

### 5. Database Initialization

The SQLite database will be automatically created on first run. To manually initialize:

```bash
deno run --allow-read --allow-write scripts/initDB.ts
```

### 6. Running the Application

#### Option 1: Using Start Scripts (Recommended)

**Windows:**
```cmd
start.bat
```

**macOS/Linux:**
```bash
chmod +x start.sh
./start.sh
```

#### Option 2: Manual Start

**Backend Server:**
```bash
deno run --allow-net --allow-read --allow-write --allow-env server.ts
```

**Frontend Development Server:**
```bash
npm run dev
```

**Production Build:**
```bash
npm run build
npm run preview
```

### 7. Access the Application

- **Customer Payment Portal:** `https://localhost:3623/payment`
- **Employee/Admin Backend:** `https://localhost:3623/backend`
- **API Endpoint:** `https://localhost:3623/api`

> **Note:** If using self-signed certificates in development, your browser will show a security warning. This is expected - proceed by accepting the certificate.

### 8. Pre-Configured Demo Accounts

Delta Pay includes pre-configured employee accounts for testing purposes:

## Features

### Authentication & Authorization

#### Pre-Configured Employee Accounts
- No registration functionality for employees or customers
- All employee accounts are pre-configured in the system
- Login with username/account number and password
- Role-based access control (RBAC) separating customer and employee access

#### Password Security
- Password hashing using bcrypt (frontend) and Argon2 (backend)
- Password salting with cryptographically secure random salts
- PBKDF2 key derivation with 100,000 iterations for customer passwords
- Minimum password strength requirements enforced (Strong rating: 5/6 criteria)
- Password strength validation: lowercase, uppercase, numbers, special characters

### Input Security

#### RegEx Whitelisting
- All input fields protected with Regular Expression whitelisting
- Strict validation patterns for each input type:
  - Names: Letters and spaces only (2-50 characters)
  - ID numbers: Exactly 13 digits
  - Account numbers: 10-20 digits with auto-formatting
  - Email: RFC 5322 compliant email validation
  - Phone: International format (+XX-XX-XXX-XXXX)
  - Card numbers: 16 digits with automatic spacing
  - SWIFT codes: 8-11 alphanumeric characters

#### Protection Against Injection
- Special characters blocked or escaped in all user inputs
- Real-time validation with immediate user feedback
- Malicious input rejected before reaching backend
- Comprehensive input sanitization on both frontend and backend

### Data in Transit Security

#### SSL/TLS Configuration
- TLS 1.3 protocol for all HTTPS traffic
- SSL certificate and private key files configured
- Certificate files located in `certificates/` directory:
  - `cert.pem` - SSL certificate
  - `key.pem` - Private key
- Automatic HTTP to HTTPS redirection
- Secure cipher suites and protocols enforced

#### Transport Security
- All sensitive data encrypted during transmission
- HTTPS enforced on all routes (visible `https://` in browser)
- Perfect Forward Secrecy (PFS) enabled
- HSTS (HTTP Strict Transport Security) headers configured

### Attack Protection

#### Helmet.js Security Headers
- Helmet.js configured for comprehensive header protection
- X-Content-Type-Options: nosniff
- X-DNS-Prefetch-Control: off
- X-Download-Options: noopen
- X-Frame-Options: DENY (clickjacking protection)
- Strict-Transport-Security: max-age=31536000
- X-XSS-Protection: 1; mode=block

#### Express-Brute Rate Limiting
- Brute force protection on all authentication endpoints
- Maximum 5 failed login attempts per account
- 15-minute account lockout after max attempts exceeded
- Exponential backoff for repeated attempts
- IP-based and account-based rate limiting

#### CORS Configuration
- Cross-Origin Resource Sharing properly configured
- Whitelisted origins defined in environment variables
- Credentials allowed only for trusted domains
- Preflight requests handled correctly

#### XSS Protection
- Content Security Policy (CSP) headers enforced
- HTML sanitization using DOMPurify library
- Script injection prevention on all user inputs
- Secure template rendering preventing code injection

#### SQL Injection Protection
- Parameterized queries used throughout the application
- ORM patterns for database operations
- Input validation before database operations
- SQLite prepared statements for all queries

#### Clickjacking Protection
- X-Frame-Options: DENY header prevents iframe embedding
- Content Security Policy frame-ancestors directive
- Protection against UI redress attacks

#### Session Management
- Secure cookie configuration:
  - HttpOnly flag prevents JavaScript access
  - Secure flag ensures HTTPS-only transmission
  - SameSite=Strict prevents CSRF attacks
- Session token regeneration after authentication
- Automatic session expiration (24-hour default)
- Session invalidation on logout
- CSRF token protection on all state-changing operations

### DevSecOps Pipeline

#### GitHub Repository
- Version control system for codebase
- Branch protection rules enforced
- Pull request reviews required
- Automated security scanning on commits

#### CircleCI Configuration
- Continuous Integration/Continuous Deployment pipeline
- Configuration file: `.circleci/config.yml`
- Automated testing on every push
- Build verification before deployment
- Pipeline triggers on pull requests and merges

#### SonarQube Integration
- Static code analysis on every push
- Code quality metrics tracked:
  - Security hotspots identification
  - Code smells detection
  - Bug detection and reporting
  - Code coverage analysis
  - Technical debt measurement
- Pipeline results accessible in SonarQube dashboard
- Quality gate enforcement before deployment

#### Pipeline Results
- Security vulnerabilities flagged automatically
- Code smell reporting and tracking
- Automated security hotspot reviews
- Technical debt metrics and trends
- Code coverage reports

### Functionality Demonstration

#### Customer Portal Flow
1. **Landing Page:** Select "Payment View" to access customer portal
2. **Account Selection:** Choose from available pre-created customer accounts
3. **Authentication:** Enter password in custom secure popup
4. **Payment Interface:** Access full payment gateway with:
   - Multi-currency support (ZAR, USD, EUR, GBP, AUD, CAD, CHF, JPY)
   - International transfer functionality
   - SWIFT provider selection
   - Recipient account and SWIFT code entry
   - Real-time validation and error feedback
5. **Transaction Submission:** Submit payment with animated confirmation
6. **Verification Status:** View transaction status (pending employee approval)

#### Employee Portal Flow
1. **Backend Access:** Login with employee credentials
2. **Transaction Dashboard:** View all customer transactions from database
3. **SWIFT Verification:**
   - Review customer payment details
   - Validate SWIFT codes for accuracy
   - Check recipient account information
   - Verify transaction amounts and currencies
4. **Approval Process:** Click "Verified" button to approve transactions
5. **Security Monitoring:** Access comprehensive security logs
6. **User Management:** Create new customer accounts via "Create User" feature

## Technology Stack

### Frontend Technologies
- **React** - Component-based UI framework for customer and employee portals
- **TypeScript** - Type-safe JavaScript for enhanced code quality
- **Vite** - Fast build tool and development server
- **React Router** - Client-side routing and navigation
- **Axios** - HTTP client for API requests
- **DOMPurify** - HTML sanitization library for XSS protection
- **JSON Web Tokens (JWT)** - Stateless authentication mechanism
- **HTTPS/TLS 1.3** - Transport layer security for all communications
- **Content Security Policy (CSP)** - Defense against XSS attacks
- **X-Frame-Options: DENY** - Clickjacking protection
- **Secure Cookies** - HttpOnly, Secure, SameSite=Strict flags for session hijacking prevention

### Backend Technologies
- **Deno** - Secure TypeScript/JavaScript runtime (port 3623)
- **Oak Framework** - Middleware framework for Deno
- **Argon2** - Password hashing algorithm (memory-hard, resistant to GPU attacks)
- **bcrypt** - Alternative password hashing with salting
- **PBKDF2** - Key derivation function (100,000 iterations)
- **Regular Expressions (RegEx)** - Input validation and whitelisting
- **Parameterized Queries** - SQL injection prevention
- **CSRF Tokens** - Cross-Site Request Forgery protection
- **Express-Brute** - Rate limiting for brute force attack prevention
- **Helmet.js** - Security headers middleware
- **SQLite** - Embedded relational database

### Security Infrastructure
- **Cloudflare CDN** - DDoS attack mitigation and WAF
- **Cloudflare Tunnel** - Secure tunnel preventing MITM attacks
- **WAF (Web Application Firewall)** - Application-layer attack protection
- **PCI DSS Compliance** - Payment Card Industry security standards
- **Data Tokenization** - Sensitive payment data protection
- **TLS/SSL Certificates** - Let's Encrypt or self-signed for development

### DevSecOps Pipeline
- **GitHub** - Version control and collaboration platform
- **CircleCI** - Continuous Integration/Continuous Deployment
- **SonarQube** - Static Application Security Testing (SAST)
- **ScoutSuite** - Multi-cloud security auditing tool
- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting

### Data Security
- **Application-Level Encryption** - Data at rest encryption
- **Database Tokenization** - Sensitive payment data tokens
- **Structured JSON Logging** - Security event monitoring and audit trails
- **Session Token Regeneration** - Session fixation attack prevention
- **Secure Random Generation** - Cryptographically secure randomness for tokens and salts

## Testing & Development

### Running Tests
```bash
# Frontend tests
npm test

# Backend tests
deno test

# Specific test file
npm test -- --testNamePattern="LoginComponent"
deno test --filter "AuthenticationTest"
```

### Linting
```bash
# Frontend linting
npm run lint

# Backend linting
deno lint
```

### Build Commands
```bash
# Frontend development
npm run dev

# Frontend production build
npm run build

# Preview production build
npm run preview
```

## Security Best Practices

### For Deployment
1. Generate strong JWT secrets (minimum 32 characters)
2. Use production-grade SSL certificates from trusted CA
3. Configure Cloudflare for DDoS protection
4. Enable all security headers via Helmet.js
5. Set up database backups and encryption
6. Configure rate limiting on all endpoints
7. Enable comprehensive logging and monitoring
8. Regularly update dependencies for security patches

### Monitoring Security Events
Access the employee portal security log to monitor:
- Failed login attempts and account lockouts
- Suspicious input patterns and injection attempts
- Unusual IP address access patterns
- Session anomalies and concurrent logins
- CSRF token validation failures
- Rate limit violations

## Troubleshooting

### Common Issues

**Port Already in Use:**
```bash
# Windows
netstat -ano | findstr :3623
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3623 | xargs kill -9
```

## License

This project is licensed under the Apache-2.0 license
