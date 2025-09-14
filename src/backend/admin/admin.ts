import { users, employees, transactions, securityLogs, sessionTokens, csrfTokens, rateLimits } from "../database/init.ts";
import { logSecurityEvent } from "../auth/auth.ts";

export async function getSecurityLogs(limit: number = 100, offset: number = 0, severity?: string): Promise<{ success: boolean; message: string; logs?: any[] }> {
  try {
    let query = `
      SELECT 
        sl.id,
        sl.action,
        sl.ip_address,
        sl.details,
        sl.severity,
        sl.timestamp,
        u.username as user_username,
        u.full_name as user_full_name,
        e.username as employee_username,
        e.full_name as employee_full_name
      FROM security_logs sl
      LEFT JOIN users u ON sl.user_id = u.id
      LEFT JOIN employees e ON sl.employee_id = e.id
    `;
    
    const params: any[] = [];
    
    if (severity) {
      query += " WHERE sl.severity = ?";
      params.push(severity);
    }
    
    query += " ORDER BY sl.timestamp DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const logs = db.query(query, params);

    const formattedLogs = logs.map(log => ({
      id: log[0],
      action: log[1],
      ipAddress: log[2],
      details: log[3],
      severity: log[4],
      timestamp: log[5],
      userUsername: log[6],
      userFullName: log[7],
      employeeUsername: log[8],
      employeeFullName: log[9]
    }));

    return { 
      success: true, 
      message: "Security logs retrieved successfully", 
      logs: formattedLogs 
    };
  } catch (error) {
    return { success: false, message: "Failed to retrieve security logs" };
  }
}

