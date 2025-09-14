import { hashPassword } from "../auth/auth.ts";

interface User {
  id: number;
  full_name: string;
  id_number: string;
  account_number: string;
  username: string;
  password_hash: string;
  created_at: string;
  is_active: boolean;
  failed_login_attempts: number;
  last_login_attempt?: string;
  account_locked_until?: string;
}

interface Employee {
  id: number;
  username: string;
  password_hash: string;
  full_name: string;
  employee_id: string;
  created_at: string;
  is_active: boolean;
  failed_login_attempts: number;
  last_login_attempt?: string;
  account_locked_until?: string;
}

interface Transaction {
  id: number;
  user_id: number;
  amount: number;
  currency: string;
  provider: string;
  recipient_account: string;
  recipient_swift_code: string;
  status: string;
  created_at: string;
  processed_at?: string;
  processed_by?: number;
  notes?: string;
}

interface SecurityLog {
  id: number;
  user_id?: number;
  employee_id?: number;
  action: string;
  ip_address: string;
  user_agent?: string;
  details?: string;
  timestamp: string;
  severity: string;
}

let users: User[] = [];
let employees: Employee[] = [];
let transactions: Transaction[] = [];
let securityLogs: SecurityLog[] = [];
let sessionTokens: any[] = [];
let csrfTokens: any[] = [];
let rateLimits: any[] = [];
let userIdCounter = 1;
let employeeIdCounter = 1;
let transactionIdCounter = 1;
let logIdCounter = 1;

export function initializeDatabase() {
  console.log("Database initialized successfully (in-memory)");
}

export async function seedDefaultEmployee() {
  const existingAdmin = employees.find(emp => emp.username === "admin");
  
  if (!existingAdmin) {
    const passwordHash = await hashPassword("admin123");
    employees.push({
      id: employeeIdCounter++,
      username: "admin",
      password_hash: passwordHash,
      full_name: "System Administrator",
      employee_id: "EMP001",
      created_at: new Date().toISOString(),
      is_active: true,
      failed_login_attempts: 0
    });
    
    console.log("Default admin employee created");
  }
}

export { users, employees, transactions, securityLogs, sessionTokens, csrfTokens, rateLimits, userIdCounter, employeeIdCounter, transactionIdCounter, logIdCounter };