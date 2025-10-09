// "Customers need to log on to the website by providing their username, account number and password." --> "Authentication services validate credentials, issue tokens, and log suspicious behaviour without leaking sensitive identifiers."

import { crypto } from "https://deno.land/std@0.200.0/crypto/mod.ts";
import { create, verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import { addSecurityLog, addUser, csrfTokens, getEmployeeByUsername, getUserByUsername, sessionTokens, type User } from "../database/init.ts";

const JWT_SECRET = "your-super-secret-jwt-key-change-in-production";

async function getJwtKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

const VALIDATION_PATTERNS = {
  fullName: /^[a-zA-Z\s]{2,50}$/,
  idNumber: /^[0-9]{13}$/,
  accountNumber: /^[0-9]{10,20}$/,
  username: /^[a-zA-Z0-9_]{3,20}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
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

interface RegisterUserInput {
  fullName: string;
  idNumber: string;
  accountNumber: string;
  username: string;
  password: string;
}

interface LoginResult {
  success: boolean;
  message?: string;
  token?: string;
  csrfToken?: string;
  user?: Pick<User, "id" | "username" | "full_name" | "account_number" | "email" | "phone_number" | "address_line_1" | "address_line_2" | "city" | "state_province" | "postal_code" | "country" | "currency" | "account_balance" | "card_number" | "card_expiry" | "card_holder_name">;
  employee?: { id: number; username: string; fullName: string };
}

export async function registerUser(userData: RegisterUserInput, ip: string): Promise<LoginResult> {
  try {
    const { fullName, idNumber, accountNumber, username, password } = userData;

    if (!fullName || !idNumber || !accountNumber || !username || !password) {
      return { success: false, message: "Missing required fields" };
    }

    const validation = validateInput(
      { fullName, idNumber, accountNumber, username, password },
      VALIDATION_PATTERNS,
    );
    if (!validation.isValid) {
      return { success: false, message: `Validation failed: ${validation.errors.join(", ")}` };
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
      email: `${username}@example.com`,
      phone_number: "+0000000000",
      date_of_birth: "1990-01-01",
      nationality: "Unknown",
      address_line_1: "Unknown Street 1",
      address_line_2: undefined,
      city: "Unknown City",
      state_province: "Unknown State",
      postal_code: "0000",
      country: "Unknown",
      account_balance: 0,
      currency: "ZAR",
      account_type: "Standard",
      preferred_language: "English",
      occupation: "Unspecified",
      annual_income: 0,
      card_number: "4532123412341234",
      card_expiry: "12/29",
      card_holder_name: fullName,
      created_at: new Date().toISOString(),
      is_active: true,
      failed_login_attempts: 0,
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

async function issueJwtForUser(user: User, userType: "user" | "employee"): Promise<string> {
  const key = await getJwtKey();
  return await create({ alg: "HS256", typ: "JWT" }, {
    userId: user.id,
    username: user.username,
    userType,
  }, key);
}

export async function loginUser(username: string, password: string, ip: string): Promise<LoginResult> {
  try {
    const user = getUserByUsername(username);
    if (!user) {
      const timestamp = new Date().toISOString();
      logSecurityEvent({
        action: 'USER_LOGIN_FAILED_UNKNOWN_USERNAME',
        ip_address: ip,
        details: `Login attempt for unknown username: ${maskIdentifier(username)}`,
        severity: 'warning',
        timestamp,
      });
      return { success: false, message: "Invalid credentials" };
    }

    const now = Date.now();
    if (user.account_locked_until && new Date(user.account_locked_until).getTime() > now) {
      logSecurityEvent({
        action: 'USER_LOGIN_BLOCKED',
        user_id: user.id,
        ip_address: ip,
        details: `Blocked login during lock window for user: ${username}`,
        severity: 'warning',
        timestamp: new Date().toISOString()
      });
      return { success: false, message: "Account temporarily locked. Please try again later." };
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      const next = (user.failed_login_attempts || 0) + 1;
      user.failed_login_attempts = next;
      user.last_login_attempt = new Date().toISOString();
      logSecurityEvent({
        action: 'USER_LOGIN_FAILED_INVALID_PASSWORD',
        user_id: user.id,
        ip_address: ip,
        details: `Invalid password for username: ${username}`,
        severity: 'warning',
        timestamp: new Date().toISOString()
      });
      if (next >= 5) {
        user.account_locked_until = new Date(now + 2 * 60 * 1000).toISOString();
        user.failed_login_attempts = 0;
        logSecurityEvent({
          action: 'USER_ACCOUNT_TEMP_LOCKED',
          user_id: user.id,
          ip_address: ip,
          details: 'Too many failed login attempts',
          severity: 'warning',
          timestamp: new Date().toISOString()
        });
      }
      return { success: false, message: "Invalid credentials" };
    }

    user.failed_login_attempts = 0;
    user.account_locked_until = undefined;

  const token = await issueJwtForUser(user, "user");

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

    return { success: true, token, user: { id: user.id, username: user.username, full_name: user.full_name, account_number: user.account_number, email: user.email, phone_number: user.phone_number, address_line_1: user.address_line_1, address_line_2: user.address_line_2, city: user.city, state_province: user.state_province, postal_code: user.postal_code, country: user.country, currency: user.currency, account_balance: user.account_balance, card_number: user.card_number, card_expiry: user.card_expiry, card_holder_name: user.card_holder_name } };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, message: "Login failed" };
  }
}

function maskIdentifier(identifier: string): string {
  if (!identifier) return "(empty)";
  const trimmed = identifier.trim();
  if (trimmed.length <= 2) return "**";
  const start = trimmed.slice(0, 2);
  const end = trimmed.slice(-1);
  return `${start}***${end}`;
}

export async function loginEmployee(username: string, password: string, ip: string): Promise<LoginResult> {
  try {
    const employee = getEmployeeByUsername(username);
    if (!employee) {
      logSecurityEvent({
        action: 'EMPLOYEE_LOGIN_FAILED_UNKNOWN_USERNAME',
        ip_address: ip,
        details: `Employee login attempt for non-existent username: ${username}`,
        severity: 'warning',
        timestamp: new Date().toISOString()
      });
      return { success: false, message: "Invalid credentials" };
    }

    const now = Date.now();
    if (employee.account_locked_until && new Date(employee.account_locked_until).getTime() > now) {
      logSecurityEvent({
        action: 'EMPLOYEE_LOGIN_BLOCKED',
        employee_id: employee.id,
        ip_address: ip,
        details: `Blocked employee login during lock window for user: ${username}`,
        severity: 'warning',
        timestamp: new Date().toISOString()
      });
      return { success: false, message: "Account temporarily locked. Please try again later." };
    }

    const isValidPassword = await verifyPassword(password, employee.password_hash);
    if (!isValidPassword) {
      const next = (employee.failed_login_attempts || 0) + 1;
      employee.failed_login_attempts = next;
      employee.last_login_attempt = new Date().toISOString();
      logSecurityEvent({
        action: 'EMPLOYEE_LOGIN_FAILED_INVALID_PASSWORD',
        employee_id: employee.id,
        ip_address: ip,
        details: `Invalid password for employee username: ${username}`,
        severity: 'warning',
        timestamp: new Date().toISOString()
      });
      if (next >= 5) {
        employee.account_locked_until = new Date(now + 2 * 60 * 1000).toISOString();
        employee.failed_login_attempts = 0;
        logSecurityEvent({
          action: 'EMPLOYEE_ACCOUNT_TEMP_LOCKED',
          employee_id: employee.id,
          ip_address: ip,
          details: 'Too many failed employee login attempts',
          severity: 'warning',
          timestamp: new Date().toISOString()
        });
      }
      return { success: false, message: "Invalid credentials" };
    }

    employee.failed_login_attempts = 0;
    employee.account_locked_until = undefined;

  const token = await issueJwtForUser(employee as unknown as User, "employee");

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
  user_id: userId,
  employee_id: employeeId,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  });
  return token;
}

type SecurityEventInput = {
  "user_id"?: number;
  "employee_id"?: number;
  action: string;
  "ip_address"?: string;
  "user_agent"?: string;
  details?: string;
  severity?: string;
  timestamp?: string;
  userId?: number;
  employeeId?: number;
  ipAddress?: string;
  userAgent?: string;
};

export function logSecurityEvent(eventData: SecurityEventInput): void {
  try {
    const safeAction = String(eventData.action || 'UNKNOWN').slice(0, 64);
    const safeSeverity = (eventData.severity || 'info').toLowerCase();
    const normalizedSeverity = safeSeverity === 'warning' ? 'warning' : safeSeverity === 'error' ? 'error' : 'info';
    const rawDetails = eventData.details ?? undefined;
    const safeDetails = typeof rawDetails === 'string' ? rawDetails.slice(0, 2000) : (rawDetails ? JSON.stringify(rawDetails).slice(0, 2000) : undefined);

    addSecurityLog({
      user_id: eventData["user_id"] ?? eventData.userId ?? undefined,
      employee_id: eventData["employee_id"] ?? eventData.employeeId ?? undefined,
      action: safeAction,
      ip_address: eventData["ip_address"] ?? eventData.ipAddress ?? "unknown",
      user_agent: eventData["user_agent"] ?? eventData.userAgent ?? undefined,
      details: safeDetails,
      severity: normalizedSeverity,
      timestamp: eventData.timestamp || new Date().toISOString()
    });
  } catch (error) {
    console.error("Security logging error:", error);
  }
}

export async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
  const key = await getJwtKey();
  const payload = await verify(token, key);

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

export async function authenticateUserPassword(username: string, password: string, ip: string): Promise<LoginResult> {
  try {
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

    const now = Date.now();
    if (user.account_locked_until && new Date(user.account_locked_until).getTime() > now) {
      return { success: false, message: "Account temporarily locked. Please try again later." };
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
      const next = (user.failed_login_attempts || 0) + 1;
      user.failed_login_attempts = next;
      user.last_login_attempt = new Date().toISOString();
      if (next >= 5) {
        user.account_locked_until = new Date(now + 2 * 60 * 1000).toISOString();
        user.failed_login_attempts = 0;
      }
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

    const token = await issueJwtForUser(user, "user");
    sessionTokens.push({
      token,
      userId: user.id,
      userType: "user",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      is_revoked: false,
    });
  const csrfToken = generateCSRFToken(user.id, undefined);

    return {
      success: true,
      token,
      csrfToken,
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
        card_holder_name: user.card_holder_name,
      },
    };
  } catch (error) {
    console.error("Password authentication error:", error);
    logSecurityEvent({
      action: 'PASSWORD_AUTH_ERROR',
      ip_address: ip,
      details: `Authentication error: ${error instanceof Error ? error.message : String(error)}`,
      severity: 'error',
      timestamp: new Date().toISOString()
    });
    return { success: false, message: "Authentication failed" };
  }
}
