import { users, employees, securityLogs, sessionTokens, csrfTokens, rateLimits } from "../database/init.ts";
import { create, verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import { crypto } from "https://deno.land/std@0.200.0/crypto/mod.ts";
const JWT_SECRET = "your-super-secret-jwt-key-change-in-production";

const VALIDATION_PATTERNS = {
  fullName: /^[a-zA-Z\s]{2,50}$/,
  idNumber: /^[0-9]{13}$/,
  accountNumber: /^[0-9]{10,20}$/,
  username: /^[a-zA-Z0-9_]{3,20}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  swiftCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  accountNumberRecipient: /^[A-Z0-9]{8,30}$/
};

export function validateInput(data: Record<string, string>, patterns: Record<string, RegExp>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const [field, value] of Object.entries(data)) {
    if (patterns[field] && !patterns[field].test(value)) {
      errors.push(`Invalid ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    await crypto.subtle.importKey(
      "raw",
      data,
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    ),
    256
  );
  
  const keyArray = new Uint8Array(key);
  const combined = new Uint8Array(salt.length + keyArray.length);
  combined.set(salt);
  combined.set(keyArray, salt.length);
  
  return btoa(String.fromCharCode(...combined));
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const combined = new Uint8Array(atob(hash).split('').map(char => char.charCodeAt(0)));
    
    const salt = combined.slice(0, 16);
    const storedKey = combined.slice(16);
    
    const key = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      await crypto.subtle.importKey(
        "raw",
        data,
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
      ),
      256
    );
    
    const derivedKey = new Uint8Array(key);
    
    if (derivedKey.length !== storedKey.length) {
      return false;
    }
    
    for (let i = 0; i < derivedKey.length; i++) {
      if (derivedKey[i] !== storedKey[i]) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

export async function generateToken(userId: number, userType: 'user' | 'employee'): Promise<string> {
  const payload = {
    userId,
    userType,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
  };
  
  return await create({ alg: "HS512", typ: "JWT" }, payload, JWT_SECRET);
}

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

export async function registerUser(userData: {
  fullName: string;
  idNumber: string;
  accountNumber: string;
  username: string;
  password: string;
}, ipAddress: string): Promise<{ success: boolean; message: string; userId?: number }> {
  const validation = validateInput(userData, VALIDATION_PATTERNS);
  if (!validation.isValid) {
    return { success: false, message: `Validation errors: ${validation.errors.join(', ')}` };
  }

  try {
    const existingUser = users.find(user => 
      user.username === userData.username || 
      user.id_number === userData.idNumber || 
      user.account_number === userData.accountNumber
    );

    if (existingUser) {
      return { success: false, message: "User with this username, ID number, or account number already exists" };
    }

    const passwordHash = await hashPassword(userData.password);

    const newUser = {
      id: users.length + 1,
      full_name: userData.fullName,
      id_number: userData.idNumber,
      account_number: userData.accountNumber,
      username: userData.username,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
      is_active: true,
      failed_login_attempts: 0
    };

    users.push(newUser);
    const userId = newUser.id;

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

export async function loginUser(username: string, password: string, ipAddress: string): Promise<{ success: boolean; message: string; token?: string; user?: any }> {
  try {
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

    const isPasswordValid = await verifyPassword(password, userData[2]);

    if (!isPasswordValid) {
      const failedAttempts = userData[4] + 1;
      db.execute(
        "UPDATE users SET failed_login_attempts = ?, last_login_attempt = ? WHERE id = ?",
        [failedAttempts, now.toISOString(), userData[0]]
      );

      if (failedAttempts >= 5) {
        const lockUntil = new Date(now.getTime() + 30 * 60 * 1000);
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

    db.execute(
      "UPDATE users SET failed_login_attempts = 0, last_login_attempt = ?, account_locked_until = NULL WHERE id = ?",
      [now.toISOString(), userData[0]]
    );

    const token = await generateToken(userData[0], 'user');

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

export async function loginEmployee(username: string, password: string, ipAddress: string): Promise<{ success: boolean; message: string; token?: string; employee?: any }> {
  try {
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

    const isPasswordValid = await verifyPassword(password, employeeData[2]);

    if (!isPasswordValid) {
      const failedAttempts = employeeData[4] + 1;
      db.execute(
        "UPDATE employees SET failed_login_attempts = ?, last_login_attempt = ? WHERE id = ?",
        [failedAttempts, now.toISOString(), employeeData[0]]
      );

      if (failedAttempts >= 5) {
        const lockUntil = new Date(now.getTime() + 30 * 60 * 1000);
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

    db.execute(
      "UPDATE employees SET failed_login_attempts = 0, last_login_attempt = ?, account_locked_until = NULL WHERE id = ?",
      [now.toISOString(), employeeData[0]]
    );

    const token = await generateToken(employeeData[0], 'employee');

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

export function generateCSRFToken(userId?: number, employeeId?: number): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2);
  const payload = userId ? `user_${userId}_${timestamp}_${random}` : `employee_${employeeId}_${timestamp}_${random}`;
  
  db.execute(`
    INSERT INTO csrf_tokens (token, user_id, employee_id, expires_at)
    VALUES (?, ?, ?, ?)
  `, [payload, userId || null, employeeId || null, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()]);
  
  return payload;
}

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