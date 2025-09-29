import { Context } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { logSecurityEvent, verifyToken } from "../auth/auth.ts";
import { csrfTokens, rateLimits } from "../database/init.ts";

export async function authenticateToken(ctx: Context, next: () => Promise<unknown>) {
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

export async function authenticateUser(ctx: Context, next: () => Promise<unknown>) {
  await authenticateToken(ctx, async () => {
    if (ctx.state.user.userType !== 'user') {
      ctx.response.status = 403;
      ctx.response.body = { success: false, message: "User access required" };
      return;
    }
    await next();
  });
}

export async function authenticateEmployee(ctx: Context, next: () => Promise<unknown>) {
  await authenticateToken(ctx, async () => {
    if (ctx.state.user.userType !== 'employee') {
      ctx.response.status = 403;
      ctx.response.body = { success: false, message: "Employee access required" };
      return;
    }
    await next();
  });
}

export async function rateLimit(ctx: Context, next: () => Promise<unknown>) {
  const ip = ctx.request.ip || "unknown";
  const endpoint = ctx.request.url.pathname;
  const now = new Date();
  const windowMs = 15 * 60 * 1000;
  const maxRequests = 100;

  try {
    const cutoffTime = new Date(now.getTime() - windowMs);
    for (let i = rateLimits.length - 1; i >= 0; i--) {
      if (new Date(rateLimits[i].last_request) < cutoffTime) {
        rateLimits.splice(i, 1);
      }
    }

    const existingRecord = rateLimits.find(limit =>
      limit.ip_address === ip && limit.endpoint === endpoint
    );

    if (!existingRecord) {
      rateLimits.push({
        ip_address: ip,
        endpoint: endpoint,
        request_count: 1,
        first_request: now.toISOString(),
        last_request: now.toISOString()
      });
      await next();
      return;
    }

    const firstRequestTime = new Date(existingRecord.first_request);
    const windowStart = new Date(now.getTime() - windowMs);

    if (firstRequestTime < windowStart) {
      existingRecord.request_count = 1;
      existingRecord.first_request = now.toISOString();
      existingRecord.last_request = now.toISOString();
      await next();
      return;
    }

    if (existingRecord.request_count >= maxRequests) {
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

    existingRecord.request_count += 1;
    existingRecord.last_request = now.toISOString();

    await next();
  } catch (error) {
    console.error("Rate limiting error:", error);
    await next();
  }
}

export async function csrfProtection(ctx: Context, next: () => Promise<unknown>) {
  if (ctx.request.method === "GET" || ctx.request.method === "HEAD" || ctx.request.method === "OPTIONS") {
    await next();
    return;
  }

  const csrfToken = ctx.request.headers.get("X-CSRF-Token");

  if (!csrfToken) {
    ctx.response.status = 403;
    ctx.response.body = { success: false, message: "CSRF token required" };
    return;
  }

  try {
    const tokenRecord = csrfTokens.find(token => token.token === csrfToken);

    if (!tokenRecord) {
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

  const now = new Date();

  if (tokenRecord.is_used || new Date(tokenRecord.expires_at) < now) {
      logSecurityEvent({
        userId: tokenRecord.user_id || undefined,
        employeeId: tokenRecord.employee_id || undefined,
        action: "CSRF_TOKEN_EXPIRED_OR_USED",
        ipAddress: ctx.request.ip || "unknown",
        details: "CSRF token expired or already used",
        severity: "warning"
      });

      const tokenIndex = csrfTokens.findIndex(token => token.token === csrfToken);
      if (tokenIndex !== -1) {
        csrfTokens.splice(tokenIndex, 1);
      }

      ctx.response.status = 403;
      ctx.response.body = { success: false, message: "CSRF token expired or already used" };
      return;
    }

  tokenRecord.is_used = true;

    await next();
  } catch (error) {
    console.error("CSRF protection error:", error);
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "CSRF validation failed" };
  }
}

export function generateCSRFToken(userId?: number, employeeId?: number): string {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

  csrfTokens.push({
    token: token,
    user_id: userId || null,
    employee_id: employeeId || null,
    expires_at: expiresAt.toISOString(),
    is_used: false
  });

  return token;
}

export async function logRequests(ctx: Context, next: () => Promise<unknown>) {
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logSecurityEvent({
      action: "REQUEST_EXCEPTION",
      ipAddress: ip,
      details: `${ctx.request.method} ${ctx.request.url.pathname} - Exception: ${errorMessage} (${duration}ms)`,
      severity: "error",
      userAgent
    });
    
    throw error;
  }
}
