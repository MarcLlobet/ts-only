import fs from "node:fs";
import path from "node:path";
import type { Config } from "./config.ts";

const isExcluded = (fullPath: string, exclude: string[]): boolean => {
  const normalized = path.normalize(fullPath);
  const name = path.basename(normalized);
  return exclude.some((entry) => {
    const pattern = path.normalize(entry);
    return (
      pattern === name ||
      pattern === normalized ||
      normalized.startsWith(`${pattern}${path.sep}`)
    );
  });
};

export const detectFiles = (directory: string, props: Config): string[] => {
  const jsFiles: string[] = [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (isExcluded(fullPath, props.exclude)) {
      continue;
    }

    if (entry.isDirectory()) {
      jsFiles.push(...detectFiles(fullPath, props));
    } else if (entry.isFile() && props.files.includes(path.extname(fullPath))) {
      jsFiles.push(fullPath);
    }
  }

  return jsFiles.sort();
};
