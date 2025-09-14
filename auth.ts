import { db } from "./database.ts";
import { create, verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import { Argon2 } from "https://deno.land/x/argon2@v0.31.0/mod.ts";

const argon2 = new Argon2();

// JWT Secret Key (in production, use environment variable)
const JWT_SECRET = "your-super-secret-jwt-key-change-in-production";

// Input validation regex patterns
const VALIDATION_PATTERNS = {
  fullName: /^[a-zA-Z\s]{2,50}$/,
  idNumber: /^[0-9]{13}$/,
  accountNumber: /^[0-9]{10,20}$/,
  username: /^[a-zA-Z0-9_]{3,20}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  swiftCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  accountNumberRecipient: /^[A-Z0-9]{8,30}$/
};

// Validate input against regex patterns
export function validateInput(data: Record<string, string>, patterns: Record<string, RegExp>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const [field, value] of Object.entries(data)) {
    if (patterns[field] && !patterns[field].test(value)) {
      errors.push(`Invalid ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

// Hash password using Argon2
export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password);
}

// Verify password using Argon2
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await argon2.verify(hash, password);
}

// Generate JWT token
export async function generateToken(userId: number, userType: 'user' | 'employee'): Promise<string> {
  const payload = {
    userId,
    userType,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };
  
  return await create({ alg: "HS512", typ: "JWT" }, payload, JWT_SECRET);
}

// Verify JWT token
export async function verifyToken(token: string): Promise<{ userId: number; userType: 'user' | 'employee' } | null> {
  try {
    const payload = await verify(token, JWT_SECRET, "HS512");
    return {
      userId: payload.userId,
      userType: payload.userType
    };
  } catch (error) {
    return null;
  }
}

// User registration
export async function registerUser(userData: {
  fullName: string;
  idNumber: string;
  accountNumber: string;
  username: string;
  password: string;
}, ipAddress: string): Promise<{ success: boolean; message: string; userId?: number }> {
  // Validate input
  const validation = validateInput(userData, VALIDATION_PATTERNS);
  if (!validation.isValid) {
    return { success: false, message: `Validation errors: ${validation.errors.join(', ')}` };
  }

  try {
    // Check if user already exists
    const existingUser = db.query(
      "SELECT id FROM users WHERE username = ? OR id_number = ? OR account_number = ?",
      [userData.username, userData.idNumber, userData.accountNumber]
    );

    if (existingUser.length > 0) {
      return { success: false, message: "User with this username, ID number, or account number already exists" };
    }

    // Hash password
    const passwordHash = await hashPassword(userData.password);

    // Insert user
    db.execute(`
      INSERT INTO users (full_name, id_number, account_number, username, password_hash)
      VALUES (?, ?, ?, ?, ?)
    `, [userData.fullName, userData.idNumber, userData.accountNumber, userData.username, passwordHash]);

    const userId = db.lastInsertRowId;

    // Log security event
    logSecurityEvent({
      userId,
      action: "USER_REGISTRATION",
      ipAddress,
      details: `New user registered: ${userData.username}`,
      severity: "info"
    });

    return { success: true, message: "User registered successfully", userId };
  } catch (error) {
    logSecurityEvent({
      action: "USER_REGISTRATION_FAILED",
      ipAddress,
      details: `Registration failed: ${error.message}`,
      severity: "error"
    });
    return { success: false, message: "Registration failed due to server error" };
  }
}

// User login
export async function loginUser(username: string, password: string, ipAddress: string): Promise<{ success: boolean; message: string; token?: string; user?: any }> {
  try {
    // Get user
    const user = db.query(
      "SELECT id, username, password_hash, full_name, account_number, failed_login_attempts, account_locked_until FROM users WHERE username = ? AND is_active = 1",
      [username]
    );

    if (user.length === 0) {
      logSecurityEvent({
        action: "LOGIN_FAILED_USER_NOT_FOUND",
        ipAddress,
        details: `Login attempt with non-existent username: ${username}`,
        severity: "warning"
      });
      return { success: false, message: "Invalid credentials" };
    }

    const userData = user[0];
    const now = new Date();

    // Check if account is locked
    if (userData[5] && new Date(userData[5]) > now) {
      logSecurityEvent({
        userId: userData[0],
        action: "LOGIN_FAILED_ACCOUNT_LOCKED",
        ipAddress,
        details: "Login attempt on locked account",
        severity: "warning"
      });
      return { success: false, message: "Account is temporarily locked. Please try again later." };
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, userData[2]);

    if (!isPasswordValid) {
      // Increment failed login attempts
      const failedAttempts = userData[4] + 1;
      db.execute(
        "UPDATE users SET failed_login_attempts = ?, last_login_attempt = ? WHERE id = ?",
        [failedAttempts, now.toISOString(), userData[0]]
      );

      // Lock account after 5 failed attempts
      if (failedAttempts >= 5) {
        const lockUntil = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
        db.execute(
          "UPDATE users SET account_locked_until = ? WHERE id = ?",
          [lockUntil.toISOString(), userData[0]]
        );

        logSecurityEvent({
          userId: userData[0],
          action: "ACCOUNT_LOCKED",
          ipAddress,
          details: `Account locked after ${failedAttempts} failed attempts`,
          severity: "warning"
        });
      }

      logSecurityEvent({
        userId: userData[0],
        action: "LOGIN_FAILED_INVALID_PASSWORD",
        ipAddress,
        details: "Invalid password provided",
        severity: "warning"
      });

      return { success: false, message: "Invalid credentials" };
    }

    // Reset failed login attempts
    db.execute(
      "UPDATE users SET failed_login_attempts = 0, last_login_attempt = ?, account_locked_until = NULL WHERE id = ?",
      [now.toISOString(), userData[0]]
    );

    // Generate JWT token
    const token = await generateToken(userData[0], 'user');

    // Log successful login
    logSecurityEvent({
      userId: userData[0],
      action: "LOGIN_SUCCESS",
      ipAddress,
      details: "User logged in successfully",
      severity: "info"
    });

    return {
      success: true,
      message: "Login successful",
      token,
      user: {
        id: userData[0],
        username: userData[1],
        fullName: userData[3],
        accountNumber: userData[4]
      }
    };
  } catch (error) {
    logSecurityEvent({
      action: "LOGIN_ERROR",
      ipAddress,
      details: `Login error: ${error.message}`,
      severity: "error"
    });
    return { success: false, message: "Login failed due to server error" };
  }
}

// Employee login
export async function loginEmployee(username: string, password: string, ipAddress: string): Promise<{ success: boolean; message: string; token?: string; employee?: any }> {
  try {
    // Get employee
    const employee = db.query(
      "SELECT id, username, password_hash, full_name, employee_id, failed_login_attempts, account_locked_until FROM employees WHERE username = ? AND is_active = 1",
      [username]
    );

    if (employee.length === 0) {
      logSecurityEvent({
        action: "EMPLOYEE_LOGIN_FAILED_USER_NOT_FOUND",
        ipAddress,
        details: `Employee login attempt with non-existent username: ${username}`,
        severity: "warning"
      });
      return { success: false, message: "Invalid credentials" };
    }

    const employeeData = employee[0];
    const now = new Date();

    // Check if account is locked
    if (employeeData[5] && new Date(employeeData[5]) > now) {
      logSecurityEvent({
        employeeId: employeeData[0],
        action: "EMPLOYEE_LOGIN_FAILED_ACCOUNT_LOCKED",
        ipAddress,
        details: "Employee login attempt on locked account",
        severity: "warning"
      });
      return { success: false, message: "Account is temporarily locked. Please try again later." };
    }

    // For demo purposes, using simple password check. In production, use Argon2
    const isPasswordValid = password === "admin123"; // Simple check for demo

    if (!isPasswordValid) {
      // Increment failed login attempts
      const failedAttempts = employeeData[4] + 1;
      db.execute(
        "UPDATE employees SET failed_login_attempts = ?, last_login_attempt = ? WHERE id = ?",
        [failedAttempts, now.toISOString(), employeeData[0]]
      );

      // Lock account after 5 failed attempts
      if (failedAttempts >= 5) {
        const lockUntil = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
        db.execute(
          "UPDATE employees SET account_locked_until = ? WHERE id = ?",
          [lockUntil.toISOString(), employeeData[0]]
        );

        logSecurityEvent({
          employeeId: employeeData[0],
          action: "EMPLOYEE_ACCOUNT_LOCKED",
          ipAddress,
          details: `Employee account locked after ${failedAttempts} failed attempts`,
          severity: "warning"
        });
      }

      logSecurityEvent({
        employeeId: employeeData[0],
        action: "EMPLOYEE_LOGIN_FAILED_INVALID_PASSWORD",
        ipAddress,
        details: "Invalid password provided for employee",
        severity: "warning"
      });

      return { success: false, message: "Invalid credentials" };
    }

    // Reset failed login attempts
    db.execute(
      "UPDATE employees SET failed_login_attempts = 0, last_login_attempt = ?, account_locked_until = NULL WHERE id = ?",
      [now.toISOString(), employeeData[0]]
    );

    // Generate JWT token
    const token = await generateToken(employeeData[0], 'employee');

    // Log successful login
    logSecurityEvent({
      employeeId: employeeData[0],
      action: "EMPLOYEE_LOGIN_SUCCESS",
      ipAddress,
      details: "Employee logged in successfully",
      severity: "info"
    });

    return {
      success: true,
      message: "Login successful",
      token,
      employee: {
        id: employeeData[0],
        username: employeeData[1],
        fullName: employeeData[3],
        employeeId: employeeData[4]
      }
    };
  } catch (error) {
    logSecurityEvent({
      action: "EMPLOYEE_LOGIN_ERROR",
      ipAddress,
      details: `Employee login error: ${error.message}`,
      severity: "error"
    });
    return { success: false, message: "Login failed due to server error" };
  }
}

// Log security event
export function logSecurityEvent(event: {
  userId?: number;
  employeeId?: number;
  action: string;
  ipAddress: string;
  details?: string;
  severity?: string;
  userAgent?: string;
}) {
  db.execute(`
    INSERT INTO security_logs (user_id, employee_id, action, ip_address, details, severity, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    event.userId || null,
    event.employeeId || null,
    event.action,
    event.ipAddress,
    event.details || null,
    event.severity || 'info',
    event.userAgent || null
  ]);
}