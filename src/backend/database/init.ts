import { hashPassword } from "../auth/auth.ts";

export interface User {
  id: number;
  "full_name": string;
  "id_number": string;
  "account_number": string;
  username: string;
  "password_hash": string;
  email: string;
  "phone_number": string;
  "date_of_birth": string;
  nationality: string;
  "address_line_1": string;
  "address_line_2"?: string;
  city: string;
  "state_province": string;
  "postal_code": string;
  country: string;
  "account_balance": number;
  currency: string;
  "account_type": string;
  "preferred_language": string;
  occupation: string;
  "annual_income": number;
  "card_number": string;
  "card_expiry": string;
  "card_holder_name": string;
  "created_at": string;
  "is_active": boolean;
  "failed_login_attempts": number;
  "last_login_attempt"?: string;
  "account_locked_until"?: string;
}

export interface Employee {
  id: number;
  username: string;
  "password_hash": string;
  "full_name": string;
  "employee_id": string;
  "created_at": string;
  "is_active": boolean;
  "failed_login_attempts": number;
  "last_login_attempt"?: string;
  "account_locked_until"?: string;
}

export interface Transaction {
  id: number;
  "user_id": number;
  amount: number;
  currency: string;
  provider: string;
  "recipient_account": string;
  status: string;
  "created_at": string;
  "processed_at"?: string;
  "processed_by"?: number;
  notes?: string;
}

export interface SecurityLog {
  id: number;
  "user_id"?: number;
  "employee_id"?: number;
  action: string;
  "ip_address": string;
  "user_agent"?: string;
  details?: string;
  timestamp: string;
  severity: string;
}

const users: User[] = [];
const employees: Employee[] = [];
const transactions: Transaction[] = [];
const securityLogs: SecurityLog[] = [];
type SessionToken = { token: string; userId: number; userType: "user" | "employee"; "expires_at": string; "is_revoked": boolean };
type CSRFToken = { token: string; "expires_at": string; "is_used"?: boolean; "user_id"?: number | null; "employee_id"?: number | null };
type RateLimit = { "ip_address": string; endpoint: string; "request_count": number; "first_request": string; "last_request": string };
const sessionTokens: SessionToken[] = [];
const csrfTokens: CSRFToken[] = [];
const rateLimits: RateLimit[] = [];

const counters = {
  userId: 1,
  employeeId: 1,
  transactionId: 1,
  logId: 1
};

export function getNextUserId(): number {
  return counters.userId++;
}

export function getNextEmployeeId(): number {
  return counters.employeeId++;
}

export function getNextTransactionId(): number {
  return counters.transactionId++;
}

export function getNextLogId(): number {
  return counters.logId++;
}

export function initializeDatabase() {
  console.log("In-memory database initialized successfully");
}

