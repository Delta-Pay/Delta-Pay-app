import { verifyToken, logSecurityEvent } from "../auth/auth.ts";
import { db } from "../database/init.ts";

export async function authenticateToken(ctx: any, next: () => Promise<void>) {
  const authHeader = ctx.request.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "Authorization token required" };
    return;
  }

  const token = authHeader.substring(7);
  const decoded = await verifyToken(token);

  if (!decoded) {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "Invalid or expired token" };
    return;
  }

  ctx.state.user = decoded;
  await next();
}

export async function authenticateUser(ctx: any, next: () => Promise<void>) {
  await authenticateToken(ctx, async () => {
    if (ctx.state.user.userType !== 'user') {
      ctx.response.status = 403;
      ctx.response.body = { success: false, message: "User access required" };
      return;
    }
    await next();
  });
}

export async function authenticateEmployee(ctx: any, next: () => Promise<void>) {
  await authenticateToken(ctx, async () => {
    if (ctx.state.user.userType !== 'employee') {
      ctx.response.status = 403;
      ctx.response.body = { success: false, message: "Employee access required" };
      return;
    }
    await next();
  });
}

export async function rateLimit(ctx: any, next: () => Promise<void>) {
  const ip = ctx.request.ip || "unknown";
  const endpoint = ctx.request.url.pathname;
  const now = new Date();
  const windowMs = 15 * 60 * 1000;
  const maxRequests = 100;

  try {
    db.execute(
      "DELETE FROM rate_limits WHERE last_request < datetime('now', '-15 minutes')"
    );

    const record = db.query(
      "SELECT request_count, first_request FROM rate_limits WHERE ip_address = ? AND endpoint = ?",
      [ip, endpoint]
    );

    if (record.length === 0) {
      db.execute(
        "INSERT INTO rate_limits (ip_address, endpoint, request_count, first_request, last_request) VALUES (?, ?, 1, ?, ?)",
        [ip, endpoint, now.toISOString(), now.toISOString()]
      );
      await next();
      return;
    }

    const [requestCount, firstRequest] = record[0];
    const firstRequestTime = new Date(firstRequest as string);
    const windowStart = new Date(now.getTime() - windowMs);

    if (firstRequestTime < windowStart) {
      db.execute(
        "UPDATE rate_limits SET request_count = 1, first_request = ?, last_request = ? WHERE ip_address = ? AND endpoint = ?",
        [now.toISOString(), now.toISOString(), ip, endpoint]
      );
      await next();
      return;
    }

    if (requestCount >= maxRequests) {
      logSecurityEvent({
        action: "RATE_LIMIT_EXCEEDED",
        ipAddress: ip,
        details: `Rate limit exceeded for ${endpoint}`,
        severity: "warning"
      });

      ctx.response.status = 429;
      ctx.response.body = { 
        success: false, 
        message: "Too many requests. Please try again later.",
        retryAfter: Math.ceil((firstRequestTime.getTime() + windowMs - now.getTime()) / 1000)
      };
      return;
    }

    db.execute(
      "UPDATE rate_limits SET request_count = request_count + 1, last_request = ? WHERE ip_address = ? AND endpoint = ?",
      [now.toISOString(), ip, endpoint]
    );

    await next();
  } catch (error) {
    console.error("Rate limiting error:", error);
    await next();
  }
}

export async function csrfProtection(ctx: any, next: () => Promise<void>) {
  if (ctx.request.method === "GET" || ctx.request.method === "HEAD" || ctx.request.method === "OPTIONS") {
    await next();
    return;
  }

  const csrfToken = ctx.request.headers.get("X-CSRF-Token") || ctx.request.url.searchParams.get("csrf_token");
  
  if (!csrfToken) {
    ctx.response.status = 403;
    ctx.response.body = { success: false, message: "CSRF token required" };
    return;
  }

  try {
    const tokenRecord = db.query(
      "SELECT user_id, employee_id, expires_at, is_used FROM csrf_tokens WHERE token = ?",
      [csrfToken]
    );

    if (tokenRecord.length === 0) {
      logSecurityEvent({
        action: "CSRF_TOKEN_INVALID",
        ipAddress: ctx.request.ip || "unknown",
        details: `Invalid CSRF token provided: ${csrfToken}`,
        severity: "warning"
      });

      ctx.response.status = 403;
      ctx.response.body = { success: false, message: "Invalid CSRF token" };
      return;
    }

    const [userId, employeeId, expiresAt, isUsed] = tokenRecord[0];
    const now = new Date();

    if (isUsed || new Date(expiresAt as string) < now) {
      logSecurityEvent({
        userId: userId || undefined,
        employeeId: employeeId || undefined,
        action: "CSRF_TOKEN_EXPIRED_OR_USED",
        ipAddress: ctx.request.ip || "unknown",
        details: "CSRF token expired or already used",
        severity: "warning"
      });

      db.execute("DELETE FROM csrf_tokens WHERE token = ?", [csrfToken]);

      ctx.response.status = 403;
      ctx.response.body = { success: false, message: "CSRF token expired or already used" };
      return;
    }

    db.execute("UPDATE csrf_tokens SET is_used = 1 WHERE token = ?", [csrfToken]);

    await next();
  } catch (error) {
    console.error("CSRF protection error:", error);
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "CSRF validation failed" };
  }
}

export function generateCSRFToken(userId?: number, employeeId?: number): string {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  db.execute(
    "INSERT INTO csrf_tokens (token, user_id, employee_id, expires_at) VALUES (?, ?, ?, ?)",
    [token, userId || null, employeeId || null, expiresAt.toISOString()]
  );

  return token;
}

export async function logRequests(ctx: any, next: () => Promise<void>) {
  const start = Date.now();
  const ip = ctx.request.ip || "unknown";
  const userAgent = ctx.request.headers.get("User-Agent") || "unknown";
  
  try {
    await next();
    
    const duration = Date.now() - start;
    const status = ctx.response.status;
    
    if (status >= 200 && status < 400) {
      logSecurityEvent({
        action: "REQUEST_SUCCESS",
        ipAddress: ip,
        details: `${ctx.request.method} ${ctx.request.url.pathname} - ${status} (${duration}ms)`,
        severity: "info",
        userAgent
      });
    } else if (status >= 400) {
      logSecurityEvent({
        action: "REQUEST_ERROR",
        ipAddress: ip,
        details: `${ctx.request.method} ${ctx.request.url.pathname} - ${status} (${duration}ms)`,
        severity: "warning",
        userAgent
      });
    }
  } catch (error) {
    const duration = Date.now() - start;
    
    logSecurityEvent({
      action: "REQUEST_EXCEPTION",
      ipAddress: ip,
      details: `${ctx.request.method} ${ctx.request.url.pathname} - Exception: ${error.message} (${duration}ms)`,
      severity: "error",
      userAgent
    });
    
    throw error;
  }
}