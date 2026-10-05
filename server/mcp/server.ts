import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  PROJECT_ROOT,
  readProjectFile,
  writeProjectFile,
  deleteProjectFile,
  moveProjectFile,
  listProjectFiles,
  searchProjectFiles,
  redactSensitiveText,
} from "./projectAccess";

const execFileAsync = promisify(execFile);

function safeCommandEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    CI: "1",
    NODE_ENV: "development",
  };

  for (const key of ["PATH", "HOME", "TMPDIR", "TMP", "TEMP", "LANG", "LC_ALL"]) {
    const value = process.env[key];
    if (value) env[key] = value;
  }

  return env;
}

async function runAllowedCommand(args: string[], timeout: number) {
  try {
    const result = await execFileAsync(process.execPath, args, {
      cwd: PROJECT_ROOT,
      env: safeCommandEnvironment(),
      timeout,
      maxBuffer: 5 * 1024 * 1024,
    });

    return {
      exitCode: 0,
      output: redactSensitiveText(
        `${result.stdout}\n${result.stderr}`,
      ).replaceAll(PROJECT_ROOT, "."),
    };
  } catch (error) {
    const commandError = error as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
    };

    return {
      exitCode:
        typeof commandError.code === "number"
          ? commandError.code
          : 1,
      output: redactSensitiveText(
        `${commandError.stdout ?? ""}\n${commandError.stderr ?? commandError.message ?? "Command failed."}`,
      ).replaceAll(PROJECT_ROOT, "."),
    };
  }
}

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
      content: z.string().max(1_000_000),
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
      replacement: z.string().max(1_000_000),
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
      const result = await listProjectFiles(relativePath);

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

  // ---------- SOURCE SEARCH ----------

  server.tool(
    "search_code",
    "Search project text files for a literal string; protected files and generated dependencies are excluded.",
    {
      query: z.string().min(1).max(256),
      path: z.string().default("."),
    },
    async ({ query, path: relativePath }) => {
      const result = await searchProjectFiles(query, relativePath);

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
                name: pkg.name,
                version: pkg.version,
                node: process.version,
                environment: process.env.NODE_ENV,
                sourceMode:
                  process.env.NODE_ENV === "production"
                    ? "published-copy"
                    : "replit-workspace",
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
      const result = await runAllowedCommand(
        [path.join(PROJECT_ROOT, "node_modules/typescript/bin/tsc")],
        120_000,
      );

      return {
        isError: result.exitCode !== 0,
        content: [
          {
            type: "text",
            text: `exit_code=${result.exitCode}\n${result.output}`.slice(0, 50_000),
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
      const result = await runAllowedCommand(
        [
          path.join(PROJECT_ROOT, "node_modules/tsx/dist/cli.mjs"),
          "script/build.ts",
        ],
        180_000,
      );

      return {
        isError: result.exitCode !== 0,
        content: [
          {
            type: "text",
            text: `exit_code=${result.exitCode}\n${result.output}`.slice(0, 50_000),
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
        ["status", "--short", "--branch", "--untracked-files=normal"],
        {
          cwd: PROJECT_ROOT,
          env: safeCommandEnvironment(),
          timeout: 30_000,
          maxBuffer: 1024 * 1024,
        },
      );

      return {
        content: [
          {
            type: "text",
            text: redactSensitiveText(`${stdout}\n${stderr}`).replaceAll(
              PROJECT_ROOT,
              ".",
            ),
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
        [
          "diff",
          "--no-ext-diff",
          "--no-textconv",
          "--unified=3",
          "HEAD",
          "--",
          ".",
          ":(exclude).replit",
          ":(exclude)**/.replit*",
          ":(exclude)**/.env*",
          ":(exclude)**/.npmrc",
          ":(exclude)**/.pypirc",
          ":(exclude)**/.ssh/**",
          ":(exclude)**/*credentials*",
          ":(exclude)**/*private-key*",
          ":(exclude)**/*mnemonic*",
        ],
        {
          cwd: PROJECT_ROOT,
          env: safeCommandEnvironment(),
          timeout: 30_000,
          maxBuffer: 5 * 1024 * 1024,
        },
      );

      return {
        content: [
          {
            type: "text",
            text: redactSensitiveText(
              `${stdout}\n${stderr}`,
            )
              .replaceAll(PROJECT_ROOT, ".")
              .slice(0, 100_000),
          },
        ],
      };
    },
  );

  return server;
}
