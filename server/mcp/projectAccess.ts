import path from "node:path";
import fs from "node:fs/promises";

export const PROJECT_ROOT = process.cwd();

/**
 * Files/directories that an external MCP client must never access.
 * Grok can edit application source while secrets remain protected.
 */
const BLOCKED_NAMES = new Set([
  ".git",
  "node_modules",
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  ".npmrc",
  ".ssh",
]);

const BLOCKED_PATTERNS = [
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /credentials/i,
  /private[-_]?key/i,
];

export function resolveProjectPath(relativePath: string): string {
  if (!relativePath || typeof relativePath !== "string") {
    throw new Error("A project-relative path is required.");
  }

  const cleaned = relativePath
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  const segments = cleaned.split("/").filter(Boolean);

  for (const segment of segments) {
    if (BLOCKED_NAMES.has(segment)) {
      throw new Error(`Access denied: ${segment}`);
    }

    if (BLOCKED_PATTERNS.some((pattern) => pattern.test(segment))) {
      throw new Error(`Protected file: ${segment}`);
    }
  }

  const resolved = path.resolve(PROJECT_ROOT, cleaned);
  const root = path.resolve(PROJECT_ROOT);

  if (
    resolved !== root &&
    !resolved.startsWith(root + path.sep)
  ) {
    throw new Error("Path traversal denied.");
  }

  return resolved;
}

export async function readProjectFile(relativePath: string) {
  const target = resolveProjectPath(relativePath);
  return fs.readFile(target, "utf8");
}

export async function writeProjectFile(
  relativePath: string,
  content: string,
) {
  const target = resolveProjectPath(relativePath);

  await fs.mkdir(path.dirname(target), {
    recursive: true,
  });

  await fs.writeFile(target, content, "utf8");

  return {
    path: relativePath,
    bytes: Buffer.byteLength(content, "utf8"),
  };
}

export async function deleteProjectFile(relativePath: string) {
  const target = resolveProjectPath(relativePath);
  const stat = await fs.stat(target);

  // Prevent an AI mistake from recursively destroying directories.
  if (stat.isDirectory()) {
    throw new Error(
      "Directory deletion is disabled. Delete individual files instead.",
    );
  }

  await fs.unlink(target);

  return {
    deleted: relativePath,
  };
}

export async function moveProjectFile(
  from: string,
  to: string,
) {
  const source = resolveProjectPath(from);
  const destination = resolveProjectPath(to);

  await fs.mkdir(path.dirname(destination), {
    recursive: true,
  });

  await fs.rename(source, destination);

  return {
    from,
    to,
  };
}

