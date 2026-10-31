import fs from "node:fs";
import path from "node:path";

const RENAMES: Record<string, string> = {
  ".js": ".ts",
  ".jsx": ".tsx",
  ".mjs": ".mts",
  ".cjs": ".cts",
};

export const EXTENSIONS = Object.keys(RENAMES);

export const suggestion = (file: string): string => {
  const ext = path.extname(file);
  return `Rename it to ${path.basename(file, ext)}${RENAMES[ext]}, or add it to "exclude" if it has to stay JavaScript.`;
};

const readJson = (file: string) =>
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : undefined;

export const loadExclude = (directory = "."): string[] =>
  (
    readJson(path.join(directory, ".ts-onlyrc.json")) ??
    readJson(path.join(directory, "package.json"))?.["ts-only"]
  )?.exclude ?? [];
