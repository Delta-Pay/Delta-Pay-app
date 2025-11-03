// "Backend view - Have a log of users who have been kicked off the site or have attempted to exploit the page through the security measures we have discussed." --> "Admin services serve structured log, user, and employee data with full IP/account tracking."

import { logSecurityEvent } from "../auth/auth.ts";
import { employees, securityLogs, transactions, users } from "../database/init.ts";

type IntBounds = { min?: number; max?: number; defaultValue?: number };

function toSafeInt(value: unknown, { min = 0, max = Number.MAX_SAFE_INTEGER, defaultValue = min }: IntBounds = {}): number {
  const numeric = typeof value === "string" ? Number.parseInt(value, 10) : typeof value === "number" ? value : defaultValue;
  if (!Number.isFinite(numeric)) return defaultValue;
  const downcast = Math.floor(numeric);
  if (downcast < min) return min;
  if (downcast > max) return max;
  return downcast;
}

function assertArrayShape<T extends Record<string, unknown>>(value: unknown, label: string): asserts value is T[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} store is unavailable`);
  }
}

function ensureDataStoresReady(): void {
  assertArrayShape(users, "Users");
  assertArrayShape(employees, "Employees");
  assertArrayShape(transactions, "Transactions");
  assertArrayShape(securityLogs, "Security logs");
}

const allowedSeverities: ReadonlySet<string> = new Set(["info", "warning", "error"]);

function normalizeSeverity(input?: string): "info" | "warning" | "error" {
  const normalized = (input || "info").toLowerCase();
  return allowedSeverities.has(normalized) ? (normalized as "info" | "warning" | "error") : "info";
}

type SecurityLogView = {
  id: number;
  action: string;
  ipAddress: string;
  userAgent?: string;
  details?: string;
  severity: string;
  timestamp: string;
  userUsername: string | null;
  userFullName: string | null;
  employeeUsername: string | null;
  employeeFullName: string | null;
};

type UserView = {
  id: number;
  username: string;
  fullName: string;
  idNumber: string;
  accountNumber: string;
  createdAt: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lastLoginAttempt: string | null;
  accountLockedUntil: string | null;
};

type EmployeeView = {
  id: number;
  username: string;
  fullName: string;
  employeeId: string;
  createdAt: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lastLoginAttempt: string | null;
  accountLockedUntil: string | null;
};

type SystemStats = {
  users: { active: number; inactive: number; total: number };
  employees: { active: number; inactive: number; total: number };
  transactions: { pending: number; approved: number; denied: number; total: number };
  security: { events24h: number; warnings24h: number; errors24h: number };
};

type FailedLoginReportEntry = { ipAddress: string; attemptCount: number; lastAttempt: string; usernames: string[] };

export async function getSecurityLogs(limit: number = 100, offset: number = 0, severity?: string): Promise<{ success: boolean; message: string; logs?: SecurityLogView[] }> {
  try {
    await Promise.resolve();
    ensureDataStoresReady();
    const lim = toSafeInt(limit, { min: 1, max: 500, defaultValue: 100 });
    const off = toSafeInt(offset, { min: 0, max: 1_000_000, defaultValue: 0 });

    let logs = securityLogs.slice();
    if (severity) {
      const sev = normalizeSeverity(severity);
      logs = logs.filter(l => (l.severity || 'info').toLowerCase() === sev);
    }

    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const page = logs.slice(off, off + lim);

    const formattedLogs: SecurityLogView[] = page.map(l => {
      const u = typeof l.user_id === 'number' ? users.find(x => x.id === l.user_id) : undefined;
      const e = typeof l.employee_id === 'number' ? employees.find(x => x.id === l.employee_id) : undefined;
      return {
        id: l.id,
        action: l.action,
        ipAddress: l.ip_address,
        userAgent: l.user_agent || undefined,
        details: l.details || undefined,
        severity: l.severity,
        timestamp: l.timestamp,
        userUsername: u?.username || null,
        userFullName: u?.full_name || null,
        employeeUsername: e?.username || null,
        employeeFullName: e?.full_name || null,
      };
    });

    return { success: true, message: "Security logs retrieved successfully", logs: formattedLogs };
  } catch (_error) {
    return { success: false, message: "Failed to retrieve security logs" };
  }
}

export async function getAllUsers(limit: number = 100, offset: number = 0): Promise<{ success: boolean; message: string; users?: UserView[] }> {
  try {
    await Promise.resolve();
    ensureDataStoresReady();
    const lim = toSafeInt(limit, { min: 1, max: 500, defaultValue: 100 });
    const off = toSafeInt(offset, { min: 0, max: 1_000_000, defaultValue: 0 });
    const sorted = users.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const slice = sorted.slice(off, off + lim);
    const formatted: UserView[] = slice.map(u => ({
      id: u.id,
      username: u.username,
      fullName: u.full_name,
      idNumber: u.id_number,
      accountNumber: u.account_number,
      createdAt: u.created_at,
      isActive: u.is_active,
      failedLoginAttempts: u.failed_login_attempts,
      lastLoginAttempt: u.last_login_attempt || null,
      accountLockedUntil: u.account_locked_until || null,
    }));
    return { success: true, message: "Users retrieved successfully", users: formatted };
  } catch (_error) {
    return { success: false, message: "Failed to retrieve users" };
  }
}

export async function getAllEmployees(limit: number = 100, offset: number = 0): Promise<{ success: boolean; message: string; employees?: EmployeeView[] }> {
  try {
    await Promise.resolve();
    ensureDataStoresReady();
    const lim = toSafeInt(limit, { min: 1, max: 500, defaultValue: 100 });
    const off = toSafeInt(offset, { min: 0, max: 1_000_000, defaultValue: 0 });
    const sorted = employees.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const slice = sorted.slice(off, off + lim);
    const formatted: EmployeeView[] = slice.map(e => ({
      id: e.id,
      username: e.username,
      fullName: e.full_name,
      employeeId: e.employee_id,
      createdAt: e.created_at,
      isActive: e.is_active,
      failedLoginAttempts: e.failed_login_attempts,
      lastLoginAttempt: e.last_login_attempt || null,
      accountLockedUntil: e.account_locked_until || null,
    }));
    return { success: true, message: "Employees retrieved successfully", employees: formatted };
  } catch (_error) {
    return { success: false, message: "Failed to retrieve employees" };
  }
}

export async function toggleUserAccount(userId: number, lock: boolean, employeeId: number, ipAddress: string, reason?: string): Promise<{ success: boolean; message: string }> {
  try {
    await Promise.resolve();
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, message: "User not found" };

    user.is_active = !lock;
    recordAdminSecurityEvent({
      employeeId,
      action: lock ? "USER_ACCOUNT_LOCKED" : "USER_ACCOUNT_UNLOCKED",
      ipAddress,
      details: `User @${user.username} ${lock ? 'locked' : 'unlocked'}${reason ? `. Reason: ${reason}` : ''}`,
      severity: lock ? "warning" : "info",
    });
    return { success: true, message: `User account ${lock ? 'locked' : 'unlocked'} successfully` };
  } catch (error) {
    recordAdminSecurityEvent({
      employeeId,
      action: "USER_ACCOUNT_TOGGLE_FAILED",
      ipAddress,
      details: `Failed to toggle user account ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      severity: "error",
    });
    return { success: false, message: "Failed to toggle user account" };
  }
}

