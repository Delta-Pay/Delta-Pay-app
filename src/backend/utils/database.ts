import { csrfTokens, employees, rateLimits, securityLogs, sessionTokens, transactions, users } from "../database/init.ts";

export class DatabaseUtils {
  static executeQuery<T = unknown>(query: string, params: ReadonlyArray<unknown> = []): T[] {
    console.log("Simulating query:", query, params);
    return [] as T[];
  }

  static executeInsert(query: string, params: ReadonlyArray<unknown> = []): number {
    console.log("Simulating insert:", query, params);
    return Math.floor(Math.random() * 1000);
  }

  static executeUpdate(query: string, params: ReadonlyArray<unknown> = []): number {
    console.log("Simulating update:", query, params);
    return 1;
  }

  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') return input;

    return input
      .replace(/['";\\]/g, '')
      .replace(/--/g, '')
      .replace(/\/\*|\*\//g, '')
      .trim();
  }

  static sanitizeObject<T extends Record<string, unknown>>(obj: T, allowedFields: ReadonlyArray<string>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (allowedFields.includes(key)) {
        if (typeof value === 'string') {
          sanitized[key] = this.sanitizeInput(value);
        } else if (typeof value === 'number') {
          sanitized[key] = value;
        } else if (typeof value === 'boolean') {
          sanitized[key] = value;
        } else if (value === null || value === undefined) {
          sanitized[key] = null;
        }
      }
    }

    return sanitized;
  }

  static getPaginationParams(page: number = 1, limit: number = 10): { offset: number; limit: number } {
    const offset = (page - 1) * limit;
    return { offset, limit };
  }

  static healthCheck(): { healthy: boolean; message: string } {
    try {
      const arrayChecks = [
        Array.isArray(users),
        Array.isArray(employees),
        Array.isArray(transactions),
        Array.isArray(securityLogs),
        Array.isArray(sessionTokens),
        Array.isArray(csrfTokens),
        Array.isArray(rateLimits)
      ];

    if (arrayChecks.every(check => check === true)) {
        return { healthy: true, message: "In-memory database healthy" };
      }
      return { healthy: false, message: "In-memory database arrays not accessible" };
    } catch (error) {
    return { healthy: false, message: `Database health check failed: ${(error as Error).message}` };
    }
  }

  static cleanupExpiredRecords(): void {
    try {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      for (let i = csrfTokens.length - 1; i >= 0; i--) {
        if (new Date(csrfTokens[i].expires_at) < now) {
          csrfTokens.splice(i, 1);
        }
      }

      for (let i = sessionTokens.length - 1; i >= 0; i--) {
        const token = sessionTokens[i];
        if (new Date(token.expires_at) < now || token.is_revoked) {
          sessionTokens.splice(i, 1);
        }
      }

      for (let i = rateLimits.length - 1; i >= 0; i--) {
        if (new Date(rateLimits[i].last_request) < twentyFourHoursAgo) {
          rateLimits.splice(i, 1);
        }
      }

      console.log("Expired records cleanup completed");
    } catch (error) {
      console.error("Cleanup error:", error);
  throw new Error(`Cleanup failed: ${(error as Error).message}`);
    }
  }
}

export const sanitizeInput = DatabaseUtils.sanitizeInput.bind(DatabaseUtils);
export const sanitizeObject = DatabaseUtils.sanitizeObject.bind(DatabaseUtils);
export const getPaginationParams = DatabaseUtils.getPaginationParams.bind(DatabaseUtils);