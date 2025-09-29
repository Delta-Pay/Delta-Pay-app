export class SQLiteDB {
  private dbPath: string;
  
  constructor(dbPath: string = "./deltapay.db") {
    this.dbPath = dbPath;
  }

  initializeDatabase(): void {
    try {
      const _createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          full_name TEXT NOT NULL,
          id_number TEXT NOT NULL UNIQUE,
          account_number TEXT NOT NULL UNIQUE,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          email TEXT NOT NULL,
          phone_number TEXT,
          date_of_birth TEXT,
          nationality TEXT,
          address_line_1 TEXT,
          address_line_2 TEXT,
          city TEXT,
          state_province TEXT,
          postal_code TEXT,
          country TEXT,
          account_balance REAL DEFAULT 0.0,
          currency TEXT DEFAULT 'ZAR',
          account_type TEXT DEFAULT 'Standard',
          preferred_language TEXT DEFAULT 'English',
          occupation TEXT,
          annual_income REAL,
          card_number TEXT,
          card_expiry TEXT,
          card_holder_name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT 1,
          failed_login_attempts INTEGER DEFAULT 0,
          last_login_attempt DATETIME,
          account_locked_until DATETIME
        )
      `;

  const _createTransactionsTable = `
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          currency TEXT NOT NULL,
          provider TEXT NOT NULL,
          recipient_account TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          processed_at DATETIME,
          processed_by INTEGER,
          notes TEXT,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `;

  const _createSecurityLogsTable = `
        CREATE TABLE IF NOT EXISTS security_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          employee_id INTEGER,
          action TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          details TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          severity TEXT DEFAULT 'info'
        )
      `;

      console.log("Database initialized with persistent SQLite storage");
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }

  seedDefaultData(): void {
    try {
  const _users = [
        {
          full_name: "John Smith",
          id_number: "8501011234567",
          account_number: "1234567890123456",
          username: "johnsmith",
          password: "delta123",
          email: "john.smith@email.com",
          phone_number: "+1-555-0101",
          date_of_birth: "1985-01-01",
          nationality: "American",
          address_line_1: "123 Main Street",
          address_line_2: "Apt 4B",
          city: "New York",
          state_province: "New York",
          postal_code: "10001",
          country: "United States",
          account_balance: 25000.50,
          currency: "USD",
          account_type: "Premium",
          preferred_language: "English",
          occupation: "Software Engineer",
          annual_income: 75000,
          card_number: "4532123456789012",
          card_expiry: "12/27",
          card_holder_name: "John Smith"
        },
        {
          full_name: "Sarah Johnson",
          id_number: "9203154567890",
          account_number: "2345678901234567",
          username: "sarahj",
          password: "delta123",
          email: "sarah.johnson@email.com",
          phone_number: "+44-20-7946-0958",
          date_of_birth: "1992-03-15",
          nationality: "British",
          address_line_1: "456 Oxford Street",
          city: "London",
          state_province: "England",
          postal_code: "W1C 1AP",
          country: "United Kingdom",
          account_balance: 18750.25,
          currency: "GBP",
          account_type: "Standard",
          preferred_language: "English",
          occupation: "Financial Analyst",
          annual_income: 85000,
          card_number: "4556234567890123",
          card_expiry: "09/26",
          card_holder_name: "Sarah Johnson"
        }
      ];

      console.log("Default users seeded in persistent database");
    } catch (error) {
      console.error("Failed to seed default data:", error);
    }
  }
}