export async function seedDefaultEmployee() {
  try {
    const existingAdmin = employees.find(emp => emp.username === "admin");

    if (!existingAdmin) {
      const passwordHash = await hashPassword("admin123");
      employees.push({
        id: getNextEmployeeId(),
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
  } catch (error) {
    console.error("Error seeding default employee:", error);
  }
}

export async function seedExampleUsers() {
  try {
    if (users.length === 0) {
      const exampleUsers = [
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
          annual_income: 95000
        },
        {
          full_name: "Sarah Johnson",
          id_number: "9203022345678",
          account_number: "2345678901234567",
          username: "sarahj",
          password: "delta123",
          email: "sarah.johnson@email.com",
          phone_number: "+1-555-0202",
          date_of_birth: "1992-03-02",
          nationality: "Canadian",
          address_line_1: "456 Oak Avenue",
          city: "Toronto",
          state_province: "Ontario",
          postal_code: "M5V 3A8",
          country: "Canada",
          account_balance: 18750.25,
          currency: "CAD",
          account_type: "Standard",
          preferred_language: "English",
          occupation: "Marketing Manager",
          annual_income: 72000
        },
        {
          full_name: "Mike Wilson",
          id_number: "8804033456789",
          account_number: "3456789012345678",
          username: "mikew",
          password: "delta123",
          email: "mike.wilson@email.com",
          phone_number: "+44-20-7946-0958",
          date_of_birth: "1988-04-03",
          nationality: "British",
          address_line_1: "789 High Street",
          city: "London",
          state_province: "Greater London",
          postal_code: "SW1A 1AA",
          country: "United Kingdom",
          account_balance: 32100.75,
          currency: "GBP",
          account_type: "Business",
          preferred_language: "English",
          occupation: "Financial Analyst",
          annual_income: 85000
        },
        {
          full_name: "Emma Davis",
          id_number: "9505044567890",
          account_number: "4567890123456789",
          username: "emmad",
          password: "delta123",
          email: "emma.davis@email.com",
          phone_number: "+61-2-9876-5432",
          date_of_birth: "1995-05-04",
          nationality: "Australian",
          address_line_1: "321 Collins Street",
          address_line_2: "Suite 1200",
          city: "Melbourne",
          state_province: "Victoria",
          postal_code: "3000",
          country: "Australia",
          account_balance: 14500.00,
          currency: "AUD",
          account_type: "Standard",
          preferred_language: "English",
          occupation: "Graphic Designer",
          annual_income: 58000
        },
        {
          full_name: "David Brown",
          id_number: "9006055678901",
          account_number: "5678901234567890",
          username: "davidb",
          password: "delta123",
          email: "david.brown@email.com",
          phone_number: "+27-11-123-4567",
          date_of_birth: "1990-06-05",
          nationality: "South African",
          address_line_1: "654 Nelson Mandela Square",
          city: "Johannesburg",
          state_province: "Gauteng",
          postal_code: "2196",
          country: "South Africa",
          account_balance: 45300.80,
          currency: "ZAR",
          account_type: "Premium",
          preferred_language: "English",
          occupation: "Investment Consultant",
          annual_income: 120000
        }
      ];

      for (const user of exampleUsers) {
        const passwordHash = await hashPassword(user.password);

        users.push({
          id: getNextUserId(),
          full_name: user.full_name,
          id_number: user.id_number,
          account_number: user.account_number,
          username: user.username,
          password_hash: passwordHash,
          email: user.email,
          phone_number: user.phone_number,
          date_of_birth: user.date_of_birth,
          nationality: user.nationality,
          address_line_1: user.address_line_1,
          address_line_2: user.address_line_2,
          city: user.city,
          state_province: user.state_province,
          postal_code: user.postal_code,
          country: user.country,
          account_balance: user.account_balance,
          currency: user.currency,
          account_type: user.account_type,
          preferred_language: user.preferred_language,
          occupation: user.occupation,
          annual_income: user.annual_income,
          card_number: "4532123456789012",
          card_expiry: "12/27", 
          card_holder_name: user.full_name,
          created_at: new Date().toISOString(),
          is_active: true,
          failed_login_attempts: 0
        });
      }
    }
  } catch (error) {
    console.error("Error seeding example users:", error);
  }
}

export function getUsers(): User[] {
  return users.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getUserByUsername(username: string): User | null {
  return users.find(user => user.username === username) || null;
}

export function getUserById(id: number): User | null {
  return users.find(user => user.id === id) || null;
}

export function addUser(user: Omit<User, 'id'>): User {
  const newUser = { ...user, id: getNextUserId() };
  users.push(newUser);
  return newUser;
}

export function addEmployee(employee: Omit<Employee, 'id'>): Employee {
  const newEmployee = { ...employee, id: getNextEmployeeId() };
  employees.push(newEmployee);
  return newEmployee;
}

export function addTransaction(transaction: Omit<Transaction, 'id'>): Transaction {
  const newTransaction = { ...transaction, id: getNextTransactionId() };
  transactions.push(newTransaction);
  return newTransaction;
}

export function addSecurityLog(log: Omit<SecurityLog, 'id'>): SecurityLog {
  const newLog = { ...log, id: getNextLogId() };
  securityLogs.push(newLog);
  return newLog;
}

export function getEmployeeByUsername(username: string): Employee | null {
  return employees.find(emp => emp.username === username) || null;
}

export { csrfTokens, employees, rateLimits, securityLogs, sessionTokens, transactions, users };

