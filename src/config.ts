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

const toExtension = (value: string): string =>
  value.startsWith(".") ? value : `.${value}`;

export const getConfig = (options: ConfigOptions = {}): Config => ({
  exclude: [...new Set([...DEFAULT_EXCLUDE, ...(options.exclude ?? [])])],
  files: (options.extensions?.length
    ? options.extensions
    : DEFAULT_EXTENSIONS
  ).map(toExtension),
});
