import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";

import { initializeDatabase, seedDefaultEmployee } from "./database/init.ts";
import { registerUser, loginUser, loginEmployee, generateCSRFToken } from "./auth/auth.ts";
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
  rateLimit, 
  csrfProtection, 
  logRequests 
} from "./middleware/middleware.ts";
import { DatabaseUtils } from "./utils/database.ts";

const app = new Application();
const router = new Router();

initializeDatabase();
seedDefaultEmployee();

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

router.get("/", (ctx) => {
  ctx.response.body = { message: "Delta Pay API Server" };
});

router.get("/health", async (ctx) => {
  const dbHealth = await DatabaseUtils.healthCheck();
  ctx.response.body = { 
    status: dbHealth.healthy ? "healthy" : "unhealthy", 
    timestamp: new Date().toISOString(),
    database: dbHealth
  };
});

router.post("/auth/register", async (ctx) => {
  try {
    const body = await ctx.request.body.json();
    const ip = ctx.request.ip || "unknown";
    
    const result = await registerUser(body, ip);
    ctx.response.status = result.success ? 201 : 400;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.post("/auth/login", async (ctx) => {
  try {
    const body = await ctx.request.body.json();
    const ip = ctx.request.ip || "unknown";
    
    const result = await loginUser(body.username, body.password, ip);
    ctx.response.status = result.success ? 200 : 401;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.post("/auth/employee-login", async (ctx) => {
  try {
    const body = await ctx.request.body.json();
    const ip = ctx.request.ip || "unknown";
    
    const result = await loginEmployee(body.username, body.password, ip);
    ctx.response.status = result.success ? 200 : 401;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.get("/auth/csrf-token", authenticateToken, async (ctx) => {
  try {
    const { userId, userType } = ctx.state.user;
    const token = generateCSRFToken(userType === 'user' ? userId : undefined, userType === 'employee' ? userId : undefined);
    
    ctx.response.body = { success: true, csrfToken: token };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Failed to generate CSRF token" };
  }
});

router.get("/user/transactions", authenticateUser, async (ctx) => {
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

router.post("/user/payments", authenticateUser, csrfProtection, async (ctx) => {
  try {
    const userId = ctx.state.user.userId;
    const body = await ctx.request.body.json();
    const ip = ctx.request.ip || "unknown";
    
    const result = await createPayment(body, userId, ip);
    ctx.response.status = result.success ? 201 : 400;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.get("/admin/transactions", authenticateEmployee, async (ctx) => {
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

router.put("/admin/transactions/:id/approve", authenticateEmployee, csrfProtection, async (ctx) => {
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

router.put("/admin/transactions/:id/deny", authenticateEmployee, csrfProtection, async (ctx) => {
  try {
    const transactionId = parseInt(ctx.params.id);
    const employeeId = ctx.state.user.userId;
    const body = await ctx.request.body.json();
    const ip = ctx.request.ip || "unknown";
    
    const result = await denyTransaction(transactionId, employeeId, body.reason, ip);
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.get("/admin/security-logs", authenticateEmployee, async (ctx) => {
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

router.get("/admin/users", authenticateEmployee, async (ctx) => {
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

router.get("/admin/employees", authenticateEmployee, async (ctx) => {
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

router.put("/admin/users/:id/toggle", authenticateEmployee, csrfProtection, async (ctx) => {
  try {
    const userId = parseInt(ctx.params.id);
    const employeeId = ctx.state.user.userId;
    const body = await ctx.request.body.json();
    const ip = ctx.request.ip || "unknown";
    
    const result = await toggleUserAccount(userId, body.lock, employeeId, ip, body.reason);
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.get("/admin/statistics", authenticateEmployee, async (ctx) => {
  try {
    const result = await getSystemStatistics();
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.get("/admin/failed-login-report", authenticateEmployee, async (ctx) => {
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

router.post("/admin/cleanup-logs", authenticateEmployee, csrfProtection, async (ctx) => {
  try {
    const employeeId = ctx.state.user.userId;
    const body = await ctx.request.body.json();
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

router.get("/statistics/transactions", async (ctx) => {
  try {
    const result = await getTransactionStatistics();
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

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

app.use(router.routes());
app.use(router.allowedMethods());

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