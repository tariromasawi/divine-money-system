import assert from "node:assert/strict";
import fs from "node:fs/promises";
import express from "express";
import { registerMcpRoutes } from "../server/mcp/http.ts";
import { randomUUID } from "node:crypto";

const testToken = `mcp-e2e-only-${randomUUID()}`;
const testFile = `.mcp-e2e-${randomUUID()}.txt`;
const originalNodeEnv = process.env.NODE_ENV;

process.env.NODE_ENV = "development";
process.env.GROK_MCP_TOKEN = testToken;

function decodeResponse(response, rawText) {
  if (response.headers.get("content-type")?.includes("text/event-stream")) {
    const dataLine = rawText
      .split(/\r?\n/)
      .find((line) => line.startsWith("data: "));
    assert.ok(dataLine, "MCP response did not contain an SSE data frame");
    return JSON.parse(dataLine.slice("data: ".length));
  }
  return rawText ? JSON.parse(rawText) : undefined;
}

async function requestMcp(baseUrl, body, authorization = `Bearer ${testToken}`) {
  const response = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify(body),
  });
  const rawText = await response.text();
  return {
    response,
    message: decodeResponse(response, rawText),
    rawText,
  };
}

async function callTool(baseUrl, name, args = {}) {
  const { response, message } = await requestMcp(baseUrl, {
    jsonrpc: "2.0",
    id: randomUUID(),
    method: "tools/call",
    params: { name, arguments: args },
  });

  assert.equal(response.status, 200, `${name} returned HTTP ${response.status}`);
  assert.equal(message?.error, undefined, `${name} returned a JSON-RPC error`);
  return message.result;
}

function resultText(result) {
  return result?.content?.find((item) => item.type === "text")?.text ?? "";
}