export async function toggleEmployeeAccount(employeeId: number, lock: boolean, adminEmployeeId: number, ipAddress: string, reason?: string): Promise<{ success: boolean; message: string }> {
  try {
    await Promise.resolve();
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return { success: false, message: "Employee not found" };

    employee.is_active = !lock;
    recordAdminSecurityEvent({
      employeeId: adminEmployeeId,
      action: lock ? "EMPLOYEE_ACCOUNT_LOCKED" : "EMPLOYEE_ACCOUNT_UNLOCKED",
      ipAddress,
      details: `Employee @${employee.username} ${lock ? 'locked' : 'unlocked'}${reason ? `. Reason: ${reason}` : ''}`,
      severity: lock ? "warning" : "info",
    });
    return { success: true, message: `Employee account ${lock ? 'locked' : 'unlocked'} successfully` };
  } catch (error) {
    recordAdminSecurityEvent({
      employeeId: adminEmployeeId,
      action: "EMPLOYEE_ACCOUNT_TOGGLE_FAILED",
      ipAddress,
      details: `Failed to toggle employee account ${employeeId}: ${error instanceof Error ? error.message : String(error)}`,
      severity: "error",
    });
    return { success: false, message: "Failed to toggle employee account" };
  }
}

export async function getSystemStatistics(): Promise<{ success: boolean; message: string; statistics?: SystemStats }> {
  try {
    await Promise.resolve();
    ensureDataStoresReady();
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const events24h = securityLogs.filter(l => new Date(l.timestamp).getTime() >= dayAgo);
    const warnings24h = events24h.filter(l => normalizeSeverity(l.severity) === 'warning');
    const errors24h = events24h.filter(l => normalizeSeverity(l.severity) === 'error');

    const statistics = {
      users: {
        active: users.filter(u => u.is_active).length,
        inactive: users.filter(u => !u.is_active).length,
        total: users.length,
      },
      employees: {
        active: employees.filter(e => e.is_active).length,
        inactive: employees.filter(e => !e.is_active).length,
        total: employees.length,
      },
      transactions: {
        pending: transactions.filter(t => t.status === 'pending').length,
        approved: transactions.filter(t => t.status === 'approved').length,
        denied: transactions.filter(t => t.status === 'denied').length,
        total: transactions.length,
      },
      security: {
        events24h: events24h.length,
        warnings24h: warnings24h.length,
        errors24h: errors24h.length,
      },
    };
    return { success: true, message: "System statistics retrieved successfully", statistics };
  } catch (_error) {
    return { success: false, message: "Failed to retrieve system statistics" };
  }
}

