import express, {
  type Request,
  Response,
  NextFunction,
} from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedProducts } from "./seed-products";
import {
  activateImmutabilityGuard,
  getImmutabilityStatus,
} from "./security/immutabilityGuard";
import { domainEnforcer } from "./middleware/domainEnforcer";
import { registerMcpRoutes } from "./mcp/http";
import { protectResponse, redact, sendError, ControlError } from "./safety/primitives";
import {migrateCommerce} from "./commerce/migrations";
import {pool as commerceMigrationPool} from "./db";
import {initializeNativeStripe} from "./commerce/native-stripe";

const app = express();
const httpServer = createServer(app);
for (const level of ["log", "warn", "error", "info", "debug"] as const) {
  const original = console[level].bind(console);
  console[level] = (...args: any[]) => original(...args.map(redact));
}
app.use(protectResponse);

// ---------------------------------------------------------
// BASIC MIDDLEWARE
// ---------------------------------------------------------

app.use(cookieParser());

// ---------------------------------------------------------
// DOMAIN ENFORCER
//
// Normal application traffic remains protected by the
// existing domainEnforcer.
//
// /mcp must be reachable by an external MCP client such as
// Grok. Authentication for /mcp is handled separately using
// GROK_MCP_TOKEN.
// ---------------------------------------------------------

app.use((req, res, next) => {
  if (req.path === "/mcp" || req.path === "/mcp-health") {
    return next();
  }

  return domainEnforcer(req, res, next);
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ---------------------------------------------------------
// BODY PARSERS
// ---------------------------------------------------------

app.use(
  express.json({
    limit: "256kb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "64kb" }));

// ---------------------------------------------------------
// GROK MCP CONNECTOR
//
// IMPORTANT:
// This must be registered before Vite/static catch-all
// handling.
//
// /mcp itself performs Bearer-token authentication using
// the GROK_MCP_TOKEN stored in Replit Secrets.
// ---------------------------------------------------------

registerMcpRoutes(app);

// ---------------------------------------------------------
// LOGGING
// ---------------------------------------------------------

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith("/api")) {
      log(JSON.stringify({ requestId: res.locals.requestId, method: req.method,
        route: typeof req.route?.path === "string" ? req.route.path : "unmatched-api-route",
        status: res.statusCode, durationMs: duration }));
    }
  });

  next();
});

// ---------------------------------------------------------
// APPLICATION STARTUP
// ---------------------------------------------------------

(async () => {
  // Activate existing ledger immutability protection.
  activateImmutabilityGuard();

  console.log(
    "[STARTUP] Immutability Guard Status:",
    getImmutabilityStatus().guardActive
      ? "SEALED"
      : "ERROR",
  );

  // Register the existing Divine Money application routes.
  await migrateCommerce(commerceMigrationPool);
  try{await initializeNativeStripe();}catch{
    console.error("Native Stripe synchronization requires verified configuration.");
  }
  await registerRoutes(httpServer, app);

  // No startup seeding or historical-record mutation in a web replica.

  // -------------------------------------------------------
  // ERROR HANDLER
  // -------------------------------------------------------

  app.use(
    (
      err: any,
      _req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      const status =
        err.status ||
        err.statusCode ||
        500;

      console.error({requestId: res.locals.requestId, category: err?.name || "Error"});
      sendError(res, new ControlError(status >=400 && status<500 ? "INVALID_REQUEST" : "INTERNAL_ERROR", status));
    },
  );

  // -------------------------------------------------------
  // FRONTEND
  //
  // Keep this AFTER API + MCP route registration so Vite
  // cannot swallow /mcp requests.
  // -------------------------------------------------------

  app.use("/api",(_req,res)=>res.status(404).json({error:"NOT_FOUND",code:"NOT_FOUND"}));
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");

    await setupVite(
      httpServer,
      app,
    );
  }

  // -------------------------------------------------------
  // HTTP SERVER
  //
  // Replit exposes the PORT environment variable.
  // Port 5000 remains the development fallback.
  // -------------------------------------------------------

  const port = parseInt(
    process.env.PORT || "5000",
    10,
  );

  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);

      console.log(
        "[MCP] MCP routes registered; persistent source editing is workspace-only.",
      );
    },
  );
})();