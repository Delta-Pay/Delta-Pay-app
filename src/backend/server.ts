import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { Application, Context, Router, send } from "https://deno.land/x/oak@v12.6.1/mod.ts";

// {Employees log in to check transactions (README)} --> {Demo walkthrough keeps admin endpoints open; JWT/CSRF optional for future hardening}
import {
  cleanupOldLogs,
  createUser,
  getAllEmployees,
  getAllUsers,
  getFailedLoginAttemptsReport,
  getSecurityLogs,
  getSystemStatistics,
  toggleUserAccount
} from "./admin/admin.ts";
import { authenticateUserPassword, generateCSRFToken, loginEmployee, loginUser, logSecurityEvent, registerUser } from "./auth/auth.ts";
import { initializeDatabase, seedDefaultEmployee, seedExampleUsers } from "./database/init.ts";
import {
  authenticateToken,
  authenticateUser,
  csrfProtection,
  logRequests,
  rateLimit
} from "./middleware/middleware.ts";
import { approveTransaction, createPayment, denyTransaction, getAllTransactions, getTransactionStatistics, getUserTransactions } from "./payments/payments.ts";
import { DatabaseUtils } from "./utils/database.ts";

type MiddlewareFunction = (ctx: Context, next: () => Promise<unknown>) => Promise<void>;

const app = new Application();
const router = new Router();

initializeDatabase();
await seedDefaultEmployee();
await seedExampleUsers();

app.use(logRequests);
app.use(rateLimit);

app.use(async (ctx, next) => {
  ctx.response.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'; form-action 'self';");
  ctx.response.headers.set("X-Frame-Options", "DENY");
  ctx.response.headers.set("X-Content-Type-Options", "nosniff");
  ctx.response.headers.set("X-XSS-Protection", "1; mode=block");
  ctx.response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  ctx.response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  await next();
});

