import { logSecurityEvent, validateInput } from "../auth/auth.ts";
import { addTransaction, employees, getUserById, transactions, users } from "../database/init.ts";

const PAYMENT_VALIDATION_PATTERNS = {
  amount: /^\d+(\.\d{1,2})?$/,
  currency: /^[A-Z]{3}$/,
  provider: /^[A-Z\s]{2,20}$/,
  recipientAccount: /^[A-Z0-9]{8,30}$/,
};

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'ZAR', 'AUD', 'CAD', 'CHF', 'JPY'];
const SUPPORTED_PROVIDERS = ['SEPA', 'ACH', 'WIRE'];

export function createPayment(paymentData: {
  amount: string;
  currency: string;
  provider: string;
  recipientAccount: string;
  notes?: string;
}, userId: number, ipAddress: string): { success: boolean; message: string; transactionId?: number } {
  try {
    const toValidate = {
      amount: paymentData.amount,
      currency: paymentData.currency,
      provider: paymentData.provider,
      recipientAccount: paymentData.recipientAccount
    } as Record<string, string>;
    const validation = validateInput(toValidate, PAYMENT_VALIDATION_PATTERNS);
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

    const user = getUserById(userId);
    if (!user || !user.is_active) {
      return { success: false, message: "User not found or account inactive" };
    }

    const newTransaction = addTransaction({
      user_id: userId,
      amount: amount,
      currency: paymentData.currency,
      provider: paymentData.provider,
      recipient_account: paymentData.recipientAccount,
      status: 'pending',
      created_at: new Date().toISOString(),
      notes: paymentData.notes || undefined
    });

    logSecurityEvent({
      user_id: userId,
      action: "PAYMENT_CREATED",
      ip_address: ipAddress,
  details: `Payment created: ${amount} ${paymentData.currency} to ${paymentData.recipientAccount} via ${paymentData.provider}`,
      severity: "info",
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      message: "Payment transaction created successfully",
      transactionId: newTransaction.id
    };
  } catch (error) {
    logSecurityEvent({
      user_id: userId,
      action: "PAYMENT_CREATION_FAILED",
      ip_address: ipAddress,
      details: `Payment creation failed: ${error instanceof Error ? error.message : String(error)}`,
      severity: "error",
      timestamp: new Date().toISOString()
    });
    return { success: false, message: "Failed to create payment transaction" };
  }
}

export function getUserTransactions(userId: number, limit: number = 50, offset: number = 0): { success: boolean; message: string; transactions?: Array<{ id: number; amount: number; currency: string; provider: string; recipientAccount: string; status: string; createdAt: string; processedAt?: string; notes?: string }> } {
  try {
    const userTransactions = transactions
      .filter(t => t.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + limit);

  const formattedTransactions = userTransactions.map(transaction => ({
      id: transaction.id,
      amount: transaction.amount,
      currency: transaction.currency,
      provider: transaction.provider,
      recipientAccount: transaction.recipient_account,
      status: transaction.status,
      createdAt: transaction.created_at,
      processedAt: transaction.processed_at,
      notes: transaction.notes
    }));

    return {
      success: true,
      message: "Transactions retrieved successfully",
      transactions: formattedTransactions
    };
  } catch (_error) {
    return { success: false, message: "Failed to retrieve transactions" };
  }
}

export function getAllTransactions(limit: number = 100, offset: number = 0): { success: boolean; message: string; transactions?: Array<{ id: number; amount: number; currency: string; provider: string; recipientAccount: string; status: string; createdAt: string; processedAt?: string; notes?: string; userUsername: string; userFullName: string; processedByUsername: string | null; processedByFullName: string | null }> } {
  try {
    const sortedTransactions = transactions
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + limit);

    const formattedTransactions = sortedTransactions.map(transaction => {
      const user = users.find(u => u.id === transaction.user_id);
      const employee = employees.find(e => e.id === transaction.processed_by);

  return {
        id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        provider: transaction.provider,
        recipientAccount: transaction.recipient_account,
        status: transaction.status,
        createdAt: transaction.created_at,
        processedAt: transaction.processed_at,
        notes: transaction.notes,
        userUsername: user?.username || 'Unknown',
        userFullName: user?.full_name || 'Unknown User',
        processedByUsername: employee?.username || null,
        processedByFullName: employee?.full_name || null
      };
    });

    return {
      success: true,
      message: "Transactions retrieved successfully",
      transactions: formattedTransactions
    };
  } catch (_error) {
    return { success: false, message: "Failed to retrieve transactions" };
  }
}

