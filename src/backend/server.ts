import { Application, Router, send, Context } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";

import { initializeDatabase, seedDefaultEmployee, seedExampleUsers } from "./database/init.ts";
import { registerUser, loginUser, loginEmployee, generateCSRFToken, logSecurityEvent } from "./auth/auth.ts";
import { createPayment, getUserTransactions, getAllTransactions, approveTransaction, denyTransaction, getTransactionStatistics } from "./payments/payments.ts";
import { 
  getSecurityLogs, 
  getAllUsers, 
  getAllEmployees, 
  toggleUserAccount, 
  toggleEmployeeAccount, 
  getSystemStatistics, 
  getFailedLoginAttemptsReport, 
  cleanupOldLogs 
} from "./admin/admin.ts";
import { 
  authenticateUser, 
  authenticateEmployee, 
  authenticateToken,
  rateLimit, 
  csrfProtection, 
  logRequests 
} from "./middleware/middleware.ts";
import { DatabaseUtils } from "./utils/database.ts";

// Type definitions for middleware
type MiddlewareFunction = (ctx: Context, next: () => Promise<unknown>) => Promise<void>;

const app = new Application();
const router = new Router();

initializeDatabase();
await seedDefaultEmployee();
await seedExampleUsers();

app.use(logRequests);
app.use(rateLimit);

app.use(async (ctx, next) => {
  ctx.response.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; form-action 'self';");
  ctx.response.headers.set("X-Frame-Options", "DENY");
  ctx.response.headers.set("X-Content-Type-Options", "nosniff");
  ctx.response.headers.set("X-XSS-Protection", "1; mode=block");
  ctx.response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  ctx.response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  await next();
});