export async function getAllUsers(limit: number = 100, offset: number = 0): Promise<{ success: boolean; message: string; users?: any[] }> {
  try {
    const users = db.query(`
      SELECT 
        id,
        username,
        full_name,
        id_number,
        account_number,
        created_at,
        is_active,
        failed_login_attempts,
        last_login_attempt,
        account_locked_until
      FROM users 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const formattedUsers = users.map(user => ({
      id: user[0],
      username: user[1],
      fullName: user[2],
      idNumber: user[3],
      accountNumber: user[4],
      createdAt: user[5],
      isActive: user[6],
      failedLoginAttempts: user[7],
      lastLoginAttempt: user[8],
      accountLockedUntil: user[9]
    }));

    return { 
      success: true, 
      message: "Users retrieved successfully", 
      users: formattedUsers 
    };
  } catch (error) {
    return { success: false, message: "Failed to retrieve users" };
  }
}

export async function getAllEmployees(limit: number = 100, offset: number = 0): Promise<{ success: boolean; message: string; employees?: any[] }> {
  try {
    const employees = db.query(`
      SELECT 
        id,
        username,
        full_name,
        employee_id,
        created_at,
        is_active,
        failed_login_attempts,
        last_login_attempt,
        account_locked_until
      FROM employees 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const formattedEmployees = employees.map(employee => ({
      id: employee[0],
      username: employee[1],
      fullName: employee[2],
      employeeId: employee[3],
      createdAt: employee[4],
      isActive: employee[5],
      failedLoginAttempts: employee[6],
      lastLoginAttempt: employee[7],
      accountLockedUntil: employee[8]
    }));

    return { 
      success: true, 
      message: "Employees retrieved successfully", 
      employees: formattedEmployees 
    };
  } catch (error) {
    return { success: false, message: "Failed to retrieve employees" };
  }
}

export async function toggleUserAccount(userId: number, lock: boolean, employeeId: number, ipAddress: string, reason?: string): Promise<{ success: boolean; message: string }> {
  try {
    const user = db.query("SELECT id, is_active FROM users WHERE id = ?", [userId]);
    if (user.length === 0) {
      return { success: false, message: "User not found" };
    }

    const action = lock ? "USER_ACCOUNT_LOCKED" : "USER_ACCOUNT_UNLOCKED";
    const newStatus = lock ? 0 : 1;

    db.execute(
      "UPDATE users SET is_active = ? WHERE id = ?",
      [newStatus, userId]
    );

    logSecurityEvent({
      employeeId,
      action,
      ipAddress,
      details: `User account ${lock ? 'locked' : 'unlocked'}${reason ? `. Reason: ${reason}` : ''}`,
      severity: lock ? "warning" : "info"
    });

    return { 
      success: true, 
      message: `User account ${lock ? 'locked' : 'unlocked'} successfully` 
    };
  } catch (error) {
    logSecurityEvent({
      employeeId,
      action: "USER_ACCOUNT_TOGGLE_FAILED",
      ipAddress,
      details: `Failed to toggle user account: ${error.message}`,
      severity: "error"
    });
    return { success: false, message: "Failed to toggle user account" };
  }
}

export async function toggleEmployeeAccount(employeeId: number, lock: boolean, adminEmployeeId: number, ipAddress: string, reason?: string): Promise<{ success: boolean; message: string }> {
  try {
    const employee = db.query("SELECT id, is_active FROM employees WHERE id = ?", [employeeId]);
    if (employee.length === 0) {
      return { success: false, message: "Employee not found" };
    }

    const action = lock ? "EMPLOYEE_ACCOUNT_LOCKED" : "EMPLOYEE_ACCOUNT_UNLOCKED";
    const newStatus = lock ? 0 : 1;

    db.execute(
      "UPDATE employees SET is_active = ? WHERE id = ?",
      [newStatus, employeeId]
    );

    logSecurityEvent({
      employeeId: adminEmployeeId,
      action,
      ipAddress,
      details: `Employee account ${lock ? 'locked' : 'unlocked'}${reason ? `. Reason: ${reason}` : ''}`,
      severity: lock ? "warning" : "info"
    });

    return { 
      success: true, 
      message: `Employee account ${lock ? 'locked' : 'unlocked'} successfully` 
    };
  } catch (error) {
    logSecurityEvent({
      employeeId: adminEmployeeId,
      action: "EMPLOYEE_ACCOUNT_TOGGLE_FAILED",
      ipAddress,
      details: `Failed to toggle employee account: ${error.message}`,
      severity: "error"
    });
    return { success: false, message: "Failed to toggle employee account" };
  }
}

export async function getSystemStatistics(): Promise<{ success: boolean; message: string; statistics?: any }> {
  try {
    const stats = db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users,
        (SELECT COUNT(*) FROM users WHERE is_active = 0) as inactive_users,
        (SELECT COUNT(*) FROM employees WHERE is_active = 1) as active_employees,
        (SELECT COUNT(*) FROM employees WHERE is_active = 0) as inactive_employees,
        (SELECT COUNT(*) FROM transactions WHERE status = 'pending') as pending_transactions,
        (SELECT COUNT(*) FROM transactions WHERE status = 'approved') as approved_transactions,
        (SELECT COUNT(*) FROM transactions WHERE status = 'denied') as denied_transactions,
        (SELECT COUNT(*) FROM security_logs WHERE timestamp >= datetime('now', '-24 hours')) as security_events_24h,
        (SELECT COUNT(*) FROM security_logs WHERE severity = 'warning' AND timestamp >= datetime('now', '-24 hours')) as security_warnings_24h,
        (SELECT COUNT(*) FROM security_logs WHERE severity = 'error' AND timestamp >= datetime('now', '-24 hours')) as security_errors_24h
    `);

    const [
      activeUsers, inactiveUsers, activeEmployees, inactiveEmployees,
      pendingTransactions, approvedTransactions, deniedTransactions,
      securityEvents24h, securityWarnings24h, securityErrors24h
    ] = stats[0];

    const statistics = {
      users: {
        active: activeUsers,
        inactive: inactiveUsers,
        total: activeUsers + inactiveUsers
      },
      employees: {
        active: activeEmployees,
        inactive: inactiveEmployees,
        total: activeEmployees + inactiveEmployees
      },
      transactions: {
        pending: pendingTransactions,
        approved: approvedTransactions,
        denied: deniedTransactions,
        total: pendingTransactions + approvedTransactions + deniedTransactions
      },
      security: {
        events24h: securityEvents24h,
        warnings24h: securityWarnings24h,
        errors24h: securityErrors24h
      }
    };

    return { 
      success: true, 
      message: "System statistics retrieved successfully", 
      statistics 
    };
  } catch (error) {
    return { success: false, message: "Failed to retrieve system statistics" };
  }
}

export async function getFailedLoginAttemptsReport(hours: number = 24): Promise<{ success: boolean; message: string; report?: any[] }> {
  try {
    const report = db.query(`
      SELECT 
        ip_address,
        COUNT(*) as attempt_count,
        MAX(timestamp) as last_attempt,
        GROUP_CONCAT(DISTINCT 
          CASE 
            WHEN user_id IS NOT NULL THEN (SELECT username FROM users WHERE id = user_id)
            WHEN employee_id IS NOT NULL THEN (SELECT username FROM employees WHERE id = employee_id)
            ELSE 'unknown'
          END
        ) as usernames
      FROM security_logs 
      WHERE action IN ('LOGIN_FAILED_INVALID_PASSWORD', 'EMPLOYEE_LOGIN_FAILED_INVALID_PASSWORD')
      AND timestamp >= datetime('now', '-? hours')
      GROUP BY ip_address
      HAVING attempt_count >= 3
      ORDER BY attempt_count DESC, last_attempt DESC
    `, [hours]);

    const formattedReport = report.map(row => ({
      ipAddress: row[0],
      attemptCount: row[1],
      lastAttempt: row[2],
      usernames: row[3] ? row[3].split(',') : []
    }));

    return { 
      success: true, 
      message: "Failed login attempts report retrieved successfully", 
      report: formattedReport 
    };
  } catch (error) {
    return { success: false, message: "Failed to retrieve failed login attempts report" };
  }
}

export async function cleanupOldLogs(daysToKeep: number = 90, employeeId: number, ipAddress: string): Promise<{ success: boolean; message: string; deletedCount?: number }> {
  try {
    const result = db.query(`
      SELECT COUNT(*) FROM security_logs 
      WHERE timestamp < datetime('now', '-? days')
    `, [daysToKeep]);

    const countToDelete = result[0][0];

    if (countToDelete === 0) {
      return { success: true, message: "No old logs to clean up" };
    }

    db.execute(`
      DELETE FROM security_logs 
      WHERE timestamp < datetime('now', '-? days')
    `, [daysToKeep]);

    logSecurityEvent({
      employeeId,
      action: "OLD_LOGS_CLEANED",
      ipAddress,
      details: `Cleaned up ${countToDelete} security logs older than ${daysToKeep} days`,
      severity: "info"
    });

    return { 
      success: true, 
      message: `Successfully cleaned up ${countToDelete} old security logs`,
      deletedCount: countToDelete
    };
  } catch (error) {
    logSecurityEvent({
      employeeId,
      action: "LOG_CLEANUP_FAILED",
      ipAddress,
      details: `Failed to clean up old logs: ${error.message}`,
      severity: "error"
    });
    return { success: false, message: "Failed to clean up old logs" };
  }
}