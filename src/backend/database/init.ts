import { DB } from "https://deno.land/x/sqlite@v3.8/mod.ts";

const db = new DB("delta_pay.db");

export function initializeDatabase() {
  db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      id_number TEXT NOT NULL UNIQUE,
      account_number TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1,
      failed_login_attempts INTEGER DEFAULT 0,
      last_login_attempt DATETIME,
      account_locked_until DATETIME
    )
  `);

  db.execute(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      employee_id TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1,
      failed_login_attempts INTEGER DEFAULT 0,
      last_login_attempt DATETIME,
      account_locked_until DATETIME
    )
  `);

  db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      currency TEXT NOT NULL DEFAULT 'ZAR',
      provider TEXT NOT NULL DEFAULT 'SWIFT',
      recipient_account TEXT NOT NULL,
      recipient_swift_code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      processed_by INTEGER,
      notes TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (processed_by) REFERENCES employees(id)
    )
  `);

  db.execute(`
    CREATE TABLE IF NOT EXISTS security_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      employee_id INTEGER,
      action TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      user_agent TEXT,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      severity TEXT DEFAULT 'info',
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  db.execute(`
    CREATE TABLE IF NOT EXISTS session_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      employee_id INTEGER,
      token_hash TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_revoked BOOLEAN DEFAULT 0,
      ip_address TEXT NOT NULL,
      user_agent TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  db.execute(`
    CREATE TABLE IF NOT EXISTS csrf_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      user_id INTEGER,
      employee_id INTEGER,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_used BOOLEAN DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  db.execute(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      request_count INTEGER DEFAULT 1,
      first_request DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_request DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(ip_address, endpoint)
    )
  `);

  console.log("Database initialized successfully");
}

export function seedDefaultEmployee() {
  const existingAdmin = db.query("SELECT id FROM employees WHERE username = ?", ["admin"]);
  
  if (existingAdmin.length === 0) {
    const passwordHash = "admin123_hashed";
    db.execute(`
      INSERT INTO employees (username, password_hash, full_name, employee_id)
      VALUES (?, ?, ?, ?)
    `, ["admin", passwordHash, "System Administrator", "EMP001"]);
    
    console.log("Default admin employee created");
  }
}

export { db };