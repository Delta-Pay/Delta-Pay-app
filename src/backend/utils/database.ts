import { db } from "../database/init.ts";

export class DatabaseUtils {
  static async executeQuery(query: string, params: any[] = []): Promise<any[]> {
    try {
      return db.query(query, params);
    } catch (error) {
      console.error("Database query error:", error);
      throw new Error(`Database query failed: ${error.message}`);
    }
  }

  static async executeInsert(query: string, params: any[] = []): Promise<number> {
    try {
      db.execute(query, params);
      return db.lastInsertRowId;
    } catch (error) {
      console.error("Database insert error:", error);
      throw new Error(`Database insert failed: ${error.message}`);
    }
  }

  static async executeUpdate(query: string, params: any[] = []): Promise<number> {
    try {
      db.execute(query, params);
      return 1;
    } catch (error) {
      console.error("Database update error:", error);
      throw new Error(`Database update failed: ${error.message}`);
    }
  }

  static beginTransaction(): void {
    db.execute("BEGIN TRANSACTION");
  }

  static commitTransaction(): void {
    db.execute("COMMIT");
  }

  static rollbackTransaction(): void {
    db.execute("ROLLBACK");
  }

  static async executeTransaction(queries: { query: string; params: any[] }[]): Promise<void> {
    try {
      this.beginTransaction();
      
      for (const { query, params } of queries) {
        db.execute(query, params);
      }
      
      this.commitTransaction();
    } catch (error) {
      this.rollbackTransaction();
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/['";\\]/g, '')
      .replace(/--/g, '')
      .replace(/\/\*|\*\//g, '')
      .trim();
  }

  static sanitizeObject(obj: Record<string, any>, allowedFields: string[]): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
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

  static getDateRangeFilter(startDate?: string, endDate?: string, dateColumn: string = 'created_at'): string {
    let conditions = [];
    
    if (startDate) {
      conditions.push(`${dateColumn} >= '${startDate}'`);
    }
    
    if (endDate) {
      conditions.push(`${dateColumn} <= '${endDate}'`);
    }
    
    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  }

  static getSearchCondition(searchTerm: string, columns: string[]): string {
    if (!searchTerm || !columns.length) return '';
    
    const conditions = columns.map(column => `${column} LIKE '%${this.sanitizeInput(searchTerm)}%'`);
    return `(${conditions.join(' OR ')})`;
  }

  static getOrderByClause(sortBy: string = 'created_at', sortOrder: 'ASC' | 'DESC' = 'DESC', allowedColumns: string[] = ['created_at']): string {
    if (!allowedColumns.includes(sortBy)) {
      sortBy = 'created_at';
    }
    
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    return `ORDER BY ${sortBy} ${order}`;
  }

  static async countTotal(table: string, conditions: string = ''): Promise<number> {
    try {
      const query = `SELECT COUNT(*) as total FROM ${table} ${conditions}`;
      const result = db.query(query);
      return result[0][0] as number;
    } catch (error) {
      console.error("Count query error:", error);
      throw new Error(`Count query failed: ${error.message}`);
    }
  }

  static async backupDatabase(backupPath: string): Promise<void> {
    try {
      const tables = db.query("SELECT name FROM sqlite_master WHERE type='table'");
      
      for (const [tableName] of tables) {
        const data = db.query(`SELECT * FROM ${tableName}`);
        console.log(`Table ${tableName} has ${data.length} records`);
      }
      
      console.log(`Database backup information logged to console`);
    } catch (error) {
      throw new Error(`Database backup failed: ${error.message}`);
    }
  }

  static async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      const result = db.query("SELECT 1 as test");
      if (result.length > 0 && result[0][0] === 1) {
        return { healthy: true, message: "Database connection healthy" };
      }
      return { healthy: false, message: "Database connection failed" };
    } catch (error) {
      return { healthy: false, message: `Database health check failed: ${error.message}` };
    }
  }

  static async cleanupExpiredRecords(): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      db.execute("DELETE FROM csrf_tokens WHERE expires_at < ?", [now]);
      db.execute("DELETE FROM session_tokens WHERE expires_at < ? OR is_revoked = 1", [now]);
      db.execute("DELETE FROM rate_limits WHERE last_request < datetime('now', '-24 hours')");
      
      console.log("Expired records cleanup completed");
    } catch (error) {
      console.error("Cleanup error:", error);
      throw new Error(`Cleanup failed: ${error.message}`);
    }
  }

  static getTableSchema(tableName: string): any[] {
    try {
      return db.query(`PRAGMA table_info(${tableName})`);
    } catch (error) {
      throw new Error(`Failed to get table schema: ${error.message}`);
    }
  }

  static validateForeignKey(table: string, column: string, value: any): boolean {
    try {
      const result = db.query(`SELECT 1 FROM ${table} WHERE ${column} = ? LIMIT 1`, [value]);
      return result.length > 0;
    } catch (error) {
      return false;
    }
  }
}

export const sanitizeInput = DatabaseUtils.sanitizeInput.bind(DatabaseUtils);
export const sanitizeObject = DatabaseUtils.sanitizeObject.bind(DatabaseUtils);
export const getPaginationParams = DatabaseUtils.getPaginationParams.bind(DatabaseUtils);
export const getOrderByClause = DatabaseUtils.getOrderByClause.bind(DatabaseUtils);