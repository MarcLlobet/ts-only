import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { EXTENSIONS } from "./config.ts";

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

export const filterFiles = (
  files: string[],
  directory: string,
  exclude: string[],
): string[] =>
  files
    .map((file) => path.normalize(file))
    .filter(
      (file) =>
        !path.relative(directory, file).startsWith("..") &&
        EXTENSIONS.includes(path.extname(file)) &&
        !isExcluded(file, exclude),
    )
    .sort();

const listFiles = (directory: string): string[] => {
  try {
    return execFileSync(
      "git",
      [
        "-C",
        directory,
        "ls-files",
        "-z",
        "--cached",
        "--others",
        "--exclude-standard",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    )
      .split("\0")
      .map((file) => path.join(directory, file))
      .filter((file) => file !== directory && fs.existsSync(file));
  } catch {
    throw new Error(`${directory} is not inside a git repository`);
  }
};

export const detectFiles = (directory: string, exclude: string[]): string[] =>
  filterFiles(listFiles(directory), directory, exclude);
