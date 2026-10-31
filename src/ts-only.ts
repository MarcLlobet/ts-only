import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const RENAMES: Record<string, string> = {
  ".js": ".ts",
  ".jsx": ".tsx",
  ".mjs": ".mts",
  ".cjs": ".cts",
};

export const suggestion = (file: string): string => {
  const ext = path.extname(file);
  return `Rename it to ${path.basename(file, ext)}${RENAMES[ext]}, or add it to .tsonlyignore if it has to stay JavaScript.`;
};

const gitFiles = (target: string, ...options: string[]): string[] =>
  execFileSync(
    "git",
    ["ls-files", "-z", "--cached", ...options, "--", target],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    },
  )
    .split("\0")
    .filter(Boolean);

export const findJavaScript = (target = "."): string[] => {
  if (!fs.existsSync(target)) throw new Error(`${target} does not exist`);
  try {
    const ignored = new Set(
      gitFiles(target, "--ignored", "--exclude-per-directory=.tsonlyignore"),
    );
    return gitFiles(target).filter(
      (file) =>
        path.extname(file) in RENAMES &&
        !ignored.has(file) &&
        fs.existsSync(file),
    );
  } catch {
    throw new Error(`${target} is not inside a git repository`);
  }
};