const corsOrigins = (Deno.env.get('CORS_ORIGINS') || 'http://localhost:3000,http://localhost:5173,http://localhost:3623')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(oakCors({
  origin: corsOrigins,
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

router.get("/select-account", async (ctx) => {
  await send(ctx, "index.html", {
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

router.get("/create-user", async (ctx) => {
  await send(ctx, "CreateUser.html", {
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
      account_number: user.account_number,
      id_number: user.id_number,
      email: user.email,
      phone_number: user.phone_number,
      date_of_birth: user.date_of_birth,
      nationality: user.nationality,
      address_line_1: user.address_line_1,
      address_line_2: user.address_line_2,
      city: user.city,
      state_province: user.state_province,
      postal_code: user.postal_code,
      country: user.country,
      account_balance: user.account_balance,
      currency: user.currency,
      account_type: user.account_type,
      preferred_language: user.preferred_language,
      occupation: user.occupation,
      annual_income: user.annual_income,
      created_at: user.created_at,
      is_active: user.is_active,
      letter: user.full_name.charAt(0).toUpperCase()
    }));

    ctx.response.body = { success: true, users: sanitizedUsers };
  } catch (_error) {
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
  } catch (_error) {
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
  } catch (_error) {
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
  } catch (_error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.post("/api/auth/authenticate-password", async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;
    const ip = ctx.request.ip || "unknown";

    const result = await authenticateUserPassword(body.username, body.password, ip);
    ctx.response.status = result.success ? 200 : 401;
    ctx.response.body = result;
  } catch (_error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.get("/api/auth/csrf-token", authenticateToken, (ctx) => {
  try {
    const { userId, userType } = ctx.state.user;
    const token = generateCSRFToken(userType === 'user' ? userId : undefined, userType === 'employee' ? userId : undefined);
    
    ctx.response.body = { success: true, csrfToken: token };
  } catch (_error) {
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
  } catch (_error) {
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
  } catch (_error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.get("/api/admin/transactions", async (ctx) => {
  try {
    const page = parseInt(ctx.request.url.searchParams.get("page") || "1");
    const limit = parseInt(ctx.request.url.searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    
    const result = await getAllTransactions(limit, offset);
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (_error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.put("/api/admin/transactions/:id/approve", async (ctx) => {
  try {
    const transactionId = Number.parseInt(ctx.params.id);
    const employeeId = Number(ctx.state.user?.userId ?? 0);
    const ip = ctx.request.ip || "unknown";
    
    const result = await approveTransaction(transactionId, employeeId, ip);
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (_error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.put("/api/admin/transactions/:id/deny", async (ctx) => {
  try {
    const transactionId = Number.parseInt(ctx.params.id);
    const employeeId = Number(ctx.state.user?.userId ?? 0);
    const body = await ctx.request.body({ type: "json" }).value;
    const ip = ctx.request.ip || "unknown";
    
    const result = await denyTransaction(transactionId, employeeId, body.reason, ip);
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (_error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.get("/api/admin/security-logs", async (ctx) => {
  try {
    const page = parseInt(ctx.request.url.searchParams.get("page") || "1");
    const limit = parseInt(ctx.request.url.searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    const severity = ctx.request.url.searchParams.get("severity") || undefined;
    
    const result = await getSecurityLogs(limit, offset, severity);
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (_error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.get("/api/admin/users", async (ctx) => {
  try {
    const page = parseInt(ctx.request.url.searchParams.get("page") || "1");
    const limit = parseInt(ctx.request.url.searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    
    const result = await getAllUsers(limit, offset);
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (_error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.get("/api/admin/employees", async (ctx) => {
  try {
    const page = parseInt(ctx.request.url.searchParams.get("page") || "1");
    const limit = parseInt(ctx.request.url.searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    
    const result = await getAllEmployees(limit, offset);
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (_error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.put("/api/admin/users/:id/toggle", async (ctx) => {
  try {
    const userId = parseInt(ctx.params.id);
    const employeeId = Number(ctx.state.user?.userId ?? 0);
    const body = await ctx.request.body({ type: "json" }).value;
    const ip = ctx.request.ip || "unknown";
    
    const result = await toggleUserAccount(userId, body.lock, employeeId, ip, body.reason);
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (_error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.get("/api/admin/statistics", async (ctx) => {
  try {
    const result = await getSystemStatistics();
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (_error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

// Admin: Create new user (Part 3 requirement - no customer self-registration)
router.post("/api/admin/users/create", async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;
    const employeeId = Number(ctx.state.user?.userId ?? 0); // 0 for demo mode
    const ip = ctx.request.ip || "unknown";
    
    const result = await createUser(body, employeeId, ip);
    ctx.response.status = result.success ? 201 : 400;
    ctx.response.body = result;
  } catch (_error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.get("/api/admin/failed-login-report", async (ctx) => {
  try {
    const hours = parseInt(ctx.request.url.searchParams.get("hours") || "24");
    const result = await getFailedLoginAttemptsReport(hours);
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (_error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.post("/api/admin/cleanup-logs", async (ctx) => {
  try {
    const employeeId = Number(ctx.state.user?.userId ?? 0);
    const body = await ctx.request.body({ type: "json" }).value;
    const ip = ctx.request.ip || "unknown";
  let daysToKeep = Number(body.daysToKeep || 90);
  if (!Number.isFinite(daysToKeep)) daysToKeep = 90;
  daysToKeep = Math.min(365, Math.max(7, Math.floor(daysToKeep)));
    
    const result = await cleanupOldLogs(daysToKeep, employeeId, ip);
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (_error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.get("/api/statistics/transactions", async (ctx) => {
  try {
    const result = await getTransactionStatistics();
    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = result;
  } catch (_error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Server error" };
  }
});

router.post("/api/security/log", async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;
    const ip = ctx.request.ip || "unknown";

    const eventType = typeof body.eventType === 'string' && body.eventType.length <= 64 ? body.eventType : 'FRONTEND_EVENT';
    const detailsObj = (body && typeof body.details === 'object' && body.details !== null) ? body.details : {};
    const safeDetails = JSON.stringify(detailsObj).slice(0, 2000);
    const userAgent = body.userAgent || ctx.request.headers.get("user-agent") || undefined;

    logSecurityEvent({
      action: eventType,
      ipAddress: ip,
      details: safeDetails,
      severity: 'info',
      userAgent
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

app.use((ctx) => {
  ctx.response.status = 404;
  ctx.response.body = { success: false, message: "Endpoint not found" };
});

const cleanupInterval = setInterval(async () => {
  try {
    await DatabaseUtils.cleanupExpiredRecords();
    console.log("Periodic cleanup completed");
  } catch (error) {
    console.error("Periodic cleanup failed:", error);
  }
}, 60 * 60 * 1000);

const shutdownController = new AbortController();

const handleShutdown = (signal: Deno.Signal) => {
  console.log(`Received ${signal}, shutting down Delta Pay API server`);
  clearInterval(cleanupInterval);
  shutdownController.abort();
};

try {
  Deno.addSignalListener("SIGTERM", () => handleShutdown("SIGTERM"));
  Deno.addSignalListener("SIGINT", () => handleShutdown("SIGINT"));
} catch (_) {;}

const port = Number(Deno.env.get('PORT') || 3623);
console.log(`Delta Pay API Server running on http://localhost:${port}`);
console.log("Database initialized and ready");
console.log("Default admin employee: username=admin, password=admin123");

try {
  await app.listen({ port, signal: shutdownController.signal });
} catch (error) {
  if (!(error instanceof DOMException && error.name === "AbortError")) {
    console.error("Server listen error:", error);
    throw error;
  }
}

console.log("Delta Pay API server stopped cleanly");
Deno.exit(0);