export async function getFailedLoginAttemptsReport(hours: number = 24): Promise<{ success: boolean; message: string; report?: FailedLoginReportEntry[] }> {
  try {
    await Promise.resolve();
    ensureDataStoresReady();
    const windowMs = toSafeInt(hours, { min: 1, max: 168, defaultValue: 24 }) * 60 * 60 * 1000;
    const cutoff = Date.now() - windowMs;
    const actions = new Set([
      'USER_LOGIN_FAILED_INVALID_PASSWORD',
      'EMPLOYEE_LOGIN_FAILED_INVALID_PASSWORD',
      'PASSWORD_AUTH_FAILED',
    ]);
    const attempts = securityLogs.filter(l => actions.has(l.action) && new Date(l.timestamp).getTime() >= cutoff);
    const grouped = new Map<string, { ipAddress: string; attemptCount: number; lastAttempt: string; usernames: Set<string> }>();

    for (const a of attempts) {
      const key = a.ip_address || 'unknown';
      if (!grouped.has(key)) grouped.set(key, { ipAddress: key, attemptCount: 0, lastAttempt: a.timestamp, usernames: new Set() });
      const g = grouped.get(key)!;
      g.attemptCount += 1;
      if (new Date(a.timestamp).getTime() > new Date(g.lastAttempt).getTime()) g.lastAttempt = a.timestamp;
      if (typeof a.user_id === 'number') {
        const u = users.find(x => x.id === a.user_id);
        if (u) g.usernames.add(u.username);
      }
    }

    const report: FailedLoginReportEntry[] = Array.from(grouped.values())
      .filter(r => r.attemptCount >= 3)
      .sort((a, b) => b.attemptCount - a.attemptCount || new Date(b.lastAttempt).getTime() - new Date(a.lastAttempt).getTime())
      .map(r => ({ ipAddress: r.ipAddress, attemptCount: r.attemptCount, lastAttempt: r.lastAttempt, usernames: Array.from(r.usernames) }));

    return { success: true, message: "Failed login attempts report retrieved successfully", report };
  } catch (_error) {
    return { success: false, message: "Failed to retrieve failed login attempts report" };
  }
}

export async function cleanupOldLogs(daysToKeep: number = 90, employeeId: number, ipAddress: string): Promise<{ success: boolean; message: string; deletedCount?: number }> {
  try {
    await Promise.resolve();
    ensureDataStoresReady();
    const days = toSafeInt(daysToKeep, { min: 7, max: 365, defaultValue: 90 });
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    let deleted = 0;
    for (let i = securityLogs.length - 1; i >= 0; i--) {
      if (new Date(securityLogs[i].timestamp).getTime() < cutoff) {
        securityLogs.splice(i, 1);
        deleted++;
      }
    }

    logSecurityEvent({
      employeeId,
      action: "OLD_LOGS_CLEANED",
      ipAddress,
      details: `Cleaned up ${deleted} security logs older than ${days} days`,
      severity: "info",
    });

    return { success: true, message: deleted ? `Successfully cleaned up ${deleted} old security logs` : "No old logs to clean up", deletedCount: deleted };
  } catch (error) {
    recordAdminSecurityEvent({
      employeeId,
      action: "LOG_CLEANUP_FAILED",
      ipAddress,
      details: `Failed to clean up old logs: ${error instanceof Error ? error.message : String(error)}`,
      severity: "error",
    });
    return { success: false, message: "Failed to clean up old logs" };
  }
}

type AdminSecurityEvent = {
  employeeId?: number;
  action: string;
  ipAddress: string;
  details: string;
  severity: "info" | "warning" | "error";
};

function recordAdminSecurityEvent(event: AdminSecurityEvent): void {
  try {
    const trimmedDetails = event.details.length > 1800 ? `${event.details.slice(0, 1797)}...` : event.details;
    logSecurityEvent({
      employeeId: event.employeeId,
      action: event.action,
      ipAddress: event.ipAddress,
      details: trimmedDetails,
      severity: event.severity,
    });
  } catch (recordError) {
    console.error("Failed to record admin security event:", recordError);
  }
}

/**
 * Creates a new user account (admin only)
 * Part 3 Requirement: Users are created by admin, no self-registration
 */
