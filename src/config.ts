import fs from "node:fs";
import path from "node:path";

export interface Config {
  exclude: string[];
  files: string[];
}

export interface ConfigOptions {
  exclude?: string[];
  extensions?: string[];
}

const DEFAULT_EXCLUDE = ["node_modules", "dist", ".git"];
const DEFAULT_EXTENSIONS = ["js", "jsx", "mjs", "cjs"];

const readJson = (file: string) =>
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : undefined;

export const loadConfigFile = (directory = "."): ConfigOptions =>
  readJson(path.join(directory, ".ts-onlyrc.json")) ??
  readJson(path.join(directory, "package.json"))?.["ts-only"] ??
  {};

export const getConfig = (
  options: ConfigOptions = {},
  file: ConfigOptions = {},
): Config => ({
  exclude: [
    ...new Set([
      ...DEFAULT_EXCLUDE,
      ...(file.exclude ?? []),
      ...(options.exclude ?? []),
    ]),
  ],
  files: (options.extensions?.length
    ? options.extensions
    : file.extensions?.length
      ? file.extensions
      : DEFAULT_EXTENSIONS
  ).map((ext) => (ext.startsWith(".") ? ext : `.${ext}`)),
});
