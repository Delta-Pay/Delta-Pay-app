# Running Delta Pay Backend Server

## Quick Start

### Using Start Scripts (Recommended)

**Linux/macOS:**
```bash
./start.sh
```

**Windows:**
```cmd
start.bat
```

### Manual Commands

**Start Backend Server:**
```bash
deno run --allow-net --allow-read --allow-write src/backend/server.ts
```

**Using npm scripts:**
```bash
# Start backend only
npm run dev:backend

# Start both frontend and backend (when frontend is implemented)
npm run dev

# Start production server
npm start
```

## Server Information

- **Port:** 3623 (as specified in README.md)
- **Backend URL:** http://localhost:3623
- **Default Admin Credentials:**
  - Username: `admin`
  - Password: `admin123`

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/employee-login` - Employee login
- `GET /auth/csrf-token` - Get CSRF token

### User Endpoints
- `GET /user/transactions` - Get user transactions
- `POST /user/payments` - Create payment

### Admin Endpoints
- `GET /admin/transactions` - Get all transactions
- `PUT /admin/transactions/:id/approve` - Approve transaction
- `PUT /admin/transactions/:id/deny` - Deny transaction
- `GET /admin/security-logs` - Get security logs
- `GET /admin/users` - Get all users
- `GET /admin/employees` - Get all employees
- `PUT /admin/users/:id/toggle` - Toggle user account
- `GET /admin/statistics` - Get system statistics
- `GET /admin/failed-login-report` - Get failed login report
- `POST /admin/cleanup-logs` - Cleanup old logs

### Public Endpoints
- `GET /` - API info
- `GET /health` - Health check
- `GET /statistics/transactions` - Transaction statistics

## Prerequisites

1. **Deno** must be installed:
   ```bash
   curl -fsSL https://deno.land/install.sh | sh
   ```

2. For frontend development (when implemented):
   - **Node.js** and **npm** must be installed

## Database

The server currently uses an in-memory database for development. When the server restarts, all data will be reset.

## Security Features

- JWT authentication
- CSRF protection
- Rate limiting
- Input validation
- Security logging
- Password hashing with PBKDF2

## Troubleshooting

### Common Issues

1. **"Module not found" errors:**
   - Ensure you have an internet connection for the first run (Deno will download dependencies)
   - Check that the import URLs are correct

2. **Permission errors:**
   - Make sure you're running with the correct permissions:
     ```bash
     deno run --allow-net --allow-read --allow-write src/backend/server.ts
     ```

3. **Port already in use:**
   - Check if port 3623 is already in use:
     ```bash
     # Linux/macOS
     lsof -i :3623
     
     # Windows
     netstat -ano | findstr :3623
     ```
   - Kill the process using the port or change the port in `src/backend/server.ts`

### VS Code Integration

Use the provided VS Code tasks:
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Tasks: Run Task"
3. Select "Start Backend Server" or "Start Development Environment"

Or use the debug configurations to run the server with debugging capabilities.