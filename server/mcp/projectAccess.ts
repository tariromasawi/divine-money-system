import path from "node:path";
import fs from "node:fs/promises";
import { constants } from "node:fs";

export const PROJECT_ROOT = path.resolve(process.cwd());
const MAX_READ_BYTES = 1_000_000;
const MAX_WRITE_BYTES = 1_000_000;

/**
 * Files/directories that an external MCP client must never access.
 * Grok can edit application source while secrets remain protected.
 */
const BLOCKED_NAMES = new Set([
  ".git",
  "node_modules",
  ".env",
  ".replit",
  ".config",
  ".secrets",
  ".npmrc",
  ".pypirc",
  ".ssh",
  ".netrc",
  ".git-credentials",
]);

const BLOCKED_PATTERNS = [
  /\.(?:pem|key|p8|p12|pfx|der|jks|keystore)$/i,
  /(?:^|[._-])credentials?(?:[._-]|$)/i,
  /private[-_]?key/i,
  /mnemonic/i,
  /wallet[-_]?(?:seed|backup)/i,
];

const IGNORED_SEARCH_DIRECTORIES = new Set([
  ".git",
  ".config",
  ".local",
  ".agents",
  ".secrets",
  "node_modules",
  "dist",
  "coverage",
  ".next",
]);

function isBlockedSegment(segment: string): boolean {
  const lower = segment.toLowerCase();

  return (
    BLOCKED_NAMES.has(lower) ||
    lower.startsWith(".env") ||
    lower.startsWith(".replit") ||
    lower.startsWith(".secrets") ||
    BLOCKED_PATTERNS.some((pattern) => pattern.test(segment))
  );
}

export function resolveProjectPath(relativePath: string): string {
  if (!relativePath || typeof relativePath !== "string") {
    throw new Error("A project-relative path is required.");
  }

  if (
    relativePath.length > 4096 ||
    relativePath.includes("\0") ||
    path.isAbsolute(relativePath) ||
    path.win32.isAbsolute(relativePath)
  ) {
    throw new Error("Only project-relative paths are allowed.");
  }

  const normalized = relativePath.replace(/\\/g, "/");

  const segments = normalized.split("/").filter(Boolean);

  for (const segment of segments) {
    if (segment === "..") {
      throw new Error("Path traversal denied.");
    }

    if (isBlockedSegment(segment)) {
      throw new Error(`Access denied: ${segment}`);
    }
  }

  const resolved = path.resolve(PROJECT_ROOT, ...segments);

  if (
    resolved !== PROJECT_ROOT &&
    !resolved.startsWith(PROJECT_ROOT + path.sep)
  ) {
    throw new Error("Path traversal denied.");
  }

  return resolved;
}

async function assertNoSymlinkComponents(target: string): Promise<void> {
  const relative = path.relative(PROJECT_ROOT, target);
  let current = PROJECT_ROOT;

  const rootStat = await fs.lstat(PROJECT_ROOT);
  if (rootStat.isSymbolicLink()) {
    throw new Error("Project root cannot be a symbolic link.");
  }

  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);

    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) {
        throw new Error("Symbolic links are not accessible through MCP.");
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }
      throw error;
    }
  }
}

