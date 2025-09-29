// README: Admin must view security logs and manage accounts; Backend Technologies mention SQLite.
// Change: Using in-memory arrays for this mock instead of SQLite joins for admin queries.
// #COMPLETION_DRIVE: Switched admin data access to in-memory arrays exposed by init.ts
// #SUGGEST_VERIFY: If/when a persistent DB is introduced, replace selectors with SQL/ORM equivalents

import { logSecurityEvent } from "../auth/auth.ts";
import { employees, securityLogs, transactions, users } from "../database/init.ts";

function toSafeInt(n: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  // #COMPLETION_DRIVE: Ensure pagination inputs don't explode memory
  // #SUGGEST_VERIFY: Clamp via API validators once a framework is added
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function arraysHealthy(): boolean {
  // #COMPLETION_DRIVE: Switched to in-memory arrays; ensure availability at runtime
  // #SUGGEST_VERIFY: Add diagnostics endpoint if this ever fails in production
  try {
    return Array.isArray(users) && Array.isArray(employees) && Array.isArray(transactions) && Array.isArray(securityLogs);
  } catch (_e) {
    return false;
  }
}

function normalizeSeverity(input?: string): 'info' | 'warning' | 'error' {
  // #COMPLETION_DRIVE: Align severities to a fixed set to avoid UI/report drift
  // #SUGGEST_VERIFY: If adding more severities, update this mapping and UI filters
  const s = (input || 'info').toLowerCase();
  return s === 'warning' ? 'warning' : s === 'error' ? 'error' : 'info';
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
    if (!arraysHealthy()) return { success: false, message: "Security logs unavailable" };
    const lim = toSafeInt(limit, 1, 500);
    const off = toSafeInt(offset, 0, 1_000_000);

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
  if (!arraysHealthy()) return { success: false, message: "Users unavailable" };
    const lim = toSafeInt(limit, 1, 500);
    const off = toSafeInt(offset, 0, 1_000_000);
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
  if (!arraysHealthy()) return { success: false, message: "Employees unavailable" };
    const lim = toSafeInt(limit, 1, 500);
    const off = toSafeInt(offset, 0, 1_000_000);
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
    // #COMPLETION_DRIVE: Record admin action to the security log
    // #SUGGEST_VERIFY: Confirm action labels align with reporting widgets
    logSecurityEvent({
      employeeId,
      action: lock ? "USER_ACCOUNT_LOCKED" : "USER_ACCOUNT_UNLOCKED",
      ipAddress,
      details: `User @${user.username} ${lock ? 'locked' : 'unlocked'}${reason ? `. Reason: ${reason}` : ''}`,
      severity: lock ? "warning" : "info",
    });
    return { success: true, message: `User account ${lock ? 'locked' : 'unlocked'} successfully` };
  } catch (error) {
    logSecurityEvent({
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
    logSecurityEvent({
      employeeId: adminEmployeeId,
      action: lock ? "EMPLOYEE_ACCOUNT_LOCKED" : "EMPLOYEE_ACCOUNT_UNLOCKED",
      ipAddress,
      details: `Employee @${employee.username} ${lock ? 'locked' : 'unlocked'}${reason ? `. Reason: ${reason}` : ''}`,
      severity: lock ? "warning" : "info",
    });
    return { success: true, message: `Employee account ${lock ? 'locked' : 'unlocked'} successfully` };
  } catch (error) {
    logSecurityEvent({
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
  if (!arraysHealthy()) return { success: false, message: "Statistics unavailable" };
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
  if (!arraysHealthy()) return { success: false, message: "Security logs unavailable" };
    const windowMs = toSafeInt(hours, 1, 168) * 60 * 60 * 1000;
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
    const days = toSafeInt(daysToKeep, 7, 365);
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
    logSecurityEvent({
      employeeId,
      action: "LOG_CLEANUP_FAILED",
      ipAddress,
      details: `Failed to clean up old logs: ${error instanceof Error ? error.message : String(error)}`,
      severity: "error",
    });
    return { success: false, message: "Failed to clean up old logs" };
  }
}