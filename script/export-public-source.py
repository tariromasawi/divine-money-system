#!/usr/bin/env python3
"""Build a public Git history without changing the live application's source.

Run against a private source repository; write only to a NEW destination.
Credential scanners must independently approve the result before publication.
"""
import argparse
import os
from pathlib import Path
import re
import subprocess

PRIVATE_DIRS = {
    ".git", ".agents", ".local", ".cache", ".config", ".upm",
    "node_modules", "dist", "coverage", "logs", "backups", "dumps",
}
PRIVATE_SUFFIXES = {
    ".log", ".pem", ".key", ".p12", ".pfx", ".keystore",
    ".dump", ".backup", ".sqlite", ".sqlite3", ".download", ".zip", ".gz",
}
PERSONAL_EMAIL = re.compile(
    rb"[\w.+-]+@(?:gmail|hotmail|outlook|yahoo|protonmail)\.[A-Za-z.]+",
    re.I,
)
OWNER_ARRAY = re.compile(
    rb"(?:const|let|var)\s+OWNER_EMAILS\s*=\s*\[[^\]]*\]\s*;", re.S,
)


def public_path(path):
    parts = Path(path).parts
    if not parts or any(p in PRIVATE_DIRS for p in parts):
        return False
    name = Path(path).name
    if name.startswith(".env") and name != ".env.example":
        return False
    if name.lower() in {"credentials.json", "secrets.json", ".npmrc", ".netrc"}:
        return False
    if Path(path).suffix.lower() in PRIVATE_SUFFIXES:
        return False
    if path.startswith("attached_assets/"):
        return path.startswith("attached_assets/generated_images/") and name.endswith(".png")
    return True