async function main() {
  const app = express();
  app.use(express.json());
  registerMcpRoutes(app);
  const httpServer = app.listen(0, "127.0.0.1");
  const disposablePaths = new Set();
  let preserveFileForRestart = false;

  try {
    await new Promise((resolve, reject) => {
      httpServer.once("listening", resolve);
      httpServer.once("error", reject);
    });

    const address = httpServer.address();
    assert.ok(address && typeof address === "object");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const health = await fetch(`${baseUrl}/mcp-health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { mcp: "online" });

    const unauthenticated = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
    });
    assert.equal(unauthenticated.status, 401);

    const invalidAuth = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        Authorization: "Bearer definitely-not-the-test-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
    });
    assert.equal(invalidAuth.status, 401);

    const initialize = await requestMcp(baseUrl, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "mcp-e2e-smoke", version: "1.0.0" },
      },
    });
    assert.equal(initialize.response.status, 200);
    assert.equal(initialize.message?.result?.serverInfo?.name, "divine-money-project");

    const initialized = await requestMcp(baseUrl, {
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });
    assert.ok(
      initialized.response.status === 200 || initialized.response.status === 202,
      `initialized notification returned HTTP ${initialized.response.status}`,
    );

    const toolList = await requestMcp(baseUrl, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });
    assert.equal(toolList.response.status, 200);
    const toolNames = toolList.message?.result?.tools?.map((tool) => tool.name) ?? [];
    const expectedTools = [
      "read_file",
      "write_file",
      "replace_text",
      "delete_file",
      "move_file",
      "list_files",
      "search_code",
      "project_status",
      "run_check",
      "run_build",
      "git_status",
      "git_diff",
    ];
    for (const name of expectedTools) {
      assert.ok(toolNames.includes(name), `tool ${name} was not advertised`);
    }

    const statusResult = await callTool(baseUrl, "project_status");
    assert.equal(JSON.parse(resultText(statusResult)).sourceMode, "replit-workspace");

    const filesResult = await callTool(baseUrl, "list_files", { path: "server/mcp" });
    assert.ok(resultText(filesResult).includes("projectAccess.ts"));

    const packageResult = await callTool(baseUrl, "read_file", { path: "package.json" });
    assert.ok(resultText(packageResult).includes('"name": "rest-express"'));

    const searchResult = await callTool(baseUrl, "search_code", {
      query: "createGrokMcpServer",
      path: "server/mcp",
    });
    assert.ok(JSON.parse(resultText(searchResult)).matches.length > 0);

    const checkResult = await callTool(baseUrl, "run_check");
    assert.equal(checkResult.isError, undefined, "run_check failed");
    const buildResult = await callTool(baseUrl, "run_build");
    assert.equal(buildResult.isError, undefined, "run_build failed");
    const gitStatus = await callTool(baseUrl, "git_status");
    assert.equal(gitStatus.isError, undefined, "git_status failed");
    const gitDiff = await callTool(baseUrl, "git_diff");
    assert.equal(gitDiff.isError, undefined, "git_diff failed");
    assert.ok(
      !resultText(gitDiff).includes("DEPLOYER_PRIVATE_KEY"),
      "git_diff exposed excluded Replit environment configuration",
    );

    for (const protectedPath of [".replit", ".env.local", "../etc/passwd"]) {
      const blocked = await callTool(baseUrl, "read_file", { path: protectedPath });
      assert.equal(blocked.isError, true, `protected path was readable: ${protectedPath}`);
    }

    const symlinkPath = `.mcp-e2e-link-${randomUUID()}`;
    await fs.symlink("/etc/passwd", symlinkPath);
    try {
      const blockedLink = await callTool(baseUrl, "read_file", { path: symlinkPath });
      assert.equal(blockedLink.isError, true, "symbolic link was readable");
    } finally {
      await fs.unlink(symlinkPath).catch(() => {});
    }

    const written = await callTool(baseUrl, "write_file", {
      path: testFile,
      content: "original",
    });
    assert.equal(written.isError, undefined);
    disposablePaths.add(testFile);

    const initialRead = await callTool(baseUrl, "read_file", { path: testFile });
    assert.equal(resultText(initialRead), "original");

    const replaced = await callTool(baseUrl, "replace_text", {
      path: testFile,
      search: "original",
      replacement: "edited",
    });
    assert.equal(replaced.isError, undefined);
    const editedRead = await callTool(baseUrl, "read_file", { path: testFile });
    assert.equal(resultText(editedRead), "edited");

    const movedPath = `${testFile}.moved`;
    const moved = await callTool(baseUrl, "move_file", {
      from: testFile,
      to: movedPath,
    });
    assert.equal(moved.isError, undefined);
    disposablePaths.delete(testFile);
    disposablePaths.add(movedPath);
    const movedRead = await callTool(baseUrl, "read_file", { path: movedPath });
    assert.equal(resultText(movedRead), "edited");
    const removed = await callTool(baseUrl, "delete_file", { path: movedPath });
    assert.equal(removed.isError, undefined);
    disposablePaths.delete(movedPath);

    const persistenceWrite = await callTool(baseUrl, "write_file", {
      path: testFile,
      content: "before-restart",
    });
    assert.equal(persistenceWrite.isError, undefined);
    disposablePaths.add(testFile);
    preserveFileForRestart = true;

    console.log(JSON.stringify({
      phase: "created",
      file: testFile,
      testedTools: toolNames,
      authentication: "missing-and-invalid-rejected; test bearer accepted",
      protocol: "initialize, initialized notification, tools/list",
      protections: "blocked sensitive paths, traversal, and symlink access",
      commandAndGitTools: "run_check, run_build, git_status, git_diff passed",
      fileTools: "write, read, replace, move, delete passed",
      persistence: "disposable source file left for post-restart verification",
    }));

    process.env.NODE_ENV = "production";
    const productionHealth = await fetch(`${baseUrl}/mcp-health`);
    assert.deepEqual(await productionHealth.json(), { mcp: "workspace-only" });
    const productionMcp = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${testToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "initialize" }),
    });
    assert.equal(productionMcp.status, 503);
    console.log("production guard: published MCP editing endpoint disabled");
  } finally {
    if (!preserveFileForRestart) {
      await Promise.all(
        [...disposablePaths].map((relativePath) =>
          fs.unlink(relativePath).catch(() => {}),
        ),
      );
    }
    await new Promise((resolve) => httpServer.close(resolve));
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
}

async function verifyAfterRestart() {
  const app = express();
  app.use(express.json());
  registerMcpRoutes(app);
  const httpServer = app.listen(0, "127.0.0.1");

  try {
    await new Promise((resolve, reject) => {
      httpServer.once("listening", resolve);
      httpServer.once("error", reject);
    });

    const address = httpServer.address();
    assert.ok(address && typeof address === "object");
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const before = await callTool(baseUrl, "read_file", {
      path: process.env.MCP_E2E_FILE,
    });
    assert.equal(resultText(before), "before-restart");

    const edited = await callTool(baseUrl, "replace_text", {
      path: process.env.MCP_E2E_FILE,
      search: "before-restart",
      replacement: "after-restart",
    });
    assert.equal(edited.isError, undefined);

    const after = await callTool(baseUrl, "read_file", {
      path: process.env.MCP_E2E_FILE,
    });
    assert.equal(resultText(after), "after-restart");

    const deleted = await callTool(baseUrl, "delete_file", {
      path: process.env.MCP_E2E_FILE,
    });
    assert.equal(deleted.isError, undefined);
    console.log(JSON.stringify({
      phase: "verified",
      file: process.env.MCP_E2E_FILE,
      persistence: "workspace source file survived server restart",
      operations: "read, replace, read, delete passed",
    }));
  } finally {
    await new Promise((resolve) => httpServer.close(resolve));
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
}

process.env.NODE_ENV = "development";
process.env.GROK_MCP_TOKEN = testToken;

const phase = process.env.MCP_E2E_PHASE ?? "create";
if (phase === "verify") {
  assert.ok(process.env.MCP_E2E_FILE, "Set MCP_E2E_FILE to the created disposable test path.");
  await verifyAfterRestart();
} else {
  await main();
}
