import { db } from "../database/init.ts";
import { validateInput, logSecurityEvent } from "../auth/auth.ts";

const PAYMENT_VALIDATION_PATTERNS = {
  amount: /^\d+(\.\d{1,2})?$/,
  currency: /^[A-Z]{3}$/,
  provider: /^[A-Z\s]{2,20}$/,
  recipientAccount: /^[A-Z0-9]{8,30}$/,
  swiftCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/
};

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'ZAR', 'AUD', 'CAD', 'CHF', 'JPY'];
const SUPPORTED_PROVIDERS = ['SWIFT', 'SEPA', 'ACH', 'WIRE'];

export async function createPayment(paymentData: {
  amount: string;
  currency: string;
  provider: string;
  recipientAccount: string;
  swiftCode: string;
  notes?: string;
}, userId: number, ipAddress: string): Promise<{ success: boolean; message: string; transactionId?: number }> {
  try {
    const validation = validateInput(paymentData, PAYMENT_VALIDATION_PATTERNS);
    if (!validation.isValid) {
      return { success: false, message: `Validation errors: ${validation.errors.join(', ')}` };
    }

    const amount = parseFloat(paymentData.amount);
    if (amount <= 0 || amount > 1000000) {
      return { success: false, message: "Amount must be between 0.01 and 1,000,000" };
    }

    if (!SUPPORTED_CURRENCIES.includes(paymentData.currency)) {
      return { success: false, message: `Unsupported currency. Supported currencies: ${SUPPORTED_CURRENCIES.join(', ')}` };
    }

    if (!SUPPORTED_PROVIDERS.includes(paymentData.provider)) {
      return { success: false, message: `Unsupported provider. Supported providers: ${SUPPORTED_PROVIDERS.join(', ')}` };
    }

    const user = db.query("SELECT id, is_active FROM users WHERE id = ?", [userId]);
    if (user.length === 0 || !user[0][1]) {
      return { success: false, message: "User not found or account inactive" };
    }

    db.execute(`
      INSERT INTO transactions (user_id, amount, currency, provider, recipient_account, recipient_swift_code, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `, [
      userId,
      amount,
      paymentData.currency,
      paymentData.provider,
      paymentData.recipientAccount,
      paymentData.swiftCode,
      paymentData.notes || null
    ]);

    const transactionId = db.lastInsertRowId;

    logSecurityEvent({
      userId,
      action: "PAYMENT_CREATED",
      ipAddress,
      details: `Payment created: ${amount} ${paymentData.currency} to ${paymentData.recipientAccount} via ${paymentData.provider}`,
      severity: "info"
    });

    return { 
      success: true, 
      message: "Payment transaction created successfully", 
      transactionId 
    };
  } catch (error) {
    logSecurityEvent({
      userId,
      action: "PAYMENT_CREATION_FAILED",
      ipAddress,
      details: `Payment creation failed: ${error.message}`,
      severity: "error"
    });
    return { success: false, message: "Failed to create payment transaction" };
  }
}

