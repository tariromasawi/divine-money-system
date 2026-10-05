import type { Express, Request, Response } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createGrokMcpServer } from "./server";

function authenticate(req: Request, res: Response): boolean {
  res.setHeader("Cache-Control", "no-store");

  const expectedToken = process.env.GROK_MCP_TOKEN;
  if (!expectedToken) {
    res.status(503).json({
      error: "MCP authentication is not configured.",
    });
    return false;
  }

  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    res.setHeader("WWW-Authenticate", "Bearer");
    res.status(401).json({
      error: "Authorization required.",
    });
    return false;
  }

  const suppliedToken = authorization.slice("Bearer ".length);
  const expectedDigest = createHash("sha256").update(expectedToken).digest();
  const suppliedDigest = createHash("sha256").update(suppliedToken).digest();

  if (!suppliedToken || !timingSafeEqual(expectedDigest, suppliedDigest)) {
    res.setHeader("WWW-Authenticate", "Bearer");
    res.status(401).json({
      error: "Invalid credentials.",
    });
    return false;
  }

  return true;
}

function requestHostIsAllowed(req: Request): boolean {
  const headerHost = req.get("host") ?? "";
  const host = headerHost
    .replace(/:\d+$/, "")
    .toLowerCase();
  const allowedHosts = new Set([
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
  ]);

  for (const name of [
    process.env.REPLIT_DEV_DOMAIN,
    process.env.REPLIT_DOMAINS,
  ]) {
    for (const candidate of (name ?? "").split(",")) {
      const normalized = candidate
        .trim()
        .replace(/^https?:\/\//i, "")
        .replace(/:\d+$/, "")
        .toLowerCase();
      if (normalized) allowedHosts.add(normalized);
    }
  }

  return allowedHosts.has(host);
}

function requestOriginMatchesHost(req: Request): boolean {
  const origin = req.get("origin");
  if (!origin) return true;

  try {
    const originHost = new URL(origin).host
      .replace(/:\d+$/, "")
      .toLowerCase();
    const requestHost = (req.get("host") ?? "")
      .replace(/:\d+$/, "")
      .toLowerCase();
    return originHost === requestHost;
  } catch {
    return false;
  }
}

export function registerMcpRoutes(app: Express): void {
  app.get("/mcp-health", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({
      mcp:
        process.env.NODE_ENV === "production"
          ? "workspace-only"
          : "online",
    });
  });

  app.all("/mcp", async (req: Request, res: Response) => {
    if (!authenticate(req, res)) return;

    if (process.env.NODE_ENV === "production") {
      res.status(503).json({
        error:
          "MCP source editing is available from the Replit workspace only. Published deployment files are ephemeral.",
      });
      return;
    }

    if (!requestHostIsAllowed(req) || !requestOriginMatchesHost(req)) {
      res.status(403).json({
        error: "MCP request origin is not allowed.",
      });
      return;
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      res.status(405).json({
        error: "This stateless MCP endpoint accepts POST requests only.",
      });
      return;
    }

    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      const server = createGrokMcpServer();

      res.once("close", () => {
        void Promise.allSettled([
          transport.close(),
          server.close(),
        ]);
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      // Do not log request bodies, authorization headers, or arbitrary
      // exception messages from code being inspected by the MCP client.
      console.error(
        "[MCP] Request failed:",
        error instanceof Error ? error.name : "unknown error",
      );

      if (!res.headersSent && !res.writableEnded) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal MCP server error.",
          },
          id: null,
        });
      }
    }
  });

  console.log("[MCP] Workspace-only authenticated endpoint registered.");
}
