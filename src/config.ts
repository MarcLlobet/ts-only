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

export const DEFAULT_EXCLUDE = ["node_modules", "dist", ".git"];
export const DEFAULT_EXTENSIONS = ["js", "jsx", "mjs", "cjs"];
export const CONFIG_FILE = ".ts-onlyrc.json";

const toExtension = (value: string): string =>
  value.startsWith(".") ? value : `.${value}`;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const pickOptions = (value: unknown, source: string): ConfigOptions => {
  if (value === undefined) return {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(
      `${source} must be an object with "exclude" and/or "extensions"`,
    );
  }
  const { exclude, extensions } = value as Record<string, unknown>;
  for (const [key, list] of Object.entries({ exclude, extensions })) {
    if (list !== undefined && !isStringArray(list)) {
      throw new Error(`"${key}" in ${source} must be an array of strings`);
    }
  }
  return {
    exclude: exclude as string[] | undefined,
    extensions: extensions as string[] | undefined,
  };
};

export const loadConfigFile = (directory = "."): ConfigOptions => {
  const rcPath = path.join(directory, CONFIG_FILE);
  if (fs.existsSync(rcPath)) {
    return pickOptions(
      JSON.parse(fs.readFileSync(rcPath, "utf8")),
      CONFIG_FILE,
    );
  }
  const packagePath = path.join(directory, "package.json");
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    return pickOptions(pkg["ts-only"], `"ts-only" in package.json`);
  }
  return {};
};

export const getConfig = (
  options: ConfigOptions = {},
  fileOptions: ConfigOptions = {},
): Config => {
  const extensions = options.extensions?.length
    ? options.extensions
    : fileOptions.extensions?.length
      ? fileOptions.extensions
      : DEFAULT_EXTENSIONS;
  return {
    exclude: [
      ...new Set([
        ...DEFAULT_EXCLUDE,
        ...(fileOptions.exclude ?? []),
        ...(options.exclude ?? []),
      ]),
    ],
    files: extensions.map(toExtension),
  };
};