app.use(oakCors({
  origin: ["http://localhost:3000", "http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
}));

router.get("/", async (ctx) => {
  await send(ctx, "index.html", {
    root: `${Deno.cwd()}/src/frontend/public`,
  });
});

router.get("/styles/:file", async (ctx) => {
  await send(ctx, ctx.params.file, {
    root: `${Deno.cwd()}/src/frontend/styles`,
  });
});

router.get("/js/:file", async (ctx) => {
  await send(ctx, ctx.params.file, {
    root: `${Deno.cwd()}/src/frontend/js`,
  });
});

// Routes for HTML pages
router.get("/select-account", async (ctx) => {
  await send(ctx, "SelectAccount.html", {
    root: `${Deno.cwd()}/src/frontend/public`,
  });
});

router.get("/make-payment", async (ctx) => {
  await send(ctx, "MakePayment.html", {
    root: `${Deno.cwd()}/src/frontend/public`,
  });
});

router.get("/view-payments", async (ctx) => {
  await send(ctx, "ViewPayments.html", {
    root: `${Deno.cwd()}/src/frontend/public`,
  });
});

router.get("/security-logs", async (ctx) => {
  await send(ctx, "SecurityLogs.html", {
    root: `${Deno.cwd()}/src/frontend/public`,
  });
});

router.get("/api", (ctx) => {
  ctx.response.body = { message: "Delta Pay API Server" };
});

router.get("/api/users/all", async (ctx) => {
  try {
    const { getUsers } = await import("./database/init.ts");
    const users = getUsers();

    const sanitizedUsers = users.map(user => ({
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      account_number: user.account_number.slice(-4),
      id_number: user.id_number,
      letter: user.full_name.charAt(0).toUpperCase()
    }));

    ctx.response.body = { success: true, users: sanitizedUsers };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.get("/api/health", async (ctx) => {
  const dbHealth = await DatabaseUtils.healthCheck();
  ctx.response.body = { 
    status: dbHealth.healthy ? "healthy" : "unhealthy", 
    timestamp: new Date().toISOString(),
    database: dbHealth
  };
});

router.post("/api/auth/register", async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;
    const ip = ctx.request.ip || "unknown";
    
    const result = await registerUser(body, ip);
    ctx.response.status = result.success ? 201 : 400;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.post("/api/auth/login", async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;
    const ip = ctx.request.ip || "unknown";
    
    const result = await loginUser(body.username, body.password, ip);
    ctx.response.status = result.success ? 200 : 401;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.post("/api/auth/employee-login", async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;
    const ip = ctx.request.ip || "unknown";
    
    const result = await loginEmployee(body.username, body.password, ip);
    ctx.response.status = result.success ? 200 : 401;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.get("/api/auth/csrf-token", authenticateToken, async (ctx) => {
  try {
    const { userId, userType } = ctx.state.user;
    const token = generateCSRFToken(userType === 'user' ? userId : undefined, userType === 'employee' ? userId : undefined);
    
    ctx.response.body = { success: true, csrfToken: token };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Failed to generate CSRF token" };
  }
});

router.get("/api/user/transactions", authenticateUser, async (ctx) => {
  try {
    const userId = ctx.state.user.userId;
    const page = parseInt(ctx.request.url.searchParams.get("page") || "1");
    const limit = parseInt(ctx.request.url.searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    
    const result = await getUserTransactions(userId, limit, offset);
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.post("/api/user/payments", authenticateUser, csrfProtection, async (ctx) => {
  try {
    const userId = ctx.state.user.userId;
    const body = await ctx.request.body({ type: "json" }).value;
    const ip = ctx.request.ip || "unknown";
    
    const result = await createPayment(body, userId, ip);
    ctx.response.status = result.success ? 201 : 400;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.get("/api/admin/transactions", authenticateEmployee, async (ctx) => {
  try {
    const page = parseInt(ctx.request.url.searchParams.get("page") || "1");
    const limit = parseInt(ctx.request.url.searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    
    const result = await getAllTransactions(limit, offset);
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.put("/api/admin/transactions/:id/approve", authenticateEmployee, csrfProtection, async (ctx) => {
  try {
    const transactionId = parseInt(ctx.params.id);
    const employeeId = ctx.state.user.userId;
    const ip = ctx.request.ip || "unknown";
    
    const result = await approveTransaction(transactionId, employeeId, ip);
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.put("/api/admin/transactions/:id/deny", authenticateEmployee, csrfProtection, async (ctx) => {
  try {
    const transactionId = parseInt(ctx.params.id);
    const employeeId = ctx.state.user.userId;
    const body = await ctx.request.body({ type: "json" }).value;
    const ip = ctx.request.ip || "unknown";
    
    const result = await denyTransaction(transactionId, employeeId, body.reason, ip);
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.get("/api/admin/security-logs", authenticateEmployee, async (ctx) => {
  try {
    const page = parseInt(ctx.request.url.searchParams.get("page") || "1");
    const limit = parseInt(ctx.request.url.searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    const severity = ctx.request.url.searchParams.get("severity") || undefined;
    
    const result = await getSecurityLogs(limit, offset, severity);
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.get("/api/admin/users", authenticateEmployee, async (ctx) => {
  try {
    const page = parseInt(ctx.request.url.searchParams.get("page") || "1");
    const limit = parseInt(ctx.request.url.searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    
    const result = await getAllUsers(limit, offset);
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.get("/api/admin/employees", authenticateEmployee, async (ctx) => {
  try {
    const page = parseInt(ctx.request.url.searchParams.get("page") || "1");
    const limit = parseInt(ctx.request.url.searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    
    const result = await getAllEmployees(limit, offset);
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.put("/api/admin/users/:id/toggle", authenticateEmployee, csrfProtection, async (ctx) => {
  try {
    const userId = parseInt(ctx.params.id);
    const employeeId = ctx.state.user.userId;
    const body = await ctx.request.body({ type: "json" }).value;
    const ip = ctx.request.ip || "unknown";
    
    const result = await toggleUserAccount(userId, body.lock, employeeId, ip, body.reason);
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.get("/api/admin/statistics", authenticateEmployee, async (ctx) => {
  try {
    const result = await getSystemStatistics();
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.get("/api/admin/failed-login-report", authenticateEmployee, async (ctx) => {
  try {
    const hours = parseInt(ctx.request.url.searchParams.get("hours") || "24");
    const result = await getFailedLoginAttemptsReport(hours);
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.post("/api/admin/cleanup-logs", authenticateEmployee, csrfProtection, async (ctx) => {
  try {
    const employeeId = ctx.state.user.userId;
    const body = await ctx.request.body({ type: "json" }).value;
    const ip = ctx.request.ip || "unknown";
    const daysToKeep = body.daysToKeep || 90;
    
    const result = await cleanupOldLogs(daysToKeep, employeeId, ip);
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.get("/api/statistics/transactions", async (ctx) => {
  try {
    const result = await getTransactionStatistics();
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

// Frontend security logging endpoint
router.post("/api/security/log", async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;
    const ip = ctx.request.ip || "unknown";

    // #COMPLETION_DRIVE: Assuming frontend provides valid event data
    // #SUGGEST_VERIFY: Add input validation for required fields
    logSecurityEvent({
      action: body.eventType || 'FRONTEND_EVENT',
      ipAddress: ip,
      details: JSON.stringify(body.details || {}),
      severity: 'info',
      userAgent: body.userAgent || ctx.request.headers.get("user-agent") || undefined
    });

    ctx.response.status = 200;
    ctx.response.body = { success: true, message: "Security event logged successfully" };
  } catch (error) {
    console.error("Security logging error:", error);
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Failed to log security event" };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    console.error("Unhandled error:", error);
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Internal server error" };
  }
});

app.use(async (ctx) => {
  ctx.response.status = 404;
  ctx.response.body = { success: false, message: "Endpoint not found" };
});

setInterval(async () => {
  try {
    await DatabaseUtils.cleanupExpiredRecords();
    console.log("Periodic cleanup completed");
  } catch (error) {
    console.error("Periodic cleanup failed:", error);
  }
}, 60 * 60 * 1000);

const port = 3623;
console.log(`Delta Pay API Server running on http://localhost:${port}`);
console.log("Database initialized and ready");
console.log("Default admin employee: username=admin, password=admin123");

await app.listen({ port });
