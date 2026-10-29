import fs from "node:fs";
import path from "node:path";
import type { Config } from "./config.ts";

export const isExcluded = (filePath: string, exclude: string[]): boolean => {
  const normalized = path.normalize(filePath);
  const segments = normalized.split(path.sep);
  return exclude.some((entry) => {
    const pattern = path.normalize(entry);
    return (
      segments.includes(pattern) ||
      normalized === pattern ||
      normalized.startsWith(`${pattern}${path.sep}`)
    );
  });
};

const isInside = (filePath: string, directory: string): boolean => {
  const relative = path.relative(directory, filePath);
  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  );
};

export const filterFiles = (
  files: string[],
  directory: string,
  props: Config,
): string[] =>
  files
    .map((file) => path.normalize(file))
    .filter(
      (file) =>
        isInside(file, directory) &&
        props.files.includes(path.extname(file)) &&
        !isExcluded(file, props.exclude),
    )
    .sort();

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
