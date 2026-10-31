import fs from "node:fs";
import path from "node:path";
import type { Config } from "./config.ts";

export const isExcluded = (file: string, exclude: string[]): boolean => {
  const normalized = path.normalize(file);
  return exclude.some((entry) => {
    const pattern = path.normalize(entry);
    return (
      normalized.split(path.sep).includes(pattern) ||
      normalized === pattern ||
      normalized.startsWith(`${pattern}${path.sep}`)
    );
  });
};

const isJavaScript = (file: string, props: Config): boolean =>
  props.files.includes(path.extname(file)) && !isExcluded(file, props.exclude);

export const filterFiles = (
  files: string[],
  directory: string,
  props: Config,
): string[] =>
  files
    .map((file) => path.normalize(file))
    .filter(
      (file) =>
        !path.relative(directory, file).startsWith("..") &&
        isJavaScript(file, props),
    )
    .sort();

export const detectFiles = (directory: string, props: Config): string[] =>
  fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(directory, entry.name);
      if (isExcluded(fullPath, props.exclude)) return [];
      if (entry.isDirectory()) return detectFiles(fullPath, props);
      return entry.isFile() && isJavaScript(fullPath, props) ? [fullPath] : [];
    })
    .sort();