export async function createUser(
  userData: {
    fullName: string;
    idNumber: string;
    accountNumber: string;
    username: string;
    password: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: string;
    nationality: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    stateProvince: string;
    postalCode: string;
    country: string;
    accountBalance: number;
    currency: string;
    accountType: string;
    preferredLanguage: string;
    occupation: string;
    annualIncome: number;
    cardNumber: string;
    cardExpiry: string;
    cardHolderName: string;
  },
  employeeId: number,
  ipAddress: string
): Promise<{ success: boolean; message: string; userId?: number }> {
  try {
    // Import required functions
    await Promise.resolve();
    const { hashPassword, validateInput } = await import('../auth/auth.ts');
    const { addUser, getUserByUsername, users } = await import('../database/init.ts');

    // Define validation patterns (RegEx whitelisting per security requirements)
    const VALIDATION_PATTERNS = {
      fullName: /^[a-zA-Z\s]{2,50}$/,
      idNumber: /^[0-9]{13}$/,
      accountNumber: /^[0-9]{10,20}$/,
      username: /^[a-zA-Z0-9_]{3,20}$/,
      password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      phoneNumber: /^[0-9+\-\s()]{10,20}$/,
      cardNumber: /^[0-9]{16}$/,
      cardExpiry: /^(0[1-9]|1[0-2])\/[0-9]{2}$/,
    };

    // Validate required fields
    const validation = validateInput(
      {
        fullName: userData.fullName,
        idNumber: userData.idNumber,
        accountNumber: userData.accountNumber,
        username: userData.username,
        password: userData.password,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        cardNumber: userData.cardNumber,
        cardExpiry: userData.cardExpiry,
      },
      VALIDATION_PATTERNS
    );

    if (!validation.isValid) {
      recordAdminSecurityEvent({
        employeeId,
        action: 'USER_CREATION_VALIDATION_FAILED',
        ipAddress,
        details: `Validation failed: ${validation.errors.join(', ')}`,
        severity: 'warning',
      });
      return {
        success: false,
        message: `Validation failed: ${validation.errors.join(', ')}`,
      };
    }

    // Check for duplicate username
    const existingUser = getUserByUsername(userData.username);
    if (existingUser) {
      recordAdminSecurityEvent({
        employeeId,
        action: 'USER_CREATION_DUPLICATE_USERNAME',
        ipAddress,
        details: `Attempted to create user with existing username: ${userData.username}`,
        severity: 'warning',
      });
      return {
        success: false,
        message: 'Username already exists',
      };
    }

    // Check for duplicate account number
    const existingByAccount = users.find(
      (u) => u.account_number === userData.accountNumber
    );
    if (existingByAccount) {
      recordAdminSecurityEvent({
        employeeId,
        action: 'USER_CREATION_DUPLICATE_ACCOUNT',
        ipAddress,
        details: `Attempted to create user with existing account number: ${userData.accountNumber}`,
        severity: 'warning',
      });
      return {
        success: false,
        message: 'Account number already exists',
      };
    }

    // Hash password (PBKDF2 with 100,000 iterations per security requirements)
    const passwordHash = await hashPassword(userData.password);

    // Create new user
    const newUser = addUser({
      full_name: userData.fullName,
      id_number: userData.idNumber,
      account_number: userData.accountNumber,
      username: userData.username,
      password_hash: passwordHash,
      email: userData.email,
      phone_number: userData.phoneNumber,
      date_of_birth: userData.dateOfBirth,
      nationality: userData.nationality,
      address_line_1: userData.addressLine1,
      address_line_2: userData.addressLine2 || undefined,
      city: userData.city,
      state_province: userData.stateProvince,
      postal_code: userData.postalCode,
      country: userData.country,
      account_balance: userData.accountBalance,
      currency: userData.currency,
      account_type: userData.accountType,
      preferred_language: userData.preferredLanguage,
      occupation: userData.occupation,
      annual_income: userData.annualIncome,
      card_number: userData.cardNumber,
      card_expiry: userData.cardExpiry,
      card_holder_name: userData.cardHolderName,
      created_at: new Date().toISOString(),
      is_active: true,
      failed_login_attempts: 0,
    });

    // Log successful user creation
    recordAdminSecurityEvent({
      employeeId,
      action: 'USER_CREATED_BY_ADMIN',
      ipAddress,
      details: `Created new user: ${userData.username} (${userData.fullName}) with account ${userData.accountNumber}`,
      severity: 'info',
    });

    return {
      success: true,
      message: 'User created successfully',
      userId: newUser.id,
    };
  } catch (error) {
    // Log error
    recordAdminSecurityEvent({
      employeeId,
      action: 'USER_CREATION_FAILED',
      ipAddress,
      details: `Failed to create user: ${error instanceof Error ? error.message : String(error)}`,
      severity: 'error',
    });

    return {
      success: false,
      message: 'Failed to create user account',
    };
  }
}