export function redactSensitiveText(text: string): string {
  return text
    .replace(
      /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/gi,
      "[REDACTED PRIVATE KEY]",
    )
    .replace(/\b(?:sk_(?:live|test)_[A-Za-z0-9]{8,}|AIza[A-Za-z0-9_-]{30,}|gh[pousr]_[A-Za-z0-9]{20,}|xai-[A-Za-z0-9_-]{20,})\b/g, "[REDACTED CREDENTIAL]")
    .replace(/https?:\/\/[^\s/@:]+:[^\s/@]+@/gi, "https://[REDACTED]@")
    .replace(/\b0x[a-f0-9]{64}\b/gi, "[REDACTED 32-BYTE HEX VALUE]")
    .replace(
      /((?:DEPLOYER|RELAYER|WALLET|BLOCKCHAIN)?_?PRIVATE_KEY\s*[:=]\s*["']?)(?:0x)?[a-f0-9]{64}(["']?)/gi,
      "$1[REDACTED PRIVATE KEY]$2",
    )
    .replace(
      /((?:api[_-]?key|access[_-]?token|authorization|bearer|client[_-]?secret|credential|mnemonic|password|private[_-]?key|seed(?:[_ -]?phrase)?|secret|token)\s*[:=]\s*["'])([^"'\r\n]{8,})(["'])/gi,
      "$1[REDACTED SECRET]$3",
    );
}

export async function readProjectFile(relativePath: string) {
  const target = resolveProjectPath(relativePath);
  await assertNoSymlinkComponents(target);

  const stat = await fs.lstat(target);
  if (!stat.isFile()) {
    throw new Error("Only regular files can be read.");
  }
  if (stat.size > MAX_READ_BYTES) {
    throw new Error(`File exceeds the ${MAX_READ_BYTES}-byte read limit.`);
  }

  const content = await fs.readFile(target, "utf8");
  return redactSensitiveText(content);
}

export async function writeProjectFile(
  relativePath: string,
  content: string,
) {
  if (typeof content !== "string") {
    throw new Error("File content must be text.");
  }
  if (Buffer.byteLength(content, "utf8") > MAX_WRITE_BYTES) {
    throw new Error(`File exceeds the ${MAX_WRITE_BYTES}-byte write limit.`);
  }

  const target = resolveProjectPath(relativePath);
  await assertNoSymlinkComponents(target);

  await fs.mkdir(path.dirname(target), {
    recursive: true,
  });

  await assertNoSymlinkComponents(target);
  const flags =
    constants.O_WRONLY |
    constants.O_CREAT |
    constants.O_TRUNC |
    (constants.O_NOFOLLOW ?? 0);
  const handle = await fs.open(target, flags, 0o600);

  try {
    const stat = await handle.stat();
    if (!stat.isFile()) {
      throw new Error("Only regular files can be written.");
    }
    await handle.writeFile(content, "utf8");
  } finally {
    await handle.close();
  }

  return {
    path: relativePath,
    bytes: Buffer.byteLength(content, "utf8"),
  };
}

export async function deleteProjectFile(relativePath: string) {
  const target = resolveProjectPath(relativePath);
  await assertNoSymlinkComponents(target);
  const stat = await fs.lstat(target);

  if (!stat.isFile()) {
    throw new Error(
      "Only regular files can be deleted. Directories and links are protected.",
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

  if (source === destination) {
    throw new Error("Source and destination must be different files.");
  }

  await assertNoSymlinkComponents(source);
  const sourceStat = await fs.lstat(source);
  if (!sourceStat.isFile()) {
    throw new Error("Only regular files can be moved.");
  }

  await assertNoSymlinkComponents(destination);
  await fs.mkdir(path.dirname(destination), {
    recursive: true,
  });

  await assertNoSymlinkComponents(destination);
  try {
    await fs.lstat(destination);
    throw new Error("Destination already exists; refusing to overwrite it.");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  await fs.rename(source, destination);

  return {
    from,
    to,
  };
}

export async function listProjectFiles(relativePath = ".") {
  const target = resolveProjectPath(relativePath);
  await assertNoSymlinkComponents(target);

  const stat = await fs.lstat(target);
  if (!stat.isDirectory()) {
    throw new Error("The requested path is not a directory.");
  }

  const entries = await fs.readdir(target, { withFileTypes: true });

  return entries
    .filter(
      (entry) =>
        !isBlockedSegment(entry.name) &&
        !entry.isSymbolicLink(),
    )
    .map((entry) => ({
      name: entry.name,
      type: entry.isDirectory() ? "directory" : "file",
    }));
}

export async function searchProjectFiles(
  query: string,
  relativePath = ".",
) {
  if (!query || query.length > 256) {
    throw new Error("Search text must be between 1 and 256 characters.");
  }

  const start = resolveProjectPath(relativePath);
  await assertNoSymlinkComponents(start);
  const startStat = await fs.lstat(start);
  const rootIsFile = startStat.isFile();
  if (!rootIsFile && !startStat.isDirectory()) {
    throw new Error("Search root must be a regular file or directory.");
  }

  const matches: Array<{ path: string; line: number; text: string }> = [];
  let scannedFiles = 0;
  const maxFiles = 5000;
  const maxMatches = 100;
  const needle = query.toLocaleLowerCase();

  async function visit(target: string): Promise<void> {
    if (matches.length >= maxMatches || scannedFiles >= maxFiles) return;

    const stat = await fs.lstat(target);
    if (stat.isSymbolicLink()) return;

    if (stat.isFile()) {
      scannedFiles += 1;
      if (stat.size > 512_000) return;

      const buffer = await fs.readFile(target);
      if (buffer.includes(0)) return;

      const text = buffer.toString("utf8");
      const lines = text.split(/\r?\n/);
      const relative = path.relative(PROJECT_ROOT, target) || ".";

      for (let index = 0; index < lines.length; index += 1) {
        if (lines[index].toLocaleLowerCase().includes(needle)) {
          matches.push({
            path: relative,
            line: index + 1,
            text: redactSensitiveText(lines[index]).slice(0, 300),
          });
          if (matches.length >= maxMatches) return;
        }
      }
      return;
    }

    if (!stat.isDirectory()) return;

    const entries = await fs.readdir(target, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.isSymbolicLink() ||
        isBlockedSegment(entry.name) ||
        IGNORED_SEARCH_DIRECTORIES.has(entry.name.toLowerCase())
      ) {
        continue;
      }
      await visit(path.join(target, entry.name));
      if (matches.length >= maxMatches || scannedFiles >= maxFiles) return;
    }
  }

  await visit(start);
  return {
    matches,
    scannedFiles,
    truncated: scannedFiles >= maxFiles || matches.length >= maxMatches,
  };
}

