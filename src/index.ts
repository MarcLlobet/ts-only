import { getConfig, type ConfigOptions } from "./config.ts";
import { detectFiles } from "./detect-files.ts";

export { getConfig, DEFAULT_EXCLUDE, DEFAULT_EXTENSIONS } from "./config.ts";
export type { Config, ConfigOptions } from "./config.ts";
export { detectFiles } from "./detect-files.ts";

export const findJavaScriptFiles = (
  directory = ".",
  options: ConfigOptions = {},
): string[] => detectFiles(directory, getConfig(options));