export function approveTransaction(transactionId: number, employeeId: number, ipAddress: string): { success: boolean; message: string } {
  try {
    const transactionIndex = transactions.findIndex(t => t.id === transactionId);

    if (transactionIndex === -1) {
      return { success: false, message: "Transaction not found" };
    }

    const transaction = transactions[transactionIndex];
    if (transaction.status !== 'pending') {
      return { success: false, message: "Transaction is not pending" };
    }

    // Update transaction in memory
    transactions[transactionIndex] = {
      ...transaction,
      status: 'approved',
      processed_at: new Date().toISOString(),
      processed_by: employeeId
    };

    logSecurityEvent({
      employee_id: employeeId,
      action: "TRANSACTION_APPROVED",
      ip_address: ipAddress,
      details: `Transaction ${transactionId} approved`,
      severity: "info",
      timestamp: new Date().toISOString()
    });

    return { success: true, message: "Transaction approved successfully" };
  } catch (error) {
    logSecurityEvent({
      employee_id: employeeId,
      action: "TRANSACTION_APPROVAL_FAILED",
      ip_address: ipAddress,
      details: `Transaction approval failed: ${error instanceof Error ? error.message : String(error)}`,
      severity: "error",
      timestamp: new Date().toISOString()
    });
    return { success: false, message: "Failed to approve transaction" };
  }
}

export function denyTransaction(transactionId: number, employeeId: number, reason: string, ipAddress: string): { success: boolean; message: string } {
  try {
    const transactionIndex = transactions.findIndex(t => t.id === transactionId);

    if (transactionIndex === -1) {
      return { success: false, message: "Transaction not found" };
    }

    const transaction = transactions[transactionIndex];
    if (transaction.status !== 'pending') {
      return { success: false, message: "Transaction is not pending" };
    }

    // Update transaction in memory
    transactions[transactionIndex] = {
      ...transaction,
      status: 'denied',
      processed_at: new Date().toISOString(),
      processed_by: employeeId,
      notes: (transaction.notes || '') + ` | Denied: ${reason}`
    };

    logSecurityEvent({
      employee_id: employeeId,
      action: "TRANSACTION_DENIED",
      ip_address: ipAddress,
      details: `Transaction ${transactionId} denied. Reason: ${reason}`,
      severity: "warning",
      timestamp: new Date().toISOString()
    });

    return { success: true, message: "Transaction denied successfully" };
  } catch (error) {
    logSecurityEvent({
      employee_id: employeeId,
      action: "TRANSACTION_DENIAL_FAILED",
      ip_address: ipAddress,
      details: `Transaction denial failed: ${error instanceof Error ? error.message : String(error)}`,
      severity: "error",
      timestamp: new Date().toISOString()
    });
    return { success: false, message: "Failed to deny transaction" };
  }
}

export function getTransactionStatistics(): { success: boolean; message: string; statistics?: { totalTransactions: number; pendingCount: number; approvedCount: number; deniedCount: number; totalApprovedAmount: number; uniqueUsers: number } } {
  try {
    const totalTransactions = transactions.length;
    const pendingCount = transactions.filter(t => t.status === 'pending').length;
    const approvedCount = transactions.filter(t => t.status === 'approved').length;
    const deniedCount = transactions.filter(t => t.status === 'denied').length;
    const totalApprovedAmount = transactions
      .filter(t => t.status === 'approved')
      .reduce((sum, t) => sum + t.amount, 0);
    const uniqueUsers = new Set(transactions.map(t => t.user_id)).size;

    const statistics = {
      totalTransactions,
      pendingCount,
      approvedCount,
      deniedCount,
      totalApprovedAmount,
      uniqueUsers
    };

    return {
      success: true,
      message: "Statistics retrieved successfully",
      statistics
    };
  } catch (_error) {
    return { success: false, message: "Failed to retrieve statistics" };
  }
}