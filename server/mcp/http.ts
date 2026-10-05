import type { Express, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createGrokMcpServer } from "./server";

const transports = new Map<string, StreamableHTTPServerTransport>();

function authenticate(req: Request, res: Response): boolean {
  const expectedToken = process.env.GROK_MCP_TOKEN;

  if (!expectedToken) {
    console.error("[MCP] GROK_MCP_TOKEN is not configured.");
    res.status(503).json({
      error: "MCP authentication is not configured.",
    });
    return false;
  }

  const auth = req.headers.authorization;

  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Authorization required.",
    });
    return false;
  }

  const suppliedToken = auth.slice("Bearer ".length);

  if (suppliedToken !== expectedToken) {
    res.status(403).json({
      error: "Invalid MCP credentials.",
    });
    return false;
  }

  return true;
}

export function registerMcpRoutes(app: Express): void { 
  app.get("/mcp-health", (_req, res) => {
    res.json({ mcp: "online" });
  });
  app.post("/mcp", async (req: Request, res: Response) => {
    if (!authenticate(req, res)) return;

    try {
      const sessionId = req.headers["mcp-session-id"] as
        | string
        | undefined;

      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports.has(sessionId)) {
        transport = transports.get(sessionId)!;
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),

          onsessioninitialized: (newSessionId) => {
            transports.set(newSessionId, transport);
            console.log(
              `[MCP] Session initialized: ${newSessionId}`,
            );
          },
        });

        transport.onclose = () => {
          if (transport.sessionId) {
            transports.delete(transport.sessionId);
            console.log(
              `[MCP] Session closed: ${transport.sessionId}`,
            );
          }
        };

        const server = createGrokMcpServer();
        await server.connect(transport);
      } else {
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Invalid or missing MCP session.",
          },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("[MCP] POST error:", error);

      if (!res.headersSent) {
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

  app.get("/mcp", async (req: Request, res: Response) => {
    if (!authenticate(req, res)) return;

    const sessionId = req.headers["mcp-session-id"] as
      | string
      | undefined;

    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).send("Invalid or missing MCP session.");
      return;
    }

    await transports.get(sessionId)!.handleRequest(req, res);
  });

  app.delete("/mcp", async (req: Request, res: Response) => {
    if (!authenticate(req, res)) return;

    const sessionId = req.headers["mcp-session-id"] as
      | string
      | undefined;

    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).send("Invalid or missing MCP session.");
      return;
    }

    await transports.get(sessionId)!.handleRequest(req, res);
  });

  console.log("[MCP] Authenticated /mcp endpoint registered.");
}