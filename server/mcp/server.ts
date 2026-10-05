import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  PROJECT_ROOT,
  resolveProjectPath,
  readProjectFile,
  writeProjectFile,
  deleteProjectFile,
  moveProjectFile,
} from "./projectAccess";

const execFileAsync = promisify(execFile);

export function createGrokMcpServer() {
  const server = new McpServer({
    name: "divine-money-project",
    version: "1.0.0",
  });

  // ---------- READ FILE ----------

  server.tool(
    "read_file",
    "Read a UTF-8 source file from the project.",
    {
      path: z.string(),
    },
    async ({ path: filePath }) => {
      const content = await readProjectFile(filePath);

      return {
        content: [
          {
            type: "text",
            text: content,
          },
        ],
      };
    },
  );

  // ---------- WRITE / CREATE FILE ----------

  server.tool(
    "write_file",
    "Create a new file or completely overwrite an existing project file.",
    {
      path: z.string(),
      content: z.string(),
    },
    async ({ path: filePath, content }) => {
      const result = await writeProjectFile(filePath, content);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  // ---------- REPLACE TEXT ----------

  server.tool(
    "replace_text",
    "Replace an exact section of text inside a project file.",
    {
      path: z.string(),
      search: z.string(),
      replacement: z.string(),
    },
    async ({ path: filePath, search, replacement }) => {
      const existing = await readProjectFile(filePath);

      if (!existing.includes(search)) {
        throw new Error("Requested search text was not found.");
      }

      const occurrences = existing.split(search).length - 1;

      if (occurrences !== 1) {
        throw new Error(
          `Expected exactly one match but found ${occurrences}.`,
        );
      }

      const updated = existing.replace(search, replacement);

      await writeProjectFile(filePath, updated);

      return {
        content: [
          {
            type: "text",
            text: `Updated ${filePath}`,
          },
        ],
      };
    },
  );

  // ---------- DELETE FILE ----------

  server.tool(
    "delete_file",
    "Delete one project file. Recursive directory deletion is prohibited.",
    {
      path: z.string(),
    },
    async ({ path: filePath }) => {
      const result = await deleteProjectFile(filePath);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  // ---------- MOVE / RENAME ----------

  server.tool(
    "move_file",
    "Move or rename a project file.",
    {
      from: z.string(),
      to: z.string(),
    },
    async ({ from, to }) => {
      const result = await moveProjectFile(from, to);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  // ---------- LIST DIRECTORY ----------

  server.tool(
    "list_files",
    "List files and directories within the project.",
    {
      path: z.string().default("."),
    },
    async ({ path: relativePath }) => {
      const target =
        relativePath === "."
          ? PROJECT_ROOT
          : resolveProjectPath(relativePath);

      const entries = await fs.readdir(target, {
        withFileTypes: true,
      });

      const result = entries
        .filter(
          (entry) =>
            entry.name !== ".git" &&
            entry.name !== "node_modules" &&
            !entry.name.startsWith(".env"),
        )
        .map((entry) => ({
          name: entry.name,
          type: entry.isDirectory() ? "directory" : "file",
        }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  // ---------- PROJECT STATUS ----------

  server.tool(
    "project_status",
    "Return basic information about the connected project.",
    {},
    async () => {
      const pkg = JSON.parse(
        await fs.readFile(
          path.join(PROJECT_ROOT, "package.json"),
          "utf8",
        ),
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                connected: true,
                projectRoot: PROJECT_ROOT,
                name: pkg.name,
                version: pkg.version,
                node: process.version,
                environment: process.env.NODE_ENV,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ---------- TYPESCRIPT CHECK ----------

  server.tool(
    "run_check",
    "Run the project's TypeScript check.",
    {},
    async () => {
      const { stdout, stderr } = await execFileAsync(
        "npm",
        ["run", "check"],
        {
          cwd: PROJECT_ROOT,
          timeout: 120_000,
        },
      );

      return {
        content: [
          {
            type: "text",
            text: `${stdout}\n${stderr}`.slice(0, 50_000),
          },
        ],
      };
    },
  );

  // ---------- BUILD ----------

  server.tool(
    "run_build",
    "Run the project's configured production build.",
    {},
    async () => {
      const { stdout, stderr } = await execFileAsync(
        "npm",
        ["run", "build"],
        {
          cwd: PROJECT_ROOT,
          timeout: 180_000,
        },
      );

      return {
        content: [
          {
            type: "text",
            text: `${stdout}\n${stderr}`.slice(0, 50_000),
          },
        ],
      };
    },
  );

  // ---------- GIT STATUS ----------

  server.tool(
    "git_status",
    "Inspect Git working-tree status.",
    {},
    async () => {
      const { stdout, stderr } = await execFileAsync(
        "git",
        ["status", "--short"],
        {
          cwd: PROJECT_ROOT,
          timeout: 30_000,
        },
      );

      return {
        content: [
          {
            type: "text",
            text: `${stdout}\n${stderr}`,
          },
        ],
      };
    },
  );

  // ---------- GIT DIFF ----------

  server.tool(
    "git_diff",
    "Inspect the current Git diff.",
    {},
    async () => {
      const { stdout, stderr } = await execFileAsync(
        "git",
        ["diff"],
        {
          cwd: PROJECT_ROOT,
          timeout: 30_000,
          maxBuffer: 5 * 1024 * 1024,
        },
      );

      return {
        content: [
          {
            type: "text",
            text: `${stdout}\n${stderr}`.slice(0, 100_000),
          },
        ],
      };
    },
  );

  return server;
}
