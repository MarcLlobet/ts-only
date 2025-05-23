import fs from "node:fs";
import path from "node:path";
import type { Config } from "./config";

export const detectFiles = (directory: string, props: Config): string[] => {
  const jsFiles: string[] = [];
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      const isValidDirectory = !props.exclude.includes(fullPath);
      if (isValidDirectory) {
        jsFiles.push(...detectFiles(fullPath, props));
      }
    } else {
      const isValidFile = props.files.includes(path.extname(fullPath));
      if (isValidFile) {
        jsFiles.push(fullPath);
      }
    }
  }

  return jsFiles;
};