export async function getUserTransactions(userId: number, limit: number = 50, offset: number = 0): Promise<{ success: boolean; message: string; transactions?: any[] }> {
  try {
    const transactions = db.query(`
      SELECT 
        id, 
        amount, 
        currency, 
        provider, 
        recipient_account,
        recipient_swift_code,
        status,
        created_at,
        processed_at,
        notes
      FROM transactions 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);

    const formattedTransactions = transactions.map(transaction => ({
      id: transaction[0],
      amount: transaction[1],
      currency: transaction[2],
      provider: transaction[3],
      recipientAccount: transaction[4],
      recipientSwiftCode: transaction[5],
      status: transaction[6],
      createdAt: transaction[7],
      processedAt: transaction[8],
      notes: transaction[9]
    }));

    return { 
      success: true, 
      message: "Transactions retrieved successfully", 
      transactions: formattedTransactions 
    };
  } catch (error) {
    return { success: false, message: "Failed to retrieve transactions" };
  }
}

export async function getAllTransactions(limit: number = 100, offset: number = 0): Promise<{ success: boolean; message: string; transactions?: any[] }> {
  try {
    const transactions = db.query(`
      SELECT 
        t.id,
        t.amount,
        t.currency,
        t.provider,
        t.recipient_account,
        t.recipient_swift_code,
        t.status,
        t.created_at,
        t.processed_at,
        t.notes,
        u.username as user_username,
        u.full_name as user_full_name,
        e.username as processed_by_username,
        e.full_name as processed_by_full_name
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN employees e ON t.processed_by = e.id
      ORDER BY t.created_at DESC 
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const formattedTransactions = transactions.map(transaction => ({
      id: transaction[0],
      amount: transaction[1],
      currency: transaction[2],
      provider: transaction[3],
      recipientAccount: transaction[4],
      recipientSwiftCode: transaction[5],
      status: transaction[6],
      createdAt: transaction[7],
      processedAt: transaction[8],
      notes: transaction[9],
      userUsername: transaction[10],
      userFullName: transaction[11],
      processedByUsername: transaction[12],
      processedByFullName: transaction[13]
    }));

    return { 
      success: true, 
      message: "Transactions retrieved successfully", 
      transactions: formattedTransactions 
    };
  } catch (error) {
    return { success: false, message: "Failed to retrieve transactions" };
  }
}

export async function approveTransaction(transactionId: number, employeeId: number, ipAddress: string): Promise<{ success: boolean; message: string }> {
  try {
    const transaction = db.query(
      "SELECT id, user_id, status FROM transactions WHERE id = ?",
      [transactionId]
    );

    if (transaction.length === 0) {
      return { success: false, message: "Transaction not found" };
    }

    if (transaction[0][2] !== 'pending') {
      return { success: false, message: "Transaction is not pending" };
    }

    db.execute(`
      UPDATE transactions 
      SET status = 'approved', processed_at = CURRENT_TIMESTAMP, processed_by = ? 
      WHERE id = ?
    `, [employeeId, transactionId]);

    logSecurityEvent({
      employeeId,
      action: "TRANSACTION_APPROVED",
      ipAddress,
      details: `Transaction ${transactionId} approved`,
      severity: "info"
    });

    return { success: true, message: "Transaction approved successfully" };
  } catch (error) {
    logSecurityEvent({
      employeeId,
      action: "TRANSACTION_APPROVAL_FAILED",
      ipAddress,
      details: `Transaction approval failed: ${error.message}`,
      severity: "error"
    });
    return { success: false, message: "Failed to approve transaction" };
  }
}

export async function denyTransaction(transactionId: number, employeeId: number, reason: string, ipAddress: string): Promise<{ success: boolean; message: string }> {
  try {
    const transaction = db.query(
      "SELECT id, user_id, status FROM transactions WHERE id = ?",
      [transactionId]
    );

    if (transaction.length === 0) {
      return { success: false, message: "Transaction not found" };
    }

    if (transaction[0][2] !== 'pending') {
      return { success: false, message: "Transaction is not pending" };
    }

    db.execute(`
      UPDATE transactions 
      SET status = 'denied', processed_at = CURRENT_TIMESTAMP, processed_by = ?, notes = COALESCE(notes, '') || ' | Denied: ' || ? 
      WHERE id = ?
    `, [employeeId, reason, transactionId]);

    logSecurityEvent({
      employeeId,
      action: "TRANSACTION_DENIED",
      ipAddress,
      details: `Transaction ${transactionId} denied. Reason: ${reason}`,
      severity: "warning"
    });

    return { success: true, message: "Transaction denied successfully" };
  } catch (error) {
    logSecurityEvent({
      employeeId,
      action: "TRANSACTION_DENIAL_FAILED",
      ipAddress,
      details: `Transaction denial failed: ${error.message}`,
      severity: "error"
    });
    return { success: false, message: "Failed to deny transaction" };
  }
}

export async function getTransactionStatistics(): Promise<{ success: boolean; message: string; statistics?: any }> {
  try {
    const stats = db.query(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied_count,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as total_approved_amount,
        COUNT(DISTINCT user_id) as unique_users
      FROM transactions
    `);

    const [total, pending, approved, denied, totalAmount, uniqueUsers] = stats[0];

    const statistics = {
      totalTransactions: total,
      pendingCount: pending,
      approvedCount: approved,
      deniedCount: denied,
      totalApprovedAmount: totalAmount,
      uniqueUsers: uniqueUsers
    };

    return { 
      success: true, 
      message: "Statistics retrieved successfully", 
      statistics 
    };
  } catch (error) {
    return { success: false, message: "Failed to retrieve statistics" };
  }
}