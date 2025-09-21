import { users, employees, securityLogs, sessionTokens, csrfTokens, rateLimits, getNextUserId, getNextEmployeeId, getNextLogId } from "../database/init.ts";
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
      id: getNextUserId(),
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
    const userRecord = users.find(u => u.username === username && u.is_active);

    if (!userRecord) {
      logSecurityEvent({
        action: "LOGIN_FAILED_USER_NOT_FOUND",
        ipAddress,
        details: `Login attempt with non-existent username: ${username}`,
        severity: "warning"
      });
      return { success: false, message: "Invalid credentials" };
    }

    const userData = userRecord;
    const now = new Date();

    if (userData.account_locked_until && new Date(userData.account_locked_until) > now) {
      logSecurityEvent({
        userId: userData.id,
        action: "LOGIN_FAILED_ACCOUNT_LOCKED",
        ipAddress,
        details: "Login attempt on locked account",
        severity: "warning"
      });
      return { success: false, message: "Account is temporarily locked. Please try again later." };
    }

    const isPasswordValid = await verifyPassword(password, userData.password_hash);

    if (!isPasswordValid) {
      const failedAttempts = userData.failed_login_attempts + 1;
      userData.failed_login_attempts = failedAttempts;
      userData.last_login_attempt = now.toISOString();

      if (failedAttempts >= 5) {
        const lockUntil = new Date(now.getTime() + 30 * 60 * 1000);
        userData.account_locked_until = lockUntil.toISOString();

        logSecurityEvent({
          userId: userData.id,
          action: "ACCOUNT_LOCKED",
          ipAddress,
          details: `Account locked after ${failedAttempts} failed attempts`,
          severity: "warning"
        });
      }

      logSecurityEvent({
        userId: userData.id,
        action: "LOGIN_FAILED_INVALID_PASSWORD",
        ipAddress,
        details: "Invalid password provided",
        severity: "warning"
      });

      return { success: false, message: "Invalid credentials" };
    }

    userData.failed_login_attempts = 0;
    userData.last_login_attempt = now.toISOString();
    userData.account_locked_until = undefined;

    const token = await generateToken(userData.id, 'user');

    logSecurityEvent({
      userId: userData.id,
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
        id: userData.id,
        username: userData.username,
        fullName: userData.full_name,
        accountNumber: userData.account_number
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
    const employeeRecord = employees.find(e => e.username === username && e.is_active);

    if (!employeeRecord) {
      logSecurityEvent({
        action: "EMPLOYEE_LOGIN_FAILED_USER_NOT_FOUND",
        ipAddress,
        details: `Employee login attempt with non-existent username: ${username}`,
        severity: "warning"
      });
      return { success: false, message: "Invalid credentials" };
    }

    const employeeData = employeeRecord;
    const now = new Date();

    if (employeeData.account_locked_until && new Date(employeeData.account_locked_until) > now) {
      logSecurityEvent({
        employeeId: employeeData.id,
        action: "EMPLOYEE_LOGIN_FAILED_ACCOUNT_LOCKED",
        ipAddress,
        details: "Employee login attempt on locked account",
        severity: "warning"
      });
      return { success: false, message: "Account is temporarily locked. Please try again later." };
    }

    const isPasswordValid = await verifyPassword(password, employeeData.password_hash);

    if (!isPasswordValid) {
      const failedAttempts = employeeData.failed_login_attempts + 1;
      employeeData.failed_login_attempts = failedAttempts;
      employeeData.last_login_attempt = now.toISOString();

      if (failedAttempts >= 5) {
        const lockUntil = new Date(now.getTime() + 30 * 60 * 1000);
        employeeData.account_locked_until = lockUntil.toISOString();

        logSecurityEvent({
          employeeId: employeeData.id,
          action: "EMPLOYEE_ACCOUNT_LOCKED",
          ipAddress,
          details: `Employee account locked after ${failedAttempts} failed attempts`,
          severity: "warning"
        });
      }

      logSecurityEvent({
        employeeId: employeeData.id,
        action: "EMPLOYEE_LOGIN_FAILED_INVALID_PASSWORD",
        ipAddress,
        details: "Invalid password provided for employee",
        severity: "warning"
      });

      return { success: false, message: "Invalid credentials" };
    }

    employeeData.failed_login_attempts = 0;
    employeeData.last_login_attempt = now.toISOString();
    employeeData.account_locked_until = undefined;

    const token = await generateToken(employeeData.id, 'employee');

    logSecurityEvent({
      employeeId: employeeData.id,
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
        id: employeeData.id,
        username: employeeData.username,
        fullName: employeeData.full_name,
        employeeId: employeeData.employee_id
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

  csrfTokens.push({
    token: payload,
    user_id: userId || null,
    employee_id: employeeId || null,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    is_used: false
  });

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
  securityLogs.push({
    id: getNextLogId(),
    user_id: event.userId || undefined,
    employee_id: event.employeeId || undefined,
    action: event.action,
    ip_address: event.ipAddress,
    details: event.details || undefined,
    severity: event.severity || 'info',
    user_agent: event.userAgent || undefined,
    timestamp: new Date().toISOString()
  });
}