def sanitize(path, content):
    if b"\0" in content or Path(path).suffix.lower() in {".png", ".jpg", ".jpeg", ".mp3", ".woff", ".woff2"}:
        return content
    if path == ".replit":
        result, skipping = [], False
        for line in content.splitlines(keepends=True):
            stripped = line.strip()
            if stripped.startswith(b"["):
                section = stripped.strip(b"[]").decode("ascii", errors="ignore")
                # Older checkpoints stored credentials under custom section
                # names, not just userenv. Export only reproduction sections.
                skipping = re.fullmatch(
                    r"nix|deployment|ports|workflows(?:\.workflow(?:\.tasks|\.metadata)?)?",
                    section,
                ) is None
            if re.match(rb"^[A-Z][A-Z0-9_]*\s*=", stripped):
                continue
            if not skipping:
                result.append(line)
        content = b"".join(result)
    if path.endswith((".ts", ".tsx", ".js", ".cjs", ".mjs")):
        content = OWNER_ARRAY.sub(
            b'const OWNER_EMAILS = (process.env.OWNER_EMAILS || "")'
            b'.split(",").map(email => email.trim().toLowerCase()).filter(Boolean);',
            content,
        )
    # Personal-provider email addresses outside the configurable allowlist are
    # private metadata, not public application data.
    return PERSONAL_EMAIL.sub(b"redacted@example.invalid", content)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default=".")
    parser.add_argument("--destination", required=True)
    parser.add_argument("--github-owner", required=True)
    args = parser.parse_args()
    source = Path(args.source).resolve()
    destination = Path(args.destination).resolve()
    if destination.exists():
        raise SystemExit("Destination must not already exist.")

    def git(*argv, data=None, target=source, env=None):
        process = subprocess.run(
            ["git", "-C", str(target), *argv], input=data,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env,
        )
        if process.returncode:
            raise RuntimeError("Git operation failed; private diagnostics were not printed.")
        return process.stdout

    destination.mkdir(parents=True)
    subprocess.run(
        ["git", "init", "-q", "-b", "main", str(destination)], check=True,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    blob_cache, commit_map = {}, {}

    def public_blob(path, old_sha=None, current=None):
        key = (path, old_sha) if current is None else None
        if key is not None and key in blob_cache:
            return blob_cache[key]
        raw = git("cat-file", "blob", old_sha) if current is None else current
        transformed = sanitize(path, raw)
        sha = git("hash-object", "-w", "--stdin", data=transformed, target=destination).decode().strip()
        if key is not None:
            blob_cache[key] = sha
        return sha

    def tree_for(entries):
        root = {}
        for path, mode, sha in entries:
            parts = path.split("/")
            node = root
            for part in parts[:-1]:
                node = node.setdefault(part, {})
            node[parts[-1]] = (mode, sha)

        def emit(node):
            lines = []
            for name, value in node.items():
                if isinstance(value, dict):
                    mode, kind, sha = "040000", "tree", emit(value)
                else:
                    mode, sha = value
                    kind = "blob"
                lines.append(f"{mode} {kind} {sha}\t{name}".encode() + b"\0")
            return git("mktree", "-z", data=b"".join(lines), target=destination).decode().strip()
        return emit(root)

    identity = f"{args.github_owner}@users.noreply.github.com"

    def create_commit(tree, parents, message, author_date, committer_date):
        env = os.environ.copy()
        env.update(
            GIT_AUTHOR_NAME=args.github_owner, GIT_AUTHOR_EMAIL=identity,
            GIT_COMMITTER_NAME=args.github_owner, GIT_COMMITTER_EMAIL=identity,
            GIT_AUTHOR_DATE=author_date, GIT_COMMITTER_DATE=committer_date,
        )
        argv = ["commit-tree", tree]
        for parent in parents:
            argv += ["-p", parent]
        return git(
            *argv, data=PERSONAL_EMAIL.sub(b"redacted@example.invalid", message),
            target=destination, env=env,
        ).decode().strip()

    private_head = git("rev-parse", "HEAD").decode().strip()
    branches = git("for-each-ref", "--format=%(refname)", "refs/heads").decode().splitlines()
    commits = git("rev-list", "--reverse", "--topo-order", "--branches").decode().splitlines()
    for old in commits:
        entries = []
        for item in git("ls-tree", "-rz", old).split(b"\0"):
            if not item:
                continue
            meta, encoded_path = item.split(b"\t", 1)
            path = encoded_path.decode()
            mode, kind, sha = meta.decode().split()
            if kind != "blob" or not public_path(path):
                continue
            entries.append((path, mode, public_blob(path, old_sha=sha)))
        raw_commit = git("cat-file", "commit", old)
        headers, message = raw_commit.split(b"\n\n", 1)
        parent_ids = re.findall(rb"^parent ([a-f0-9]+)$", headers, re.M)
        dates = []
        for field in [b"author", b"committer"]:
            match = re.search(rb"^" + field + rb" .* ([0-9]+ [+-][0-9]{4})$", headers, re.M)
            dates.append("@" + match.group(1).decode())
        commit_map[old] = create_commit(
            tree_for(entries), [commit_map[p.decode()] for p in parent_ids],
            message, *dates,
        )
    current_entries = []
    current_paths = set(git("ls-files", "-z").decode().split("\0"))
    current_paths.update(git("ls-files", "--others", "--exclude-standard", "-z").decode().split("\0"))
    modes = {}
    for item in git("ls-files", "--stage", "-z").split(b"\0"):
        if item:
            metadata, name = item.split(b"\t", 1)
            modes[name.decode()] = metadata.split()[0].decode()
    for path in sorted(current_paths):
        file = source / path
        if not path or not public_path(path) or not file.is_file():
            continue
        if file.is_symlink():
            raise RuntimeError("Symlink requires explicit public-export review.")
        current_entries.append((
            path, modes.get(path, "100644"),
            public_blob(path, current=file.read_bytes()),
        ))
    public_parents = [commit_map[private_head]]
    previous_public = next((b for b in branches if b == "refs/heads/public-main"), None)
    if previous_public:
        previous_tip = git("rev-parse", previous_public).decode().strip()
        preserved_tip = commit_map[previous_tip]
        if preserved_tip not in public_parents:
            # Subsequent exports fast-forward the published branch, rather
            # than replacing its history or requiring a force push.
            public_parents.append(preserved_tip)
    head = create_commit(
        tree_for(current_entries), public_parents,
        b"Prepare complete sanitized Divine Money source for public GitHub\n",
        git("show", "-s", "--format=%aI", "HEAD").decode().strip(),
        git("show", "-s", "--format=%cI", "HEAD").decode().strip(),
    )
    git("update-ref", "refs/heads/main", head, target=destination)
    for branch in branches:
        if branch.endswith("/main") or branch.endswith("/public-main") or branch.startswith("refs/heads/public-history/"):
            continue
        old_tip = git("rev-parse", branch).decode().strip()
        public_ref = "refs/heads/history/" + branch.removeprefix("refs/heads/")
        git("update-ref", public_ref, commit_map[old_tip], target=destination)
    git("reset", "--hard", "main", target=destination)
    print(f"Sanitized commits: {len(commits) + 1}; current files: {len(current_entries)}")
    print(f"Public main commit: {head}")


if __name__ == "__main__":
    main()
