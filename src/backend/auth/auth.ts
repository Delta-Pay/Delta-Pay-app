import { crypto } from "https://deno.land/std@0.200.0/crypto/mod.ts";
import { create, verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import { addSecurityLog, addUser, csrfTokens, getEmployeeByUsername, getUserByUsername, sessionTokens } from "../database/init.ts";

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
    const combined = new Uint8Array(atob(hash).split('').map(c => c.charCodeAt(0)));
    const salt = combined.slice(0, 16);
    const key = combined.slice(16);

    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const derivedKey = await crypto.subtle.deriveBits(
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

    const derivedKeyArray = new Uint8Array(derivedKey);
    return derivedKeyArray.every((byte, index) => byte === key[index]);
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
}

export async function registerUser(userData: any, ip: string): Promise<any> {
  try {
    const { fullName, idNumber, accountNumber, username, password } = userData;

    if (!fullName || !idNumber || !accountNumber || !username || !password) {
      return { success: false, message: "Missing required fields" };
    }

    const existingUser = getUserByUsername(username);
    if (existingUser) {
      return { success: false, message: "Username already exists" };
    }

    const passwordHash = await hashPassword(password);

    addUser({
      full_name: fullName,
      id_number: idNumber,
      account_number: accountNumber,
      username: username,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
      is_active: true,
      failed_login_attempts: 0
    });

    logSecurityEvent({
      action: 'USER_REGISTERED',
      ip_address: ip,
      details: JSON.stringify({ username, fullName }),
      severity: 'info',
      timestamp: new Date().toISOString()
    });

    return { success: true, message: "User registered successfully" };
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, message: "Registration failed" };
  }
}

export async function loginUser(username: string, password: string, ip: string): Promise<any> {
  try {
    const user = getUserByUsername(username);
    if (!user) {
      return { success: false, message: "Invalid credentials" };
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return { success: false, message: "Invalid credentials" };
    }

    const token = await create({ alg: "HS256", typ: "JWT" }, {
      userId: user.id,
      username: user.username,
      userType: "user"
    }, JWT_SECRET);

    sessionTokens.push({
      token,
      userId: user.id,
      userType: "user",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      is_revoked: false
    });

    logSecurityEvent({
      action: 'USER_LOGIN_SUCCESS',
      user_id: user.id,
      ip_address: ip,
      details: JSON.stringify({ username }),
      severity: 'info',
      timestamp: new Date().toISOString()
    });

    return { success: true, token, user: { id: user.id, username: user.username, fullName: user.full_name } };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, message: "Login failed" };
  }
}

export async function loginEmployee(username: string, password: string, ip: string): Promise<any> {
  try {
    const employee = getEmployeeByUsername(username);
    if (!employee) {
      return { success: false, message: "Invalid credentials" };
    }

    const isValidPassword = await verifyPassword(password, employee.password_hash);
    if (!isValidPassword) {
      return { success: false, message: "Invalid credentials" };
    }

    const token = await create({ alg: "HS256", typ: "JWT" }, {
      userId: employee.id,
      username: employee.username,
      userType: "employee"
    }, JWT_SECRET);

    sessionTokens.push({
      token,
      userId: employee.id,
      userType: "employee",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      is_revoked: false
    });

    logSecurityEvent({
      action: 'EMPLOYEE_LOGIN_SUCCESS',
      employee_id: employee.id,
      ip_address: ip,
      details: JSON.stringify({ username }),
      severity: 'info',
      timestamp: new Date().toISOString()
    });

    return { success: true, token, employee: { id: employee.id, username: employee.username, fullName: employee.full_name } };
  } catch (error) {
    console.error("Employee login error:", error);
    return { success: false, message: "Login failed" };
  }
}

export function generateCSRFToken(userId?: number, employeeId?: number): string {
  const token = crypto.randomUUID();
  csrfTokens.push({
    token,
    userId,
    employeeId,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  });
  return token;
}

export function logSecurityEvent(eventData: any): void {
  try {
    addSecurityLog({
      user_id: eventData.user_id || eventData.userId || null,
      employee_id: eventData.employee_id || eventData.employeeId || null,
      action: eventData.action,
      ip_address: eventData.ip_address || eventData.ipAddress,
      user_agent: eventData.user_agent || eventData.userAgent || null,
      details: eventData.details || null,
      severity: eventData.severity || 'info',
      timestamp: eventData.timestamp || new Date().toISOString()
    });
  } catch (error) {
    console.error("Security logging error:", error);
  }
}

export async function verifyToken(token: string): Promise<any> {
  try {
    const payload = await verify(token, JWT_SECRET, "HS256");

    const sessionToken = sessionTokens.find(t =>
      t.token === token &&
      !t.is_revoked &&
      new Date(t.expires_at) > new Date()
    );

    if (!sessionToken) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}

export async function authenticateUserPassword(username: string, password: string, ip: string): Promise<any> {
  try {
    // #COMPLETION_DRIVE: Assuming user exists and password validation is required for payment flow // #SUGGEST_VERIFY: Add rate limiting and account lockout for failed authentication attempts
    const user = getUserByUsername(username);
    if (!user || !user.is_active) {
      logSecurityEvent({
        action: 'PASSWORD_AUTH_FAILED',
        ip_address: ip,
        details: `Authentication failed for username: ${username}`,
        severity: 'warning',
        timestamp: new Date().toISOString()
      });
      return { success: false, message: "Invalid credentials" };
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      logSecurityEvent({
        action: 'PASSWORD_AUTH_FAILED',
        user_id: user.id,
        ip_address: ip,
        details: `Password authentication failed for user: ${username}`,
        severity: 'warning',
        timestamp: new Date().toISOString()
      });
      return { success: false, message: "Invalid credentials" };
    }

    logSecurityEvent({
      action: 'PASSWORD_AUTH_SUCCESS',
      user_id: user.id,
      ip_address: ip,
      details: `Password authentication successful for user: ${username}`,
      severity: 'info',
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        account_number: user.account_number,
        email: user.email,
        phone_number: user.phone_number,
        address_line_1: user.address_line_1,
        address_line_2: user.address_line_2,
        city: user.city,
        state_province: user.state_province,
        postal_code: user.postal_code,
        country: user.country,
        currency: user.currency,
        account_balance: user.account_balance,
        card_number: user.card_number,
        card_expiry: user.card_expiry,
        card_holder_name: user.card_holder_name
      }
    };
  } catch (error) {
    console.error("Password authentication error:", error);
    logSecurityEvent({
      action: 'PASSWORD_AUTH_ERROR',
      ip_address: ip,
      details: `Authentication error: ${error.message}`,
      severity: 'error',
      timestamp: new Date().toISOString()
    });
    return { success: false, message: "Authentication failed" };
  }
}